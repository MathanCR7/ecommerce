import mongoose from "mongoose";
import asyncHandler from "../middleware/asyncHandler.js";
import Banner from "../models/Banner.js";
import { deleteFile } from "../config/multerConfig.js";
import path from "path";

// @desc    Get all banners with pagination and search
// @route   GET /api/admin/banners
// @access  Private/Admin
const getBanners = asyncHandler(async (req, res) => {
  console.log("[Ctrl Banner Get] Request received for all banners.");
  const pageSize = 10;
  const page = Number(req.query.pageNumber) || 1;
  const keyword = req.query.keyword
    ? {
        $or: [
          { title: { $regex: req.query.keyword, $options: "i" } },
          { description: { $regex: req.query.keyword, $options: "i" } },
        ],
      }
    : {};

  try {
    const count = await Banner.countDocuments({ ...keyword });
    console.log(`[Ctrl Banner Get] Found ${count} banners matching keyword.`);

    const banners = await Banner.find({ ...keyword })
      .populate("categoryId", "name slug") // Populate category
      .populate("itemId", "name slug sku") // Populate item
      .limit(pageSize)
      .skip(pageSize * (page - 1))
      .sort({ createdAt: -1 });

    console.log(
      `[Ctrl Banner Get] Sending ${banners.length} banners for page ${page}.`
    );
    res.status(200).json({
      success: true,
      banners,
      page,
      pages: Math.ceil(count / pageSize),
      count,
    });
  } catch (error) {
    console.error("[Ctrl Banner Get] Error fetching banners:", error);
    res.status(500);
    throw new Error("Server error fetching banners.");
  }
});

// @desc    Get single banner by ID
// @route   GET /api/admin/banners/:id
// @access  Private/Admin
const getBannerById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  console.log(`[Ctrl Banner GetByID] Request for banner ID: ${id}`);
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400);
    throw new Error("Invalid banner ID format.");
  }

  const banner = await Banner.findById(id)
    .populate("categoryId", "name slug") // Populate category
    .populate("itemId", "name slug sku"); // Populate item

  if (banner) {
    console.log(`[Ctrl Banner GetByID] Found banner: ${banner.title}`);
    res.status(200).json({ success: true, banner });
  } else {
    console.log(`[Ctrl Banner GetByID] Banner not found: ${id}`);
    res.status(404);
    throw new Error("Banner not found.");
  }
});

// @desc    Create a new banner
// @route   POST /api/admin/banners
// @access  Private/Admin
const createBanner = asyncHandler(async (req, res) => {
  console.log("[Ctrl Banner Create] Request received.");
  console.log("[Ctrl Banner Create] Body:", req.body);
  console.log("[Ctrl Banner Create] File:", req.file);

  const { title, description, isActive, categoryId, itemId } = req.body;
  let uploadedFilePath = null;

  if (!title || !title.trim()) {
    res.status(400);
    throw new Error("Banner title is required.");
  }
  if (!req.file || !req.file.filename) {
    res.status(400);
    throw new Error("Banner image file is required.");
  }

  // Validate categoryId if provided
  if (
    categoryId &&
    categoryId !== "null" &&
    categoryId !== "" &&
    !mongoose.Types.ObjectId.isValid(categoryId)
  ) {
    if (req.file?.filename)
      await deleteFile(
        path.join("banners", req.file.filename).replace(/\\/g, "/")
      );
    res.status(400);
    throw new Error("Invalid Category ID format.");
  }
  // Validate itemId if provided
  if (
    itemId &&
    itemId !== "null" &&
    itemId !== "" &&
    !mongoose.Types.ObjectId.isValid(itemId)
  ) {
    if (req.file?.filename)
      await deleteFile(
        path.join("banners", req.file.filename).replace(/\\/g, "/")
      );
    res.status(400);
    throw new Error("Invalid Item ID format.");
  }

  uploadedFilePath = path
    .join("banners", req.file.filename)
    .replace(/\\/g, "/");
  console.log(
    `[Ctrl Banner Create] Determined image path: ${uploadedFilePath}`
  );

  try {
    const banner = new Banner({
      title: title.trim(),
      description: description?.trim() || "",
      imageUrl: uploadedFilePath,
      isActive: isActive === "true" || isActive === true,
      categoryId:
        categoryId && categoryId !== "null" && categoryId !== ""
          ? categoryId
          : null,
      itemId: itemId && itemId !== "null" && itemId !== "" ? itemId : null,
      // createdBy: req.user._id
    });

    const createdBanner = await banner.save();
    console.log(
      "[Ctrl Banner Create] Banner saved successfully. ID:",
      createdBanner._id
    );

    // Populate references for the response
    const populatedBanner = await Banner.findById(createdBanner._id)
      .populate("categoryId", "name slug")
      .populate("itemId", "name slug sku");

    res.status(201).json({
      success: true,
      message: "Banner created successfully!",
      banner: populatedBanner,
    });
  } catch (error) {
    console.error("[Ctrl Banner Create] DATABASE SAVE ERROR:", error);
    if (uploadedFilePath) {
      console.error(
        `[Ctrl Banner Create Error] Cleaning up failed upload file: ${uploadedFilePath}`
      );
      await deleteFile(uploadedFilePath);
    }
    res.status(error.name === "ValidationError" ? 400 : 500);
    throw error;
  }
});

