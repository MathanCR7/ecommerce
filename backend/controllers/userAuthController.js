// backend/controllers/userAuthController.js
import jwt from "jsonwebtoken";
import twilio from "twilio";
import passport from "passport";
import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import { clearAuthCookies, setAuthCookies } from "../utils/cookieUtils.js";
import { generateRandomPassword } from "../utils/passwordGenerator.js";
// Import the function that handles sending the email
import { sendPasswordResetEmail } from "../utils/emailService.js";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1d";
const FRONTEND_URL = process.env.ECOM_FRONTEND_URL || "http://localhost:5173";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID; // For OTP via Verify API
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER; // For direct SMS (Forgot Password)

let twilioClient = null;
if (accountSid && authToken) {
  try {
    twilioClient = twilio(accountSid, authToken);
    if (verifyServiceSid) {
      console.log(
        "Twilio Client Initialized for Verify Service (User Auth & Profile)."
      );
    } else {
      console.warn(
        "TWILIO_VERIFY_SERVICE_SID not configured. OTP functionalities may be limited."
      );
    }
    // We don't check twilioPhoneNumber here for initialization, only when needed for direct SMS
    console.log("Twilio Client initialized.");
  } catch (error) {
    console.error("Failed to initialize Twilio Client:", error);
  }
} else {
  console.warn(
    "TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not configured. Twilio functionalities (OTP, SMS) disabled."
  );
}

