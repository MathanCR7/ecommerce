// backend/routes/adminItemRoutes.js
import express from "express";
import {
  getAllAdminItems,
  getAdminItemById,
  createAdminItem,
  updateAdminItem,
  deleteAdminItem,
  deleteMultipleAdminItems,
  getActiveItemsForSelect,
} from "../controllers/adminItemController.js";
import { protect } from "../middleware/adminAuthMiddleware.js"; // Assuming this is your correct admin auth middleware
import {
  uploadItemImagesForCreate, // Corrected import for create
  uploadItemImagesForUpdate, // Corrected import for update
} from "../config/multerConfig.js";
import {
  validateItem,
  handleValidationErrors,
} from "../middleware/validators.js";

const router = express.Router();

// Apply admin authentication to all routes in this file
router.use(protect);
router.get("/list-for-select", getActiveItemsForSelect);

router.route("/").get(getAllAdminItems).post(
  uploadItemImagesForCreate, // Use for item creation (expects 'images' field)
  validateItem,
  handleValidationErrors,
  createAdminItem
);

router.route("/delete-multiple").post(deleteMultipleAdminItems); // No file upload here, so no multer

router
  .route("/:id")
  .get(getAdminItemById)
  .put(
    uploadItemImagesForUpdate, // Use for item update (expects 'newImages' field)
    validateItem, // Consider if a separate validateItemUpdate is needed
    handleValidationErrors,
    updateAdminItem
  )
  .delete(deleteAdminItem);

export default router;
