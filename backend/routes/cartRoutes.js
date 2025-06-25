import express from "express";
import {
  getCart,
  addToCart,
  removeFromCart,
  clearCart,
} from "../controllers/cartController.js";
import { verifyToken as protectUser } from "../middleware/userAuthMiddleware.js";

const router = express.Router();

router
  .route("/")
  .get(protectUser, getCart)
  .post(protectUser, addToCart) // Used for both add and update quantity
  .delete(protectUser, clearCart);

router.route("/:itemId").delete(protectUser, removeFromCart);
// For specific quantity update, addToCart can handle it by sending new total quantity
// Or you can add a PUT route: .put(protectUser, updateCartItemQuantity) if preferred

export default router;
