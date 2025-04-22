// backend/routes/productRoutes.js
import express from "express";
import {
  getPublicProducts,
  getPublicProductById,
} from "../controllers/publicProductController.js";

const router = express.Router();

// GET /api/products - Get all products (public, supports filtering/pagination)
router.get("/", getPublicProducts);

// GET /api/products/:id - Get single product by ID (public)
router.get("/:id", getPublicProductById);

export default router;
