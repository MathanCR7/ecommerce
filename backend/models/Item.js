// backend/models/Item.js
import mongoose from "mongoose";
import slugify from "slugify";
import { deleteFile } from "../config/multerConfig.js"; // Assuming this helper exists

const imageSchema = new mongoose.Schema({
  path: { type: String, required: true },
  altText: { type: String, trim: true, default: "" },
  isPrimary: { type: Boolean, default: false },
});

const itemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Item name is required."],
      trim: true,
      maxlength: [150, "Item name cannot exceed 150 characters."],
    },
    slug: {
      type: String,
      unique: true, // unique: true implies an index
      index: true, // Redundant when unique: true is used, but keeping for clarity/consistency
    },
    sku: {
      type: String,
      trim: true,
      unique: true,
      sparse: true, // Allows multiple null/undefined values but unique among actual values
      index: true,
    },
    shortDescription: {
      type: String,
      trim: true,
      maxlength: [500, "Short description cannot exceed 500 characters."],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [5000, "Item description cannot exceed 5000 characters."],
      default: "",
    },
    mrp: {
      type: Number,
      required: [true, "MRP is required."],
      min: [0, "MRP cannot be negative."],
    },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      default: "percentage",
    },
    discountValue: {
      type: Number,
      min: [0, "Discount value cannot be negative."],
      default: 0,
    },
    price: {
      // This field will be calculated in the pre-save hook
      type: Number,
      min: [0, "Price cannot be negative."],
      // It's good practice to make this required if it's always calculated
      // required: true, // Consider adding this
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Item must belong to a category"],
      index: true, // Index is defined here
    },
    images: {
      type: [imageSchema],
      validate: [
        {
          validator: function (v) {
            // Check if there's a value or if it's an empty array
            // The frontend expects an array, so requiring at least one item might be too strict if images are optional
            return Array.isArray(v); // Allow empty array
            // return v.length >= 1; // If at least one image is strictly required
          },
          message: "Images field must be an array.", // Corrected message
        },
        // Check max length only if array is not null/undefined and has length
        {
          validator: function (v) {
            return v === null || v === undefined || v.length <= 5;
          },
          message: "A maximum of 5 images are allowed.",
        },
        {
          validator: function (v) {
            if (!v || v.length === 0) return true; // Allow no primary if no images
            return v.filter((img) => img.isPrimary).length <= 1;
          },
          message: "Only one image can be marked as primary.",
        },
      ],
    },
    stock: {
      type: Number,
      // Required only if manageStock is true (handled by the conditional requirement below)
      min: [0, "Stock cannot be negative."],
      default: 0,
      validate: {
        validator: function (v) {
          // Validator to ensure it's an integer if it's a number
          return typeof v !== "number" || Number.isInteger(v);
        },
        message: "{VALUE} is not an integer value for stock",
      },
    },
    manageStock: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "discontinued", "out-of-stock", "draft"], // 'out-of-stock' status might be redundant if stock/manageStock indicate it
      default: "active",
      index: true,
    },
    isTaxable: {
      type: Boolean,
      default: false,
    },
    cgstRate: {
      type: Number,
      min: [0, "CGST rate cannot be negative."],
      default: 0,
    },
    sgstRate: {
      type: Number,
      min: [0, "SGST rate cannot be negative."],
      default: 0,
    },
    weight: {
      type: Number,
      min: [0, "Weight cannot be negative."],
    },
    dimensions: {
      length: { type: Number, min: [0, "Length cannot be negative."] },
      width: { type: Number, min: [0, "Width cannot be negative."] },
      height: { type: Number, min: [0, "Height cannot be negative."] },
      unit: { type: String, default: "cm", enum: ["cm", "in", "m", "g", "kg"] }, // Added g, kg for weight unit
    },
    shippingClass: { type: String, trim: true },
    lowStockThreshold: {
      type: Number,
      min: [0, "Low stock threshold cannot be negative."],
      // Only required if manageStock is true? Schema doesn't enforce this.
    },
    brand: { type: String, trim: true },
    gtin: {
      type: String,
      trim: true,
    },
    countryOfOrigin: { type: String, trim: true },
    warrantyInfo: { type: String, trim: true },
    // Added Rating field (assuming it exists based on frontend usage)
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    // Added Unit field (assuming it exists based on frontend usage)
    unit: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin", // Make sure 'Admin' is the correct model name for your admin users
      required: true, // Assuming item creation requires an admin user
    },
    // ++ ADDED updatedBy FIELD ++
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin", // Should also reference your Admin user model
      // Not required as initial creation doesn't have an updater
    },
  },
  {
    timestamps: true, // This will add createdAt and updatedAt automatically
  }
);

