// backend/routes/adminCustomerRoutes.js
import express from "express";
import {
  getAllCustomers,
  getCustomerDetailsById, // Ensure this is imported
} from "../controllers/adminCustomerController.js";
// Make sure this path and middleware are correct for your project
import { protect as protectAdmin } from "../middleware/adminAuthMiddleware.js"; // Ensure this middleware calls next() or sends a response

const router = express.Router();

// Route for GET /api/admin/customers (handles search, pagination)
router.route("/").get(protectAdmin, getAllCustomers);

// Route for GET /api/admin/customers/:id
// This is the route that was causing the 404. Ensure it's correctly defined and the controller is linked.
router.route("/:id").get(protectAdmin, getCustomerDetailsById);

// Example for a dedicated search endpoint if needed, though getAllCustomers handles search via query param.
// router.route("/search").get(protectAdmin, someOtherSearchController);

export default router;
