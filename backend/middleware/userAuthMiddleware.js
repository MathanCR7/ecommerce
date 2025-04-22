// backend/middleware/userAuthMiddleware.js
import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import User from "../models/User.js";

const JWT_SECRET = process.env.JWT_SECRET;
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN; // Needed for clearing cookie

// Helper to clear cookies on auth failure
const clearAuthCookies = (res) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "lax" : "lax",
    domain: COOKIE_DOMAIN,
    path: "/",
    expires: new Date(0), // Expire immediately
  };
  res.cookie("accessToken", "", { ...cookieOptions });
  res.cookie("user", "", { ...cookieOptions, httpOnly: false }); // Clear user data cookie too
  console.log("Auth cookies cleared for domain:", COOKIE_DOMAIN);
};

export const verifyToken = asyncHandler(async (req, res, next) => {
  const token = req.cookies.accessToken;

  if (!token || token === "loggedout" || token === "") {
    // No token found in cookies
    res.status(401);
    throw new Error("Unauthorized: No token provided.");
  }

  if (!JWT_SECRET) {
    console.error("FATAL: JWT_SECRET is not defined!");
    res.status(500);
    throw new Error("Server configuration error (JWT).");
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Find the user based on the decoded ID, exclude password
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      // User associated with the token not found in DB (maybe deleted?)
      console.warn(
        `verifyToken: User ID ${decoded.userId} from token not found in DB.`
      );
      clearAuthCookies(res); // Clear invalid cookies
      res.status(401);
      throw new Error("Unauthorized: User not found.");
    }

    // Attach the user object (Mongoose document) to the request
    req.user = user; // This user should be of type 'User'
    req.userId = user._id; // Keep userId for consistency if needed

    next(); // Proceed to the next middleware or route handler
  } catch (err) {
    console.error("Token verification error:", err.name, err.message);
    clearAuthCookies(res); // Clear invalid/expired cookies

    let message = "Unauthorized: Invalid token.";
    if (err.name === "TokenExpiredError") {
      message = "Unauthorized: Token expired.";
    } else if (err.name === "JsonWebTokenError") {
      message = "Unauthorized: Malformed token.";
    }
    res.status(401);
    throw new Error(message);
  }
});

// Optional: Add role checks for users if needed
// export const requireUserRole = (role) => asyncHandler(async (req, res, next) => { ... });
