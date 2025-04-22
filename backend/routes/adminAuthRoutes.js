// backend/routes/adminAuthRoutes.js
import express from "express";
import {
  sendAdminOtp,
  verifyAdminOtp,
  registerAdmin,
  loginAdmin,
  logoutAdmin,
  checkAdminAuthStatus,
} from "../controllers/adminAuthController.js";
import {
  validateAdminSendOtp, // Use specific admin validator
  validateAdminVerifyOtp, // Use specific admin validator
  validateAdminRegister,
  validateAdminLogin,
  handleValidationErrors,
} from "../middleware/validators.js";
import { protect as protectAdmin } from "../middleware/adminAuthMiddleware.js";

const router = express.Router();

// POST /api/admin/auth/send-otp
router.post(
  "/send-otp",
  validateAdminSendOtp,
  handleValidationErrors,
  sendAdminOtp
);
// POST /api/admin/auth/verify-otp
router.post(
  "/verify-otp",
  validateAdminVerifyOtp,
  handleValidationErrors,
  verifyAdminOtp
);
// POST /api/admin/auth/register
router.post(
  "/register",
  validateAdminRegister,
  handleValidationErrors,
  registerAdmin
);
// POST /api/admin/auth/login
router.post("/login", validateAdminLogin, handleValidationErrors, loginAdmin);
// GET /api/admin/auth/status
router.get("/status", checkAdminAuthStatus);
// POST /api/admin/auth/logout
router.post("/logout", protectAdmin, logoutAdmin);

export default router;
