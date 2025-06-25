// backend/routes/wishlistRoutes.js
import express from "express";
import {
  getWishlist,
  toggleWishlist,
} from "../controllers/wishlistController.js";
import { verifyToken as protectUser } from "../middleware/userAuthMiddleware.js"; // Assuming user authentication middleware is named verifyToken and aliased

const router = express.Router();

// Route to get the user's wishlist
// GET /api/wishlist
router.route("/").get(protectUser, getWishlist);

// Route to toggle an item in the wishlist (add or remove)
// POST /api/wishlist/toggle/:itemId
// Using POST because it modifies the user's wishlist resource
router.route("/toggle/:itemId").post(protectUser, toggleWishlist);

// Optional: If you want a dedicated DELETE route to remove an item
// router.route('/:itemId').delete(protectUser, removeItemFromWishlist);
// (You would need to implement removeItemFromWishlist in wishlistController.js)

export default router;
