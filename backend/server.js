// backend/server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import session from "express-session";
import MongoStore from "connect-mongo";
import cookieParser from "cookie-parser";
import passport from "./config/passport.js"; // Ensure passport config is correct
import connectDB from "./config/database.js";
import addressRoutes from "./routes/addressRoutes.js";
// import { notFound, errorHandler } from "./middleware/errorMiddleware.js"; // Your original error middleware

// Route Imports
import userAuthRoutes from "./routes/userAuthRoutes.js";
import adminAuthRoutes from "./routes/adminAuthRoutes.js";
import userProfileRoutes from "./routes/userProfileRoutes.js"; // This will have the new route
import publicCategoryRoutes from "./routes/categoryRoutes.js"; // Assuming this is for public
import publicItemRoutes from "./routes/itemRoutes.js"; // Assuming this is for public
import adminCategoryRoutes from "./routes/adminCategoryRoutes.js";
import adminItemRoutes from "./routes/adminItemRoutes.js";
import bannerRoutes from "./routes/bannerRoutes.js";
import couponRoutes from "./routes/couponRoutes.js";
import posOrderRoutes from "./routes/posOrderRoutes.js";
import adminCustomerRoutes from "./routes/adminCustomerRoutes.js";
import orderRoutes from "./routes/orderRoutes.js"; // <-- Import the order routes
import paymentRoutes from "./routes/paymentRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";
import publicCouponRoutes from "./routes/couponRoutes.js";
import adminCouponRoutes from "./routes/adminCouponRoutes.js";
// Example snippet in your main server file (e.g., server.js)
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

// --- CORE MIDDLEWARE ---
const allowedOrigins = process.env.FRONTEND_URLS
  ? process.env.FRONTEND_URLS.split(",").map((url) => url.trim())
  : [];
const clientPort = process.env.CLIENT_PORT || 5173;
const devClientUrl = `http://localhost:${clientPort}`;

if (
  process.env.NODE_ENV !== "production" &&
  !allowedOrigins.includes(devClientUrl)
) {
  console.warn(
    `[CORS Setup] DEV MODE: Adding ${devClientUrl} to allowed origins.`
  );
  allowedOrigins.push(devClientUrl);
}
if (
  process.env.ECOM_FRONTEND_URL &&
  !allowedOrigins.includes(process.env.ECOM_FRONTEND_URL)
) {
  if (process.env.ECOM_FRONTEND_URL !== devClientUrl) {
    // Avoid adding duplicates
    console.warn(
      `[CORS Setup] Adding ECOM_FRONTEND_URL: ${process.env.ECOM_FRONTEND_URL} to allowed origins.`
    );
    allowedOrigins.push(process.env.ECOM_FRONTEND_URL);
  }
}

console.log(
  "[CORS Setup] Allowed Origins:",
  allowedOrigins.join(", ") || "None Configured (Will likely block frontend!)"
);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error(`[CORS Check] Blocked origin: ${origin}`);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
};
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// --- Session Configuration ---
const sessionSecret = process.env.SESSION_SECRET;
const mongoDbUri = process.env.MONGODB_URI;

if (!sessionSecret || !mongoDbUri) {
  console.error(
    "FATAL ERROR: SESSION_SECRET or MONGODB_URI not found. Session middleware requires these."
  );
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
      sameSite: process.env.NODE_ENV === "production" ? "lax" : "lax", // 'lax' is good default
      domain: process.env.COOKIE_DOMAIN || undefined,
    },
  })
);

// --- Passport Initialization ---
app.use(passport.initialize());
app.use(passport.session()); // For persistent login sessions (if used, though JWT is primary for API)

// --- Static Files Hosting ---
const uploadsPath = path.join(__dirname, "uploads");
const ensureUploadsDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`Created directory: ${dirPath}`);
    } catch (e) {
      console.error(`ERROR creating directory ${dirPath}:`, e);
    }
  }
};

