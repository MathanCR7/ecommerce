import asyncHandler from "express-async-handler";
import Coupon from "../models/Coupon.js";

// @desc    Get all active and valid coupons
// @route   GET /api/coupons
// @access  Public
export const getPublicCoupons = asyncHandler(async (req, res) => {
  const currentDate = new Date();
  const coupons = await Coupon.find({
    isActive: true,
    startDate: { $lte: currentDate },
    expireDate: { $gte: currentDate },
    // You might want to add more filters, e.g., couponType !== "Customer Wise"
    // or exclude coupons that reached a global usage limit if you implement that.
  }).select(
    "couponType title code discountType discountAmount minPurchase maxDiscount expireDate description"
  ); // Select fields relevant for display

  res.status(200).json({ success: true, coupons });
});

// @desc    Validate a coupon code (optional, can be part of order creation)
// @route   POST /api/coupons/validate
// @access  Public (or Private if user-specific validation is needed)
export const validateCoupon = asyncHandler(async (req, res) => {
  const { couponCode, cartSubtotal } = req.body;

  if (!couponCode) {
    return res
      .status(400)
      .json({ success: false, message: "Coupon code is required." });
  }

  const coupon = await Coupon.findOne({
    code: couponCode.toUpperCase(),
    isActive: true,
    startDate: { $lte: new Date() },
    expireDate: { $gte: new Date() },
  });

  if (!coupon) {
    return res
      .status(404)
      .json({ success: false, message: "Invalid or expired coupon code." });
  }

  if (cartSubtotal < coupon.minPurchase) {
    return res.status(400).json({
      success: false,
      message: `Minimum purchase of ${coupon.minPurchase} required for this coupon.`,
    });
  }

  // Here you could add more complex validation, e.g., user-specific usage limits,
  // if `req.user` is available (if it's a protected route).

  let discountAmount = 0;
  if (coupon.discountType === "Percent") {
    discountAmount = (cartSubtotal * coupon.discountAmount) / 100;
    if (coupon.maxDiscount > 0 && discountAmount > coupon.maxDiscount) {
      discountAmount = coupon.maxDiscount;
    }
  } else if (coupon.discountType === "Amount") {
    discountAmount = coupon.discountAmount;
  }
  // Ensure discount doesn't exceed cart subtotal itself
  discountAmount = Math.min(discountAmount, cartSubtotal);

  res.status(200).json({
    success: true,
    message: "Coupon applied successfully!",
    coupon: {
      code: coupon.code,
      title: coupon.title,
      discountType: coupon.discountType,
      discountValue: coupon.discountAmount, // The original value from coupon
      calculatedDiscount: discountAmount, // The discount that would be applied
      minPurchase: coupon.minPurchase,
      maxDiscount: coupon.maxDiscount,
      description: coupon.description,
    },
  });
});
