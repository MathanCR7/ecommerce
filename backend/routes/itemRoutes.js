// backend/routes/itemRoutes.js
import express from "express";
import {
  getPublicItems, // Existing public items route
  getPublicItemById, // Existing single public item route
  getTopSellingItems, // <--- NEW: Import the new controller function
} from "../controllers/publicItemController.js"; // All public item logic is in this controller

const router = express.Router();

// Add the specific route for top-selling items FIRST
// GET /api/items/top-selling
router.get("/top-selling", getTopSellingItems); // <--- ADD THIS ROUTE HERE

// GET /api/items - Get all items (public, supports filtering/pagination)
router.get("/", getPublicItems); // Keep existing route

// GET /api/items/:id - Get single item by ID (public)
// This route MUST come AFTER the specific /top-selling route
router.get("/:id", getPublicItemById); // Keep existing route

export default router;
