import express from "express";
import {
  getPublicCoupons,
  validateCoupon,
} from "../controllers/publicCouponController.js";
// import { verifyToken as protectUser } from "../middleware/userAuthMiddleware.js"; // If validate needs auth

const router = express.Router();

router.route("/").get(getPublicCoupons);
router.route("/validate").post(validateCoupon); // Could be protectUser if validation is user-specific

export default router;
