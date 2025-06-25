// backend/routes/adminCouponRoutes.js
import express from "express";
import {
  createCoupon,
  getAllCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
  updateCouponStatus,
} from "../controllers/couponController.js";

// Assuming your admin authentication middleware is correctly set up
// For example: import { protect, admin } from "../middleware/authMiddleware.js";
// If you have a single middleware for admin protection:
import { protect as protectAdmin } from "../middleware/adminAuthMiddleware.js"; // Adjust if your middleware is named differently or structured otherwise

const router = express.Router();

// Apply admin protection to all routes in this file
// If you have separate protect and admin middlewares:
// router.use(protect);
// router.use(admin);
// If you have a single middleware that checks for auth AND admin role:
router.use(protectAdmin);

router.route("/").get(getAllCoupons).post(createCoupon);

router.route("/:id").get(getCouponById).put(updateCoupon).delete(deleteCoupon);

router.route("/:id/status").patch(updateCouponStatus);

export default router;
