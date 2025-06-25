// backend/routes/posOrderRoutes.js
import express from "express";
import {
  createPosOrder,
  getPosOrders,
  getPosOrderById,
} from "../controllers/posOrderController.js";
import { protect as protectAdmin } from "../middleware/adminAuthMiddleware.js";

const router = express.Router();

router
  .route("/")
  .post(protectAdmin, createPosOrder)
  .get(protectAdmin, getPosOrders);

router.route("/:id").get(protectAdmin, getPosOrderById);

export default router;
