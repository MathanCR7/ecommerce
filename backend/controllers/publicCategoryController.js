// backend/controllers/publicCategoryController.js
import asyncHandler from "express-async-handler";
import Category from "../models/Category.js";

// GET /api/categories - Fetch all categories (public)
export const getPublicCategories = asyncHandler(async (req, res) => {
  console.log("[Ctrl Public Cat] Fetching all categories");
  // Select only fields needed for public display, sort by name perhaps
  const categories = await Category.find({})
    .select("name slug description imagePath") // Select specific fields
    .sort({ name: 1 }); // Sort alphabetically by name

  console.log(`[Ctrl Public Cat] Found ${categories.length} categories.`);
  res.status(200).json({ success: true, categories });
});

// GET /api/categories/:slug - Fetch a single category by slug (public)
export const getPublicCategoryBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  console.log(`[Ctrl Public Cat] Fetching category by slug: ${slug}`);

  const category = await Category.findOne({ slug: slug.toLowerCase() }).select(
    "name slug description imagePath"
  ); // Select fields

  if (!category) {
    res.status(404);
    throw new Error("Category not found.");
  }

  console.log(`[Ctrl Public Cat] Found category: ${category.name}`);
  res.status(200).json({ success: true, category });
});