const signToken = (userId) => {
  if (!JWT_SECRET) {
    console.error("JWT_SECRET is not defined. Authentication will fail.");
    throw new Error("Server configuration error: JWT secret is missing.");
  }
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const checkExistingUser = asyncHandler(async (req, res) => {
  const { username, email, phone } = req.body;
  const query = [];
  if (username) query.push({ username: username.toLowerCase() });
  if (email) query.push({ email: email.toLowerCase() });
  if (phone) query.push({ phone });
  if (query.length === 0) {
    res
      .status(400)
      .json({ success: false, message: "Username, email, or phone required." });
    return;
  }
  const existingUser = await User.findOne({ $or: query });
  if (existingUser) {
    let field = "credentials";
    if (username && existingUser.username === username.toLowerCase())
      field = "username";
    else if (email && existingUser.email === email.toLowerCase())
      field = "email";
    else if (phone && existingUser.phone === phone) field = "phone number";
    return res.status(200).json({ success: true, exists: true, field });
  }
  return res.status(200).json({ success: true, exists: false });
});

export const sendUserOtp = asyncHandler(async (req, res) => {
  if (!twilioClient || !verifyServiceSid) {
    res.status(503).json({
      success: false,
      message: "OTP service unavailable. Please contact support.",
    });
    return;
  }
  const { phone } = req.body;
  try {
    console.log(`Sending User OTP to: ${phone} via Verify Service`);
    await twilioClient.verify.v2
      .services(verifyServiceSid)
      .verifications.create({ to: phone, channel: "sms" });
    res.status(200).json({ success: true, message: "OTP sent successfully." });
  } catch (error) {
    console.error(`Twilio Send OTP Error for User Phone ${phone}:`, error);
    let userMessage = "Failed to send OTP. Please try again later.";
    let statusCode = 500;
    if (error.status === 400 || error.code === 60200) {
      userMessage =
        "Invalid phone number format. Please ensure it is in E.164 format (e.g., +91XXXXXXXXXX).";
      statusCode = 400;
    } else if (error.code === 60203) {
      userMessage =
        "Maximum OTP send attempts reached for this phone number. Please try again later.";
      statusCode = 429;
    } else if (error.code === 21608 && process.env.NODE_ENV !== "production") {
      userMessage =
        "This phone number is not verified in your Twilio trial account. Please add it to your Twilio console.";
      statusCode = 403;
    }
    res.status(statusCode).json({ success: false, message: userMessage });
  }
});

export const signupUser = asyncHandler(async (req, res) => {
  const { username, email, password, phone, dob, otp, displayName } = req.body;

  let phoneVerified = false;
  if (phone && otp) {
    if (!twilioClient || !verifyServiceSid) {
      res.status(503).json({
        success: false,
        message:
          "OTP service unavailable for verification. Cannot complete signup.",
      });
      return;
    }
    try {
      const verificationCheck = await twilioClient.verify.v2
        .services(verifyServiceSid)
        .verificationChecks.create({ to: phone, code: otp });
      if (verificationCheck.status === "approved") {
        phoneVerified = true;
      } else {
        res.status(400).json({
          success: false,
          message: "Invalid or expired OTP. Please try again.",
        });
        return;
      }
    } catch (otpError) {
      console.error(`Signup: OTP Verification Error for ${phone}:`, otpError);
      if (otpError.code === 20404 || otpError.status === 404) {
        res.status(400).json({
          success: false,
          message:
            "Invalid or expired OTP (not found). Please request a new one.",
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Could not verify OTP. Please try again.",
        });
      }
      return;
    }
  } else if (phone && !otp) {
    res.status(400).json({
      success: false,
      message: "OTP required to verify phone number during signup.",
    });
    return;
  }

  const lowerCaseUsername = username.toLowerCase();
  const lowerCaseEmail = email.toLowerCase();

  const orConditions = [
    { username: lowerCaseUsername },
    { email: lowerCaseEmail },
  ];
  if (phone) {
    orConditions.push({ phone });
  }
  const existingUser = await User.findOne({ $or: orConditions });

  if (existingUser) {
    let conflictField = "An account";
    if (existingUser.username === lowerCaseUsername) conflictField = "Username";
    else if (existingUser.email === lowerCaseEmail) conflictField = "Email";
    else if (phone && existingUser.phone === phone)
      conflictField = "Phone number";
    res.status(409).json({
      success: false,
      message: `${conflictField} is already registered. Please try logging in or use different credentials.`,
    });
    return;
  }

  const newUser = new User({
    username: lowerCaseUsername,
    email: lowerCaseEmail,
    password,
    phone: phone || null,
    dob: dob ? new Date(dob) : null,
    isPhoneVerified: phoneVerified,
    displayName: displayName || username,
  });

  const savedUser = await newUser.save();
  const token = signToken(savedUser._id);
  const userDataForCookie = savedUser.toObject({ virtuals: true });

  setAuthCookies(res, token, userDataForCookie, true);

  res.status(201).json({
    success: true,
    message: "Registration successful! Welcome.",
    user: userDataForCookie,
  });
});

export const loginUser = asyncHandler(async (req, res) => {
  const { loginIdentifier, password } = req.body;
  const lowerLoginIdentifier = loginIdentifier.toLowerCase();

  const user = await User.findOne({
    $or: [
      { username: lowerLoginIdentifier },
      { email: lowerLoginIdentifier },
      { phone: loginIdentifier },
    ],
  }).select("+password");

  if (!user) {
    res.status(401).json({
      success: false,
      message:
        "Invalid credentials. Please check your username/email/phone and password.",
    });
    return;
  }

  if (!user.password && user.googleId) {
    res.status(401).json({
      success: false,
      message:
        "This account was created using Google. Please log in with Google, or use 'Forgot Password' to set one.",
    });
    return;
  }
  if (!user.password) {
    res.status(401).json({
      success: false,
      message:
        "Login method not available for this account. Please contact support.",
    });
    return;
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    res.status(401).json({
      success: false,
      message:
        "Invalid credentials. Please check your username/email/phone and password.",
    });
    return;
  }

  await user.updateRecentLogin();
  const token = signToken(user._id);
  const userDataForCookie = user.toObject({ virtuals: true });

  setAuthCookies(res, token, userDataForCookie, true);

  res.status(200).json({
    success: true,
    message: "Login successful! Welcome back.",
    user: userDataForCookie,
  });
});

export const logoutUser = (req, res) => {
  clearAuthCookies(res);
  res
    .status(200)
    .json({ success: true, message: "You have been logged out successfully." });
};

export const googleAuthInitiate = passport.authenticate("google", {
  scope: ["profile", "email"],
  prompt: "select_account",
});

export const googleAuthCallback = (req, res, next) => {
  passport.authenticate(
    "google",
    {
      session: false,
      failureRedirect: `${FRONTEND_URL}/login?error=google_auth_failed&reason=general`,
    },
    async (err, user, info) => {
      if (err) {
        console.error("Google Auth Callback Error:", err);
        let errorMessage =
          err.message || "Google authentication failed due to a server error.";
        if (
          err.message &&
          err.message.toLowerCase().includes("account conflict")
        ) {
          errorMessage =
            "An account with this email already exists using a different sign-in method.";
        }
        return res.redirect(
          `${FRONTEND_URL}/login?error=google_auth_failed&reason=${encodeURIComponent(
            errorMessage
          )}`
        );
      }
      if (!user) {
        const message = info?.message || "Google login could not be completed.";
        return res.redirect(
          `${FRONTEND_URL}/login?error=google_auth_failed&reason=${encodeURIComponent(
            message
          )}`
        );
      }
      try {
        await user.updateRecentLogin();
        const freshUser = await User.findById(user._id);
        if (!freshUser) throw new Error("User disappeared after Google auth.");

        const token = signToken(freshUser._id);
        const userDataForCookie = freshUser.toObject({ virtuals: true });
        setAuthCookies(res, token, userDataForCookie, true);
        res.redirect(`${FRONTEND_URL}/`);
      } catch (error) {
        console.error("Error processing Google callback:", error);
        res.redirect(
          `${FRONTEND_URL}/login?error=server_error&reason=login_completion_failed`
        );
      }
    }
  )(req, res, next);
};

export const checkUserAuthStatus = asyncHandler(async (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      isAuthenticated: false,
      user: null,
      message: "User not authenticated.",
    });
  }
  const freshUser = await User.findById(req.user._id);
  if (!freshUser) {
    clearAuthCookies(res);
    return res.status(401).json({
      success: false,
      isAuthenticated: false,
      user: null,
      message: "User not found.",
    });
  }
  const userDataForResponse = freshUser.toObject({ virtuals: true });
  res
    .status(200)
    .json({ success: true, isAuthenticated: true, user: userDataForResponse });
});

