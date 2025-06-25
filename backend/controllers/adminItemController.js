// backend/controllers/adminItemController.js
import mongoose from "mongoose";
import asyncHandler from "express-async-handler";
import path from "path";
import Item from "../models/Item.js";
import Category from "../models/Category.js";
import { deleteFile, UPLOADS_DIR_NAME } from "../config/multerConfig.js";

// Helper to parse FormData fields that might be JSON or boolean strings
const parseFormDataField = (field) => {
  if (field === undefined || field === null) return undefined;
  if (field === "true") return true;
  if (field === "false") return false;
  try {
    return JSON.parse(field);
  } catch (e) {
    // If not JSON, check if it's a number string before returning as is
    if (
      typeof field === "string" &&
      !isNaN(parseFloat(field)) &&
      isFinite(field)
    ) {
      // It could be a number string that wasn't parsed by JSON.parse, e.g., "123"
      // Let validator's .toFloat() or .toInt() handle final conversion
    }
    return field; // Return as string for further validation/parsing
  }
};

// Helper to safely convert a value to a string for trimming, or return empty if not applicable
const safeTrim = (value) => {
  if (typeof value === "string") {
    return value.trim();
  }
  if (value !== undefined && value !== null) {
    return String(value).trim(); // Convert to string then trim
  }
  return ""; // Return empty string if undefined or null
};

// Function to safely parse integer from potentially stringified input
const safeParseInt = (value, defaultValue = 0) => {
  if (value === undefined || value === null) return defaultValue;
  const stringValue = String(value).trim();
  if (stringValue === "") return defaultValue;
  const parsed = parseInt(stringValue, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

// Function to safely parse float from potentially stringified input
const safeParseFloat = (value, defaultValue = 0) => {
  if (value === undefined || value === null) return defaultValue;
  const stringValue = String(value).trim();
  if (stringValue === "") return defaultValue;
  const parsed = parseFloat(stringValue);
  return isNaN(parsed) ? defaultValue : parsed;
};

export const getAllAdminItems = asyncHandler(async (req, res) => {
  const { search, categoryId } = req.query;
  let query = {};

  if (search) {
    const searchRegex = new RegExp(search, "i");
    query.$or = [
      { name: searchRegex },
      { sku: searchRegex },
      { brand: searchRegex },
    ];
  }

  if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
    query.category = categoryId;
  }

  const items = await Item.find(query)
    .populate("category", "name slug")
    .populate("createdBy", "username email")
    .sort({ createdAt: -1 });
  res.status(200).json({ success: true, items: items });
});

export const getAdminItemById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400);
    throw new Error("Invalid item ID format");
  }
  const item = await Item.findById(id)
    .populate("category", "name slug")
    .populate("createdBy", "username email");
  if (!item) {
    res.status(404);
    throw new Error("Item not found.");
  }
  res.status(200).json({ success: true, item: item });
});

