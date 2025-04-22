// backend/controllers/userProfileController.js
import asyncHandler from "express-async-handler";
import fs from "fs";
import path from "path";
import User from "../models/User.js";
import { setAuthCookies } from "../utils/cookieUtils.js"; // Import cookie utility
import { deleteFile } from "../config/multerConfig.js"; // Import file deletion utility
import { fileURLToPath } from "url";

// ES Module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
// Assumes controllers are in backend/controllers
const PROJECT_ROOT = path.resolve(path.dirname(__filename), "..");

// GET /api/profile - Get current logged-in user's profile
export const getUserProfile = asyncHandler(async (req, res) => {
  // verifyToken middleware already ran and attached req.user (User instance)
  if (!req.user) {
    res.status(404); // Should be caught by verifyToken, but double-check
    throw new Error("User not found.");
  }
  // Password excluded by schema 'select: false' by default
  res
    .status(200)
    .json({ success: true, user: req.user.toObject({ virtuals: true }) });
});

// PUT /api/profile - Update current user's profile
export const updateUserProfile = asyncHandler(async (req, res) => {
  const userId = req.userId; // Attached by verifyToken
  const updates = req.body;
  const currentUser = req.user; // Mongoose User document attached by verifyToken

  if (!currentUser) {
    res.status(401);
    throw new Error("Unauthorized: Cannot update profile.");
  }

  const allowedUpdates = ["displayName", "dob", "phone"];
  const finalUpdates = {};
  let needsVerificationReset = false;

  allowedUpdates.forEach((key) => {
    if (updates.hasOwnProperty(key)) {
      const newValue = updates[key];
      if (key === "dob") {
        const currentDob = currentUser.dob
          ? new Date(currentUser.dob).toISOString().split("T")[0]
          : null;
        const newDob = newValue
          ? new Date(newValue).toISOString().split("T")[0]
          : null;
        // Only update if different, allow setting to null
        if (newDob !== currentDob)
          finalUpdates[key] = newValue ? new Date(newValue) : null;
      } else if (key === "phone") {
        const newPhone = newValue?.trim() || null; // Standardize to null if empty/whitespace
        // Only update if different, allow setting to null
        if (newPhone !== (currentUser.phone || null)) {
          finalUpdates[key] = newPhone;
          // If changing or setting phone, verification status resets
          if (newPhone) {
            finalUpdates["isPhoneVerified"] = false;
            needsVerificationReset = true;
          } else {
            // If setting phone to null, clear verification status
            finalUpdates["isPhoneVerified"] = false;
          }
        }
      } else if (key === "displayName") {
        const newDisplayName = newValue?.trim();
        // Only update if provided and different from current display name or username (fallback)
        if (
          newDisplayName &&
          newDisplayName !== (currentUser.displayName || currentUser.username)
        ) {
          finalUpdates[key] = newDisplayName;
        }
      }
    }
  });

  // Check if any valid updates were found
  if (Object.keys(finalUpdates).length === 0) {
    return res.status(200).json({
      success: true,
      message: "No changes detected.",
      user: currentUser.toObject({ virtuals: true }),
    });
  }

  // Perform the update
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: finalUpdates },
    { new: true, runValidators: true, context: "query" } // Return updated doc, run validators
  );

  if (!updatedUser) {
    res.status(404);
    throw new Error("User not found during update.");
  }

  // --- Update the 'user' cookie ---
  const userDataForCookie = updatedUser.toObject({ virtuals: true });
  delete userDataForCookie.password;
  setAuthCookies(res, req.cookies.accessToken, userDataForCookie, false); // Update only user cookie

  res.status(200).json({
    success: true,
    message: `Profile updated.${
      needsVerificationReset ? " Phone verification may be required." : ""
    }`,
    user: userDataForCookie,
  });
});

// POST /api/profile/picture - Upload/Update profile picture
// Note: uploadUserProfile middleware runs first (defined in route)
export const uploadProfilePicture = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const currentUser = req.user; // User doc from verifyToken

  if (!req.file) {
    res.status(400);
    throw new Error("No image file was uploaded.");
  }
  if (!currentUser) {
    res.status(401);
    throw new Error("Unauthorized: Cannot upload picture.");
  }

  const relativePath = path.join("users", req.file.filename); // Path relative to uploads dir

  // Optional: Delete old picture if it was stored locally in our uploads
  const oldImagePath = currentUser.profilePicture;
  if (oldImagePath && oldImagePath.startsWith("users/")) {
    // Only delete if it points to our local user uploads
    await deleteFile(oldImagePath); // deleteFile expects path relative to uploads
  }

  // Update user in DB with the new relative path
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { profilePicture: relativePath }, // Store relative path
    { new: true }
  );

  if (!updatedUser) {
    // If user update failed, try to delete the newly uploaded file
    await deleteFile(relativePath);
    res.status(404);
    throw new Error("User not found during picture update.");
  }

  // --- Update the 'user' cookie ---
  const userDataForCookie = updatedUser.toObject({ virtuals: true });
  delete userDataForCookie.password;
  setAuthCookies(res, req.cookies.accessToken, userDataForCookie, false); // Update only user cookie

  res.status(200).json({
    success: true,
    message: "Profile picture updated successfully.",
    // Send back the *relative* path; frontend prepends base URL or handles static serving
    profilePicturePath: relativePath,
    user: userDataForCookie,
  });
});
