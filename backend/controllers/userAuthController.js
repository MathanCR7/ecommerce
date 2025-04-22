import jwt from "jsonwebtoken";
import twilio from "twilio";
import passport from "passport";
import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import { clearAuthCookies, setAuthCookies } from "../utils/cookieUtils.js";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "1d";
const FRONTEND_URL = process.env.ECOM_FRONTEND_URL;

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
let twilioClient = null;
if (accountSid && authToken && verifyServiceSid) {
  try {
    twilioClient = twilio(accountSid, authToken);
    console.log("Twilio Client Initialized for User Auth.");
  } catch (error) {
    console.error("Failed to initialize Twilio Client:", error);
  }
} else {
  console.warn("Twilio credentials not fully configured. User OTP disabled.");
}

const signToken = (userId) => {
  if (!JWT_SECRET) throw new Error("JWT secret is missing.");
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const checkExistingUser = asyncHandler(async (req, res) => {
  const { username, email, phone } = req.body;
  const query = [];
  if (username) query.push({ username: username.toLowerCase() });
  if (email) query.push({ email: email.toLowerCase() });
  if (phone) query.push({ phone });
  if (query.length === 0) {
    res.status(400);
    throw new Error("Username, email, or phone required.");
  }
  const existingUser = await User.findOne({ $or: query });
  if (existingUser) {
    let field = "credentials";
    if (username && existingUser.username === username.toLowerCase())
      field = "username";
    else if (email && existingUser.email === email.toLowerCase())
      field = "email";
    else if (phone && existingUser.phone === phone) field = "phone number";
    return res.status(200).json({ exists: true, field });
  }
  return res.status(200).json({ exists: false });
});

export const sendUserOtp = asyncHandler(async (req, res) => {
  if (!twilioClient) {
    res.status(503);
    throw new Error("OTP service unavailable.");
  }
  const { phone } = req.body;
  if (!phone) {
    res.status(400);
    throw new Error("Phone number is required.");
  }
  try {
    console.log(`Sending User OTP to: ${phone}`);
    await twilioClient.verify.v2
      .services(verifyServiceSid)
      .verifications.create({ to: phone, channel: "sms" });
    res.status(200).json({ success: true, message: "OTP sent successfully." });
  } catch (error) {
    console.error(`Twilio Send OTP Error for User Phone ${phone}:`, {
      code: error.code,
      status: error.status,
      message: error.message,
    }); // Log more detail
    let userMessage = "Failed to send OTP.";
    let statusCode = 500;
    if (error.code === 60200 || error.status === 400) {
      userMessage = "Invalid phone number format.";
      statusCode = 400;
    } else if (error.code === 60203) {
      userMessage = "Max OTP send attempts reached.";
      statusCode = 429;
    } else if (error.code === 21608) {
      userMessage = "Phone number not verified in Twilio trial account.";
      statusCode = 403;
    }
    res.status(statusCode);
    throw new Error(userMessage);
  }
});

export const signupUser = asyncHandler(async (req, res) => {
  const { username, email, password, phone, dob, otp } = req.body;
  let phoneVerified = false;
  if (phone && otp) {
    if (!twilioClient) {
      res.status(503);
      throw new Error("OTP service unavailable for verification.");
    }
    try {
      const verificationCheck = await twilioClient.verify.v2
        .services(verifyServiceSid)
        .verificationChecks.create({ to: phone, code: otp });
      if (verificationCheck.status === "approved") phoneVerified = true;
      else {
        res.status(400);
        throw new Error("Invalid or expired OTP.");
      }
    } catch (otpError) {
      console.error(`Signup: OTP Verification Error for ${phone}:`, {
        code: otpError.code,
        status: otpError.status,
        message: otpError.message,
      });
      if (otpError.code === 20404 || otpError.status === 404) {
        res.status(400);
        throw new Error("Invalid or expired OTP.");
      }
      res.status(500);
      throw new Error("Could not verify OTP.");
    }
  } else if (phone && !otp) {
    res.status(400);
    throw new Error("OTP required to verify phone number.");
  }

  const lowerCaseUsername = username.toLowerCase();
  const lowerCaseEmail = email.toLowerCase();
  const existingUser = await User.findOne({
    $or: [
      { username: lowerCaseUsername },
      { email: lowerCaseEmail },
      ...(phone ? [{ phone }] : []),
    ],
  });
  if (existingUser) {
    let conflictField = "Account";
    if (existingUser.username === lowerCaseUsername) conflictField = "Username";
    else if (existingUser.email === lowerCaseEmail) conflictField = "Email";
    else if (phone && existingUser.phone === phone)
      conflictField = "Phone number";
    res.status(409);
    throw new Error(`${conflictField} already exists.`);
  }
  const newUser = new User({
    username: lowerCaseUsername,
    email: lowerCaseEmail,
    password,
    phone: phone || null,
    dob: dob ? new Date(dob) : null,
    isPhoneVerified: phoneVerified,
    displayName: username,
  });
  const savedUser = await newUser.save();
  const token = signToken(savedUser._id);
  const userDataForCookie = savedUser.toObject({ virtuals: true });
  setAuthCookies(res, token, userDataForCookie);
  res
    .status(201)
    .json({
      success: true,
      message: "Registration successful!",
      user: userDataForCookie,
    });
});

export const loginUser = asyncHandler(async (req, res) => {
  const { loginIdentifier, password } = req.body;
  const user = await User.findOne({
    $or: [
      { username: loginIdentifier.toLowerCase() },
      { email: loginIdentifier.toLowerCase() },
      { phone: loginIdentifier },
    ],
  }).select("+password");
  if (!user) {
    res.status(401);
    throw new Error("Invalid credentials.");
  }
  if (!user.password) {
    res.status(401);
    throw new Error("Login with your Google account or reset password.");
  }
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    res.status(401);
    throw new Error("Invalid credentials.");
  }
  user.recentLogin = new Date();
  user.save().catch((err) => console.error("Error updating recentLogin:", err));
  const token = signToken(user._id);
  const userDataForCookie = user.toObject({ virtuals: true });
  setAuthCookies(res, token, userDataForCookie);
  res
    .status(200)
    .json({
      success: true,
      message: "Login successful!",
      user: userDataForCookie,
    });
});