// --- Password Management Controllers ---

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.userId;

  const user = await User.findById(userId).select("+password");

  if (!user) {
    res.status(404).json({ success: false, message: "User not found." });
    return;
  }
  if (!user.password && user.googleId) {
    res.status(400).json({
      success: false,
      message:
        "Account created with Google. To set a password, please use 'Forgot Password' first.",
    });
    return;
  }
  if (!user.password) {
    res.status(400).json({
      success: false,
      message: "No password set for this account. Cannot change password.",
    });
    return;
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    res
      .status(401)
      .json({ success: false, message: "Incorrect current password." });
    return;
  }

  user.password = newPassword;
  await user.save(); // This triggers the pre-save hook to hash the new password

  res
    .status(200)
    .json({ success: true, message: "Password changed successfully." });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { identifier } = req.body;
  let user;

  const isEmail = /\S+@\S+\.\S+/.test(identifier);
  const isPhone = /^\+[1-9]\d{1,14}$/.test(identifier);

  if (isEmail) {
    user = await User.findOne({ email: identifier.toLowerCase() });
  } else if (isPhone) {
    user = await User.findOne({ phone: identifier });
  } else {
    // Should be caught by validator, but as a safeguard:
    res
      .status(400)
      .json({ success: false, message: "Invalid identifier format." });
    return;
  }

  if (!user) {
    console.log(
      `Forgot password attempt for non-existent identifier: ${identifier}`
    );
    // Generic success message to prevent account enumeration
    return res.status(200).json({
      success: true,
      message:
        "If an account with that email or phone number exists, instructions to reset your password have been sent.",
    });
  }

  const tempPassword = generateRandomPassword(10);
  user.password = tempPassword;
  await user.save();

  let messageSent = false;
  let problemType = null;

  if (isEmail) {
    // Call the sendPasswordResetEmail function - it handles its own configuration checks
    const emailResult = await sendPasswordResetEmail(user.email, tempPassword);
    if (emailResult.success) {
      console.log(`Temporary password sent via email to ${user.email}`);
      messageSent = true;
    } else {
      problemType = "email_send_fail";
      console.error(
        `Failed to send password reset email to ${user.email}:`,
        emailResult.error
      );
    }
  } else if (isPhone && user.phone) {
    const configuredTwilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
    if (!twilioClient || !configuredTwilioPhoneNumber) {
      problemType = "sms_config";
      console.warn(
        `Forgot Password: Twilio SMS not configured or TWILIO_PHONE_NUMBER missing in .env. Cannot send SMS to ${user.phone}. Temp Pwd: ${tempPassword}`
      );
    } else {
      try {
        await twilioClient.messages.create({
          body: `Your temporary password for our service is: ${tempPassword}. Please change it after logging in.`,
          from: configuredTwilioPhoneNumber,
          to: user.phone,
        });
        console.log(`Temporary password sent via SMS to ${user.phone}`);
        messageSent = true;
      } catch (smsError) {
        problemType = "sms_send_fail";
        console.error(
          `Failed to send password reset SMS to ${user.phone}:`,
          smsError
        );
        if (smsError.code === 21608 && process.env.NODE_ENV !== "production") {
          console.warn(
            "Twilio Trial Account: The recipient phone number has not been verified. Add it to your Twilio console."
          );
        } else if (smsError.status === 400) {
          console.error(
            `Twilio SMS Error (400): Invalid 'To' number or other Twilio API error: ${smsError.message}`
          );
        }
      }
    }
  }

  if (!messageSent && process.env.NODE_ENV !== "production" && problemType) {
    console.warn(
      `Forgot Password: Temp password for ${identifier} generated, but message could not be sent due to ${problemType}. Check backend logs.`
    );
  }

  res.status(200).json({
    success: true,
    message:
      "If an account with that email or phone number exists, instructions to reset your password have been sent.",
  });
});
