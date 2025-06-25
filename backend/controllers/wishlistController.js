// backend/controllers/wishlistController.js
import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import Item from "../models/Item.js";

// @desc    Get user's wishlist
// @route   GET /api/wishlist
// @access  Private
export const getWishlist = asyncHandler(async (req, res) => {
  // Find the user and populate their wishlist with item details
  const user = await User.findById(req.user._id).populate({
    path: "wishlist.item",
    model: "Item",
    // Select fields needed for wishlist display (similar to cart, but without quantity)
    select:
      "name price images slug stock manageStock mrp discountType discountValue unit",
  });

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Filter out wishlist items where the item might have been deleted from the DB
  const validWishlistItems = user.wishlist.filter(
    (wishlistItem) => wishlistItem.item !== null
  );

  // If invalid items were found and filtered, update the user's wishlist in the DB
  if (validWishlistItems.length !== user.wishlist.length) {
    user.wishlist = validWishlistItems;
    await user.save();
  }

  // Structure the wishlist data to send to the frontend
  const wishlistToSend = validWishlistItems.map((wishlistItem) => {
    const itemDetail = wishlistItem.item; // This is the populated item object

    // Determine the primary image path, similar to cart
    let displayImagePath = "/assets/images/placeholder-item.png"; // Default placeholder
    if (itemDetail.images && itemDetail.images.length > 0) {
      const primaryImg = itemDetail.images.find((img) => img.isPrimary);
      displayImagePath = primaryImg
        ? primaryImg.path
        : itemDetail.images[0].path; // Use primary, or first if no primary
    } else if (itemDetail.imagePath) {
      // Fallback for older structure with single imagePath field
      displayImagePath = itemDetail.imagePath;
    }

    return {
      _id: itemDetail._id.toString(), // Item's actual ID
      wishlistItemId: wishlistItem._id.toString(), // ID of the subdocument in the wishlist array
      name: itemDetail.name,
      price: itemDetail.price,
      mrp: itemDetail.mrp,
      imagePath: displayImagePath, // This will be a relative path like 'items/image.jpg'
      stock: itemDetail.manageStock ? itemDetail.stock : Infinity, // Handle infinite stock
      slug: itemDetail.slug,
      unit: itemDetail.unit,
      addedAt: wishlistItem.addedAt, // When it was added to wishlist
      // Include discount info if needed for UI badges etc.
      discountType: itemDetail.discountType,
      discountValue: itemDetail.discountValue,
    };
  });

  res.json({ success: true, wishlist: wishlistToSend });
});

// @desc    Toggle item in wishlist (add if not exists, remove if exists)
// @route   POST /api/wishlist/toggle/:itemId
// @access  Private
export const toggleWishlist = asyncHandler(async (req, res) => {
  const { itemId } = req.params; // Get item ID from URL parameters
  const userId = req.user._id; // Get user ID from authenticated user

  // Validate the item exists and is active
  const item = await Item.findById(itemId);
  if (!item || item.status !== "active") {
    res.status(404);
    throw new Error("Item not found or not available.");
  }

  // Find the user
  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Check if the item is already in the user's wishlist
  const existingWishlistItemIndex = user.wishlist.findIndex(
    (wishlistItem) => wishlistItem.item.toString() === itemId
  );

  let actionMessage;
  if (existingWishlistItemIndex > -1) {
    // Item exists in wishlist, remove it
    user.wishlist.splice(existingWishlistItemIndex, 1);
    actionMessage = "Item removed from wishlist.";
  } else {
    // Item does not exist, add it
    user.wishlist.push({ item: itemId, addedAt: new Date() }); // Store item ID and add timestamp
    actionMessage = "Item added to wishlist.";
  }

  // Save the updated user document
  await user.save();

  // Fetch the updated user document with the wishlist populated, similar to getWishlist
  const updatedUser = await User.findById(userId).populate({
    path: "wishlist.item",
    model: "Item",
    select:
      "name price images slug stock manageStock mrp discountType discountValue unit",
  });

  // Structure the updated wishlist data to send back
  const wishlistToSend = updatedUser.wishlist
    .filter((wi) => wi.item !== null) // Filter out any potential null items just in case
    .map((wishlistItem) => {
      const itemDetail = wishlistItem.item;
      let displayImagePath = "/assets/images/placeholder-item.png";
      if (itemDetail.images && itemDetail.images.length > 0) {
        const primaryImg = itemDetail.images.find((img) => img.isPrimary);
        displayImagePath = primaryImg
          ? primaryImg.path
          : itemDetail.images[0].path;
      } else if (itemDetail.imagePath) {
        displayImagePath = itemDetail.imagePath;
      }
      return {
        _id: itemDetail._id.toString(),
        wishlistItemId: wishlistItem._id.toString(),
        name: itemDetail.name,
        price: itemDetail.price,
        mrp: itemDetail.mrp,
        imagePath: displayImagePath,
        stock: itemDetail.manageStock ? itemDetail.stock : Infinity,
        slug: itemDetail.slug,
        unit: itemDetail.unit,
        addedAt: wishlistItem.addedAt,
        discountType: itemDetail.discountType,
        discountValue: itemDetail.discountValue,
      };
    });

  res
    .status(200)
    .json({ success: true, wishlist: wishlistToSend, message: actionMessage });
});

// Note: A separate route for removing might be redundant if toggle handles it,
// but you could add one if needed (e.g., DELETE /api/wishlist/:itemId)
