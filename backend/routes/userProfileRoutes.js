// backend/routes/userProfileRoutes.js
import express from "express";
import * as userProfileController from "../controllers/userProfileController.js";
import { verifyToken as protectUser } from "../middleware/userAuthMiddleware.js"; // User JWT auth
import { uploadUserProfile } from "../config/multerConfig.js"; // Multer for user profile pics
import {
  validateUserProfileUpdate,
  handleValidationErrors,
} from "../middleware/validators.js";

const router = express.Router();

// Apply user authentication middleware to all routes in this file
router.use(protectUser);

// GET /api/profile - Get current user's profile
router.get("/", userProfileController.getUserProfile);

// PUT /api/profile - Update current user's profile
router.put(
  "/",
  validateUserProfileUpdate,
  handleValidationErrors,
  userProfileController.updateUserProfile
);

// POST /api/profile/picture - Upload profile picture
router.post(
  "/picture",
  uploadUserProfile,
  userProfileController.uploadProfilePicture
);
// Note: Multer error handling is implicitly done by the global errorHandler now

export default router;