export const logoutUser = (req, res) => {
  clearAuthCookies(res);
  res.status(200).json({ success: true, message: "Logout successful." });
};

export const googleAuthInitiate = passport.authenticate("google", {
  scope: ["profile", "email"],
  prompt: "select_account",
});

export const googleAuthCallback = (req, res, next) => {
  // Use the 'google' strategy defined in passport.js
  passport.authenticate(
    "google",
    {
      session: false,
      failureRedirect: `${FRONTEND_URL}/login?error=google_failed`,
    },
    (err, user, info) => {
      // Custom callback gets err, user, info
      // Handle errors passed from the strategy's 'done' function
      if (err) {
        console.error(
          "Google Auth Callback Error (from strategy done(err,...)):",
          err.message
        );
        // Use the error message from the strategy if available
        return res.redirect(
          `${FRONTEND_URL}/login?error=${encodeURIComponent(
            err.message || "Google authentication failed"
          )}`
        );
      }
      // Handle failures indicated by done(null, false, ...)
      if (!user) {
        console.error(
          "Google Auth Callback: No user received from strategy.",
          info
        );
        // Use the info message from the strategy if available
        return res.redirect(
          `${FRONTEND_URL}/login?error=${encodeURIComponent(
            info?.message || "Google login failed"
          )}`
        );
      }

      // --- Google Authentication Successful ---
      try {
        const token = signToken(user._id);
        const userDataForCookie = user.toObject({ virtuals: true });
        setAuthCookies(res, token, userDataForCookie);
        console.log(
          `Google auth successful for ${user.email}, redirecting to frontend.`
        );
        res.redirect(`${FRONTEND_URL}/`); // Redirect to e-commerce frontend homepage
      } catch (tokenCookieError) {
        console.error(
          "Error setting token/cookie after Google callback:",
          tokenCookieError
        );
        res.redirect(`${FRONTEND_URL}/login?error=server_error_login_complete`);
      }
    }
  )(req, res, next); // Invoke the middleware returned by passport.authenticate
};

export const checkUserAuthStatus = asyncHandler(async (req, res) => {
  // verifyToken middleware already ran and attached req.user
  const userDataForResponse = req.user.toObject({ virtuals: true });
  res.status(200).json({ isAuthenticated: true, user: userDataForResponse });
});