ensureUploadsDir(uploadsPath);
ensureUploadsDir(path.join(uploadsPath, "items"));
ensureUploadsDir(path.join(uploadsPath, "categories"));
ensureUploadsDir(path.join(uploadsPath, "users"));
ensureUploadsDir(path.join(uploadsPath, "banners"));
// ensureUploadsDir(path.join(uploadsPath, "coupons")); // if coupons have images

app.use("/uploads", express.static(uploadsPath));
console.log(
  `[Server] Serving static files from ${uploadsPath} via /uploads route`
);

// --- Optional Request Logger ---
app.use((req, res, next) => {
  console.log(
    `[Request In] ${new Date().toISOString()} | ${req.method} ${
      req.originalUrl
    } | Origin: ${req.headers.origin || "N/A"}`
  );
  next();
});

// --- API Routes ---
app.get("/api", (req, res) =>
  res.status(200).json({ message: "API is Alive and Kicking!" })
);

console.log("[Server] Mounting Public & User Routes...");
app.use("/api/auth", userAuthRoutes); // User login/signup/status, Google Auth
app.use("/api/profile", userProfileRoutes); // User profile management (PROTECTED BY JWT MIDDLEWARE INSIDE THE ROUTE FILE)
app.use("/api/categories", publicCategoryRoutes); // Public category listing
app.use("/api/items", publicItemRoutes); // Public item listing
app.use("/api/profile/addresses", addressRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes); // <-- Mount the order routes here

console.log("[Server] Mounting Admin Routes...");
app.use("/api/admin/auth", adminAuthRoutes);
app.use("/api/admin/categories", adminCategoryRoutes);
app.use("/api/admin/items", adminItemRoutes);
app.use("/api/admin/banners", bannerRoutes);
app.use("/api/admin/coupons", couponRoutes);
app.use("/api/admin/pos/orders", posOrderRoutes);
app.use("/api/admin/customers", adminCustomerRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/coupons", publicCouponRoutes);
app.use("/api/admin/coupons", adminCouponRoutes);
// Use Admin Routes
app.use("/api/admin/orders", adminOrderRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/banners", publicBannerRoutes);
// --- Catch-All 404 Handler (Place AFTER all other routes) ---
app.use((req, res, next) => {
  console.log(
    `[404 Handler] Route not found: ${req.method} ${req.originalUrl}`
  );
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
});

// --- General Error Handler (Place LAST) ---
// Must have four arguments (err, req, res, next)
app.use((err, req, res, next) => {
  console.error("[Error Handler] An error occurred:", {
    message: err.message,
    status: err.status || err.statusCode, // Use err.status if available
    url: req.originalUrl,
    method: req.method,
    stack:
      process.env.NODE_ENV !== "production"
        ? err.stack
        : "Stack hidden in production",
    // For multer errors specifically
    ...(err.code && { code: err.code }),
    ...(err.field && { field: err.field }),
  });

  let statusCode = err.statusCode || err.status || res.statusCode;
  if (!statusCode || statusCode < 400) {
    // Ensure it's an error status
    statusCode = 500;
  }

  res.status(statusCode);

  // Customize response for specific errors like Multer's
  let responseMessage = err.message || "An unexpected error occurred.";
  if (err.code === "LIMIT_FILE_SIZE") {
    responseMessage = `File too large. Max size is ${
      process.env.MAX_FILE_UPLOAD_SIZE_MB || 5
    }MB.`;
  } else if (err.code === "INVALID_FILE_TYPE") {
    responseMessage =
      "Invalid file type. Only images (JPEG, PNG, GIF, WEBP) are allowed.";
  } else if (statusCode === 500 && process.env.NODE_ENV === "production") {
    responseMessage = "Internal Server Error";
  }

  res.json({
    message: responseMessage,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
    ...(err.errors && { errors: err.errors }), // For validation errors from express-validator
  });
});

// --- Start Server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(
    `\n🚀 Server ready and listening on port ${PORT} [Mode: ${
      process.env.NODE_ENV || "development"
    }]`
  );
  console.log(
    `   Frontend expected at: ${devClientUrl} or ${process.env.ECOM_FRONTEND_URL}`
  );
  console.log(`   API base path: /api`);
  console.log(`   Uploads served from: /uploads`);
});