// Conditional requirement for stock based on manageStock
// This is already in the schema and correct.
itemSchema.path("stock").required(function () {
  return this.manageStock === true; // Only required if explicitly true
}, "Stock quantity is required when manageStock is true.");

itemSchema.pre("save", async function (next) {
  // Slug generation
  if (this.isModified("name") || !this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true });
    let baseSlug = this.slug;
    let count = 0;
    let existingItem = await mongoose
      .model("Item")
      .findOne({ slug: this.slug, _id: { $ne: this._id } });
    while (existingItem) {
      count++;
      this.slug = `${baseSlug}-${count}`;
      existingItem = await mongoose
        .model("Item")
        .findOne({ slug: this.slug, _id: { $ne: this._id } });
    }
  }

  // Auto-generate SKU if not provided on new item
  // Ensure this is robust or consider making SKU strictly required/unique at input
  if (!this.sku && this.isNew) {
    try {
      const CategoryModel = mongoose.model("Category"); // Get model instance
      const category = this.category
        ? await CategoryModel.findById(this.category)
        : null;

      const catCode = category
        ? category.name
            .substring(0, Math.min(3, category.name.length))
            .toUpperCase()
            .replace(/\s/g, "")
        : "GEN";
      const namePart = this.name
        .substring(0, Math.min(3, this.name.length))
        .toUpperCase()
        .replace(/\s/g, "");

      const safeCatCode = catCode || "CAT";
      const safeNamePart = namePart || "ITEM";

      let potentialSku;
      let skuExists = true;
      let attempt = 0;
      const maxAttempts = 20; // Increased attempts

      do {
        const randomSuffix = Math.random()
          .toString(36)
          .substring(2, 8) // Using 6 chars for more uniqueness
          .toUpperCase();
        const parts = [safeCatCode, safeNamePart, randomSuffix].filter(Boolean);
        potentialSku = parts.join("-");

        if (attempt > 0) potentialSku = `${potentialSku}-${attempt}`;

        const existingSkuItem = await mongoose
          .model("Item")
          .findOne({ sku: potentialSku });
        if (!existingSkuItem) skuExists = false;
        attempt++;
        if (attempt >= maxAttempts) {
          console.error(
            "Max SKU auto-generation attempts reached for item:",
            this.name
          );
          break; // Exit loop if too many attempts
        }
      } while (skuExists);

      if (!skuExists) {
        this.sku = potentialSku;
      } else {
        // Fallback SKU if auto-gen fails completely
        this.sku = `SKU-FAIL-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 6) // Use 4 chars for fallback
          .toUpperCase()}`;
        console.warn(
          `Failed to generate unique SKU, using fallback: ${this.sku} for item: ${this.name}`
        );
      }
    } catch (error) {
      console.error("Error during SKU auto-generation:", error);
      // Fallback SKU on error
      if (!this.sku)
        this.sku = `SKU-ERROR-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 6)
          .toUpperCase()}`;
      console.warn(
        `Error during SKU auto-generation, using fallback: ${this.sku} for item: ${this.name}`
      );
    }
  }

  // Calculate price
  // This logic is already in the schema and correct.
  if (
    this.isModified("mrp") ||
    this.isModified("discountType") ||
    this.isModified("discountValue") ||
    this.price === undefined || // Calculate if price is not set
    this.price === null // Calculate if price is null
  ) {
    const numMrp = this.mrp || 0;
    const numDiscountValue = this.discountValue || 0;
    let discountAmount = 0;
    if (this.discountType === "percentage") {
      discountAmount = (numMrp * numDiscountValue) / 100;
    } else if (this.discountType === "fixed") {
      discountAmount = numDiscountValue;
    }
    this.price = Math.max(0, numMrp - discountAmount);
    // If discount makes price <= 0, set to 0
    if (this.price < 0.01 && this.price !== 0) this.price = 0;
  }

  // Ensure exactly one primary image if images exist
  if (this.images && this.images.length > 0) {
    const primaryImages = this.images.filter((img) => img.isPrimary);
    if (primaryImages.length === 0) {
      // If no primary is set, set the first image as primary
      this.images[0].isPrimary = true;
    } else if (primaryImages.length > 1) {
      // If multiple are marked primary, unset all and set the first one
      this.images.forEach((img) => (img.isPrimary = false));
      this.images[0].isPrimary = true;
    }
  } else if (this.images && this.images.length === 0) {
    // If images array is empty, clear isPrimary flags (shouldn't be any, but safety)
    this.images.forEach((img) => (img.isPrimary = false));
  }

  // If manageStock becomes false, clear lowStockThreshold
  if (this.isModified("manageStock") && this.manageStock === false) {
    this.lowStockThreshold = undefined; // Or null, depending on preference
  }

  // If being updated (not new) and updatedBy is not already set by controller,
  // or if timestamps option is used, mongoose handles updatedAt automatically.
  // updatedBy should typically be set in the controller before saving/updating.

  next();
});

