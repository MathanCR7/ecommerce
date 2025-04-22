// backend/routes/itemRoutes.js
import express from "express";
import {
  getPublicItems, // Renamed function
  getPublicItemById, // Renamed function
} from "../controllers/publicItemController.js"; // Renamed controller

const router = express.Router();

// GET /api/items - Get all items (public, supports filtering/pagination)
router.get("/", getPublicItems);

// GET /api/items/:id - Get single item by ID (public)
router.get("/:id", getPublicItemById);

export default router;
