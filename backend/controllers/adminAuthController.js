// backend/controllers/adminAuthController.js
import passport from "passport";
import twilio from "twilio";
import asyncHandler from "express-async-handler";
import Admin from "../models/Admin.js";
import AdminActivity from "../models/AdminActivity.js";
import AdminDetails from "../models/AdminDetails.js";

// Twilio Client (Shared instance is fine, or initialize separately)
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
let twilioClient = null;
if (accountSid && authToken && verifyServiceSid) {
  try {
    twilioClient = twilio(accountSid, authToken);
    console.log("Twilio Client Initialized for Admin Auth.");
  } catch (error) {
    console.error("Failed to initialize Twilio Client:", error);
  }
} else {
  console.warn("Twilio credentials not fully configured. Admin OTP disabled.");
}

const indianMobileRegex = /^\+91[6-9]\d{9}$/;
const otpRegex = /^\d{6}$/;

// --- Send OTP --- POST /api/admin/auth/send-otp
export const sendAdminOtp = asyncHandler(async (req, res) => {
  if (!twilioClient) {
    res.status(503);
    throw new Error("OTP service is currently unavailable.");
  }
  const { mobileNumber } = req.body; // Validation assumed done by middleware

  // Check if number already verified for another admin
  const existingVerifiedAdmin = await Admin.findOne({
    mobileNumber,
    isMobileVerified: true,
  });
  if (existingVerifiedAdmin) {
    res.status(409);
    throw new Error("Mobile number already registered to a verified admin.");
  }

  try {
    console.log(
      `Sending Admin OTP to: ${mobileNumber} via service ${verifyServiceSid}`
    );
    const verification = await twilioClient.verify.v2
      .services(verifyServiceSid)
      .verifications.create({ to: mobileNumber, channel: "sms" });

    if (verification.status === "pending") {
      res
        .status(200)
        .json({
          success: true,
          message: "OTP sent successfully.",
          sid: verification.sid,
        });
    } else {
      console.warn(
        "Unexpected Twilio verification status:",
        verification.status
      );
      res
        .status(500)
        .json({ success: false, message: "Failed to initiate OTP sending." });
    }
  } catch (error) {
    console.error("Twilio Send Admin OTP Error:", error);
    let userMessage = "Failed to send OTP.";
    let statusCode = 500;
    if (error.code === 60200 || error.status === 400) {
      userMessage = "Invalid mobile number format.";
      statusCode = 400;
    } else if (error.code === 60203) {
      userMessage = "Max OTP send attempts reached.";
      statusCode = 429;
    }
    res.status(statusCode);
    throw new Error(userMessage);
  }
});

// --- Verify OTP --- POST /api/admin/auth/verify-otp
export const verifyAdminOtp = asyncHandler(async (req, res) => {
  if (!twilioClient) {
    res.status(503);
    throw new Error("OTP service is currently unavailable.");
  }
  const { mobileNumber, otp } = req.body; // Validation assumed done

  try {
    console.log(`Verifying Admin OTP for: ${mobileNumber} with code ${otp}`);
    const verificationCheck = await twilioClient.verify.v2
      .services(verifyServiceSid)
      .verificationChecks.create({ to: mobileNumber, code: otp });

    if (verificationCheck.status === "approved") {
      res
        .status(200)
        .json({ success: true, message: "OTP verified successfully." });
    } else {
      console.warn(
        "Twilio verification check status not 'approved':",
        verificationCheck.status
      );
      res.status(400); // Incorrect code
      throw new Error("Invalid or expired OTP code provided.");
    }
  } catch (error) {
    console.error("Twilio Verify Admin OTP Error:", error);
    if (error.code === 20404 || error.status === 404) {
      res.status(404);
      throw new Error(
        "OTP verification failed (not found - likely expired or invalid)."
      );
    } else if (error.status === 429 || error.code === 60203) {
      res.status(429);
      throw new Error("Max OTP check attempts reached.");
    } else {
      res.status(500);
      throw new Error("Failed to verify OTP due to a server or service error.");
    }
  }
});

// --- Register Admin --- POST /api/admin/auth/register
// Assumes OTP verification was successful client-side before calling this
export const registerAdmin = asyncHandler(async (req, res) => {
  const { username, password, mobileNumber, email, firstName, lastName, role } =
    req.body;

  const lowerCaseUsername = username.toLowerCase();
  const lowerCaseEmail = email?.toLowerCase();

  // Check existing (redundant but safe)
  const existingAdmin = await Admin.findOne({
    $or: [
      { username: lowerCaseUsername },
      { mobileNumber },
      ...(lowerCaseEmail ? [{ email: lowerCaseEmail }] : []),
    ],
  });
  if (existingAdmin) {
    let field = "details";
    if (existingAdmin.username === lowerCaseUsername) field = "Username";
    else if (existingAdmin.mobileNumber === mobileNumber)
      field = "Mobile number";
    else if (lowerCaseEmail && existingAdmin.email === lowerCaseEmail)
      field = "Email";
    res.status(409);
    throw new Error(`${field} already exists.`);
  }

  // Create Admin
  const newAdmin = new Admin({
    username: lowerCaseUsername,
    password, // Hashing handled by pre-save hook
    mobileNumber,
    email: lowerCaseEmail || undefined,
    isMobileVerified: true, // Assumed verified before register call
    isActive: true,
  });
  const savedAdmin = await newAdmin.save();

  // Create Details & Activity (Best effort)
  let detailsCreated = false,
    activityCreated = false;
  try {
    const newAdminDetails = new AdminDetails({
      adminId: savedAdmin._id,
      firstName: firstName?.trim() || "",
      lastName: lastName?.trim() || "",
      role: role || "Admin",
    });
    await newAdminDetails.save();
    detailsCreated = true;
  } catch (detailsError) {
    console.warn(
      `WARN: Failed to create AdminDetails for ${savedAdmin.username}: ${detailsError.message}`
    );
  }
  try {
    const newAdminActivity = new AdminActivity({ adminId: savedAdmin._id });
    await newAdminActivity.save();
    activityCreated = true;
  } catch (activityError) {
    console.warn(
      `WARN: Failed to create AdminActivity for ${savedAdmin.username}: ${activityError.message}`
    );
  }

  // Respond (Don't log in automatically, admin should log in separately)
  const { password: omitPassword, ...adminInfo } = savedAdmin.toObject();
  let message = "Admin registered successfully.";
  if (!detailsCreated || !activityCreated)
    message += " Some associated records might have failed.";

  res.status(201).json({ success: true, message: message, user: adminInfo });
});