// Add text index definition (already exists, keep)
itemSchema.index({
  name: "text",
  description: "text",
  sku: "text",
  brand: "text",
});

// Add other indexes (already exists, keep)
itemSchema.index({ price: 1, category: 1, status: 1 });
// itemSchema.index({ slug: 1 }); // <-- REMOVED DUPLICATE INDEX
// itemSchema.index({ category: 1 }); // <-- REMOVED DUPLICATE INDEX

// Pre-delete hook to clean up images (already exists, keep)
itemSchema.pre(
  "deleteOne",
  { document: true, query: false }, // Ensure it runs as document middleware on deleteOne()
  async function (next) {
    const item = this;
    console.log(`--- [HOOK Item Delete ${item._id}] ---`);
    // Assuming deleteFile is correctly implemented to handle potential errors or non-existent files
    try {
      if (item.images && item.images.length > 0) {
        for (const image of item.images) {
          if (image.path) {
            // Delete file relative to the uploads directory
            // Ensure deleteFile can handle paths relative to the uploads root
            const filePathRelativeToUploads = image.path.startsWith("/")
              ? image.path.substring(1)
              : image.path;
            console.log(
              `[HOOK Item Delete ${item._id}] Attempting to delete image file: ${filePathRelativeToUploads}`
            );
            // deleteFile should resolve the full path internally
            await deleteFile(filePathRelativeToUploads);
          }
        }
      } else {
        console.log(`[HOOK Item Delete ${item._id}] No image files to delete.`);
      }
      next();
    } catch (error) {
      console.error(
        `[HOOK Item Delete ${item._id}] Error in pre-deleteOne hook (file deletion):`,
        error
      );
      // Decide if file deletion failure should block item deletion.
      // Typically, you might just log the error and proceed with item deletion.
      // next(error); // Uncomment this if you want to abort item deletion on file error
      next(); // Proceed with item deletion even if file deletion fails
    }
    console.log(`--- [END HOOK Item Delete ${item._id}] ---`);
  }
);

const Item = mongoose.model("Item", itemSchema);
export default Item;