export const createAdminItem = asyncHandler(async (req, res) => {
  const adminId = req.user._id;

  // req.body fields are now expected to be correctly typed by validators or parsed here
  const {
    name,
    sku,
    shortDescription,
    description,
    mrp,
    discountType,
    discountValue,
    categoryId,
    status,
    shippingClass,
    brand,
    gtin,
    countryOfOrigin,
    warrantyInfo,
    // Booleans from validator are now true/false, not strings
    manageStock,
    isTaxable,
    // Numbers from validator are now numbers
    stock,
    lowStockThreshold,
    cgstRate,
    sgstRate,
    weight,
  } = req.body;

  const parsedDimensions = parseFormDataField(req.body.dimensions) || {}; // dimensions still JSON string
  const parsedImageAltTexts = parseFormDataField(req.body.imageAltTexts) || [];
  const parsedPrimaryImageIndex =
    req.body.primaryImageIndex !== undefined
      ? parseInt(req.body.primaryImageIndex, 10) // Already validated as int string
      : 0;

  let uploadedImages = [];
  if (req.files && req.files.length > 0) {
    uploadedImages = req.files.map((file, index) => ({
      path: path.join("items", file.filename).replace(/\\/g, "/"),
      altText: parsedImageAltTexts[index] || name || `Item Image ${index + 1}`,
      isPrimary: index === parsedPrimaryImageIndex,
    }));
  } else {
    res.status(400);
    throw new Error("At least one image is required.");
  }

  if (uploadedImages.length > 0) {
    const primaryCount = uploadedImages.filter((img) => img.isPrimary).length;
    if (
      primaryCount === 0 ||
      parsedPrimaryImageIndex >= uploadedImages.length
    ) {
      uploadedImages.forEach((img, idx) => (img.isPrimary = idx === 0));
    } else if (primaryCount > 1) {
      uploadedImages.forEach(
        (img, idx) => (img.isPrimary = idx === parsedPrimaryImageIndex)
      );
    }
  }

  if (!mongoose.Types.ObjectId.isValid(categoryId)) {
    res.status(400);
    throw new Error("Invalid Category ID.");
  }
  const categoryExists = await Category.findById(categoryId);
  if (!categoryExists) {
    for (const img of uploadedImages) await deleteFile(img.path);
    res.status(400);
    throw new Error(`Category with ID ${categoryId} not found.`);
  }

  const trimmedSku = sku ? String(sku).trim() : undefined; // sku can be null/undefined from validator
  if (trimmedSku) {
    const skuExists = await Item.findOne({ sku: trimmedSku });
    if (skuExists) {
      for (const img of uploadedImages) await deleteFile(img.path);
      res.status(409);
      throw new Error(`Item with SKU "${trimmedSku}" already exists.`);
    }
  }

  const newItemData = {
    name: safeTrim(name),
    sku: trimmedSku,
    shortDescription: safeTrim(shortDescription),
    description: safeTrim(description),
    mrp: mrp, // Already float from validator
    discountType,
    discountValue: discountValue, // Already float from validator
    category: categoryId,
    images: uploadedImages,
    stock: manageStock ? (stock !== undefined ? stock : 0) : 0, // stock is int or undefined
    manageStock: manageStock, // Already boolean
    status: status || "draft",
    isTaxable: isTaxable, // Already boolean
    cgstRate: isTaxable ? (cgstRate !== undefined ? cgstRate : 0) : undefined, // cgstRate is float or undefined
    sgstRate: isTaxable ? (sgstRate !== undefined ? sgstRate : 0) : undefined, // sgstRate is float or undefined
    weight: weight, // weight is float or undefined
    dimensions: {
      length: parsedDimensions.length
        ? parseFloat(parsedDimensions.length)
        : undefined,
      width: parsedDimensions.width
        ? parseFloat(parsedDimensions.width)
        : undefined,
      height: parsedDimensions.height
        ? parseFloat(parsedDimensions.height)
        : undefined,
      unit: parsedDimensions.unit || "cm",
    },
    shippingClass: safeTrim(shippingClass),
    lowStockThreshold: manageStock
      ? lowStockThreshold !== undefined
        ? lowStockThreshold
        : undefined
      : undefined, // lowStockThreshold is int or undefined
    brand: safeTrim(brand),
    gtin: safeTrim(gtin),
    countryOfOrigin: safeTrim(countryOfOrigin),
    warrantyInfo: safeTrim(warrantyInfo),
    createdBy: adminId,
  };

  try {
    const item = new Item(newItemData);
    const savedItem = await item.save();
    const populatedItem = await Item.findById(savedItem._id)
      .populate("category", "name slug")
      .populate("createdBy", "username email");
    res.status(201).json(populatedItem);
  } catch (error) {
    for (const img of uploadedImages) {
      if (img.path) await deleteFile(img.path);
    }
    console.error("Item creation save error:", error);
    res.status(error.status || 500);
    throw error;
  }
});

