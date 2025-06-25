// backend/routes/addressRoutes.js
import express from "express";
import {
  getUserAddresses, // Corrected import name
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "../controllers/addressController.js";
// CHANGED IMPORT NAME
import { verifyToken } from "../middleware/userAuthMiddleware.js"; // <--- Changed from protect to verifyToken

const router = express.Router();

router
  .route("/")
  .get(verifyToken, getUserAddresses) // Use verifyToken
  .post(verifyToken, addAddress); // Use verifyToken

router
  .route("/:addressId")
  .put(verifyToken, updateAddress) // Use verifyToken
  .delete(verifyToken, deleteAddress); // Use verifyToken

router.route("/:addressId/default").put(verifyToken, setDefaultAddress); // Use verifyToken

export default router;
