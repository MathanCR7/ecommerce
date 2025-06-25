// backend/middleware/validators.js
import { body, param, validationResult } from "express-validator";
import mongoose from "mongoose";

export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error("Validation Errors:", JSON.stringify(errors.array()));
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};
// backend/middleware/validators.js

// ... other imports and functions ...

export const validateUserSignup = [
  body("username")
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be 3-30 characters."),
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required.")
    .isEmail()
    .withMessage("Invalid email format provided.")
    .normalizeEmail(),
  body("password")
    .notEmpty()
    .withMessage("Password is required.")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long."),
  body("phone")
    .optional({ checkFalsy: true })
    .trim()
    .if(body("phone").notEmpty())
    // FIX: Correct regex for E.164 phone format
    .matches(/^\+[1-9]\d{1,14}$/)
    .withMessage(
      "Invalid phone number format (E.164 format required, e.g., +911234567890)."
    ),
  // Conditional validation: require OTP if phone is provided
  body("otp")
    .optional({ checkFalsy: true }) // Still optional overall
    .trim()
    // Require OTP only if phone is present and not empty
    .if(body("phone").notEmpty())
    .notEmpty()
    .withMessage("OTP is required for phone verification.")
    .isLength({ min: 4, max: 6 })
    .withMessage("OTP must be 4-6 digits.")
    .isNumeric()
    .withMessage("OTP must be numeric."),
  body("dob")
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage("Invalid Date of Birth format (YYYY-MM-DD required).")
    .toDate(),
  body("displayName")
    .optional()
    .trim()
    .escape()
    .isLength({ max: 50 })
    .withMessage("Display name cannot exceed 50 characters."),
];

// ... rest of the validators ...
export const validateUserLogin = [
  body("loginIdentifier")
    .trim()
    .notEmpty()
    .withMessage("Username, email, or phone is required."),
  body("password").notEmpty().withMessage("Password is required."),
];

export const validateUserProfileUpdate = [
  body("displayName")
    .optional()
    .trim()
    .escape()
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
    .if(body("phone").notEmpty())
    .matches(/^\+[1-9]\d{1,14}$/)
    .withMessage(
      "Invalid phone number format (e.164 format required, e.g., +91XXXXXXXXXX)."
    ),
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
    .withMessage("Verification status cannot be set directly here."),
  body("googleId").not().exists().withMessage("Google ID cannot be changed."),
];

export const validateUserSendOtp = [
  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required.")
    .matches(/^\+[1-9]\d{1,14}$/)
    .withMessage(
      "Invalid phone number format (e.164 format required, e.g., +91XXXXXXXXXX)."
    ),
];

export const validateVerifyOtpAndUpdatePhone = [
  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required.")
    .matches(/^\+[1-9]\d{1,14}$/)
    .withMessage(
      "Invalid phone number format (e.164 format required, e.g., +91XXXXXXXXXX)."
    ),
  body("otp")
    .trim()
    .isNumeric()
    .withMessage("OTP must be numeric.")
    .isLength({ min: 4, max: 6 })
    .withMessage("OTP must be 4-6 digits."),
];

// --- PASSWORD MANAGEMENT VALIDATORS for User ---
export const validateChangePassword = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required.")
    .isLength({ min: 1 })
    .withMessage("Current password cannot be empty."),
  body("newPassword")
    .notEmpty()
    .withMessage("New password is required.")
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters long.")
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error(
          "New password cannot be the same as the current password."
        );
      }
      return true;
    }),
];

