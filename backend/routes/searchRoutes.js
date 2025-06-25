import express from "express";
import { getSearchSuggestions } from "../controllers/searchController.js"; // Adjust path as needed

const router = express.Router();

// @desc    Get search suggestions for items and categories
// @route   GET /api/search/suggestions
// @access  Public
router.get("/suggestions", getSearchSuggestions);

export default router;
