// backend/models/Banner.js
import mongoose from "mongoose";
import { deleteFile } from "../config/multerConfig.js";

const bannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Banner title is required."],
      trim: true,
      maxlength: [100, "Banner title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters."],
      default: "",
    },
    imageUrl: {
      type: String,
      required: [true, "Banner image URL is required."],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // --- NEW FIELDS ---
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category", // References the 'Category' model
      default: null,
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item", // References the 'Item' model
      default: null,
    },
    // createdBy: { // Optional tracking
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: 'Admin',
    //   required: true
    // },
  },
  {
    timestamps: true,
  }
);

// --- Middleware: Delete image file BEFORE document is removed ---
bannerSchema.pre(
  "deleteOne",
  { document: true, query: false },
  async function (next) {
    console.log(
      `[Banner Model Hook] Deleting banner: ${this.title} (${this._id})`
    );
    if (this.imageUrl) {
      console.log(
        `[Banner Model Hook] Scheduling image deletion for: ${this.imageUrl}`
      );
      try {
        await deleteFile(this.imageUrl);
      } catch (error) {
        console.error(
          `[Banner Model Hook] Error deleting image ${this.imageUrl} for banner ${this._id}:`,
          error
        );
      }
    }
    next();
  }
);

// Indexing
bannerSchema.index({ title: "text", description: "text" });
bannerSchema.index({ isActive: 1, createdAt: -1 });
bannerSchema.index({ categoryId: 1 }); // Optional: if you query by categoryId often
bannerSchema.index({ itemId: 1 }); // Optional: if you query by itemId often

const Banner = mongoose.model("Banner", bannerSchema);

export default Banner;
