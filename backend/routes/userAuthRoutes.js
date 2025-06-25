// backend/routes/userAuthRoutes.js
import express from "express";
import * as userAuthController from "../controllers/userAuthController.js";
import { verifyToken as protectUser } from "../middleware/userAuthMiddleware.js";
import {
  validateUserSignup,
  validateUserLogin,
  validateUserSendOtp,
  validateChangePassword,
  validateForgotPassword,
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
);

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

// GET /api/auth/status - Check if user is logged in
router.get("/status", protectUser, userAuthController.checkUserAuthStatus);

// --- Password Management Routes ---

// POST /api/auth/change-password (User must be logged in)
router.post(
  "/change-password",
  protectUser,
  validateChangePassword,
  handleValidationErrors,
  userAuthController.changePassword
);

// POST /api/auth/forgot-password (Publicly accessible)
router.post(
  "/forgot-password",
  validateForgotPassword,
  handleValidationErrors,
  userAuthController.forgotPassword
);

export default router;
