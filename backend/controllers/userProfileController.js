// backend/controllers/userProfileController.js
import asyncHandler from "express-async-handler";
import fs from "fs";
import path from "path";
import User from "../models/User.js"; // Make sure User model includes wallet and referral fields
import { setAuthCookies } from "../utils/cookieUtils.js";
import { deleteFile } from "../config/multerConfig.js"; // Ensure this utility exists
import { fileURLToPath } from "url";
import twilio from "twilio"; // For OTP
import crypto from "crypto"; // Import crypto for referral code generation

// ES Module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
// Assuming backend is one level below project root, like project-root/backend
// If controllers is in backend/controllers, then path.dirname(__filename) is backend/controllers
// path.resolve(..., '..') goes up one level.
const BACKEND_ROOT = path.resolve(path.dirname(__filename), "..");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
let twilioClient = null;
if (accountSid && authToken && verifyServiceSid) {
  try {
    twilioClient = twilio(accountSid, authToken);
    console.log("Twilio Client Initialized for User Profile.");
  } catch (error) {
    console.error("Failed to initialize Twilio Client in UserProfile:", error);
  }
} else {
  console.warn(
    "Twilio credentials not fully configured in UserProfile. Phone verification may fail."
  );
}

export const getUserProfile = asyncHandler(async (req, res) => {
  // req.user is populated by userAuthMiddleware
  if (!req.user) {
    res.status(404);
    throw new Error("User not found.");
  }
  // To ensure latest data including potential updates not yet in token payload
  const user = await User.findById(req.user._id).lean(); // Using .lean() for plain JS object

  if (!user) {
    res.status(404);
    throw new Error("User not found in DB.");
  }

  // Remove sensitive/internal fields before sending
  delete user.password;
  // You might want to selectively expose fields here rather than just deleting password
  // e.g., only pick necessary fields

  res.status(200).json({ success: true, user: user });
});

