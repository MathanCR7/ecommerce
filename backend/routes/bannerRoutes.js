// ========================================================================
// FILE: backend/routes/bannerRoutes.js (VERIFY IMPORTS AND MIDDLEWARE)
// ========================================================================
import express from "express";
import {
  createBanner,
  getBanners, // Ensure getBanners is imported
  getBannerById,
  updateBanner,
  deleteBanner,
  toggleBannerStatus,
} from "../controllers/bannerController.js"; // Verify this path is correct
import { protect } from "../middleware/adminAuthMiddleware.js"; // Verify this path is correct
import { uploadBannerImageMiddleware } from "../config/multerConfig.js"; // Verify this path is correct

const router = express.Router();
console.log("[Router Setup] Initializing bannerRoutes.js");

// Optional: Log when this router handles a request
router.use((req, res, next) => {
  console.log(
    `[Banner Router Hit] Method: ${req.method}, Path: ${req.originalUrl}`
  ); // Use originalUrl for full path
  next();
});

// Apply admin protection to all routes in this file
router.use(protect); // Ensure this middleware calls next() or sends a response
console.log("[Banner Router] Applied 'protect' middleware.");

// Define routes
router
  .route("/")
  .get(getBanners) // GET request should now be handled by the implemented getBanners
  .post(uploadBannerImageMiddleware, createBanner); // upload runs BEFORE createBanner
console.log("[Banner Router] Defined GET, POST for '/'");

router
  .route("/:id")
  .get(getBannerById)
  .put(uploadBannerImageMiddleware, updateBanner) // upload runs BEFORE updateBanner
  .delete(deleteBanner);
console.log("[Banner Router] Defined GET, PUT, DELETE for '/:id'");

router.patch("/:id/status", toggleBannerStatus); // PATCH doesn't need image upload middleware
console.log("[Banner Router] Defined PATCH for '/:id/status'");

export default router;
