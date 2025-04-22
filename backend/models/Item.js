// backend/models/Item.js
import mongoose from "mongoose";
import { deleteFile } from "../config/multerConfig.js"; // Import file deletion utility

const itemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Item name is required."],
      trim: true,
      maxlength: [150, "Item name cannot exceed 150 characters."],
    },
    sku: {
      // Stock Keeping Unit
      type: String,
      trim: true,
      unique: true,
      sparse: true, // Allows multiple nulls, but unique if value exists
      index: true,
      default: null,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, "Item description cannot exceed 2000 characters."],
      default: "",
    },
    price: {
      type: Number,
      required: [true, "Item price is required."],
      min: [0, "Price cannot be negative."],
    },
    category: {
      // References the Category model
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Item must belong to a category"],
      index: true,
    },
    imagePath: {
      // Stores relative path like 'items/item-123.jpg'
      type: String,
      trim: true,
      default: null,
    },
    stock: {
      // Quantity available
      type: Number,
      required: [true, "Stock quantity is required."],
      min: [0, "Stock cannot be negative."],
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} is not an integer value for stock",
      },
    },
    status: {
      // Availability status
      type: String,
      enum: ["active", "inactive", "discontinued", "out-of-stock"],
      default: "active",
      index: true,
    },
    createdBy: {
      // References the Admin model
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    // Add other relevant item properties if needed:
    // brand: { type: String, trim: true },
    // ratings: { type: Number, min: 0, max: 5, default: 0 },
    // numberOfReviews: { type: Number, default: 0 },
    // attributes: [ { name: String, value: String } ], // E.g., { name: 'Color', value: 'Red' }
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

// Add index for common query fields (can keep text index if needed for search)
itemSchema.index({ name: "text", description: "text" }); // For text search
itemSchema.index({ price: 1 }); // For sorting/filtering by price

// --- Middleware: Before removing an item ---
itemSchema.pre(
  "deleteOne",
  { document: true, query: false },
  async function (next) {
    const item = this; // 'this' refers to the document being removed
    console.log(`--- [HOOK Item Delete ${item._id}] ---`);
    try {
      // Delete the item's image file (if it exists)
      if (item.imagePath) {
        console.log(
          `[HOOK Item Delete ${item._id}] Deleting image file: ${item.imagePath}`
        );
        // Assuming deleteFile takes the relative path stored in imagePath
        await deleteFile(item.imagePath);
      } else {
        console.log(`[HOOK Item Delete ${item._id}] No image file to delete.`);
      }
      console.log(`[HOOK Item Delete ${item._id}] Pre-deleteOne completed.`);
      next(); // Proceed with removing the item document
    } catch (error) {
      console.error(
        `[HOOK Item Delete ${item._id}] Error in pre-deleteOne hook:`,
        error
      );
      // Decide if the error should prevent deletion
      next(error); // Pass error to potentially stop removal if critical
    }
    console.log(`--- [END HOOK Item Delete ${item._id}] ---`);
  }
);

const Item = mongoose.model("Item", itemSchema); // Use "Item" as the model name

export default Item;