export const updateAdminItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400);
    throw new Error("Invalid item ID format");
  }

  const item = await Item.findById(id);
  if (!item) {
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        await deleteFile(path.join("items", file.filename).replace(/\\/g, "/"));
      }
    }
    res.status(404);
    throw new Error("Item not found.");
  }

  // Fields from req.body. Validators should have typed them correctly (number, boolean)
  // or they are parsed here (JSON strings).
  const {
    name,
    sku,
    shortDescription,
    description,
    mrp,
    discountType,
    discountValue,
    categoryId,
    status,
    shippingClass,
    brand,
    gtin,
    countryOfOrigin,
    warrantyInfo,
    // These are expected as numbers or undefined from validator's customSanitizer
    stock,
    lowStockThreshold,
    cgstRate,
    sgstRate,
    weight,
    // These are expected as booleans from validator
    manageStock: manageStockStr, // keep raw string for initial check if needed
    isTaxable: isTaxableStr, // keep raw string for initial check if needed
  } = req.body;

  // Handle booleans explicitly, falling back to item's current value if not provided in request
  const finalManageStock =
    manageStockStr !== undefined
      ? manageStockStr === "true" || manageStockStr === true
      : item.manageStock;
  const finalIsTaxable =
    isTaxableStr !== undefined
      ? isTaxableStr === "true" || isTaxableStr === true
      : item.isTaxable;

  const parsedDimensions = parseFormDataField(req.body.dimensions);
  const keptExistingImagesData =
    parseFormDataField(req.body.keptExistingImages) || [];
  const newImageAltTexts = parseFormDataField(req.body.newImageAltTexts) || [];
  const primaryImageIdentifier = req.body.primaryImageIdentifier;

  let newlyUploadedImages = [];
  let tempNewFilePathsForCleanup = [];

  if (req.files && req.files.length > 0) {
    newlyUploadedImages = req.files.map((file, index) => {
      const relativePath = path
        .join("items", file.filename)
        .replace(/\\/g, "/");
      tempNewFilePathsForCleanup.push(relativePath);
      return {
        path: relativePath,
        altText:
          newImageAltTexts[index] ||
          safeTrim(name) ||
          item.name ||
          `Item Image ${index + 1}`,
        isPrimary: false,
      };
    });
  }

  let finalImages = [];
  keptExistingImagesData.forEach((keptImg) => {
    const originalImage = item.images.find(
      (dbImg) => dbImg.path === keptImg.path
    );
    if (originalImage) {
      finalImages.push({
        _id: originalImage._id,
        path: originalImage.path,
        altText: keptImg.altText || originalImage.altText,
        isPrimary: false,
      });
    }
  });
  finalImages = finalImages.concat(newlyUploadedImages);

  if (finalImages.length > 0) {
    let primaryIndexInFinalArray = -1;
    if (primaryImageIdentifier) {
      if (primaryImageIdentifier.startsWith("new-")) {
        const originalNewIndex = parseInt(
          primaryImageIdentifier.split("-")[1],
          10
        );
        if (
          originalNewIndex >= 0 &&
          originalNewIndex < newlyUploadedImages.length
        ) {
          const newPrimaryPath = newlyUploadedImages[originalNewIndex].path;
          primaryIndexInFinalArray = finalImages.findIndex(
            (img) => img.path === newPrimaryPath
          );
        }
      } else {
        primaryIndexInFinalArray = finalImages.findIndex(
          (img) => img.path === primaryImageIdentifier
        );
      }
    }
    if (primaryIndexInFinalArray === -1) primaryIndexInFinalArray = 0;
    finalImages.forEach(
      (img, idx) => (img.isPrimary = idx === primaryIndexInFinalArray)
    );
  }

  if (finalImages.length < 1) {
    res.status(400);
    throw new Error("At least one image is required.");
  }
  if (finalImages.length > 5) {
    res.status(400);
    throw new Error(`Maximum of 5 images allowed.`);
  }

  const finalImagePaths = finalImages.map((img) => img.path);
  for (const dbImage of item.images) {
    if (!finalImagePaths.includes(dbImage.path)) {
      await deleteFile(dbImage.path);
    }
  }
  item.images = finalImages;

  if (name !== undefined) item.name = safeTrim(name);
  if (sku !== undefined) {
    const trimmedSku = String(sku).trim() === "" ? null : String(sku).trim();
    if (item.sku !== trimmedSku) {
      if (trimmedSku) {
        const skuExists = await Item.findOne({
          sku: trimmedSku,
          _id: { $ne: id },
        });
        if (skuExists) {
          for (const p of tempNewFilePathsForCleanup) await deleteFile(p);
          res.status(409);
          throw new Error(`Item with SKU "${trimmedSku}" already exists.`);
        }
      }
      item.sku = trimmedSku;
    }
  }
  if (shortDescription !== undefined)
    item.shortDescription = safeTrim(shortDescription);
  if (description !== undefined) item.description = safeTrim(description);
  if (mrp !== undefined) item.mrp = safeParseFloat(mrp, item.mrp); // Use safeParseFloat
  if (discountType !== undefined) item.discountType = discountType;
  if (discountValue !== undefined)
    item.discountValue = safeParseFloat(discountValue, item.discountValue); // Use safeParseFloat

  if (categoryId !== undefined) {
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      for (const p of tempNewFilePathsForCleanup) await deleteFile(p);
      res.status(400);
      throw new Error("Invalid Category ID format.");
    }
    const categoryExists = await Category.findById(categoryId);
    if (!categoryExists) {
      for (const p of tempNewFilePathsForCleanup) await deleteFile(p);
      res.status(400);
      throw new Error(`Category with ID ${categoryId} not found.`);
    }
    item.category = categoryId;
  }

  item.manageStock = finalManageStock;
  if (finalManageStock) {
    // 'stock' comes from validator already as number or undefined
    if (stock !== undefined) item.stock = stock;
    // 'lowStockThreshold' comes from validator already as number or undefined
    if (lowStockThreshold !== undefined)
      item.lowStockThreshold = lowStockThreshold;
    else if (req.body.lowStockThreshold === "")
      item.lowStockThreshold = undefined;
  } else {
    item.stock = 0;
    item.lowStockThreshold = undefined;
  }

  if (status !== undefined) item.status = status;
  item.isTaxable = finalIsTaxable;
  if (finalIsTaxable) {
    // cgstRate & sgstRate come from validator as number or undefined
    if (cgstRate !== undefined) item.cgstRate = cgstRate;
    if (sgstRate !== undefined) item.sgstRate = sgstRate;
  } else {
    item.cgstRate = undefined;
    item.sgstRate = undefined;
  }

  // 'weight' comes from validator as number or undefined
  if (weight !== undefined) item.weight = weight;
  else if (req.body.weight === "") item.weight = undefined;

  if (parsedDimensions) {
    if (parsedDimensions.length !== undefined)
      item.dimensions.length = safeParseFloat(
        parsedDimensions.length,
        item.dimensions.length
      );
    if (parsedDimensions.width !== undefined)
      item.dimensions.width = safeParseFloat(
        parsedDimensions.width,
        item.dimensions.width
      );
    if (parsedDimensions.height !== undefined)
      item.dimensions.height = safeParseFloat(
        parsedDimensions.height,
        item.dimensions.height
      );
    if (parsedDimensions.unit !== undefined)
      item.dimensions.unit =
        parsedDimensions.unit || item.dimensions.unit || "cm";
  }
  if (shippingClass !== undefined) item.shippingClass = safeTrim(shippingClass);
  if (brand !== undefined) item.brand = safeTrim(brand);
  if (gtin !== undefined) item.gtin = safeTrim(gtin);
  if (countryOfOrigin !== undefined)
    item.countryOfOrigin = safeTrim(countryOfOrigin);
  if (warrantyInfo !== undefined) item.warrantyInfo = safeTrim(warrantyInfo);
  item.updatedBy = req.user._id;

  try {
    const updatedItem = await item.save();
    const populatedItem = await Item.findById(updatedItem._id)
      .populate("category", "name slug")
      .populate("createdBy", "username email")
      .populate("updatedBy", "username email");
    res.status(200).json(populatedItem);
  } catch (error) {
    for (const newPath of tempNewFilePathsForCleanup) {
      await deleteFile(newPath);
    }
    console.error("Item update save error:", error);
    res.status(error.status || 500);
    throw error;
  }
});

