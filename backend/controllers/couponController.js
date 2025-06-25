import Coupon from "../models/Coupon.js";
import asyncHandler from "../middleware/asyncHandler.js";
import crypto from "crypto";

const generateCouponCode = (length = 8) => {
  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .slice(0, length)
    .toUpperCase();
};

// @desc    Create a new coupon
// @route   POST /api/admin/coupons
// @access  Private/Admin
const createCoupon = asyncHandler(async (req, res) => {
  const {
    couponType,
    title,
    code,
    limitForSameUser,
    discountType,
    discountAmount,
    minPurchase,
    maxDiscount,
    startDate,
    expireDate,
    isActive,
  } = req.body;

  if (
    !title ||
    !discountType ||
    discountAmount === undefined || // Allow 0 for discountAmount
    discountAmount === null ||
    String(discountAmount).trim() === "" ||
    !startDate ||
    !expireDate ||
    limitForSameUser === undefined ||
    limitForSameUser === null ||
    String(limitForSameUser).trim() === ""
  ) {
    res.status(400);
    throw new Error(
      "Please provide all required coupon details (Title, Discount Type/Amount, Dates, Limit)."
    );
  }

  const couponCode = code ? code.trim().toUpperCase() : generateCouponCode();

  const existingCoupon = await Coupon.findOne({ code: couponCode });
  if (existingCoupon) {
    res.status(400);
    throw new Error(`Coupon code '${couponCode}' already exists.`);
  }

  const coupon = new Coupon({
    couponType,
    title: title.trim(),
    code: couponCode,
    limitForSameUser: Number(limitForSameUser),
    discountType,
    discountAmount: Number(discountAmount),
    minPurchase: Number(minPurchase) || 0,
    maxDiscount: discountType === "Amount" ? 0 : Number(maxDiscount) || 0,
    startDate, // Mongoose will cast string YYYY-MM-DD to Date
    expireDate, // Mongoose will cast string YYYY-MM-DD to Date
    isActive: isActive !== undefined ? isActive : true, // isActive is handled here
  });

  const createdCoupon = await coupon.save(); // Pre-save hook in model will validate dates
  res.status(201).json(createdCoupon);
});

// @desc    Get all coupons
// @route   GET /api/admin/coupons
// @access  Private/Admin
const getAllCoupons = asyncHandler(async (req, res) => {
  const keyword = req.query.search
    ? {
        $or: [
          { title: { $regex: req.query.search, $options: "i" } },
          { code: { $regex: req.query.search, $options: "i" } },
        ],
      }
    : {};

  const coupons = await Coupon.find({ ...keyword }).sort({ createdAt: -1 }); // Fetches all fields including isActive
  res.json({ success: true, coupons });
});

// @desc    Get coupon by ID
// @route   GET /api/admin/coupons/:id
// @access  Private/Admin
const getCouponById = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);

  if (coupon) {
    res.json(coupon);
  } else {
    res.status(404);
    throw new Error("Coupon not found");
  }
});

// @desc    Update a coupon
// @route   PUT /api/admin/coupons/:id
// @access  Private/Admin
const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);

  if (!coupon) {
    res.status(404);
    throw new Error("Coupon not found");
  }

  const {
    couponType,
    title,
    limitForSameUser,
    discountType,
    discountAmount,
    minPurchase,
    maxDiscount,
    startDate,
    expireDate,
    isActive, // isActive can be updated here too
  } = req.body;

  coupon.couponType = couponType !== undefined ? couponType : coupon.couponType;
  coupon.title = title !== undefined ? title.trim() : coupon.title;
  coupon.limitForSameUser =
    limitForSameUser !== undefined
      ? Number(limitForSameUser)
      : coupon.limitForSameUser;

  const newDiscountType =
    discountType !== undefined ? discountType : coupon.discountType;
  coupon.discountType = newDiscountType;

  coupon.discountAmount =
    discountAmount !== undefined
      ? Number(discountAmount)
      : coupon.discountAmount;
  coupon.minPurchase =
    minPurchase !== undefined ? Number(minPurchase) : coupon.minPurchase;

  if (newDiscountType === "Amount") {
    coupon.maxDiscount = 0;
  } else if (maxDiscount !== undefined) {
    // Only update maxDiscount if explicitly provided for Percent type
    coupon.maxDiscount = Number(maxDiscount);
  }
  // If discountType is 'Percent' and maxDiscount is not provided, existing maxDiscount is preserved.

  if (startDate !== undefined) coupon.startDate = startDate; // Let schema cast and pre-save validate
  if (expireDate !== undefined) coupon.expireDate = expireDate; // Let schema cast and pre-save validate

  // The model's pre-save hook will handle date validation (expireDate vs startDate)
  // and other validations like discountAmount for Percent type.

  coupon.isActive = isActive !== undefined ? isActive : coupon.isActive;

  const updatedCoupon = await coupon.save();
  res.json(updatedCoupon);
});

// @desc    Delete a coupon
// @route   DELETE /api/admin/coupons/:id
// @access  Private/Admin
const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);

  if (coupon) {
    await Coupon.deleteOne({ _id: coupon._id });
    res.json({ message: "Coupon removed", couponId: req.params.id });
  } else {
    res.status(404);
    throw new Error("Coupon not found");
  }
});

// @desc    Update coupon status (Toggle Active/Inactive)
// @route   PATCH /api/admin/coupons/:id/status
// @access  Private/Admin
const updateCouponStatus = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);

  if (!coupon) {
    res.status(404);
    throw new Error("Coupon not found");
  }

  coupon.isActive = !coupon.isActive; // Toggles isActive

  const updatedCoupon = await coupon.save();
  res.json(updatedCoupon); // Return the full updated coupon object with new isActive status
});

export {
  createCoupon,
  getAllCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
  updateCouponStatus,
  generateCouponCode,
};
