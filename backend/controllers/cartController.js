// backend/controllers/cartController.js
import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import Item from "../models/Item.js";

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Private
export const getCart = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: "cart.item",
    model: "Item",
    select:
      "name price images stock manageStock mrp discountType discountValue unit slug isTaxable cgstRate sgstRate", // Added isTaxable, cgstRate, sgstRate
  });

  if (user) {
    // Filter out items that might have been deleted from the DB but are still in user's cart
    const validCartItems = user.cart.filter(
      (cartItem) => cartItem.item !== null
    );
    if (validCartItems.length !== user.cart.length) {
      // If there were invalid items, update the user's cart
      user.cart = validCartItems;
      await user.save();
    }

    const cartToSend = validCartItems.map((cartItem) => {
      const itemDetail = cartItem.item;
      let displayImagePath = "/assets/images/placeholder-item.png"; // Default placeholder
      if (
        itemDetail &&
        itemDetail.images &&
        Array.isArray(itemDetail.images) &&
        itemDetail.images.length > 0
      ) {
        const primaryImg = itemDetail.images.find((img) => img.isPrimary);
        // Return the path stored in the DB (relative to uploads)
        displayImagePath = primaryImg
          ? primaryImg.path
          : itemDetail.images[0].path;
      } else if (itemDetail && itemDetail.imagePath) {
        // Fallback for older structure if needed
        displayImagePath = itemDetail.imagePath;
      }

      return {
        _id: itemDetail._id.toString(), // item's actual _id
        cartItemId: cartItem._id.toString(), // id of the item within the cart subdocument array
        name: itemDetail.name,
        price: itemDetail.price,
        mrp: itemDetail.mrp,
        imagePath: displayImagePath, // This will be the relative path from the DB
        quantity: cartItem.quantity,
        stock: itemDetail.manageStock ? itemDetail.stock : Infinity,
        unit: itemDetail.unit,
        slug: itemDetail.slug,
        isTaxable: itemDetail.isTaxable, // Added
        cgstRate: itemDetail.cgstRate, // Added
        sgstRate: itemDetail.sgstRate, // Added
        manageStock: itemDetail.manageStock, // Pass manageStock for FE logic
      };
    });

    res.json({ success: true, cart: cartToSend });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

// @desc    Add item to cart or update quantity
// @route   POST /api/cart
// @access  Private
export const addToCart = asyncHandler(async (req, res) => {
  const { itemId, quantity } = req.body;
  const userId = req.user._id;

  if (!itemId || !quantity || quantity < 1) {
    res.status(400);
    throw new Error("Item ID and a valid quantity are required.");
  }

  const item = await Item.findById(itemId);
  if (!item || item.status !== "active") {
    res.status(404);
    throw new Error("Item not found or not available.");
  }

  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const itemStock = item.manageStock ? item.stock : Infinity;
  // Check total quantity requested including existing cart quantity
  const existingCartItem = user.cart.find(
    (cartItem) => cartItem.item.toString() === itemId
  );
  const currentCartQuantity = existingCartItem ? existingCartItem.quantity : 0;
  const newTotalQuantity = quantity; // Assuming 'quantity' is the *target* quantity, not the amount to add

  if (newTotalQuantity > itemStock) {
    res.status(400);
    throw new Error(
      `Cannot add ${item.name}. Only ${itemStock} units are available. Your current cart has ${currentCartQuantity}.`
    );
  }

  if (existingCartItem) {
    // Item exists, update quantity
    existingCartItem.quantity = newTotalQuantity; // Set to target quantity
  } else {
    // Item does not exist, add new
    if (newTotalQuantity === 0) {
      // Don't add if target quantity is 0
      res.status(400);
      throw new Error("Cannot add 0 quantity to cart.");
    }
    user.cart.push({ item: itemId, quantity: newTotalQuantity });
  }

  await user.save();
  // Fetch the updated cart to send back with populated item details
  const updatedUser = await User.findById(userId).populate({
    path: "cart.item",
    model: "Item",
    select:
      "name price images stock manageStock mrp discountType discountValue unit slug isTaxable cgstRate sgstRate", // Added isTaxable, cgstRate, sgstRate
  });

  const cartToSend = updatedUser.cart
    .filter((ci) => ci.item !== null)
    .map((cartItem) => {
      const itemDetail = cartItem.item;
      let displayImagePath = "/assets/images/placeholder-item.png"; // Default placeholder
      if (
        itemDetail &&
        itemDetail.images &&
        Array.isArray(itemDetail.images) &&
        itemDetail.images.length > 0
      ) {
        const primaryImg = itemDetail.images.find((img) => img.isPrimary);
        displayImagePath = primaryImg
          ? primaryImg.path
          : itemDetail.images[0].path;
      } else if (itemDetail && itemDetail.imagePath) {
        // Fallback for older structure
        displayImagePath = itemDetail.imagePath;
      }
      return {
        _id: itemDetail._id.toString(),
        cartItemId: cartItem._id.toString(),
        name: itemDetail.name,
        price: itemDetail.price,
        mrp: itemDetail.mrp,
        imagePath: displayImagePath,
        quantity: cartItem.quantity,
        stock: itemDetail.manageStock ? itemDetail.stock : Infinity,
        unit: itemDetail.unit,
        slug: itemDetail.slug,
        isTaxable: itemDetail.isTaxable, // Added
        cgstRate: itemDetail.cgstRate, // Added
        sgstRate: itemDetail.sgstRate, // Added
        manageStock: itemDetail.manageStock, // Pass manageStock for FE logic
      };
    });

  res.status(200).json({
    success: true,
    cart: cartToSend,
    message: "Cart updated successfully.",
  });
});

// @desc    Remove item from cart
// @route   DELETE /api/cart/:itemId
// @access  Private
export const removeFromCart = asyncHandler(async (req, res) => {
  // This itemId is the actual Item._id, NOT the cart subdocument _id
  const { itemId } = req.params;
  const userId = req.user._id;

  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const initialCartLength = user.cart.length;
  // Filter out the item by its actual item._id
  user.cart = user.cart.filter(
    (cartItem) => cartItem.item.toString() !== itemId
  );

  if (user.cart.length === initialCartLength) {
    // Item was not in the cart by its actual _id
    return res
      .status(404)
      .json({ success: false, message: "Item not found in cart." });
  }

  await user.save();
  // Fetch the updated cart to send back
  const updatedUser = await User.findById(userId).populate({
    path: "cart.item",
    model: "Item",
    select:
      "name price images stock manageStock mrp discountType discountValue unit slug isTaxable cgstRate sgstRate", // Added isTaxable, cgstRate, sgstRate
  });

  const cartToSend = updatedUser.cart
    .filter((ci) => ci.item !== null)
    .map((cartItem) => {
      const itemDetail = cartItem.item;
      let displayImagePath = "/assets/images/placeholder-item.png"; // Default placeholder
      if (
        itemDetail &&
        itemDetail.images &&
        Array.isArray(itemDetail.images) &&
        itemDetail.images.length > 0
      ) {
        const primaryImg = itemDetail.images.find((img) => img.isPrimary);
        displayImagePath = primaryImg
          ? primaryImg.path
          : itemDetail.images[0].path;
      } else if (itemDetail && itemDetail.imagePath) {
        // Fallback for older structure
        displayImagePath = itemDetail.imagePath;
      }
      return {
        _id: itemDetail._id.toString(),
        cartItemId: cartItem._id.toString(),
        name: itemDetail.name,
        price: itemDetail.price,
        mrp: itemDetail.mrp,
        imagePath: displayImagePath,
        quantity: cartItem.quantity,
        stock: itemDetail.manageStock ? itemDetail.stock : Infinity,
        unit: itemDetail.unit,
        slug: itemDetail.slug,
        isTaxable: itemDetail.isTaxable, // Added
        cgstRate: itemDetail.cgstRate, // Added
        sgstRate: itemDetail.sgstRate, // Added
        manageStock: itemDetail.manageStock, // Pass manageStock for FE logic
      };
    });

  res.status(200).json({
    success: true,
    cart: cartToSend,
    message: "Item removed from cart.",
  });
});

// @desc    Clear user's cart
// @route   DELETE /api/cart
// @access  Private
export const clearCart = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const user = await User.findById(userId);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  user.cart = [];
  await user.save();
  res.status(200).json({ success: true, cart: [], message: "Cart cleared." });
});