// ... (deleteAdminItem and deleteMultipleAdminItems remain the same) ...
export const deleteAdminItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400);
    throw new Error("Invalid item ID format");
  }
  const item = await Item.findById(id);
  if (!item) {
    res.status(404);
    throw new Error("Item not found.");
  }

  // The pre 'deleteOne' hook in Item model should handle image deletion
  await item.deleteOne();

  res.status(200).json({
    success: true,
    message: `Item "${item.name}" and its associated images scheduled for deletion.`,
  });
});

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
  }

  let deletedCount = 0;
  const errors = [];
  const notFoundIds = [];
  const deletedItemNames = [];

  for (const id of validIds) {
    try {
      const item = await Item.findById(id);
      if (item) {
        deletedItemNames.push(item.name);
        await item.deleteOne(); // Triggers pre 'deleteOne' hook
        deletedCount++;
      } else {
        notFoundIds.push(id);
      }
    } catch (error) {
      console.error(`Error deleting item ${id}:`, error);
      errors.push({ id: id, message: error.message || "Deletion failed" });
    }
  }

  let message = `${deletedCount} item(s) scheduled for deletion.`;
  if (deletedItemNames.length > 0) {
    message = `Item(s) "${deletedItemNames.join(
      '", "'
    )}" scheduled for deletion.`;
  }
  if (notFoundIds.length > 0)
    message += ` ${notFoundIds.length} item(s) not found.`;
  if (errors.length > 0)
    message += ` ${errors.length} item(s) failed to delete.`;

  const status =
    errors.length > 0
      ? deletedCount > 0
        ? 207
        : 500
      : notFoundIds.length > 0 && deletedCount === 0
      ? 404
      : 200;

  res.status(status).json({
    success: errors.length === 0 && notFoundIds.length === 0,
    message,
    deletedCount,
    notFoundCount: notFoundIds.length,
    errors,
  });
});
// *** NEW CONTROLLER FUNCTION ***
// GET /api/admin/items/list-for-select - Get active items for dropdowns
export const getActiveItemsForSelect = asyncHandler(async (req, res) => {
  const { categoryId } = req.query;
  console.log(
    `[Ctrl Admin Item] Fetching active items for select. CategoryID: ${categoryId}`
  );

  let query = { status: "active" }; // Example: Only fetch active items, or remove status filter

  if (categoryId) {
    if (mongoose.Types.ObjectId.isValid(categoryId)) {
      query.category = categoryId;
    } else {
      // If categoryId is provided but invalid, return a 400 error or an empty list
      console.warn(
        `[Ctrl Admin Item] Invalid categoryId format for select: ${categoryId}`
      );
      // Option 1: Return 400 error
      // res.status(400);
      // throw new Error("Invalid category ID format for filtering items.");
      // Option 2: Return empty list (safer for frontend if it expects an array)
      return res.status(200).json({ success: true, items: [] });
    }
  }

  const items = await Item.find(query)
    .select("_id name sku") // Select only needed fields
    // .populate('category', 'name') // Optional: if you need category name with item in dropdown
    .sort({ name: 1 }); // Sort alphabetically by name

  res.status(200).json({ success: true, items: items || [] });
});
