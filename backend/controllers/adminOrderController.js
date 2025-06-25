// backend/controllers/adminOrderController.js
import asyncHandler from "express-async-handler";
import Order from "../models/Order.js";
import User from "../models/User.js";
import mongoose from "mongoose";

// @desc    Get orders by status for admin with filtering, search, pagination, and optional export
// @route   GET /api/admin/orders?status=...&search=...&page=...&limit=...&startDate=...&endDate=...&export=...
// @access  Private/Admin
const getOrdersByStatus = asyncHandler(async (req, res) => {
  const pageSize = parseInt(req.query.limit) || 10;
  const page = parseInt(req.query.page) || 1;

  const statusFilter = req.query.status;
  const searchTerm = req.query.search;
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;
  const exportData = req.query.export === "true";

  const conditions = [];

  if (statusFilter && statusFilter.toLowerCase() !== "all") {
    const lowerCaseStatus = statusFilter.toLowerCase();
    const validStatuses = Order.schema.path("orderStatus").enumValues; // Dynamically gets enum

    const statusToMatch = validStatuses.find(
      (s) => s.toLowerCase() === lowerCaseStatus
    );

    if (statusToMatch) {
      conditions.push({ orderStatus: statusToMatch });
    } else {
      if (lowerCaseStatus === "paid") {
        conditions.push({ isPaid: true });
      } else if (lowerCaseStatus === "notpaid") {
        conditions.push({ isPaid: false });
      } else if (lowerCaseStatus === "offlinepaymentpendingverification") {
        // Handling the special case for VerifyOfflinePaymentPage
        conditions.push({
          paymentMethod: "Online", // Assuming offline payments are still marked 'Online' but need verification
          isPaid: false,
          // You might have a specific field like 'paymentVerificationStatus: "Pending"'
          // For now, this example assumes 'Online' method that is not yet 'isPaid' needs verification
          // Adjust this condition based on your exact schema for offline payment verification
        });
      }
    }
  }

  if (searchTerm) {
    const searchConditions = { $or: [] };
    try {
      const matchingUsers = await User.find({
        $or: [
          // Search by name or displayName
          { name: { $regex: searchTerm, $options: "i" } },
          { displayName: { $regex: searchTerm, $options: "i" } },
        ],
      }).select("_id");
      const userIds = matchingUsers.map((user) => user._id);
      if (userIds.length > 0) {
        searchConditions.$or.push({ user: { $in: userIds } });
      }
    } catch (userSearchError) {
      console.error("Error searching users for admin orders:", userSearchError);
    }
    if (mongoose.Types.ObjectId.isValid(searchTerm)) {
      try {
        const objectIdSearchTerm = new mongoose.Types.ObjectId(searchTerm);
        searchConditions.$or.push({ _id: objectIdSearchTerm });
      } catch (idError) {
        console.error("Error creating ObjectId from searchTerm:", idError);
      }
    }
    if (searchConditions.$or.length > 0) {
      conditions.push(searchConditions);
    }
  }

  if (startDate || endDate) {
    const dateFilter = {};
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      if (!isNaN(start.getTime())) dateFilter.$gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (!isNaN(end.getTime())) dateFilter.$lte = end;
    }
    if (Object.keys(dateFilter).length > 0) {
      conditions.push({ createdAt: dateFilter });
    } else if (startDate || endDate) {
      // Only throw error if dates were provided but invalid
      res.status(400);
      throw new Error("Invalid date format provided for filtering.");
    }
  }

  const finalQuery = conditions.length > 0 ? { $and: conditions } : {};
  const totalCount = await Order.countDocuments(finalQuery);

  let query = Order.find(finalQuery)
    .sort({ createdAt: -1 })
    .populate("user", "name email phone displayName")
    .select(
      "_id orderStatus totalPrice createdAt paymentMethod deliveryOption shippingAddress.city promoCodeApplied.appliedDiscount deliveryPreference.date deliveryPreference.timeSlot isPaid paymentVerificationStatus" // Added paymentVerificationStatus if you use it
    );

  if (!exportData) {
    query = query.limit(pageSize).skip(pageSize * (page - 1));
  }

  const orders = await query.exec();

  if (exportData) {
    res.json({
      orders,
      totalCount,
    });
  } else {
    res.json({
      orders,
      page,
      pages: Math.ceil(totalCount / pageSize),
      totalCount,
      limit: pageSize,
    });
  }
});

// @desc    Get a single order by ID for admin
// @route   GET /api/admin/orders/:id
// @access  Private/Admin
const getOrderById = asyncHandler(async (req, res) => {
  const orderId = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    res.status(400);
    throw new Error("Invalid Order ID format");
  }
  const order = await Order.findById(orderId)
    .populate("user", "name email phone displayName")
    .populate("orderItems.item", "name slug images unit price");
  if (order) {
    res.json(order);
  } else {
    res.status(404);
    throw new Error("Order not found");
  }
});

