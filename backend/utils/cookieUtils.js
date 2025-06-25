// backend/utils/cookieUtils.js
import dotenv from "dotenv";

dotenv.config(); // Ensure .env variables are loaded

const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN;
const NODE_ENV = process.env.NODE_ENV;
const COOKIE_EXPIRES_IN_MS = parseInt(
  process.env.COOKIE_EXPIRES_IN_MS || "86400000", // Default 1 day
  10
);

// Sets authentication cookies (accessToken and user data)
export const setAuthCookies = (res, token, userData, setTokenCookie = true) => {
  const baseCookieOptions = {
    expires: new Date(Date.now() + COOKIE_EXPIRES_IN_MS),
    secure: NODE_ENV === "production", // Send only over HTTPS in production
    sameSite: NODE_ENV === "production" ? "lax" : "lax", // CSRF protection (use 'none' with secure:true if needed for cross-site)
    domain: COOKIE_DOMAIN, // CRITICAL: From .env
    path: "/",
  };

  // 1. Access Token Cookie (HttpOnly)
  if (setTokenCookie) {
    const accessTokenCookieOptions = {
      ...baseCookieOptions,
      httpOnly: true, // Protects against XSS
    };
    res.cookie("accessToken", token, accessTokenCookieOptions);
    // console.log("accessToken cookie set for domain:", COOKIE_DOMAIN); // Optional: for debugging
  }

  // 2. User Data Cookie (Readable by Frontend JS)
  // Prepare safe user data (ensure password and other sensitive fields are removed)
  const safeUserData = { ...userData }; // Clone user data
  delete safeUserData.password; // Explicitly remove password if present
  // **REMOVED:** delete safeUserData.googleId; // Now we KEEP googleId for frontend check
  // Add other fields to remove if necessary: delete safeUserData.__v;

  const userCookieOptions = {
    ...baseCookieOptions,
    httpOnly: false, // Allow frontend JS to read this
  };
  res.cookie("user", JSON.stringify(safeUserData), userCookieOptions); // Cookie name is 'user'
  // console.log("user cookie set for domain:", COOKIE_DOMAIN); // Optional: for debugging
};

// Clears authentication cookies
export const clearAuthCookies = (res) => {
  const cookieOptions = {
    httpOnly: true,
    secure: NODE_ENV === "production",
    sameSite: NODE_ENV === "production" ? "lax" : "lax",
    domain: COOKIE_DOMAIN,
    path: "/",
    expires: new Date(0), // Set expiry date to the past
  };
  res.cookie("accessToken", "", { ...cookieOptions });
  res.cookie("user", "", { ...cookieOptions, httpOnly: false }); // Clear user cookie too
  // console.log("Auth cookies cleared for domain:", COOKIE_DOMAIN); // Optional: for debugging
};
