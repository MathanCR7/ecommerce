// backend/middleware/adminAuthMiddleware.js
import asyncHandler from "express-async-handler";
import Admin from "../models/Admin.js";
import AdminDetails from "../models/AdminDetails.js"; // Import for role check

// Middleware to protect routes requiring admin authentication via Passport session
export const protect = asyncHandler(async (req, res, next) => {
  if (req.isAuthenticated() && req.user && req.user instanceof Admin) {
    try {
      const currentAdmin = await Admin.findById(req.user._id);
      if (!currentAdmin) {
        console.warn(
          `Admin ${req.user._id} authenticated but not found in DB during 'protect'. Forcing logout.`
        );
        req.logout((err) => {
          if (err) console.error("Error during forced logout:", err);
        });
        req.session.destroy((err) => {
          if (err) console.error("Error during forced session destroy:", err);
        });
        res.clearCookie("connect.sid");
        res.status(401);
        throw new Error("Not authorized, admin record missing.");
      }
      if (!currentAdmin.isMobileVerified) {
        res.status(403);
        throw new Error("Access denied. Mobile number not verified.");
      }
      if (!currentAdmin.isActive) {
        res.status(403);
        throw new Error("Access denied. Admin account is not active.");
      }
    } catch (dbError) {
      console.error(
        "Database error during admin check in 'protect' middleware:",
        dbError
      );
      res.status(500);
      throw new Error("Server error during authorization check.");
    }
    next(); // Proceed if checks pass
  } else {
    if (req.user && !(req.user instanceof Admin)) {
      console.warn(
        `Attempt to access admin route by non-admin user type: ${req.user.constructor.modelName}`
      );
    }
    res.status(401);
    throw new Error("Not authorized as Admin. Please log in.");
  }
});

// Middleware for specific admin roles
export const requireAdminRole = (roles) => {
  const requiredRoles = Array.isArray(roles) ? roles : [roles];
  return asyncHandler(async (req, res, next) => {
    // 'protect' should have run first
    if (!req.user || !(req.user instanceof Admin)) {
      res.status(401);
      throw new Error("Not authorized as Admin.");
    }
    // Fetch AdminDetails to get the role
    const adminDetails = await AdminDetails.findOne({ adminId: req.user._id });

    if (!adminDetails || !adminDetails.role) {
      res.status(403);
      throw new Error("Access denied. Admin role not found.");
    }
    if (requiredRoles.includes(adminDetails.role)) {
      next(); // Role matches
    } else {
      res.status(403);
      throw new Error(
        `Access denied. Requires role(s): ${requiredRoles.join(" or ")}.`
      );
    }
  });
};
