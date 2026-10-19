// server/src/services/__tests__/post.service.test.js

import { jest } from "@jest/globals";

const mockPostRepository = {
  createWithTags: jest.fn(),
  searchPublished: jest.fn(),
};
const mockEventBus = { emit: jest.fn() };

jest.unstable_mockModule("../../repositories/post.repository.js", () => ({
  PostRepository: mockPostRepository,
}));
jest.unstable_mockModule("../../events/event-bus.js", () => ({
  EventBus: mockEventBus,
}));

const { PostService } = await import("../post.service.js");

beforeEach(() => {
  jest.clearAllMocks();
});

test("publish() creates a PUBLISHED post and emits post.published", async () => {
  mockPostRepository.createWithTags.mockResolvedValue({ id: "p1", title: "Hello", status: "PUBLISHED" });

  const post = await PostService.publish({ authorId: "u1", title: "Hello", body: "World" });

  expect(post.status).toBe("PUBLISHED");
  expect(mockEventBus.emit).toHaveBeenCalledWith(
    "post.published",
    expect.objectContaining({ postId: "p1" })
  );
});

test("publish() rejects an empty title", async () => {
  await expect(
    PostService.publish({ authorId: "u1", title: "", body: "World" })
  ).rejects.toThrow();
});

/*
| # | Technique                                | Input                            | Expected Outcome                         |
|---|------------------------------------------|----------------------------------|------------------------------------------|
| 1 | Black-box (equivalence: valid input)     | query: "design"                  | Matching published posts are returned   |
| 2 | Black-box (equivalence: no matches)      | query: "missing"                 | Empty posts array is returned            |
| 3 | Black-box (boundary: first page)         | page: 1, pageSize: 1             | First one-item page is returned          |
| 4 | White-box (strategy failure)             | Search strategy rejects          | Error is propagated to the caller        |
*/
describe("PostService.search", () => {
  test("returns matching published posts for a valid query (row 1)", async () => {
    const searchResult = {
      posts: [{ id: "p1", title: "Software Design" }],
      hasMore: false,
    };
    mockPostRepository.searchPublished.mockResolvedValue(searchResult);

    const result = await PostService.search({ query: "design" });

    expect(result).toEqual(searchResult);
    expect(mockPostRepository.searchPublished).toHaveBeenCalledWith({
      query: "design",
      page: 1,
      pageSize: 10,
    });
  });

  test("returns an empty posts array when nothing matches (row 2)", async () => {
    const searchResult = { posts: [], hasMore: false };
    mockPostRepository.searchPublished.mockResolvedValue(searchResult);

    const result = await PostService.search({ query: "missing" });

    expect(result).toEqual(searchResult);
  });

  test("returns the first one-item page (row 3, boundary)", async () => {
    const searchResult = {
      posts: [{ id: "p1", title: "Software Design" }],
      hasMore: true,
    };
    mockPostRepository.searchPublished.mockResolvedValue(searchResult);

    const result = await PostService.search({ query: "design", page: 1, pageSize: 1 });

    expect(result).toEqual(searchResult);
    expect(mockPostRepository.searchPublished).toHaveBeenCalledWith({
      query: "design",
      page: 1,
      pageSize: 1,
    });
  });

  test("propagates a search strategy failure (row 4, white-box)", async () => {
    mockPostRepository.searchPublished.mockRejectedValue(new Error("search unavailable"));

    await expect(
      PostService.search({ query: "design" })
    ).rejects.toThrow("search unavailable");
  });
});
