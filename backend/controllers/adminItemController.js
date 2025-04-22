// backend/controllers/adminItemController.js
import mongoose from "mongoose";
import asyncHandler from "express-async-handler";
import path from "path";
import Item from "../models/Item.js"; // Changed from Product
import Category from "../models/Category.js";
import { deleteFile } from "../config/multerConfig.js";

// GET /api/admin/items - Get ALL items (for admin panel)
export const getAllAdminItems = asyncHandler(async (req, res) => {
  console.log("[Ctrl Admin Item] Fetching all items for admin"); // Changed Log Prefix
  const items = await Item.find({}) // Changed to Item
    .populate("category", "name slug")
    .populate("createdBy", "username email")
    .sort({ createdAt: -1 });
  res.status(200).json({ success: true, items }); // Changed to items
});

// GET /api/admin/items/:id - Get single item (for admin panel)
export const getAdminItemById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const item = await Item.findById(id) // Changed to Item
    .populate("category", "name slug")
    .populate("createdBy", "username email");
  if (!item) {
    res.status(404);
    throw new Error("Item not found."); // Changed message
  }
  res.status(200).json({ success: true, item }); // Changed to item
});

// POST /api/admin/items - Create new item
// Assume uploadItemImage middleware runs first (adjust if needed)
export const createAdminItem = asyncHandler(async (req, res) => {
  const { name, sku, description, price, stock, categoryId, status } = req.body;
  const adminId = req.user._id;
  let uploadedFilePath = null;

  // Construct potential path early
  if (req.file) {
    // *** Use "items" directory for images ***
    uploadedFilePath = path
      .join("items", req.file.filename)
      .replace(/\\/g, "/");
  }

  // Validate category
  const categoryExists = await Category.findById(categoryId);
  if (!categoryExists) {
    if (uploadedFilePath) await deleteFile(uploadedFilePath);
    res.status(400);
    throw new Error(`Category with ID ${categoryId} not found.`);
  }

  // Validate SKU uniqueness
  const trimmedSku = sku?.trim();
  if (trimmedSku) {
    const skuExists = await Item.findOne({ sku: trimmedSku }); // Changed to Item
    if (skuExists) {
      if (uploadedFilePath) await deleteFile(uploadedFilePath);
      res.status(409);
      throw new Error(`Item with SKU "${trimmedSku}" already exists.`); // Changed message
    }
  }

  const newItem = new Item({
    // Changed to Item
    name: name.trim(),
    sku: trimmedSku || null,
    description: description?.trim() || "",
    price: parseFloat(price),
    stock: parseInt(stock, 10),
    category: categoryId,
    imagePath: uploadedFilePath,
    status: status || "active",
    createdBy: adminId,
  });

  try {
    const savedItem = await newItem.save(); // Changed variable name
    const populatedItem = await Item.findById(savedItem._id) // Changed to Item
      .populate("category", "name slug")
      .populate("createdBy", "username email");

    res.status(201).json({ success: true, item: populatedItem }); // Changed to item
  } catch (saveError) {
    if (uploadedFilePath) {
      console.error(
        `[Ctrl Admin Item] Save failed for ${name}. Cleaning up image: ${uploadedFilePath}`
      );
      await deleteFile(uploadedFilePath);
    }
    throw saveError;
  }
});

