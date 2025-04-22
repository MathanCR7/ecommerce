// backend/middleware/validators.js
import { body, param, validationResult } from "express-validator";
import mongoose from "mongoose"; // Import mongoose if using isMongoId

// Middleware to handle validation results from express-validator
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Log the validation errors for debugging on the server
    console.error("Validation Errors:", JSON.stringify(errors.array()));
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next(); // Proceed if no errors
};

// --- Validation Rule Sets ---

// == User Authentication Validators ==
// (Keeping User validators as they were, assuming they are correct for your user flow)
export const validateUserSignup = [
  body("username")
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be 3-30 characters.")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage(
      "Username can only contain letters, numbers, and underscores."
    ),
  body("email")
    .trim()
    .isEmail()
    .withMessage("Please provide a valid email address.")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long."),
  body("phone")
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^\+91[6-9]\d{9}$/) // Example: Specific Indian format validation
    .withMessage("Invalid phone number format (e.g., +91XXXXXXXXXX required)."),
  body("dob")
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage("Invalid Date of Birth format (YYYY-MM-DD required).")
    .toDate(),
  body("otp") // If OTP is part of initial signup
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 4, max: 6 })
    .withMessage("OTP must be 4-6 digits.")
    .isNumeric()
    .withMessage("OTP must be numeric."),
];
export const validateUserLogin = [
  body("loginIdentifier")
    .trim()
    .notEmpty()
    .withMessage("Username, email, or phone is required."),
  body("password").notEmpty().withMessage("Password is required."),
];

// == User Profile Validators ==
export const validateUserProfileUpdate = [
  body("displayName")
    .optional()
    .trim()
    .escape() // Sanitize against XSS
    .isLength({ min: 1, max: 50 })
    .withMessage("Display name must be 1-50 characters if provided."),
  body("dob")
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage("Invalid Date of Birth format (YYYY-MM-DD required).")
    .toDate(),
  body("phone")
    .optional({ checkFalsy: true })
    .trim()
    .if(body("phone").notEmpty()) // Only validate if phone is not empty
    .matches(/^\+91[6-9]\d{9}$/) // Example: Specific Indian format validation
    .withMessage("Invalid phone number format (e.g., +91XXXXXXXXXX required)."),
  // Prevent critical fields from being updated via this route
  body("email").not().exists().withMessage("Email cannot be updated here."),
  body("username")
    .not()
    .exists()
    .withMessage("Username cannot be updated here."),
  body("password")
    .not()
    .exists()
    .withMessage("Password cannot be updated here."),
  body("isPhoneVerified")
    .not()
    .exists()
    .withMessage("Verification status cannot be set directly."),
  body("googleId").not().exists().withMessage("Google ID cannot be changed."),
];

// == Admin Authentication Validators ==
export const validateAdminRegister = [
  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required.")
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be 3-30 characters.")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Username can only contain letters, numbers, underscores."),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long."),
  body("mobileNumber")
    .trim()
    .notEmpty()
    .withMessage("Mobile number is required.")
    .matches(/^\+91[6-9]\d{9}$/) // Example: Specific Indian format validation
    .withMessage("Valid Indian mobile number (+91XXXXXXXXXX) is required."),
  body("email")
    .optional({ checkFalsy: true }) // Optional, but validate if provided
    .trim()
    .isEmail()
    .withMessage("Invalid email format provided.")
    .normalizeEmail(),
  body("firstName").optional().trim().escape(),
  body("lastName").optional().trim().escape(),
  body("role") // Optional role during registration
    .optional()
    .isIn(["Admin", "SuperAdmin", "ContentManager", "Support", "Viewer"])
    .withMessage("Invalid role specified."),
];
export const validateAdminLogin = [
  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username or email is required."),
  body("password").notEmpty().withMessage("Password is required."),
];

// == OTP Validators ==