// @desc    Update order status for admin
// @route   PUT /api/admin/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = asyncHandler(async (req, res) => {
  const orderId = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    res.status(400);
    throw new Error("Invalid Order ID format");
  }

  const order = await Order.findById(orderId);
  // The `paymentStatus` from req.body is used to update `isPaid`
  // The `status` from req.body is used to update `orderStatus`
  const { status: newOrderStatus, paymentStatus: newPaymentStatusString } =
    req.body;

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // Validate and update orderStatus if provided
  if (newOrderStatus) {
    const validOrderStatuses = Order.schema.path("orderStatus").enumValues; // Dynamically gets current enum
    if (!validOrderStatuses.includes(newOrderStatus)) {
      res.status(400);
      // This is the line that was throwing the error.
      // Now validOrderStatuses will include "Confirmed" because your Order model schema was updated.
      throw new Error(
        `Invalid order status provided: "${newOrderStatus}". Valid statuses are: ${validOrderStatuses.join(
          ", "
        )}`
      );
    }
    order.orderStatus = newOrderStatus;

    // Update delivery/paid timestamps based on orderStatus transitions
    if (
      (newOrderStatus === "Delivered" || newOrderStatus === "Picked Up") &&
      !order.isDelivered
    ) {
      order.isDelivered = true;
      if (!order.deliveredAt) {
        order.deliveredAt = new Date();
      }
      // If COD and delivered/picked up, and not already paid, mark as paid
      if (order.paymentMethod === "COD" && !order.isPaid) {
        order.isPaid = true; // This will be handled by the paymentStatus logic below if newPaymentStatusString is also sent
        if (!order.paidAt) {
          order.paidAt = new Date();
        }
        if (!order.paymentResult) {
          order.paymentResult = {
            id: `COD_PAID_MANUAL_${Date.now()}_${orderId.substring(0, 6)}`,
            status: "captured",
            update_time: new Date().toISOString(),
            email_address: order.user?.email || "N/A",
            method: "COD",
            description: `COD payment received at ${newOrderStatus.toLowerCase()} status update`,
          };
        }
      }
    }
  }

  // Validate and update paymentStatus (isPaid) if newPaymentStatusString is provided
  if (newPaymentStatusString) {
    const newIsPaidValue = newPaymentStatusString.toLowerCase() === "paid";
    if (order.isPaid !== newIsPaidValue) {
      // Only update if different
      order.isPaid = newIsPaidValue;
      if (order.isPaid) {
        if (!order.paidAt) {
          // Set paidAt only if changing to paid and not already set
          order.paidAt = new Date();
        }
        // If becoming paid and no paymentResult (e.g. manual offline approval), create a placeholder
        if (order.paymentMethod === "Online" && !order.paymentResult) {
          // Assuming "Online" here covers "Offline Payment" for verification
          order.paymentResult = {
            id: `MANUAL_PAID_${Date.now()}_${orderId.substring(0, 6)}`,
            status: "captured", // Or 'verified'
            update_time: new Date().toISOString(),
            email_address: order.user?.email || "N/A", // Prefer user's email if available
            method: order.paymentMethod, // Could be 'Offline' or 'Bank Transfer' if you add those to enum
            description: `Payment manually marked as paid. Original method: ${order.paymentMethod}`,
          };
        }
      } else {
        // If changing to unpaid, clear paidAt (this might be controversial depending on business logic)
        // order.paidAt = undefined; // Or null
      }
    }
  }

  const updatedOrder = await order.save();
  await updatedOrder.populate("user", "name email phone displayName");
  res.json(updatedOrder);
});

// @desc    Update order delivery date/time preference for admin
// @route   PUT /api/admin/orders/:id/delivery
// @access  Private/Admin
const updateOrderDeliveryPreference = asyncHandler(async (req, res) => {
  const orderId = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    res.status(400);
    throw new Error("Invalid Order ID format");
  }

  const order = await Order.findById(orderId);
  const { date, timeSlot } = req.body;

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (!order.deliveryPreference) {
    order.deliveryPreference = {};
  }

  if (date !== undefined) {
    const parsedDate = date ? new Date(date) : undefined;
    if (date && parsedDate && isNaN(parsedDate.getTime())) {
      res.status(400);
      throw new Error(
        "Invalid date format provided for delivery preference date."
      );
    }
    order.deliveryPreference.date = parsedDate;
  }

  if (timeSlot !== undefined) {
    order.deliveryPreference.timeSlot = timeSlot || undefined;
  }

  if (order.deliveryPreference.date || order.deliveryPreference.timeSlot) {
    if (order.deliveryOption === "homeDelivery") {
      order.deliveryPreference.type = "scheduled";
    } else if (order.deliveryOption === "selfPickup") {
      order.deliveryPreference.type = "pickupScheduled";
    }
  } else {
    if (
      order.deliveryOption === "homeDelivery" &&
      order.deliveryPreference.type === "scheduled"
    ) {
      order.deliveryPreference.type = "quick";
    }
  }

  const updatedOrder = await order.save();
  await updatedOrder.populate("user", "name email phone displayName");
  res.json(updatedOrder);
});

const getLatestAdminOrder = asyncHandler(async (req, res) => {
  const latestOrder = await Order.findOne()
    .sort({ updatedAt: -1 }) // Sort by updatedAt in descending order to get the most recent
    .populate("user", "name displayName") // Optional: populate user for richer notification
    .select(
      "_id orderId orderStatus totalPrice user updatedAt createdAt paymentMethod isPaid"
    ); // Select necessary fields

  if (latestOrder) {
    res.json(latestOrder);
  } else {
    // No orders found at all in the system
    res.status(404).json({ message: "No orders found" });
  }
});

export {
  getOrdersByStatus,
  getOrderById,
  updateOrderStatus,
  updateOrderDeliveryPreference,
  getLatestAdminOrder, // Add the new controller here
};
