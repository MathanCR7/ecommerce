// backend/config/multerConfig.js
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// ES Module __dirname equivalent relative to this config file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Project Root (assuming config is in backend/config)
const PROJECT_ROOT = path.resolve(__dirname, "..");
const UPLOADS_DIR = path.join(PROJECT_ROOT, "uploads"); // Base uploads directory path

// --- Helper Functions ---
// Ensures a directory exists (absolute path)
const ensureDirExistsAbsolute = (absolutePath) => {
  if (!fs.existsSync(absolutePath)) {
    try {
      fs.mkdirSync(absolutePath, { recursive: true });
      console.log(`Created directory: ${absolutePath}`);
    } catch (err) {
      console.error(`Error creating directory ${absolutePath}:`, err);
      throw err; // Critical if upload dir can't be made
    }
  }
  return absolutePath;
};

// --- Storage Configurations ---
const createStorage = (destinationSubDir, filenamePrefix) => {
  // Ensure the specific subdirectory exists within the base 'uploads' directory
  const absoluteUploadPath = ensureDirExistsAbsolute(
    path.join(UPLOADS_DIR, destinationSubDir)
  );

  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, absoluteUploadPath); // Use the ensured absolute path
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const extension = path.extname(file.originalname);
      // Filename includes the prefix (e.g., 'item-12345.jpg')
      cb(null, `${filenamePrefix}-${uniqueSuffix}${extension}`);
    },
  });
};

// --- File Filter ---
const imageFileFilter = (req, file, cb) => {
  // Regular expression to test file mimetype for common image types
  const allowedImageTypes = /image\/(jpeg|jpg|png|gif|webp)/;
  if (allowedImageTypes.test(file.mimetype)) {
    cb(null, true); // Accept image
  } else {
    console.warn(
      `[Multer Filter] Rejected file type: ${file.mimetype} for ${file.originalname}`
    );
    // Create a specific error that the error handler can potentially identify
    const error = new Error(
      "Only image files (JPEG, PNG, WEBP, GIF) are allowed."
    );
    error.code = "INVALID_FILE_TYPE"; // Custom error code
    cb(error, false); // Reject file with a specific error
  }
};

// --- File Size Limit ---
const MAX_SIZE_MB = parseInt(process.env.MAX_FILE_UPLOAD_SIZE_MB || "5", 10);
const fileSizeLimit = MAX_SIZE_MB * 1024 * 1024; // Size in bytes

// --- Multer Instances ---

// For User Profile Pictures -> uploads/users/user-<uniqueId>.ext
const userStorage = createStorage("users", "user");
const uploadUserProfile = multer({
  storage: userStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: fileSizeLimit },
}).single("profilePicture"); // Field name expected from user profile form

// For Category Images -> uploads/categories/category-<uniqueId>.ext
const categoryStorage = createStorage("categories", "category");
const uploadCategoryImage = multer({
  storage: categoryStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: fileSizeLimit },
}).single("image"); // Field name expected from category form

// *** RENAMED: For Item Images -> uploads/items/item-<uniqueId>.ext ***
const itemStorage = createStorage("items", "item"); // Changed subDir and prefix
const uploadItemImage = multer({
  // Renamed multer instance
  storage: itemStorage, // Use itemStorage
  fileFilter: imageFileFilter,
  limits: { fileSize: fileSizeLimit },
}).single("image"); // Field name expected from item form (assuming it's also 'image')

// --- File Deletion Utility ---
// Takes path RELATIVE to the 'uploads' directory (e.g., "items/item-123.jpg")
const deleteFile = async (relativePath) => {
  if (!relativePath || typeof relativePath !== "string") {
    console.log("[Delete File] Invalid or missing relative path provided.");
    return false; // Indicate failure or invalid input
  }

  // Construct absolute path from the base uploads directory + relative path
  const absolutePath = path.join(UPLOADS_DIR, relativePath);
  console.log(`[Delete File] Attempting to delete: ${absolutePath}`);

  try {
    await fs.promises.access(absolutePath, fs.constants.F_OK); // Check existence using recommended mode F_OK
    await fs.promises.unlink(absolutePath); // Delete the file
    console.log(`[Delete File] Successfully deleted file: ${absolutePath}`);
    return true; // Indicate success
  } catch (error) {
    if (error.code === "ENOENT") {
      // File doesn't exist - often not a critical error during cleanup
      console.log(
        `[Delete File] File not found (already deleted or invalid path?): ${absolutePath}`
      );
    } else {
      // Log other errors (permissions, etc.)
      console.error(
        `[Delete File] Error deleting file ${absolutePath}:`,
        error
      );
    }
    return false; // Indicate failure
  }
};

// *** UPDATED EXPORT LIST ***
export {
  uploadUserProfile,
  uploadCategoryImage,
  uploadItemImage, // Export the renamed item image uploader
  deleteFile,
};
