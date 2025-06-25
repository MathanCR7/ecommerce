// backend/routes/paymentRoutes.js
import express from "express";
import {
  createRazorpayOrder,
  verifyRazorpayPayment, // Use the dedicated verification handler
} from "../controllers/paymentController.js";
import { verifyToken as protectUser } from "../middleware/userAuthMiddleware.js";

const router = express.Router();

// Route to initiate a Razorpay order (get order_id from backend)
router.post("/razorpay/order", protectUser, createRazorpayOrder);

// Route to verify the payment signature and create the order document after payment success
router.post("/razorpay/verify", protectUser, verifyRazorpayPayment);

export default router;
