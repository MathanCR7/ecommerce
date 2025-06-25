// File: backend/routes/publicBannerRoutes.js (or similar path)
import express from "express";
import { getActiveBannersForCarousel } from "../controllers/bannerController.js"; // Ensure this path is correct

const router = express.Router();

// Optional: Log when this router handles a request
router.use((req, res, next) => {
  console.log(
    `[Public Banner Router Hit] Method: ${req.method}, Path: ${req.originalUrl}`
  );
  next();
});

// Public route to get active banners for the carousel
router.route("/active-for-carousel").get(getActiveBannersForCarousel);
console.log("[Public Banner Router] Defined GET for '/active-for-carousel'");

export default router;
