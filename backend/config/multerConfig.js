// backend/config/multerConfig.js
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve PROJECT_ROOT one level up from 'config' directory
const PROJECT_ROOT = path.resolve(__dirname, "..", ".."); // Adjusted to go up two levels if config is inside backend
// If your project structure is backend/config, backend/uploads, backend/controllers etc., then:
// const PROJECT_ROOT = path.resolve(__dirname, ".."); // This would be correct

const UPLOADS_DIR_NAME = "uploads"; // Define the uploads directory name
const UPLOADS_DIR_PATH_FROM_BACKEND_ROOT = path.join(
  "backend",
  UPLOADS_DIR_NAME
); // Path relative to project root for deletion
const ABSOLUTE_UPLOADS_DIR = path.join(
  PROJECT_ROOT,
  UPLOADS_DIR_PATH_FROM_BACKEND_ROOT
);

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
      throw err; // Propagate error to stop server initialization if critical
    }
  }
  return absolutePath;
};

// Initialize base UPLOADS_DIR on module load
ensureDirExistsAbsolute(ABSOLUTE_UPLOADS_DIR);

const createStorage = (destinationSubDir, filenamePrefix) => {
  const absoluteUploadPathWithSubDir = ensureDirExistsAbsolute(
    path.join(ABSOLUTE_UPLOADS_DIR, destinationSubDir)
  );
  return multer.diskStorage({
    destination: (req, file, cb) => {
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
 * Deletes a file from the uploads directory.
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

  // Construct absolute path from the base ABSOLUTE_UPLOADS_DIR
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