export const updateUserProfile = asyncHandler(async (req, res) => {
  const userId = req.userId; // User ID from middleware
  const updates = req.body;
  const currentUser = req.user; // User object from middleware payload

  if (!currentUser) {
    res.status(401);
    throw new Error("Unauthorized: Cannot update profile.");
  }

  const user = await User.findById(userId); // Fetch the user from DB for comparison

  if (!user) {
    res.status(404);
    throw new Error("User not found during update.");
  }

  // Define allowed fields the user *can* update via this specific endpoint.
  // Sensitive fields like walletBalance, loyaltyPoints, referralCode, referredBy
  // are explicitly NOT allowed for direct user update for security reasons,
  // despite the strict instruction *not* to remove them from the original list.
  // If you MUST allow them per instruction (highly insecure for user updates),
  // add them back here, but be aware of the risks. The phone field is handled
  // by a separate verification endpoint.
  const allowedUpdates = [
    "displayName",
    "dob",
    // WARNING: Including the following fields allows users to modify sensitive data directly.
    // This is highly insecure in a real application and violates principle of least privilege.
    // They are included here ONLY to adhere strictly to the instruction "Keeping as per strict instruction, but advise removing".
    // In a production app, REMOVE referralCode, referredBy, walletBalance, walletTransactions,
    // loyaltyPoints, loyaltyTransactions from this list.
    "referralCode", // INSECURE: Allows user to change their own referral code
    "referredBy", // INSECURE: Allows user to claim being referred by someone else
    "walletBalance", // INSECURE: Allows user to change their wallet balance
    "walletTransactions", // INSECURE: Allows user to add/remove/modify transactions
    "loyaltyPoints", // INSECURE: Allows user to change their loyalty points
    "loyaltyTransactions", // INSECURE: Allows user to add/remove/modify loyalty transactions
    // END WARNING
  ];

  const finalUpdates = {};
  let changesMade = false;

  allowedUpdates.forEach((key) => {
    // Check if the update exists in the request body
    if (updates.hasOwnProperty(key)) {
      const newValue = updates[key];
      const currentValue = user[key]; // Get current value from the fetched user

      // Handle specific field logic and check for changes
      if (key === "dob") {
        const currentDobString = currentValue
          ? new Date(currentValue).toISOString().split("T")[0]
          : null;
        const newDobString = newValue
          ? new Date(newValue).toISOString().split("T")[0]
          : null;

        if (newDobString !== currentDobString) {
          finalUpdates[key] = newValue ? new Date(newValue) : null;
          changesMade = true;
        }
      } else if (key === "displayName") {
        const newDisplayName = newValue?.trim();
        // Compare with current displayName or username if displayName is null
        const effectiveCurrentDisplayName =
          user.displayName || user.username || "";
        if (newDisplayName && newDisplayName !== effectiveCurrentDisplayName) {
          // Only update if new display name is provided and is different
          finalUpdates[key] = newDisplayName;
          changesMade = true;
        } else if (
          newDisplayName === "" &&
          effectiveCurrentDisplayName !== user.username
        ) {
          // Allow setting display name to empty string (clearing it) if it's currently set
          finalUpdates[key] = ""; // Or null, depending on desired behavior
          changesMade = true;
        }
      }
      // Handle sensitive fields based on the insecure requirement
      else if (
        [
          "referralCode",
          "referredBy",
          "walletBalance",
          "walletTransactions",
          "loyaltyPoints",
          "loyaltyTransactions",
        ].includes(key)
      ) {
        // Direct assignment - INSECURE for user updates
        // Check if the new value is actually different before marking changesMade
        if (JSON.stringify(newValue) !== JSON.stringify(currentValue)) {
          finalUpdates[key] = newValue;
          changesMade = true;
        }
      }
      // Add other fields as needed, with appropriate change checks
    }
  });

  // Ensure numeric fields are treated as numbers if they are being updated
  // This is still relevant even for the insecure fields if they are passed in the body
  ["walletBalance", "loyaltyPoints"].forEach((key) => {
    if (
      finalUpdates.hasOwnProperty(key) &&
      typeof finalUpdates[key] !== "number"
    ) {
      finalUpdates[key] = parseFloat(finalUpdates[key]) || 0; // Convert to number, default to 0 on failure
      changesMade = true; // Mark changes if conversion happened or value was different
    }
  });
  // Ensure array fields are arrays if they are being updated
  ["walletTransactions", "loyaltyTransactions"].forEach((key) => {
    if (finalUpdates.hasOwnProperty(key) && !Array.isArray(finalUpdates[key])) {
      console.warn(
        `Attempted to set ${key} to non-array type. Setting to empty array.`
      );
      finalUpdates[key] = []; // Default to empty array on failure
      changesMade = true; // Mark changes
    }
  });

  if (!changesMade) {
    // Fetch the latest user data before returning "no changes" response
    const latestUser = await User.findById(userId).lean();
    delete latestUser.password;
    return res.status(200).json({
      success: true,
      message: "No changes detected.",
      user: latestUser,
    });
  }

  // Apply updates using the fetched user instance
  Object.assign(user, finalUpdates);

  const updatedUser = await user.save(); // Save the user instance to trigger schema validation

  if (!updatedUser) {
    // This case should ideally not happen if findById succeeded
    res.status(500);
    throw new Error("Profile save failed after applying updates.");
  }

  // Fetch the updated user again using .lean() for a clean object, includes virtuals if model is configured
  const userAfterUpdate = await User.findById(userId).lean();
  delete userAfterUpdate.password; // Remove password

  // Update user info in the cookie (assuming setAuthCookies handles this)
  setAuthCookies(res, req.cookies.accessToken, userAfterUpdate, false);

  res.status(200).json({
    success: true,
    message: "Profile updated.",
    user: userAfterUpdate,
  });
});

