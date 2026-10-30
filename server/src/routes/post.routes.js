import { Router } from "express";
import { PostService } from "../services/post.service.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();
const MAX_PAGE_SIZE = 100;

router.post("/posts", requireAuth, async (req, res, next) => {
  try {
    // Never trust client-supplied identity fields — derive
    // authorId from the authenticated request, not the request body.
    const post = await PostService.publish({
      ...req.body,
      authorId: req.user.id, // set by requireAuth middleware from the verified JWT
    });
    res.status(201).json(post);
  } catch (err) {
    next(err);
  }
});

router.get("/posts", async (req, res, next) => {
  try {
    const { page = 1, pageSize = 10, search } = req.query;
    const numericPageSize = Number(pageSize);

    // Prevent oversized feed requests from exhausting server resources.
    if (numericPageSize > MAX_PAGE_SIZE) {
      return res.status(400).json({
        error: {
          code: "PAGE_SIZE_TOO_LARGE",
          message: `pageSize must be ${MAX_PAGE_SIZE} or less.`,
        },
      });
    }

    const result = search
      ? await PostService.search({ query: search, page: Number(page), pageSize: numericPageSize })
      : await PostService.listPublished({ page: Number(page), pageSize: numericPageSize });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
