// backend/routes/categoryRoutes.js
import express from "express";
import {
  getPublicCategories,
  getPublicCategoryBySlug,
} from "../controllers/publicCategoryController.js";

const router = express.Router();

// GET /api/categories - Get all categories (public)
router.get("/", getPublicCategories);

// GET /api/categories/:slug - Get single category by slug (public)
router.get("/:slug", getPublicCategoryBySlug);

export default router;
