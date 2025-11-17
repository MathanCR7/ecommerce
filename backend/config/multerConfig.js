// backend/config/multerConfig.js
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import os from "os"; // UNIFIED CHANGE: Import 'os' module for Vercel's temp directory

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- UNIFIED CHANGE: Dynamically determine the base upload directory ---
let BASE_UPLOADS_DIR;
const UPLOADS_DIR_NAME = "uploads";

if (process.env.NODE_ENV === "production") {
  // --- VERCEL / PRODUCTION ENVIRONMENT ---
  // Use the only writable directory in a serverless environment.
  BASE_UPLOADS_DIR = path.join(os.tmpdir(), UPLOADS_DIR_NAME);
  console.log(
    `[Multer Config] Production mode detected. Using temporary directory for uploads: ${BASE_UPLOADS_DIR}`
  );
} else {
  // --- LOCAL DEVELOPMENT ENVIRONMENT ---
  // Use the original logic to create a persistent 'uploads' folder in your project.
  // This assumes your structure is `project-root/backend/config`, and you want `project-root/backend/uploads`.
  const backendRoot = path.resolve(__dirname, "..");
  BASE_UPLOADS_DIR = path.join(backendRoot, UPLOADS_DIR_NAME);
  console.log(
    `[Multer Config] Development mode detected. Using local directory for uploads: ${BASE_UPLOADS_DIR}`
  );
}
// For clarity, let's call the final exportable variable ABSOLUTE_UPLOADS_DIR to minimize changes elsewhere.
const ABSOLUTE_UPLOADS_DIR = BASE_UPLOADS_DIR;

const ensureDirExistsAbsolute = (absolutePath) => {
  if (!fs.existsSync(absolutePath)) {
    try {
      fs.mkdirSync(absolutePath, { recursive: true });
      console.log(`[Multer Config] Created directory: ${absolutePath}`);
    } catch (err) {
      console.error(
        `[Multer Config] Error creating directory ${absolutePath}:`,
        err
      );
      throw err;
    }
  }
  return absolutePath;
};

// UNIFIED CHANGE: Only run directory creation on startup for LOCAL development.
// This was the line causing the Vercel crash.
if (process.env.NODE_ENV !== "production") {
  ensureDirExistsAbsolute(ABSOLUTE_UPLOADS_DIR);
}

const createStorage = (destinationSubDir, filenamePrefix) => {
  // UNIFIED CHANGE: This function now uses the dynamic ABSOLUTE_UPLOADS_DIR.
  const absoluteUploadPathWithSubDir = path.join(
    ABSOLUTE_UPLOADS_DIR,
    destinationSubDir
  );

  return multer.diskStorage({
    destination: (req, file, cb) => {
      // UNIFIED CHANGE: Create the directory just-in-time. This is safe for both environments.
      ensureDirExistsAbsolute(absoluteUploadPathWithSubDir);
      cb(null, absoluteUploadPathWithSubDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const extension = path.extname(file.originalname);
      cb(null, `${filenamePrefix}-${uniqueSuffix}${extension}`);
    },
  });
};

const imageFileFilter = (req, file, cb) => {
  const allowedImageTypes = /image\/(jpeg|jpg|png|gif|webp)/;
  if (allowedImageTypes.test(file.mimetype)) {
    cb(null, true);
  } else {
    console.warn(
      `[Multer Filter] Rejected file type: ${file.mimetype} for ${file.originalname}`
    );
    const error = new Error(
      "Only image files (JPEG, JPG, PNG, GIF, WEBP) are allowed."
    );
    error.code = "INVALID_FILE_TYPE"; // Custom code for easier handling
    cb(error, false);
  }
};

const MAX_SIZE_MB = parseInt(process.env.MAX_FILE_UPLOAD_SIZE_MB || "5", 10);
const fileSizeLimit = MAX_SIZE_MB * 1024 * 1024;

// --- Your Original Multer Instances (No changes needed here) ---

// User Profile Picture
const userStorage = createStorage("users", "user-profile");
const uploadUserProfile = multer({
  storage: userStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: fileSizeLimit },
}).single("profilePicture");

// Category Image
const categoryStorage = createStorage("categories", "category");
const uploadCategoryImage = multer({
  storage: categoryStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: fileSizeLimit },
}).single("image"); // Frontend sends as 'image' for category

// Item Images - For Creation (expects 'images' field)
const itemStorage = createStorage("items", "item-image"); // Subdirectory "items" for item images
const MAX_ITEM_IMAGES_CREATE = 5; // Corresponds to frontend MAX_IMAGES
const uploadItemImagesForCreate = multer({
  storage: itemStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: fileSizeLimit, files: MAX_ITEM_IMAGES_CREATE },
}).array("images", MAX_ITEM_IMAGES_CREATE); // 'images' from frontend FormData for new item

// Item Images - For Update (expects 'newImages' field for new files)
const MAX_ITEM_IMAGES_UPDATE = 5; // Should be consistent with create and frontend
const uploadItemImagesForUpdate = multer({
  storage: itemStorage, // Reuse same storage configuration
  fileFilter: imageFileFilter,
  limits: { fileSize: fileSizeLimit, files: MAX_ITEM_IMAGES_UPDATE },
}).array("newImages", MAX_ITEM_IMAGES_UPDATE); // 'newImages' from frontend FormData for item update

// Banner Image
const bannerStorage = createStorage("banners", "banner-image");
const uploadBannerImageMiddleware = multer({
  storage: bannerStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: fileSizeLimit },
}).single("bannerImage");

/**
 * Deletes a file from the uploads directory (works for both local and Vercel).
 * @param {string} relativePathFromUploadsDir - The path of the file relative to the UPLOADS_DIR.
 *                                               Example: "items/item-image-123.jpg"
 * @returns {Promise<boolean>} True if deletion was successful or file didn't exist, false on error.
 */
const deleteFile = async (relativePathFromUploadsDir) => {
  if (
    !relativePathFromUploadsDir ||
    typeof relativePathFromUploadsDir !== "string"
  ) {
    console.warn(
      "[Delete File] Invalid or missing relative path from uploads directory provided."
    );
    return false;
  }

  // UNIFIED CHANGE: Uses the dynamic ABSOLUTE_UPLOADS_DIR to find the correct file.
  const absolutePath = path.join(
    ABSOLUTE_UPLOADS_DIR,
    relativePathFromUploadsDir
  );

  console.log(`[Delete File] Attempting to delete: ${absolutePath}`);
  try {
    await fs.promises.access(absolutePath, fs.constants.F_OK); // Check if file exists
    await fs.promises.unlink(absolutePath); // Delete the file
    console.log(`[Delete File] Successfully deleted file: ${absolutePath}`);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") {
      console.log(
        `[Delete File] File not found (already deleted or invalid path?): ${absolutePath}`
      );
      return true; // Consider not found as a "successful" outcome for cleanup
    } else {
      console.error(
        `[Delete File] Error deleting file ${absolutePath}:`,
        error
      );
      return false; // Indicate failure
    }
  }
};

export {
  uploadUserProfile,
  uploadCategoryImage,
  uploadItemImagesForCreate, // Renamed for clarity
  uploadItemImagesForUpdate, // New specific middleware for updates
  uploadBannerImageMiddleware,
  deleteFile,
  ABSOLUTE_UPLOADS_DIR, // Export for potential use elsewhere if needed for constructing paths
  UPLOADS_DIR_NAME, // Export for constructing relative paths for DB storage
};