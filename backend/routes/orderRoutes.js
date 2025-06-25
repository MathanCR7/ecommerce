// ========================================================================
// FILE: backend/routes/orderRoutes.js
// ========================================================================
import express from "express";
import {
  createCODOrder, // User route for creating COD orders
  getOrderById, // User route for getting a specific order by ID
  getMyOrders,
  checkDeliveryEligibilityController, // User route for getting logged in user's orders
  // Admin routes below are REMOVED from here to avoid conflict
  // getAllOrdersAdmin,
  // updateOrderStatusAdmin,
} from "../controllers/orderController.js"; // Import user-specific controllers
import { verifyToken as protectUser } from "../middleware/userAuthMiddleware.js"; // Assuming this is your user auth middleware

const router = express.Router();

// @desc    Create new order (primarily for COD)
// @route   POST /api/orders
// @access  Private (User)
router.route("/").post(protectUser, createCODOrder);

router
  .route("/validate-delivery-address")
  .post(protectUser, checkDeliveryEligibilityController);

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private (User)
router.route("/myorders").get(protectUser, getMyOrders);

// @desc    Get a specific order by ID for the logged in user
// @route   GET /api/orders/:id
// @access  Private (User)
// Note: This route should be checked to ensure the order belongs to the user (implemented in controller)
router.route("/:id").get(protectUser, getOrderById);

// --- Admin Routes (REMOVED from this user-facing file) ---
// These routes should only be defined and handled in the dedicated adminOrderRoutes.js
// router.route("/admin").get(protectAdmin, getAllOrdersAdmin); // REMOVED
// router.route("/admin/:id/status").put(protectAdmin, updateOrderStatusAdmin); // REMOVED
// Add any other admin routes as needed in adminOrderRoutes.js

export default router;