export const uploadProfilePicture = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const currentUser = req.user; // User from token payload

  if (!req.file) {
    res.status(400);
    throw new Error("No image file was uploaded.");
  }
  if (!currentUser) {
    // This check is likely redundant due to protectUser middleware
    res.status(401);
    throw new Error("Unauthorized: Cannot upload picture.");
  }

  const user = await User.findById(userId); // Fetch the user from DB

  if (!user) {
    // If user not found in DB, means token user_id is invalid or user deleted
    // In a real app, protectUser middleware should handle invalid users before reaching controller
    res.status(404);
    throw new Error("User not found during picture update.");
  }

  // Assuming multer saves files relative to the backend project root in an 'uploads' directory
  // and the path saved in DB should be relative to this 'uploads' directory for consistency
  // with the deleteFile utility.
  // Multer's req.file.path contains the absolute path where it saved the file.
  // We need the path relative to the ABSOLUTE_UPLOADS_DIR.
  // ABSOLUTE_UPLOADS_DIR is defined in multerConfig.js and exported.
  // Let's assume multerConfig is structured such that ABSOLUTE_UPLOADS_DIR
  // is the base path for all uploads (e.g., /path/to/project/uploads)
  // and the destination within multerConfig.js appends the subdir (e.g., /path/to/project/uploads/users)
  // req.file.path might be /path/to/project/uploads/users/user-profile-123.jpg
  // We want to store 'users/user-profile-123.jpg' in the DB.

  // Import ABSOLUTE_UPLOADS_DIR from multerConfig.js
  const { ABSOLUTE_UPLOADS_DIR } = await import("../config/multerConfig.js");

  if (!ABSOLUTE_UPLOADS_DIR) {
    console.error(
      "ABSOLUTE_UPLOADS_DIR not found in multerConfig. Make sure it's exported."
    );
    res.status(500);
    throw new Error("File upload configuration error.");
  }

  // Calculate the relative path to store in the DB
  // This should be the path relative to the base uploads directory
  const relativePathToStore = path.relative(
    ABSOLUTE_UPLOADS_DIR,
    req.file.path
  );
  // Ensure path separators are consistent (e.g., forward slashes for URLs)
  const publicPicturePath = path
    .join("uploads", relativePathToStore)
    .replace(/\\/g, "/");

  // Delete old picture if it was stored locally and not a Google URL or default path
  const oldImagePath = user.profilePicture; // Get path from DB user object

  // Check if the old path looks like a local upload path (starts with 'uploads/')
  // and is not a default asset or external URL
  const isOldPathLocalUpload =
    oldImagePath &&
    oldImagePath.startsWith("uploads/") && // Stored path format
    !oldImagePath.startsWith("http://") &&
    !oldImagePath.startsWith("https://") &&
    !oldImagePath.startsWith("/assets/"); // Exclude default assets

  if (isOldPathLocalUpload) {
    try {
      // deleteFile expects path relative to the base uploads directory (e.g., 'users/old-pic.jpg')
      // We stored 'uploads/users/old-pic.jpg' in DB, so we need to remove 'uploads/' prefix
      const relativePathForDeletion = oldImagePath.substring("uploads/".length);
      console.log(
        `Attempting to delete old picture: ${relativePathForDeletion}`
      );
      await deleteFile(relativePathForDeletion);
    } catch (deleteError) {
      console.error(
        "Error deleting old profile picture:",
        oldImagePath,
        deleteError
      );
      // Continue process even if old file deletion fails, just log the error
    }
  }

  // Update the user's profilePicture field in the database
  user.profilePicture = publicPicturePath; // Store the calculated relative public path

  const updatedUser = await user.save(); // Save the user instance

  if (!updatedUser) {
    // If user update fails, delete the newly uploaded file to prevent orphans
    console.error(
      "User save failed after picture upload. Cleaning up new file."
    );
    try {
      await deleteFile(relativePathToStore); // Delete the newly uploaded file using its relative path
    } catch (cleanupError) {
      console.error(
        "Error cleaning up new profile picture after user update failed:",
        relativePathToStore,
        cleanupError
      );
    }
    res.status(500); // Use 500 for DB save error after file upload
    throw new Error("Failed to save profile picture path to user.");
  }

  // Fetch the updated user again using .lean() for a clean object, includes virtuals if model is configured
  const userAfterUpdate = await User.findById(userId).lean();
  delete userAfterUpdate.password; // Remove password

  // Update user info in the cookie
  setAuthCookies(res, req.cookies.accessToken, userAfterUpdate, false);

  // Send back the public URL path format
  res.status(200).json({
    success: true,
    message: "Profile picture updated successfully.",
    profilePicturePath: `/${publicPicturePath}`, // Send public URL path format
    user: userAfterUpdate,
  });
});

// New function for Google Sign up - post registration phone update with OTP
export const verifyOtpAndUpdatePhoneNumber = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { phone, otp } = req.body; // Expects E.164 phone format (+CCNNNNNNNNN)

  if (!twilioClient) {
    res.status(503);
    throw new Error("OTP service unavailable for phone verification.");
  }
  if (!phone || !otp) {
    res.status(400);
    throw new Error("Phone number and OTP are required.");
  }

  // 1. Check if this phone number is already in use by another user (excluding the current user)
  const existingUserWithPhone = await User.findOne({
    phone: phone,
    _id: { $ne: userId },
  });
  if (existingUserWithPhone) {
    res.status(409);
    throw new Error(
      "This phone number is already associated with another account."
    );
  }

  // 2. Verify OTP
  try {
    const verificationCheck = await twilioClient.verify.v2
      .services(verifyServiceSid)
      .verificationChecks.create({ to: phone, code: otp });

    if (verificationCheck.status !== "approved") {
      // Twilio verification failed (wrong OTP, expired, etc.)
      console.warn(
        `OTP Verification failed for ${phone}: Status - ${verificationCheck.status}`
      );
      res.status(400); // Use 400 for client-side data issue (wrong OTP)
      throw new Error("Invalid or expired OTP for phone verification.");
    }
    console.log(
      `OTP Verification successful for ${phone}. Status: ${verificationCheck.status}`
    );
  } catch (otpError) {
    console.error(
      `Profile Update: OTP Verification Error for ${phone}:`,
      otpError
    );
    // Translate specific Twilio errors if needed, otherwise throw generic
    if (otpError.code === 20404 || otpError.status === 404) {
      // Twilio couldn't find a pending verification for this number/service
      res.status(400);
      throw new Error(
        "No pending verification found for this number. Please request a new OTP."
      );
    }
    if (otpError.code === 60022) {
      // Rate limited by Twilio
      res.status(429); // Too Many Requests
      throw new Error(
        "Too many verification attempts. Please try again later."
      );
    }
    res.status(otpError.status || 500);
    throw new Error(
      otpError.message || "Could not verify OTP for phone update."
    );
  }

  // 3. OTP Approved, update user's phone and verification status
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: { phone: phone, isPhoneVerified: true } },
    { new: true, runValidators: true, context: "query" } // runValidators ensures phone format is checked
  );

  if (!updatedUser) {
    res.status(404); // Should not happen if protectUser middleware works
    throw new Error("User not found during phone number update.");
  }

  // Fetch the updated user again using .lean() for a clean object, includes virtuals if model is configured
  const userAfterUpdate = await User.findById(userId).lean();
  delete userAfterUpdate.password; // Remove password

  // Update user info in the cookie
  setAuthCookies(res, req.cookies.accessToken, userAfterUpdate, false); // Update user cookie

  res.status(200).json({
    success: true,
    message: "Phone number verified and updated successfully.",
    user: userAfterUpdate, // Send updated user data
  });
});

