// backend/controllers/adminCustomerController.js
import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import Order from "../models/Order.js";
import Address from "../models/Address.js"; // Import the Address model
import mongoose from "mongoose";

// @desc    Get all customers with aggregated order data and search
// @route   GET /api/admin/customers
// @access  Private/Admin
const getAllCustomers = asyncHandler(async (req, res) => {
  const pageSize = Number(req.query.limit) || 10;
  const page = Number(req.query.page) || 1;
  const searchQuery = req.query.search ? String(req.query.search).trim() : "";

  const baseQuery = {}; // Add base filters if needed, e.g., { role: 'customer' }

  const orConditions = [];
  if (searchQuery) {
    const searchRgx = new RegExp(searchQuery, "i");
    orConditions.push(
      { username: searchRgx },
      { email: searchRgx },
      { displayName: searchRgx }
    );

    const numericSearchQuery = searchQuery.replace(/\D/g, "");
    if (numericSearchQuery.length > 0) {
      // More robust phone search that allows for non-digit characters between numbers
      const phoneSearchRegexPattern = numericSearchQuery.split("").join("\\D*");
      orConditions.push({ phone: new RegExp(phoneSearchRegexPattern) }); // Removed 'i' flag as pattern handles digits
    } else if (!searchQuery.startsWith("+")) {
      // Only if not specifically searching for international format
      orConditions.push({ phone: searchRgx });
    }
  }

  const matchStage = { ...baseQuery };
  if (orConditions.length > 0) {
    matchStage.$or = orConditions;
  }

  try {
    const totalCustomers = await User.countDocuments(matchStage);

    const customers = await User.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: Order.collection.name, // Use Order.collection.name for safety
          localField: "_id",
          foreignField: "user",
          as: "ordersData",
        },
      },
      {
        $addFields: {
          totalOrders: { $size: "$ordersData" },
          totalOrderAmount: { $sum: "$ordersData.totalPrice" },
          // Add isActive field, default to true if not present in schema or add to schema
          // If User model has 'isActive', it will be used. Otherwise, defaults to true.
          isActive: { $ifNull: ["$isActive", true] },
        },
      },
      {
        $project: {
          username: 1,
          email: 1,
          displayName: 1,
          profilePicture: 1,
          phone: 1,
          createdAt: 1,
          totalOrders: 1,
          totalOrderAmount: 1,
          isActive: 1,
          // Ensure password and other sensitive fields are not included
          // cart, wishlist, walletTransactions, loyaltyTransactions etc. are usually not needed for list view
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: pageSize * (page - 1) },
      { $limit: pageSize },
    ]);

    res.json({
      customers,
      page,
      pages: Math.ceil(totalCustomers / pageSize),
      totalCount: totalCustomers,
      limit: pageSize,
    });
  } catch (error) {
    console.error("Error in getAllCustomers controller:", error);
    res.status(500).json({ message: "Server error fetching customers." });
  }
});

// @desc    Get a single customer's details and their orders and addresses
// @route   GET /api/admin/customers/:id
// @access  Private/Admin
const getCustomerDetailsById = asyncHandler(async (req, res) => {
  const customerId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(customerId)) {
    res.status(400);
    throw new Error("Invalid customer ID format.");
  }

  // Fetch user details. User model has walletBalance and loyaltyPoints as top-level fields.
  const user = await User.findById(customerId).select(
    "-password -cart -wishlist -walletTransactions -loyaltyTransactions -referralCode -referredBy -addresses" // Explicitly exclude embedded addresses if User schema has it
    // Add other fields to exclude if necessary, like -resetPasswordToken, -resetPasswordExpire
    // Keep fields like: username, email, displayName, profilePicture, phone, createdAt,
    // walletBalance, loyaltyPoints, isPhoneVerified, dob, recentLogin
  );

  if (!user) {
    res.status(404);
    throw new Error("Customer not found.");
  }

  // Fetch customer's orders
  // Select only necessary fields for the order list on customer details page
  const orders = await Order.find({ user: customerId })
    .sort({ createdAt: -1 })
    .limit(20) // Optional: limit the number of orders initially displayed
    // MODIFIED LINE: Changed 'status' to 'orderStatus'
    .select("_id orderIdSuffix totalPrice createdAt orderStatus paymentMethod");

  // Fetch customer's saved addresses from the Address collection
  const addresses = await Address.find({ user: customerId }).sort({
    isDefault: -1,
    updatedAt: -1,
  }); // Sort by default first, then by most recently updated

  // The response should be an object containing the user document, their orders array, and their addresses array
  res.json({ user: user.toObject(), orders, addresses }); // .toObject() can be useful for virtuals if any
});

export { getAllCustomers, getCustomerDetailsById };