// Validator specifically for User Send OTP (expects 'phone')
export const validateUserSendOtp = [
  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required.")
    .matches(/^\+91[6-9]\d{9}$/) // Example: Specific Indian format validation
    .withMessage("Invalid phone number format (e.g., +91XXXXXXXXXX required)."),
];

// Validator specifically for Admin Send OTP (expects 'mobileNumber')
export const validateAdminSendOtp = [
  body("mobileNumber")
    .trim()
    .notEmpty()
    .withMessage("Mobile number is required.")
    .matches(/^\+91[6-9]\d{9}$/) // Example: Specific Indian format validation
    .withMessage(
      "Invalid mobile number format (e.g., +91XXXXXXXXXX required)."
    ),
];

// Validator specifically for User Verify OTP (expects 'phone' and 'otp')
export const validateUserVerifyOtp = [
  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required.")
    .matches(/^\+91[6-9]\d{9}$/) // Example: Specific Indian format validation
    .withMessage("Invalid phone number format (e.g., +91XXXXXXXXXX required)."),
  body("otp")
    .trim()
    .isNumeric()
    .withMessage("OTP must be numeric.")
    .isLength({ min: 4, max: 6 })
    .withMessage("OTP must be 4-6 digits."), // Adjust length as needed
];

// Validator specifically for Admin Verify OTP (expects 'mobileNumber' and 'otp')
export const validateAdminVerifyOtp = [
  body("mobileNumber")
    .trim()
    .notEmpty()
    .withMessage("Mobile number is required.")
    .matches(/^\+91[6-9]\d{9}$/) // Example: Specific Indian format validation
    .withMessage(
      "Invalid mobile number format (e.g., +91XXXXXXXXXX required)."
    ),
  body("otp")
    .trim()
    .isNumeric()
    .withMessage("OTP must be numeric.")
    .isLength({ min: 6, max: 6 })
    .withMessage("OTP must be 6 digits."), // Assuming 6 digits for Admin Twilio Verify
];

// == Admin CRUD Validators ==

// --- Category Validator ---
export const validateCategory = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Category name is required.")
    .isLength({ max: 100 })
    .withMessage("Category name cannot exceed 100 characters."),
  body("description")
    .optional() // Description is optional
    .trim()
    .escape() // Sanitize description
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters."),
];

// --- Item Validator (RENAMED from validateProduct) ---
export const validateItem = [
  // <-- RENAMED HERE
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Item name is required.") // Updated message
    .isLength({ max: 150 })
    .withMessage("Item name cannot exceed 150 characters."), // Updated message
  body("sku")
    .optional({ nullable: true, checkFalsy: true }) // Allow null or empty string
    .trim()
    .escape()
    .isLength({ max: 50 })
    .withMessage("SKU cannot exceed 50 characters."), // Example max length
  body("description")
    .optional() // Description is optional
    .trim()
    .escape() // Sanitize description
    .isLength({ max: 2000 })
    .withMessage("Item description cannot exceed 2000 characters."), // Updated message
  body("price")
    .notEmpty()
    .withMessage("Item price is required.") // Updated message
    .isFloat({ gt: 0 })
    .withMessage("Price must be a positive number.") // Ensures price > 0
    .toFloat(), // Convert to float
  body("stock")
    .notEmpty()
    .withMessage("Stock quantity is required.")
    .isInt({ min: 0 })
    .withMessage("Stock must be a non-negative integer.") // Allow 0 stock
    .toInt(), // Convert to integer
  body("categoryId")
    .notEmpty()
    .withMessage("Category ID is required.")
    .isMongoId()
    .withMessage("Invalid Category ID format."), // Validate if it's a valid MongoDB ObjectId
  body("status")
    .optional() // Status is optional, defaults on backend if not provided
    .isIn(["active", "inactive", "discontinued", "out-of-stock"])
    .withMessage(
      "Invalid status value. Must be one of: active, inactive, discontinued, out-of-stock."
    ),
];