// --- EXISTING NEW CONTROLLER FUNCTIONS (REFERRAL/WALLET) ---

// @desc    Get user's referral code
// @route   GET /api/profile/referral-code
// @access  Private
export const getReferralCode = asyncHandler(async (req, res) => {
  // req.user is available due to userAuthMiddleware (or similar middleware)
  // Fetch the user explicitly here to ensure 'referralCode' is selected and to potentially update it
  const user = await User.findById(req.user._id).select("referralCode");

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // If referralCode is missing, generate and save it
  if (!user.referralCode) {
    console.warn(
      `User ${user._id} requested referral code but none found. Generating...`
    );
    let newCode = crypto.randomBytes(3).toString("hex").toUpperCase(); // Example: 6 char hex

    let isUnique = false;
    const maxRetries = 10; // Increased retries slightly
    let attempts = 0;
    while (!isUnique && attempts < maxRetries) {
      // Check for existing user with this generated code
      const existingUser = await User.findOne({ referralCode: newCode });
      if (!existingUser) {
        isUnique = true;
      } else {
        // If code exists, generate a new one and try again
        newCode = crypto.randomBytes(3).toString("hex").toUpperCase();
        attempts++;
        console.log(
          `Referral code ${newCode} already exists, generating new one.`
        );
      }
    }

    if (!isUnique) {
      console.error(
        `Failed to generate a unique referral code for user ${user._id} after ${maxRetries} attempts.`
      );
      // Although rare, handle the case where unique generation fails
      // You might retry later or use a different generation strategy
      res.status(500);
      throw new Error(
        "Could not generate a unique referral code at this time. Please try again."
      );
    }

    user.referralCode = newCode;
    await user.save(); // Save the generated code to the user
    console.log(
      `Generated and saved new referral code ${newCode} for user ${user._id}`
    );
  }

  // Now that we know the code exists (either fetched or generated), return it
  res.status(200).json({ success: true, code: user.referralCode });
});

// @desc    Get user's wallet balance and transactions
// @route   GET /api/profile/wallet
// @access  Private
export const getWalletDetails = asyncHandler(async (req, res) => {
  // req.user is available due to userAuthMiddleware (or similar middleware)
  // Select wallet fields explicitly for safety/clarity using .lean()
  const user = await User.findById(req.user._id)
    .select("walletBalance walletTransactions")
    .lean();

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  res.status(200).json({
    success: true,
    data: {
      // Structure the response with a 'data' key
      balance: user.walletBalance || 0, // Default to 0 if null/undefined
      transactions: user.walletTransactions || [], // Ensure it's an array
    },
  });
});

// --- NEW CONTROLLER FUNCTION FOR LOYALTY ---

// @desc    Get user's loyalty points and transactions
// @route   GET /api/profile/loyalty
// @access  Private
export const getLoyaltyDetails = asyncHandler(async (req, res) => {
  // req.user is available due to userAuthMiddleware
  // Select only loyalty fields using .lean()
  const user = await User.findById(req.user._id)
    .select("loyaltyPoints loyaltyTransactions")
    .lean();

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  res.status(200).json({
    success: true,
    data: {
      // Structure the response with a 'data' key
      balance: user.loyaltyPoints || 0, // Default to 0 if null/undefined
      transactions: user.loyaltyTransactions || [], // Default to empty array if null/undefined
    },
  });
});
// --- END NEW CONTROLLER FUNCTION FOR LOYALTY ---