// @desc    Update a banner
// @route   PUT /api/admin/banners/:id
// @access  Private/Admin
const updateBanner = asyncHandler(async (req, res) => {
  const { id } = req.params;
  console.log(`[Ctrl Banner Update] Request for banner ID: ${id}`);
  console.log("[Ctrl Banner Update] Body:", req.body);
  console.log("[Ctrl Banner Update] File:", req.file);

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400);
    throw new Error("Invalid banner ID format.");
  }

  const { title, description, isActive, categoryId, itemId } = req.body;
  let newRelativePath = null;

  const banner = await Banner.findById(id);

  if (!banner) {
    if (req.file) {
      const tempPath = path
        .join("banners", req.file.filename)
        .replace(/\\/g, "/");
      console.warn(
        `[Ctrl Banner Update] Banner ${id} not found. Cleaning up uploaded file: ${tempPath}`
      );
      await deleteFile(tempPath);
    }
    res.status(404);
    throw new Error("Banner not found.");
  }

  const oldImagePath = banner.imageUrl;
  let hasChanges = false;

  if (title && title.trim() !== banner.title) {
    banner.title = title.trim();
    hasChanges = true;
  }
  if (description !== undefined && description.trim() !== banner.description) {
    banner.description = description.trim();
    hasChanges = true;
  }
  const newIsActive = isActive === "true" || isActive === true;
  if (isActive !== undefined && newIsActive !== banner.isActive) {
    banner.isActive = newIsActive;
    hasChanges = true;
  }

  // Handle categoryId update
  if (categoryId !== undefined) {
    const newCatId =
      categoryId && categoryId !== "null" && categoryId !== ""
        ? categoryId
        : null;
    if (newCatId && !mongoose.Types.ObjectId.isValid(newCatId)) {
      if (req.file?.filename)
        await deleteFile(
          path.join("banners", req.file.filename).replace(/\\/g, "/")
        );
      res.status(400);
      throw new Error("Invalid Category ID format for update.");
    }
    if ((banner.categoryId?.toString() || null) !== newCatId) {
      banner.categoryId = newCatId;
      hasChanges = true;
    }
  }

  // Handle itemId update
  if (itemId !== undefined) {
    const newItemId =
      itemId && itemId !== "null" && itemId !== "" ? itemId : null;
    if (newItemId && !mongoose.Types.ObjectId.isValid(newItemId)) {
      if (req.file?.filename)
        await deleteFile(
          path.join("banners", req.file.filename).replace(/\\/g, "/")
        );
      res.status(400);
      throw new Error("Invalid Item ID format for update.");
    }
    if ((banner.itemId?.toString() || null) !== newItemId) {
      banner.itemId = newItemId;
      hasChanges = true;
    }
  }

  if (req.file && req.file.filename) {
    newRelativePath = path
      .join("banners", req.file.filename)
      .replace(/\\/g, "/");
    if (newRelativePath !== banner.imageUrl) {
      banner.imageUrl = newRelativePath;
      hasChanges = true;
    } else {
      console.warn(
        `[Ctrl Banner Update] New image path same as old. Deleting redundant upload: ${newRelativePath}`
      );
      await deleteFile(newRelativePath);
      newRelativePath = null;
    }
  }

  if (hasChanges) {
    try {
      const savedBanner = await banner.save();

      // Populate references for the response
      const updatedBanner = await Banner.findById(savedBanner._id)
        .populate("categoryId", "name slug")
        .populate("itemId", "name slug sku");

      if (
        newRelativePath &&
        oldImagePath &&
        oldImagePath !== updatedBanner.imageUrl
      ) {
        console.log(`[Ctrl Banner Update] Deleting old image: ${oldImagePath}`);
        await deleteFile(oldImagePath);
      }
      res.status(200).json({
        success: true,
        message: "Banner updated successfully!",
        banner: updatedBanner,
      });
    } catch (saveError) {
      console.error(
        `[Ctrl Banner Update] **DATABASE SAVE ERROR** for ${id}:`,
        saveError
      );
      if (newRelativePath) {
        console.error(
          `[Ctrl Banner Update Error] Save failed. Cleaning up new image: ${newRelativePath}`
        );
        await deleteFile(newRelativePath);
      }
      res.status(saveError.name === "ValidationError" ? 400 : 500);
      throw saveError;
    }
  } else {
    console.log(`[Ctrl Banner Update] No changes detected for banner ${id}.`);
    if (req.file && req.file.filename) {
      const tempPath = path
        .join("banners", req.file.filename)
        .replace(/\\/g, "/");
      console.warn(
        `[Ctrl Banner Update] No changes detected. Cleaning up unused new upload: ${tempPath}`
      );
      await deleteFile(tempPath);
    }
    // Populate references even if no DB changes, for consistent response structure
    const currentBannerPopulated = await Banner.findById(banner._id)
      .populate("categoryId", "name slug")
      .populate("itemId", "name slug sku");
    res.status(200).json({
      success: true,
      message: "No changes detected.",
      banner: currentBannerPopulated,
    });
  }
});

