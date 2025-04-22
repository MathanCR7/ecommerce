// backend/routes/adminItemRoutes.js
import express from "express";
import {
  getAllAdminItems, // Renamed function
  getAdminItemById, // Renamed function
  createAdminItem, // Renamed function
  updateAdminItem, // Renamed function
  deleteAdminItem, // Renamed function
  deleteMultipleAdminItems, // Renamed function
} from "../controllers/adminItemController.js"; // Renamed controller file
import { protect as protectAdmin } from "../middleware/adminAuthMiddleware.js";
// *** Assume you have uploadItemImage in multerConfig or rename uploadProductImage ***
import { uploadItemImage } from "../config/multerConfig.js"; // Renamed multer function
import {
  validateItem, // *** Assume you rename validateProduct to validateItem ***
  handleValidationErrors,
} from "../middleware/validators.js"; // Renamed validator

const router = express.Router();

// Apply admin authentication middleware
router.use(protectAdmin);

// --- Define Routes ---

// POST /api/admin/items/delete-multiple
router.post("/delete-multiple", deleteMultipleAdminItems); // Renamed handler

// GET /api/admin/items/ and POST /api/admin/items/
router
  .route("/")
  .get(getAllAdminItems) // Renamed handler
  .post(
    uploadItemImage, // Renamed multer function
    validateItem, // Renamed validator
    handleValidationErrors,
    createAdminItem // Renamed handler
  );

// GET /api/admin/items/:id, PUT /api/admin/items/:id, DELETE /api/admin/items/:id
router
  .route("/:id")
  .get(getAdminItemById) // Renamed handler
  .put(
    uploadItemImage, // Renamed multer function
    validateItem, // Renamed validator
    handleValidationErrors,
    updateAdminItem // Renamed handler
  )
  .delete(deleteAdminItem); // Renamed handler

export default router;
