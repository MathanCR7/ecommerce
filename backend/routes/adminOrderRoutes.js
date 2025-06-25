// ========================================================================
// FILE: backend/routes/adminOrderRoutes.js
// ========================================================================
import express from "express";
const router = express.Router();
import {
  getOrdersByStatus, // Controller for fetching lists of orders
  getOrderById, // Controller for fetching a single order by ID
  updateOrderStatus, // Controller for updating order status
  updateOrderDeliveryPreference,
  getLatestAdminOrder, // Controller for updating delivery details
} from "../controllers/adminOrderController.js"; // Import controllers

// Assuming this middleware exists and correctly verifies admin authentication
// This middleware should check for a valid token AND verify the user associated with the token is an admin.
import { protect as protectAdmin } from "../middleware/adminAuthMiddleware.js";

// Apply the admin protection middleware to all routes defined in this router
// This ensures only authenticated and authorized admins can access these endpoints.
router.use(protectAdmin);

router.route("/latest").get(getLatestAdminOrder);
// @desc    Get list of orders with status filter, search, date range, and pagination
// @route   GET /api/admin/orders
// @access  Private/Admin
router.route("/").get(getOrdersByStatus);

// @desc    Get a single order by its ID
// @route   GET /api/admin/orders/:id
// @access  Private/Admin
// This route uses a dynamic parameter ':id'. It should be placed after any static routes like '/' or '/pending'.
router.route("/:id").get(getOrderById);

// @desc    Update the status of a specific order
// @route   PUT /api/admin/orders/:id/status
// @access  Private/Admin
router.route("/:id/status").put(updateOrderStatus);

// @desc    Update delivery date/time preference for a specific order
// @route   PUT /api/admin/orders/:id/delivery
// @access  Private/Admin
router.route("/:id/delivery").put(updateOrderDeliveryPreference);

// Optional: If you had a specific need for a separate endpoint for pending orders only,
// you would define it here, likely before the dynamic ':id' route.
// router.route("/pending").get(getPendingOrders); // Assuming getPendingOrders controller exists

export default router;
