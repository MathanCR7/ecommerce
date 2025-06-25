// backend/routes/adminCategoryRoutes.js
import express from "express";
import {
  getAllAdminCategories,
  getAdminCategoryById,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory, // Original delete (cascades items)
  deleteMultipleAdminCategories, // Original multi-delete (cascades items)
  moveItemsAndDeleteCategory,
  getActiveCategoriesForSelect, // New controller for move & delete
} from "../controllers/adminCategoryController.js";
import { protect as protectAdmin } from "../middleware/adminAuthMiddleware.js";
import { uploadCategoryImage } from "../config/multerConfig.js";
import {
  validateCategory,
  handleValidationErrors,
} from "../middleware/validators.js"; // Assuming validateCategory exists

const router = express.Router();

// Apply admin authentication middleware to ALL routes in this file
router.use(protectAdmin);

router.get("/list-for-select", getActiveCategoriesForSelect);
// --- Define Routes ---

// POST /api/admin/categories/delete-multiple
router.post("/delete-multiple", deleteMultipleAdminCategories);

// *** NEW ROUTE for moving items then deleting ***
// POST /api/admin/categories/:id/move-delete
// This needs to be defined BEFORE the '/:id' route for specific matching
router.post("/:id/move-delete", moveItemsAndDeleteCategory);

// GET /api/admin/categories/ and POST /api/admin/categories/
router.route("/").get(getAllAdminCategories).post(
  uploadCategoryImage,
  validateCategory, // Apply validation
  handleValidationErrors, // Handle validation results
  createAdminCategory
);

// GET /api/admin/categories/:id, PUT /api/admin/categories/:id, DELETE /api/admin/categories/:id
router
  .route("/:id")
  .get(getAdminCategoryById) // Handles GET /api/admin/categories/:id
  .put(
    uploadCategoryImage,
    validateCategory, // Apply validation
    handleValidationErrors, // Handle validation results
    updateAdminCategory // Handles PUT /api/admin/categories/:id
  )
  // This DELETE route still triggers the item cascade delete via model hook
  .delete(deleteAdminCategory); // Handles DELETE /api/admin/categories/:id

export default router;