// --- Login Admin --- POST /api/admin/auth/login
export const loginAdmin = (req, res, next) => {
  // Use the 'local-admin' strategy defined in passport.js
  passport.authenticate("local-admin", async (err, adminUser, info) => {
    if (err) return next(err);
    if (!adminUser)
      return res
        .status(401)
        .json({ success: false, message: info?.message || "Login failed." });
    // Additional checks already done in strategy (isActive, isMobileVerified)

    req.login(adminUser, async (loginErr) => {
      // This establishes the session
      if (loginErr) return next(loginErr);

      // Update Activity Log (fire and forget)
      try {
        const ip =
          req.headers["x-forwarded-for"]?.split(",").shift() ||
          req.socket?.remoteAddress ||
          req.ip;
        const ua = req.headers["user-agent"] || "Unknown";
        await AdminActivity.findOneAndUpdate(
          { adminId: adminUser._id },
          { $set: { lastLogin: new Date(), ipAddress: ip, userAgent: ua } },
          { upsert: true, new: true }
        );
      } catch (activityError) {
        console.error("Login activity update error:", activityError.message);
      }

      // Respond with user info (excluding password)
      const { password, ...adminInfo } = adminUser.toObject({ virtuals: true });
      // Optionally fetch and include AdminDetails here if needed immediately
      // const details = await AdminDetails.findOne({ adminId: adminUser._id });
      // adminInfo.details = details ? details.toObject({virtuals: true}) : null;

      return res
        .status(200)
        .json({ success: true, message: "Login successful", user: adminInfo });
    });
  })(req, res, next); // Invoke passport middleware
};

// --- Logout Admin --- POST /api/admin/auth/logout (Protected Route)
export const logoutAdmin = (req, res, next) => {
  const adminId = req.user?._id; // req.user should be the Admin object from session
  const username = req.user?.username;

  if (adminId) {
    AdminActivity.findOneAndUpdate(
      { adminId: adminId },
      { $set: { lastLogout: new Date() } }
    )
      .exec()
      .catch((err) =>
        console.error(
          `Logout activity update error for ${username || adminId}:`,
          err
        )
      );
  } else {
    console.warn("Admin ID missing during logout attempt.");
  }

  req.logout((logoutErr) => {
    // Passport logout
    if (logoutErr) console.error("Passport Logout Error:", logoutErr);
    req.session.destroy((sessionErr) => {
      // Destroy server session
      if (sessionErr)
        console.error("Session Destruction Error on Logout:", sessionErr);
      res.clearCookie("connect.sid"); // Clear client session cookie (adjust name if needed)
      console.log(`Admin ${username || "Unknown"} logged out.`);
      return res
        .status(200)
        .json({ success: true, message: "Logout successful" });
    });
  });
};

// --- Check Admin Auth Status --- GET /api/admin/auth/status
export const checkAdminAuthStatus = asyncHandler(async (req, res) => {
  // Check passport status AND ensure it's an Admin user
  if (req.isAuthenticated() && req.user && req.user instanceof Admin) {
    // Re-verify critical flags from DB (as done in protect middleware)
    const currentAdmin = await Admin.findById(req.user._id);
    if (
      !currentAdmin ||
      !currentAdmin.isMobileVerified ||
      !currentAdmin.isActive
    ) {
      const reason = !currentAdmin
        ? "Not found"
        : !currentAdmin.isMobileVerified
        ? "Mobile unverified"
        : "Inactive";
      console.warn(
        `Admin auth status check failed for ${req.user?.username}: ${reason}. Forcing logout.`
      );
      req.logout(() => {});
      req.session.destroy(() => {});
      res.clearCookie("connect.sid");
      return res
        .status(200)
        .json({ isAuthenticated: false, user: null, reason: reason });
    }

    // User is authenticated and valid Admin
    const { password, ...adminInfo } = req.user.toObject({ virtuals: true });
    // Optionally fetch and include AdminDetails here
    const details = await AdminDetails.findOne({ adminId: req.user._id });
    adminInfo.details = details ? details.toObject({ virtuals: true }) : null;

    return res.status(200).json({ isAuthenticated: true, user: adminInfo });
  } else {
    // Not authenticated as Admin
    return res.status(200).json({ isAuthenticated: false, user: null });
  }
});