export const validateForgotPassword = [
  body("identifier")
    .notEmpty()
    .withMessage("Email or phone number is required.")
    .trim()
    .custom((value) => {
      const isEmail = /\S+@\S+\.\S+/.test(value);
      const isPhone = /^\+[1-9]\d{1,14}$/.test(value); // E.164 format
      if (!isEmail && !isPhone) {
        throw new Error(
          "Please provide a valid email address or phone number in E.164 format (e.g., +911234567890)."
        );
      }
      return true;
    }),
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
    .matches(/^\+91[6-9]\d{9}$/)
    .withMessage("Valid Indian mobile number (+91XXXXXXXXXX) is required."),
  body("email")
    .optional({ checkFalsy: true })
    .trim()
    .isEmail()
    .withMessage("Invalid email format provided.")
    .normalizeEmail(),
  body("firstName").optional().trim().escape(),
  body("lastName").optional().trim().escape(),
  body("role")
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

// == OTP Validators == (Admin specific)
export const validateAdminSendOtp = [
  body("mobileNumber")
    .trim()
    .notEmpty()
    .withMessage("Mobile number is required.")
    .matches(/^\+91[6-9]\d{9}$/)
    .withMessage(
      "Invalid mobile number format (e.g., +91XXXXXXXXXX required)."
    ),
];
export const validateAdminVerifyOtp = [
  body("mobileNumber")
    .trim()
    .notEmpty()
    .withMessage("Mobile number is required.")
    .matches(/^\+91[6-9]\d{9}$/)
    .withMessage(
      "Invalid mobile number format (e.g., +91XXXXXXXXXX required)."
    ),
  body("otp")
    .trim()
    .isNumeric()
    .withMessage("OTP must be numeric.")
    .isLength({ min: 6, max: 6 })
    .withMessage("OTP must be 6 digits."),
];

// == Admin CRUD Validators ==
export const validateCategory = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Category name is required.")
    .isLength({ max: 100 })
    .withMessage("Category name cannot exceed 100 characters."),
  body("description")
    .optional()
    .trim()
    .escape()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters."),
];
// Corrected validateItem to match frontend fields and model logic
export const validateItem = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Item name is required.")
    .isLength({ max: 150 })
    .withMessage("Item name cannot exceed 150 characters."),
  body("sku")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage("SKU cannot exceed 50 characters."),
  body("shortDescription")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage("Short description cannot exceed 500 characters."),
  body("description")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 5000 })
    .withMessage("Item description cannot exceed 5000 characters."),
  body("mrp")
    .notEmpty()
    .withMessage("MRP is required.")
    .isString()
    .withMessage("MRP must be a string from form data.") // Ensure it's a string first
    .custom((valStr) => {
      // Then validate its content
      if (isNaN(parseFloat(valStr)) || parseFloat(valStr) <= 0) {
        throw new Error("MRP must be a positive number.");
      }
      return true;
    })
    .toFloat(),
  body("discountType")
    .notEmpty()
    .withMessage("Discount type is required.")
    .isIn(["percentage", "fixed"])
    .withMessage("Invalid discount type. Must be 'percentage' or 'fixed'."),
  body("discountValue")
    .notEmpty()
    .withMessage("Discount value is required.")
    .isString()
    .withMessage("Discount value must be a string from form data.")
    .custom((valStr) => {
      if (isNaN(parseFloat(valStr)) || parseFloat(valStr) < 0) {
        throw new Error("Discount value must be a non-negative number.");
      }
      return true;
    })
    .toFloat(),
  body("manageStock")
    .notEmpty()
    .withMessage("Manage stock status is required.")
    .isString()
    .withMessage("Manage stock must be a string 'true' or 'false'.")
    .custom((value) => {
      if (value !== "true" && value !== "false") {
        throw new Error("Manage stock must be 'true' or 'false'.");
      }
      return true;
    }),
  body("stock")
    .custom((value, { req }) => {
      const manageStock = req.body.manageStock === "true";
      if (manageStock) {
        if (
          value === undefined ||
          value === null ||
          (typeof value === "string" && value.trim() === "")
        ) {
          throw new Error("Stock quantity is required when managing stock.");
        }
        const valStr = String(value); // Ensure it's a string for regex test
        if (!/^\d+$/.test(valStr.trim())) {
          throw new Error(
            "Stock must be an integer string when managing stock."
          );
        }
        const intValue = parseInt(valStr.trim(), 10);
        if (isNaN(intValue) || intValue < 0) {
          throw new Error(
            "Stock must be a non-negative integer when managing stock."
          );
        }
      }
      return true;
    })
    .customSanitizer((value) => {
      if (value === undefined || value === null) return undefined;
      const valStr = String(value);
      return valStr.trim() === "" ? undefined : parseInt(valStr.trim(), 10);
    }),
  body("lowStockThreshold")
    .optional({ nullable: true, checkFalsy: true })
    .custom((value, { req }) => {
      const manageStock = req.body.manageStock === "true";
      if (manageStock && value !== undefined && value !== null) {
        const valStr = String(value);
        if (valStr.trim() !== "") {
          if (!/^\d+$/.test(valStr.trim())) {
            throw new Error("Low stock threshold must be an integer string.");
          }
          const intValue = parseInt(valStr.trim(), 10);
          if (isNaN(intValue) || intValue < 0) {
            throw new Error(
              "Low stock threshold must be a non-negative integer."
            );
          }
        }
      }
      return true;
    })
    .customSanitizer((value) => {
      if (value === undefined || value === null) return undefined;
      const valStr = String(value);
      return valStr.trim() === "" ? undefined : parseInt(valStr.trim(), 10);
    }),
  body("isTaxable")
    .notEmpty()
    .withMessage("Taxable status is required.")
    .isString()
    .withMessage("Is taxable must be a string 'true' or 'false'.")
    .custom((value) => {
      if (value !== "true" && value !== "false") {
        throw new Error("Is taxable must be 'true' or 'false'.");
      }
      return true;
    }),
  body("cgstRate")
    .optional({ nullable: true, checkFalsy: true })
    .custom((value, { req }) => {
      const isTaxable = req.body.isTaxable === "true";
      if (
        isTaxable &&
        (value === undefined || value === null || String(value).trim() === "")
      ) {
        throw new Error("CGST Rate is required when item is taxable.");
      }
      if (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
      ) {
        const floatValue = parseFloat(String(value).trim());
        if (isNaN(floatValue) || floatValue < 0) {
          throw new Error("CGST Rate must be a non-negative number.");
        }
      }
      return true;
    })
    .customSanitizer((value) => {
      if (value === undefined || value === null) return undefined;
      const valStr = String(value);
      return valStr.trim() === "" ? undefined : parseFloat(valStr.trim());
    }),
  body("sgstRate")
    .optional({ nullable: true, checkFalsy: true })
    .custom((value, { req }) => {
      const isTaxable = req.body.isTaxable === "true";
      if (
        isTaxable &&
        (value === undefined || value === null || String(value).trim() === "")
      ) {
        throw new Error("SGST Rate is required when item is taxable.");
      }
      if (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
      ) {
        const floatValue = parseFloat(String(value).trim());
        if (isNaN(floatValue) || floatValue < 0) {
          throw new Error("SGST Rate must be a non-negative number.");
        }
      }
      return true;
    })
    .customSanitizer((value) => {
      if (value === undefined || value === null) return undefined;
      const valStr = String(value);
      return valStr.trim() === "" ? undefined : parseFloat(valStr.trim());
    }),
  body("categoryId")
    .notEmpty()
    .withMessage("Category ID is required.")
    .isMongoId()
    .withMessage("Invalid Category ID format."),
  body("status")
    .optional()
    .isIn(["active", "inactive", "discontinued", "out-of-stock", "draft"])
    .withMessage(
      "Invalid status. Must be active, inactive, discontinued, out-of-stock, or draft."
    ),
  body("weight")
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      // Custom validation for string before toFloat
      if (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
      ) {
        const floatValue = parseFloat(String(value).trim());
        if (isNaN(floatValue) || floatValue < 0) {
          throw new Error("Weight must be a non-negative number.");
        }
      }
      return true;
    })
    .customSanitizer((value) => {
      if (value === undefined || value === null) return undefined;
      const valStr = String(value);
      return valStr.trim() === "" ? undefined : parseFloat(valStr.trim());
    }),
  body("dimensions")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage("Dimensions should be a JSON string if provided.")
    .custom((value) => {
      if (value) {
        try {
          const obj = JSON.parse(value);
          if (typeof obj !== "object" || obj === null) throw new Error();
        } catch (e) {
          throw new Error(
            "Dimensions must be a valid JSON string representing an object."
          );
        }
      }
      return true;
    }),
  body("shippingClass")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage("Shipping class cannot exceed 100 characters."),
  body("brand")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage("Brand cannot exceed 100 characters."),
  body("gtin")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 14 })
    .withMessage("GTIN cannot exceed 14 characters."),
  body("countryOfOrigin")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage("Country of origin cannot exceed 100 characters."),
  body("warrantyInfo")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage("Warranty info cannot exceed 500 characters."),
  body("keptExistingImages")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage("Kept existing images data must be a string.")
    .custom((value) => {
      if (value) {
        try {
          const arr = JSON.parse(value);
          if (!Array.isArray(arr)) throw new Error();
        } catch (e) {
          throw new Error(
            "Kept existing images must be a valid JSON array string."
          );
        }
      }
      return true;
    }),
  body("newImageAltTexts")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage("New image alt texts data must be a string.")
    .custom((value) => {
      if (value) {
        try {
          const arr = JSON.parse(value);
          if (!Array.isArray(arr)) throw new Error();
        } catch (e) {
          throw new Error(
            "New image alt texts must be a valid JSON array string."
          );
        }
      }
      return true;
    }),
  body("primaryImageIdentifier")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage("Primary image identifier must be a string if provided."),
];
// ... (any other validators) ...
