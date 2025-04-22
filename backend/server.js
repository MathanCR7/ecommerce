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

// Configuration & Middleware Imports
import passport from "./config/passport.js";
import connectDB from "./config/database.js";
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";

// Route Imports
import userAuthRoutes from "./routes/userAuthRoutes.js";
import adminAuthRoutes from "./routes/adminAuthRoutes.js";
import userProfileRoutes from "./routes/userProfileRoutes.js";
import publicCategoryRoutes from "./routes/categoryRoutes.js";
import publicItemRoutes from "./routes/itemRoutes.js"; // Correct import
import adminCategoryRoutes from "./routes/adminCategoryRoutes.js";
import adminItemRoutes from "./routes/adminItemRoutes.js"; // Correct import

// --- Initial Setup ---
dotenv.config();
connectDB();
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- CORS Configuration ---
const allowedOrigins = process.env.FRONTEND_URLS
  ? process.env.FRONTEND_URLS.split(",").map((url) => url.trim())
  : [];

if (
  process.env.NODE_ENV !== "production" &&
  !allowedOrigins.includes(
    `http://localhost:${process.env.CLIENT_PORT || 5173}`
  )
) {
  const devClientUrl = `http://localhost:${process.env.CLIENT_PORT || 5173}`;
  console.warn(
    `WARNING: Development client origin ${devClientUrl} not found in FRONTEND_URLS. Adding it automatically for development.`
  );
  allowedOrigins.push(devClientUrl);
}

if (allowedOrigins.length === 0) {
  console.warn(
    "WARNING: No FRONTEND_URLS defined in .env, CORS might block frontend requests."
  );
} else {
  console.log("Allowed CORS origins:", allowedOrigins);
}

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`CORS Error: Origin ${origin} not allowed.`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};
app.use(cors(corsOptions));

// --- Core Middlewares ---
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// --- Session Configuration ---
if (!process.env.SESSION_SECRET || !process.env.MONGODB_URI) {
  console.error(
    "FATAL ERROR: SESSION_SECRET or MONGODB_URI missing in .env for session setup."
  );
  process.exit(1);
}

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
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

// --- Passport Initialization ---
app.use(passport.initialize());
app.use(passport.session());

// --- Static Files ---
const uploadsPath = path.join(__dirname, "uploads");
const ensureUploadsDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`Created directory: ${dirPath}`);
    } catch (mkdirError) {
      console.error(
        `ERROR: Could not create directory at ${dirPath}`,
        mkdirError
      );
    }
  }
};
ensureUploadsDir(uploadsPath);
ensureUploadsDir(path.join(uploadsPath, "items"));
ensureUploadsDir(path.join(uploadsPath, "categories"));
ensureUploadsDir(path.join(uploadsPath, "users")); // Added for user profile pics

app.use("/uploads", express.static(uploadsPath));
console.log(`Serving static files from ${uploadsPath} at /uploads`);

// --- API Routes ---
app.get("/api", (req, res) =>
  res.json({ message: "Unified E-commerce API Running" })
);

// Mount different route handlers
app.use("/api/auth", userAuthRoutes);
app.use("/api/admin/auth", adminAuthRoutes);
app.use("/api/profile", userProfileRoutes);
app.use("/api/categories", publicCategoryRoutes);
app.use("/api/admin/categories", adminCategoryRoutes);

// Correct route mounting
app.use("/api/items", publicItemRoutes); // Public item routes
app.use("/api/admin/items", adminItemRoutes); // Admin item routes

// --- Error Handling Middleware ---
app.use(notFound);
app.use(errorHandler);

// --- Start Server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(
    `\n🚀 Unified Server running in ${
      process.env.NODE_ENV || "development"
    } mode on port ${PORT}`
  );
  console.log(
    `   MongoDB URI: ${process.env.MONGODB_URI ? "Set" : "MISSING!"}`
  );
  console.log(
    `   Allowed Frontend Origins: ${
      allowedOrigins.length > 0 ? allowedOrigins.join(", ") : "None Configured!"
    }`
  );
  console.log(
    `   Cookie Domain: ${
      process.env.COOKIE_DOMAIN || "Not Set (Default Behavior)"
    }`
  );
  console.log(
    `   Session Cookie Secure: ${
      process.env.NODE_ENV === "production"
    } (Should be true in production)`
  );
});
