// backend/server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
// import fs from "fs"; // UNIFIED CHANGE: No longer needed for directory creation on startup.

// --- (Your original imports are all correct and remain unchanged) ---
import session from "express-session";
import MongoStore from "connect-mongo";
import cookieParser from "cookie-parser";
import passport from "./config/passport.js";
import connectDB from "./config/database.js";
import addressRoutes from "./routes/addressRoutes.js";
import userAuthRoutes from "./routes/userAuthRoutes.js";
import adminAuthRoutes from "./routes/adminAuthRoutes.js";
import userProfileRoutes from "./routes/userProfileRoutes.js";
import publicCategoryRoutes from "./routes/categoryRoutes.js";
import publicItemRoutes from "./routes/itemRoutes.js";
import adminCategoryRoutes from "./routes/adminCategoryRoutes.js";
import adminItemRoutes from "./routes/adminItemRoutes.js";
import bannerRoutes from "./routes/bannerRoutes.js";
import couponRoutes from "./routes/couponRoutes.js";
import posOrderRoutes from "./routes/posOrderRoutes.js";
import adminCustomerRoutes from "./routes/adminCustomerRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";
import publicCouponRoutes from "./routes/couponRoutes.js";
import adminCouponRoutes from "./routes/adminCouponRoutes.js";
import adminOrderRoutes from "./routes/adminOrderRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import publicBannerRoutes from "./routes/publicBannerRoutes.js";

// --- Initial Setup ---
dotenv.config();
connectDB();
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log("[Server] Root directory:", __dirname);

// --- CORE MIDDLEWARE (Your original code is correct, no changes here) ---
const allowedOrigins = process.env.FRONTEND_URLS
  ? process.env.FRONTEND_URLS.split(",").map((url) => url.trim())
  : [];
if (process.env.NODE_ENV !== "production") {
    // Add multiple localhost origins for dev
    allowedOrigins.push('http://localhost:5173', 'http://localhost:5170');
}
console.log("[CORS Setup] Allowed Origins:", allowedOrigins.join(", ") || "None Configured!");
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
};
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// --- Session Configuration (Your original code is correct, no changes here) ---
const sessionSecret = process.env.SESSION_SECRET;
const mongoDbUri = process.env.MONGODB_URI;
if (!sessionSecret || !mongoDbUri) {
  console.error("FATAL ERROR: SESSION_SECRET or MONGODB_URI not found.");
  process.exit(1);
}
app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: mongoDbUri,
      collectionName: "app_sessions",
      ttl: 14 * 24 * 60 * 60,
      autoRemove: "native",
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 14 * 24 * 60 * 60 * 1000,
      sameSite: process.env.NODE_ENV === "production" ? "lax" : "lax",
      domain: process.env.COOKIE_DOMAIN || undefined,
    },
  })
);

// --- Passport Initialization (Your original code is correct, no changes here) ---
app.use(passport.initialize());
app.use(passport.session());

// --- UNIFIED CHANGE: Static File Serving Block ---
// This entire block is removed because it is incompatible with Vercel's
// read-only and ephemeral filesystem. Your `multerConfig.js` now correctly
// handles uploads by sending them to a temporary '/tmp' directory.
// Serving these files long-term requires a dedicated cloud storage service.
/*
const uploadsPath = path.join(__dirname, "uploads");
const ensureUploadsDir = (dirPath) => { ... };
ensureUploadsDir(uploadsPath);
...
app.use("/uploads", express.static(uploadsPath));
*/
console.log("[Server] Static file serving from local 'uploads' is disabled for Vercel deployment.");
// --- END OF UNIFIED CHANGE ---


// --- Optional Request Logger (Your original code is correct, no changes here) ---
app.use((req, res, next) => {
  console.log(`[Request In] ${new Date().toISOString()} | ${req.method} ${req.originalUrl}`);
  next();
});

// --- API Routes (Your original routes are all correct and remain unchanged) ---
app.get("/api", (req, res) =>
  res.status(200).json({ message: "API is Alive and Kicking!" })
);
// UNIFIED CHANGE: Added a root route for friendlier testing of the backend URL.
app.get("/", (req, res) =>
  res.status(200).json({ message: "API is Alive and Kicking!" })
);

console.log("[Server] Mounting Public & User Routes...");
app.use("/api/auth", userAuthRoutes);
app.use("/api/profile", userProfileRoutes);
app.use("/api/categories", publicCategoryRoutes);
app.use("/api/items", publicItemRoutes);
app.use("/api/profile/addresses", addressRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);

console.log("[Server] Mounting Admin Routes...");
app.use("/api/admin/auth", adminAuthRoutes);
app.use("/api/admin/categories", adminCategoryRoutes);
app.use("/api/admin/items", adminItemRoutes);
app.use("/api/admin/banners", bannerRoutes);
app.use("/api/admin/coupons", adminCouponRoutes);
app.use("/api/admin/pos/orders", posOrderRoutes);
app.use("/api/admin/customers", adminCustomerRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/coupons", publicCouponRoutes); // Duplicated, but keeping your original structure
app.use("/api/admin/orders", adminOrderRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/banners", publicBannerRoutes);


// --- Error Handlers (Your original code is correct, no changes here) ---
app.use((req, res, next) => {
  console.log(`[404 Handler] Route not found: ${req.method} ${req.originalUrl}`);
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
});

app.use((err, req, res, next) => {
  console.error("[Error Handler] An error occurred:", {
    message: err.message,
    status: err.status || err.statusCode,
    url: req.originalUrl,
    method: req.method,
    stack: process.env.NODE_ENV !== "production" ? err.stack : "Stack hidden in production",
    ...(err.code && { code: err.code }),
    ...(err.field && { field: err.field }),
  });
  let statusCode = err.statusCode || err.status || res.statusCode;
  if (!statusCode || statusCode < 400) {
    statusCode = 500;
  }
  res.status(statusCode);
  let responseMessage = err.message || "An unexpected error occurred.";
  if (err.code === "LIMIT_FILE_SIZE") {
    responseMessage = `File too large. Max size is ${process.env.MAX_FILE_UPLOAD_SIZE_MB || 5}MB.`;
  } else if (err.code === "INVALID_FILE_TYPE") {
    responseMessage = "Invalid file type. Only images (JPEG, PNG, GIF, WEBP) are allowed.";
  } else if (statusCode === 500 && process.env.NODE_ENV === "production") {
    responseMessage = "Internal Server Error";
  }
  res.json({
    message: responseMessage,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
    ...(err.errors && { errors: err.errors }),
  });
});

// --- Start Server / Export App ---
const PORT = process.env.PORT || 5000;

// UNIFIED CHANGE: Vercel needs to import the 'app' object, it does not run app.listen().
// This change makes the code work for both local development and Vercel.
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`\n🚀 Server ready for local development at http://localhost:${PORT}`);
  });
}

export default app;