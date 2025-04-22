// backend/routes/userAuthRoutes.js
import express from "express";
import * as userAuthController from "../controllers/userAuthController.js";
import { verifyToken as protectUser } from "../middleware/userAuthMiddleware.js";
import {
  validateUserSignup,
  validateUserLogin,
  validateUserSendOtp, // *** Ensure this matches the export in validators.js ***
  //   validateUserVerifyOtp, // Need this if adding verify endpoint
  handleValidationErrors,
} from "../middleware/validators.js";

const router = express.Router();

// POST /api/auth/check-existing
router.post("/check-existing", userAuthController.checkExistingUser);

// POST /api/auth/send-otp
router.post(
  "/send-otp",
  validateUserSendOtp,
  handleValidationErrors,
  userAuthController.sendUserOtp
); // *** Use correct validator ***

// POST /api/auth/signup
router.post(
  "/signup",
  validateUserSignup,
  handleValidationErrors,
  userAuthController.signupUser
);

// POST /api/auth/login
router.post(
  "/login",
  validateUserLogin,
  handleValidationErrors,
  userAuthController.loginUser
);

// POST /api/auth/logout
router.post("/logout", userAuthController.logoutUser);

// --- Google OAuth Routes ---
router.get("/google", userAuthController.googleAuthInitiate);
router.get("/google/callback", userAuthController.googleAuthCallback);

// GET /api/auth/status - Check if user is logged in (protected by JWT)
router.get("/status", protectUser, userAuthController.checkUserAuthStatus); // *** Ensure this is added ***

export default router;
