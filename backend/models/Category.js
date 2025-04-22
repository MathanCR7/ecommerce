// backend/models/Category.js
import mongoose from "mongoose";
// *** CORRECTED: Import the Item model ***
import Item from "./Item.js";
import { deleteFile } from "../config/multerConfig.js";
import slugify from "slugify";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      unique: true,
      // Case-insensitive unique index
      index: { unique: true, collation: { locale: "en", strength: 2 } },
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      index: true,
    },
    description: { type: String, trim: true, default: "" },
    imagePath: {
      // Stores relative path like 'categories/category-123.jpg'
      type: String,
      trim: true,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin", // Reference the Admin model
      required: true,
    },
  },
  { timestamps: true }
);

// --- Middleware: Generate slug BEFORE saving ---
categorySchema.pre("save", function (next) {
  // Only generate slug if name is modified or slug doesn't exist
  if (this.isModified("name") || !this.slug) {
    const generatedSlug = slugify(this.name, {
      lower: true, // convert to lower case
      strict: true, // remove special characters strictly
      trim: true, // trim leading/trailing spaces
      replacement: "-", // replace spaces with -
    });
    // Use a fallback if slugify returns empty (e.g., for names with only special chars)
    this.slug =
      generatedSlug ||
      (this._id
        ? this._id.toString().substring(0, 12)
        : Date.now().toString(36));
    console.log(
      `[HOOK Category Pre-Save] Set slug to: '${this.slug}' for name: '${this.name}'`
    );
  }
  next();
});

// --- Middleware: Before removing a category (Cascade Delete Items) ---
categorySchema.pre(
  "deleteOne",
  { document: true, query: false }, // Ensure this runs on document instance deletion
  async function (next) {
    const category = this;
    const categoryId = category._id;
    console.log(`\n--- [HOOK Category Delete ${categoryId}] ---`);
    try {
      // *** CORRECTED: Find associated Items ***
      console.log(
        `[HOOK Category Delete ${categoryId}] Finding associated items...`
      );
      const itemsToDelete = await Item.find({ category: categoryId });
      console.log(
        `[HOOK Category Delete ${categoryId}] Found ${itemsToDelete.length} associated items.` // Updated log message
      );

      if (itemsToDelete.length > 0) {
        console.log(
          `[HOOK Category Delete ${categoryId}] Initiating item deletion cascade...` // Updated log message
        );
        // Trigger deleteOne on each item to ensure their pre-remove hooks run (e.g., image deletion)
        const itemDeletionPromises = itemsToDelete.map((item) => {
          console.log(
            `  [Cascade] Triggering deleteOne for Item: ${item.name} (${item._id})` // Updated log message
          );
          // Using deleteOne on the document instance triggers its hooks
          return item.deleteOne().catch((err) => {
            // Log error but don't necessarily stop the whole process unless critical
            console.error(`  [Cascade] Error deleting item ${item._id}:`, err);
            // Optionally collect errors to report later
          });
        });
        // Wait for all item deletions (and their hooks) to attempt completion
        await Promise.all(itemDeletionPromises);
        console.log(
          `[HOOK Category Delete ${categoryId}] Finished item cascade.` // Updated log message
        );
      }

      // Delete the category's own image file
      if (category.imagePath) {
        console.log(
          `[HOOK Category Delete ${categoryId}] Deleting category image: ${category.imagePath}`
        );
        // Assuming deleteFile takes the relative path stored in imagePath
        await deleteFile(category.imagePath);
      } else {
        console.log(
          `[HOOK Category Delete ${categoryId}] No category image to delete.`
        );
      }

      console.log(
        `[HOOK Category Delete ${categoryId}] Pre-deleteOne completed successfully.`
      );
      next(); // Proceed with deleting the category document
    } catch (error) {
      console.error(
        `[HOOK Category Delete ${categoryId}] CRITICAL error in pre-deleteOne hook:`,
        error
      );
      next(error); // Pass error to potentially stop the category deletion process
    }
    console.log(`--- [END HOOK Category Delete ${categoryId}] ---`);
  }
);

const Category = mongoose.model("Category", categorySchema);
export default Category;
