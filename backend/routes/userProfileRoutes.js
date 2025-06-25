// backend/routes/userProfileRoutes.js
import express from "express";
import * as userProfileController from "../controllers/userProfileController.js";
import { verifyToken as protectUser } from "../middleware/userAuthMiddleware.js"; // Ensure this path is correct
import { uploadUserProfile } from "../config/multerConfig.js"; // Ensure this path and function name are correct
import {
  validateUserProfileUpdate,
  validateVerifyOtpAndUpdatePhone, // <-- IMPORT NEW VALIDATOR
  handleValidationErrors,
} from "../middleware/validators.js"; // Ensure this path is correct

const router = express.Router();

router.use(protectUser); // Apply auth to all profile routes

// Existing Routes (Do Not Change/Remove)
router.get("/", userProfileController.getUserProfile);

router.put(
  "/",
  validateUserProfileUpdate,
  handleValidationErrors,
  userProfileController.updateUserProfile
);

router.post(
  "/picture",
  uploadUserProfile, // Multer middleware for single file upload
  userProfileController.uploadProfilePicture
);

// New route for verifying OTP and updating phone (e.g., after Google signup)
router.put(
  "/phone-verification", // Changed from /phone to be more specific
  validateVerifyOtpAndUpdatePhone, // <-- USE NEW VALIDATOR
  handleValidationErrors,
  userProfileController.verifyOtpAndUpdatePhoneNumber
);

// --- EXISTING NEW ROUTES FOR REFERRAL AND WALLET ---
router.get("/referral-code", userProfileController.getReferralCode); // protectUser middleware is already applied by router.use()
router.get("/wallet", userProfileController.getWalletDetails); // protectUser middleware is already applied by router.use()

// --- NEW ROUTE FOR LOYALTY POINTS ---
router.get("/loyalty", userProfileController.getLoyaltyDetails); // protectUser middleware is already applied by router.use()
// --- END NEW ROUTES ---

export default router;
