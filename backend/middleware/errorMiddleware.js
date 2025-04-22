// backend/middleware/errorMiddleware.js
import multer from "multer";

// Custom 404 Not Found handler
export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error); // Pass the error to the global error handler
};

// Global Error Handler Middleware
export const errorHandler = (err, req, res, next) => {
  let statusCode =
    res.statusCode === 200
      ? err.statusCode || err.status || 500
      : res.statusCode;
  let message = err.message || "An unexpected internal server error occurred.";

  // Log the error internally (optional: enhance logging)
  console.error("--- Global Error Handler ---");
  console.error("Timestamp:", new Date().toISOString());
  console.error("Request:", `${req.method} ${req.originalUrl}`);
  if (statusCode >= 500) {
    // Log full error for server errors
    console.error("Status Code:", statusCode);
    console.error("Error Name:", err.name);
    console.error("Error Message:", message);
    console.error("Error Stack:", err.stack);
  } else {
    // Log concise info for client errors
    console.warn("Status Code:", statusCode);
    console.warn("Error Name:", err.name);
    console.warn("Error Message:", message);
  }
  console.error("--------------------------");

  // --- Specific Error Type Handling ---
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
  } else if (err.name === "CastError" && err.kind === "ObjectId") {
    statusCode = 400;
    message = `Invalid ID format provided for resource.`;
  } else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue)[0];
    message = `${
      field.charAt(0).toUpperCase() + field.slice(1)
    } already exists. Please use a different value.`;
  } else if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Unauthorized: Invalid token.";
  } else if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Unauthorized: Token has expired.";
  } else if (err instanceof multer.MulterError) {
    statusCode = 400;
    if (err.code === "LIMIT_FILE_SIZE") {
      message = `File too large. Maximum size is ${
        process.env.MAX_FILE_UPLOAD_SIZE_MB || 5
      }MB.`;
    } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
      message = `Invalid file field or too many files uploaded. Check field name: '${err.field}'.`;
    } else {
      message = `File Upload Error: ${err.message}`;
    }
  } else if (err.message === "Only image files are allowed!") {
    // Custom error from multer filter
    statusCode = 400;
    message = "Invalid file type. Only image files are allowed.";
  } else if (err.message === "Not allowed by CORS") {
    statusCode = 403; // Forbidden by CORS policy
    message = "Origin not allowed by CORS policy.";
  }
  // Ensure status code is valid
  if (statusCode < 100 || statusCode > 599) {
    console.warn(
      `Invalid status code ${statusCode} detected in error handler. Resetting to 500.`
    );
    statusCode = 500;
  }

  res.status(statusCode).json({
    success: false,
    message: message,
    // Send stack trace only in development
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
};