// @desc    Delete a banner
// @route   DELETE /api/admin/banners/:id
// @access  Private/Admin
const deleteBanner = asyncHandler(async (req, res) => {
  const { id } = req.params;
  console.log(`[Ctrl Banner Delete] Request for banner ID: ${id}`);
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400);
    throw new Error("Invalid banner ID format.");
  }

  const banner = await Banner.findById(id);

  if (!banner) {
    res.status(404);
    throw new Error("Banner not found.");
  }

  try {
    await banner.deleteOne(); // Mongoose middleware in Banner.js handles image deletion
    console.log(
      `[Ctrl Banner Delete] Banner ${id} (${banner.title}) deleted successfully.`
    );
    res.status(200).json({
      success: true,
      message: `Banner "${banner.title}" deleted successfully.`,
    });
  } catch (error) {
    console.error(
      `[Ctrl Banner Delete] Error during deletion process for ${id}:`,
      error
    );
    res.status(500);
    throw new Error("Could not delete banner.");
  }
});

// @desc    Toggle banner active status
// @route   PATCH /api/admin/banners/:id/status
// @access  Private/Admin
const toggleBannerStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  console.log(`[Ctrl Banner Toggle] Request for banner ID: ${id}`);
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400);
    throw new Error("Invalid banner ID format.");
  }

  const banner = await Banner.findById(id);

  if (!banner) {
    res.status(404);
    throw new Error("Banner not found.");
  }

  banner.isActive = !banner.isActive;

  try {
    await banner.save();
    // Populate references for the response
    const updatedBanner = await Banner.findById(banner._id)
      .populate("categoryId", "name slug")
      .populate("itemId", "name slug sku");

    console.log(
      `[Ctrl Banner Toggle] Banner ${id} status toggled to ${updatedBanner.isActive}.`
    );
    res.status(200).json({
      success: true,
      message: `Banner "${updatedBanner.title}" status updated to ${
        updatedBanner.isActive ? "Active" : "Inactive"
      }.`,
      banner: updatedBanner, // Send back populated banner
    });
  } catch (error) {
    console.error(`[Ctrl Banner Toggle] Error saving status for ${id}:`, error);
    res.status(500);
    throw new Error("Could not update banner status.");
  }
});

// --- NEW PUBLIC FUNCTION ---
// @desc    Get the latest active banner (PUBLIC)
// @route   GET /api/banners/latest-active  (Example path, adjust as needed)
// @access  Public
const getActiveBannersForCarousel = asyncHandler(async (req, res) => {
  console.log(
    "[Ctrl Banner GetActiveCarousel] Request received for active banners."
  );
  const banners = await Banner.find({ isActive: true }) // find() returns an array
    .sort({ createdAt: -1 }) // Or any other desired sorting
    .populate("categoryId", "name slug")
    .populate("itemId", "name slug sku");

  if (banners && banners.length > 0) {
    console.log(
      `[Ctrl Banner GetActiveCarousel] Found ${banners.length} active banners.`
    );
    res.json({ success: true, banners }); // Ensure the key is 'banners' (plural)
  } else {
    console.log("[Ctrl Banner GetActiveCarousel] No active banners found.");
    res.json({
      success: true,
      banners: [], // Send empty array
      message: "No active banners found.",
    });
  }
});

export {
  createBanner,
  getBanners,
  getBannerById,
  updateBanner,
  deleteBanner,
  toggleBannerStatus,
  getActiveBannersForCarousel,
};