// PUT /api/admin/items/:id - Update item
// Assume uploadItemImage middleware runs first
export const updateAdminItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, sku, description, price, stock, categoryId, status } = req.body;
  let newRelativePath = null;

  if (req.file) {
    // *** Use "items" directory for images ***
    newRelativePath = path.join("items", req.file.filename).replace(/\\/g, "/");
  }

  const item = await Item.findById(id); // Changed to Item
  if (!item) {
    if (newRelativePath) await deleteFile(newRelativePath);
    res.status(404);
    throw new Error("Item not found."); // Changed message
  }

  let hasChanges = false;

  // Prepare updates (variable names remain the same, model field is item)
  if (name !== undefined && item.name !== name.trim()) {
    item.name = name.trim();
    hasChanges = true;
  }
  if (description !== undefined && item.description !== description.trim()) {
    item.description = description.trim();
    hasChanges = true;
  }
  const newPrice = Number(price);
  if (price !== undefined && !isNaN(newPrice) && item.price !== newPrice) {
    item.price = newPrice;
    hasChanges = true;
  }
  const newStock = parseInt(stock, 10);
  if (stock !== undefined && !isNaN(newStock) && item.stock !== newStock) {
    item.stock = newStock;
    hasChanges = true;
  }
  if (status !== undefined && item.status !== status) {
    item.status = status;
    hasChanges = true;
  }

  // Update Category
  if (categoryId !== undefined && item.category.toString() !== categoryId) {
    const categoryExists = await Category.findById(categoryId);
    if (!categoryExists) {
      if (newRelativePath) await deleteFile(newRelativePath);
      res.status(400);
      throw new Error(`Category with ID ${categoryId} not found.`);
    }
    item.category = categoryId;
    hasChanges = true;
  }

  // Update SKU
  const newSkuTrimmed = sku?.trim() || null;
  if (sku !== undefined && newSkuTrimmed !== item.sku) {
    if (newSkuTrimmed) {
      const skuExists = await Item.findOne({
        sku: newSkuTrimmed,
        _id: { $ne: id },
      }); // Changed to Item
      if (skuExists) {
        if (newRelativePath) await deleteFile(newRelativePath);
        res.status(409);
        throw new Error(`Item with SKU "${newSkuTrimmed}" already exists.`);
      } // Changed message
    }
    item.sku = newSkuTrimmed;
    hasChanges = true;
  }

  // Handle image update
  let oldImagePath = item.imagePath;
  if (newRelativePath) {
    item.imagePath = newRelativePath;
    hasChanges = true;
  }

  if (hasChanges) {
    try {
      const updatedItem = await item.save(); // Changed variable name

      if (
        newRelativePath &&
        oldImagePath &&
        oldImagePath !== updatedItem.imagePath
      ) {
        console.log(`[Ctrl Admin Item] Deleting old image: ${oldImagePath}`); // Changed Log Prefix
        await deleteFile(oldImagePath);
      }

      const populatedItem = await Item.findById(updatedItem._id) // Changed to Item
        .populate("category", "name slug")
        .populate("createdBy", "username email");
      res.status(200).json({ success: true, item: populatedItem }); // Changed to item
    } catch (saveError) {
      if (newRelativePath) {
        console.error(
          `[Ctrl Admin Item] Save failed for ${item.name}. Cleaning up new image: ${newRelativePath}`
        ); // Changed Log Prefix
        await deleteFile(newRelativePath);
      }
      throw saveError;
    }
  } else {
    if (newRelativePath) {
      console.log(
        `[Ctrl Admin Item] No changes detected for ${item.name}. Cleaning up unused upload: ${newRelativePath}`
      ); // Changed Log Prefix
      await deleteFile(newRelativePath);
    }

    const currentPopulated = await Item.findById(id) // Changed to Item
      .populate("category", "name slug")
      .populate("createdBy", "username email");
    res
      .status(200)
      .json({
        success: true,
        message: "No changes detected.",
        item: currentPopulated,
      }); // Changed to item
  }
});

// DELETE /api/admin/items/:id - Delete single item
export const deleteAdminItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const item = await Item.findById(id); // Changed to Item
  if (!item) {
    res.status(404);
    throw new Error("Item not found."); // Changed message
  }

  await item.deleteOne(); // Trigger hooks

  res
    .status(200)
    .json({
      success: true,
      message: `Item "${item.name}" scheduled for deletion.`,
    }); // Changed message
});

// POST /api/admin/items/delete-multiple - Delete multiple items
export const deleteMultipleAdminItems = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400);
    throw new Error("Invalid request: 'ids' array is required.");
  }

  const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (validIds.length === 0) {
    res.status(400);
    throw new Error("No valid item IDs provided.");
  } // Changed message

  let deletedCount = 0,
    errors = [],
    notFoundCount = 0;
  const itemNames = []; // Changed variable name

  for (const id of validIds) {
    try {
      const item = await Item.findById(id); // Changed to Item
      if (item) {
        itemNames.push(item.name);
        await item.deleteOne();
        deletedCount++;
      } else {
        notFoundCount++;
      }
    } catch (error) {
      console.error(`Error processing item ${id} for deletion:`, error); // Changed message
      errors.push({ id: id, message: error.message || "Deletion failed" });
    }
  }

  let message = `${deletedCount} items scheduled for deletion.`; // Changed message
  if (itemNames.length > 0)
    message = `Items "${itemNames.join('", "')}" scheduled for deletion.`; // Changed message
  if (notFoundCount > 0) message += ` ${notFoundCount} not found.`;
  if (errors.length > 0) message += ` ${errors.length} failed.`;

  const status = errors.length > 0 ? (deletedCount > 0 ? 207 : 500) : 200;

  res
    .status(status)
    .json({
      success: errors.length === 0,
      message,
      deletedCount,
      notFoundCount,
      errors,
    });
});
