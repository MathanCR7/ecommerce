// backend/controllers/orderController.js
import asyncHandler from "express-async-handler";
import Order from "../models/Order.js";
import Item from "../models/Item.js";
import Address from "../models/Address.js";
import Coupon from "../models/Coupon.js";
import User from "../models/User.js";
import dotenv from "dotenv";
import mongoose from "mongoose";
import {
  isPointInPolygon,
  getDeliveryZonePolygon,
} from "../utils/locationUtils.js";

dotenv.config();

const getStoreAddressDetails = () => ({
  contactName: process.env.STORE_CONTACT_NAME || "The FruitBowl & Co Store",
  contactNumber: process.env.STORE_CONTACT_NUMBER || "+910000000000",
  addressLine: process.env.STORE_ADDRESS_LINE || "123 Main Street",
  streetNumber: process.env.STORE_STREET_NUMBER || null,
  houseNumber: process.env.STORE_HOUSE_NUMBER || null,
  floorNumber: process.env.STORE_FLOOR_NUMBER || null,
  city: process.env.STORE_CITY || "Anytown",
  state: process.env.STORE_STATE || "Anystate",
  postalCode: process.env.STORE_POSTAL_CODE || "000000",
  country: process.env.STORE_COUNTRY || "India",
  label: process.env.STORE_LABEL || "Store Pickup Location",
  latitude: process.env.STORE_LATITUDE
    ? parseFloat(process.env.STORE_LATITUDE)
    : undefined,
  longitude: process.env.STORE_LONGITUDE
    ? parseFloat(process.env.STORE_LONGITUDE)
    : undefined,
});

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);
};

// ⭐ NEW HELPER FOR DELIVERY ELIGIBILITY CHECK ⭐ (Existing)
export const validateDeliveryEligibility = async (
  userId,
  shippingAddressId,
  deliveryOption
) => {
  if (deliveryOption !== "homeDelivery") {
    // Not a home delivery, so no zone check needed from this function's perspective
    return null; // Or some indication that it's not applicable
  }

  if (
    !shippingAddressId ||
    !mongoose.Types.ObjectId.isValid(shippingAddressId)
  ) {
    // This specific error structure helps differentiate errors for the frontend if needed
    const error = new Error(
      "Valid shipping address ID is required for home delivery."
    );
    error.statusCode = 400;
    throw error;
  }

  const userShippingAddress = await Address.findOne({
    _id: shippingAddressId,
    user: userId,
  });

  if (!userShippingAddress) {
    const error = new Error("Shipping address not found for this user.");
    error.statusCode = 404;
    throw error;
  }

  const deliveryZonePolygon = getDeliveryZonePolygon(); // This will now return polygon with [lon, lat] vertices
  if (deliveryZonePolygon) {
    if (
      userShippingAddress.longitude == null || // Catches undefined and null
      userShippingAddress.latitude == null
    ) {
      const error = new Error(
        "Selected address is missing location coordinates. Cannot verify delivery eligibility. Please update your address details to include precise location."
      );
      error.statusCode = 400;
      throw error;
    }
    // addressPoint is [longitude, latitude]
    const addressPoint = [
      userShippingAddress.longitude,
      userShippingAddress.latitude,
    ];
    // isPointInPolygon expects point as [lon, lat] and polygon vertices as [lon, lat]
    if (!isPointInPolygon(addressPoint, deliveryZonePolygon)) {
      const error = new Error(
        "Sorry, we currently do not deliver to your selected address. Please choose a different address or opt for self-pickup."
      );
      error.statusCode = 400;
      throw error;
    }
  }
  // If all checks pass, return the address object. Could be useful.
  return userShippingAddress;
};
// ⭐ END NEW HELPER ⭐

const _createOrderDocument = async (userId, validatedOrderData) => {
  const userForOrder = await User.findById(userId).select(
    "cart profilePicture displayName name"
  );
  if (!userForOrder) {
    console.error(`FATAL: User ${userId} not found during order creation.`);
    throw new Error("User not found.");
  }

  const order = new Order({
    user: userId,
    ...validatedOrderData,
  });

  const createdOrder = await order.save();

  try {
    await Promise.all(
      validatedOrderData.orderItems.map(async (item) => {
        const product = await Item.findById(item.item);
        if (!product) {
          console.warn(
            `Stock update skipped: Item ${item.item} not found for order ${createdOrder._id}`
          );
          return;
        }
        if (product.manageStock) {
          const updatedProduct = await Item.findByIdAndUpdate(
            item.item,
            { $inc: { stock: -item.quantity } },
            { new: true, runValidators: true }
          );
          if (updatedProduct.stock < 0) {
            console.error(
              `Stock went negative for item ${item.item} on order ${createdOrder._id}! Current stock: ${updatedProduct.stock}`
            );
            await Item.findByIdAndUpdate(item.item, { stock: 0 });
          } else {
            console.log(
              `Stock updated for item ${item.item}: new stock ${updatedProduct.stock}`
            );
          }
        } else {
          console.log(
            `Stock management disabled for item ${item.item}. Stock not updated.`
          );
        }
      })
    );
  } catch (stockError) {
    console.error(
      `Error during stock updates for order ${createdOrder._id}:`,
      stockError
    );
  }

  if (validatedOrderData.promoCodeApplied?.code) {
    try {
      const appliedCouponCode = validatedOrderData.promoCodeApplied.code;
      const updatedCoupon = await Coupon.findOneAndUpdate(
        { code: appliedCouponCode.toUpperCase() },
        { $inc: { totalUsed: 1 } },
        { new: true }
      );

      if (!updatedCoupon) {
        console.warn(
          `Coupon usage update failed: Coupon code ${appliedCouponCode} not found.`
        );
      } else {
        console.log(
          `Coupon ${appliedCouponCode} usage count incremented to ${updatedCoupon.totalUsed} for order ${createdOrder._id}.`
        );
        if (
          updatedCoupon.maxTotalUses > 0 &&
          updatedCoupon.totalUsed >= updatedCoupon.maxTotalUses &&
          updatedCoupon.isActive
        ) {
          await Coupon.findByIdAndUpdate(updatedCoupon._id, {
            isActive: false,
          });
          console.log(
            `Coupon ${appliedCouponCode} deactivated due to max usage reached.`
          );
        }
      }
    } catch (couponUpdateError) {
      console.error(
        `Error updating usage for coupon ${validatedOrderData.promoCodeApplied.code} for order ${createdOrder._id}: ${couponUpdateError.message}`
      );
    }
  }

  if (userForOrder) {
    try {
      userForOrder.cart = [];
      await userForOrder.save({ validateBeforeSave: false });
      console.log(
        `Cart cleared for user ${userId} after order ${createdOrder._id}`
      );
    } catch (cartClearError) {
      console.error(
        `Error clearing cart for user ${userId} after order ${createdOrder._id}: ${cartClearError.message}`
      );
    }
  }
  return createdOrder;
};

export const createCODOrder = asyncHandler(async (req, res) => {
  const {
    orderItems: payloadOrderItems,
    shippingAddressId,
    deliveryOption = "homeDelivery",
    deliveryPreferenceType,
    scheduledDate,
    scheduledTimeSlot,
    promoCode: promoCodeInput,
    orderNotes,
  } = req.body;

  const userId = req.user._id;

  if (
    !payloadOrderItems ||
    !Array.isArray(payloadOrderItems) ||
    payloadOrderItems.length === 0
  ) {
    res.status(400);
    throw new Error("No order items provided.");
  }
  if (
    !deliveryOption ||
    !["homeDelivery", "selfPickup"].includes(deliveryOption)
  ) {
    res.status(400);
    throw new Error("Invalid delivery option provided.");
  }

  let finalShippingAddress = {};
  let finalDeliveryPreference = {};
  const storeAddressDetails = getStoreAddressDetails();
  let userShippingAddress = null; // To hold the validated address if home delivery

  if (deliveryOption === "homeDelivery") {
    // ⭐ USE THE NEW VALIDATION HELPER ⭐
    try {
      userShippingAddress = await validateDeliveryEligibility(
        userId,
        shippingAddressId,
        deliveryOption
      );
    } catch (error) {
      res.status(error.statusCode || 400);
      throw new Error(error.message); // Re-throw to be caught by asyncHandler
    }
    // If validation passed, userShippingAddress is populated
    finalShippingAddress = {
      contactName: userShippingAddress.contactName,
      contactNumber: userShippingAddress.contactNumber,
      addressLine: userShippingAddress.addressLine,
      streetNumber: userShippingAddress.streetNumber || null,
      houseNumber: userShippingAddress.houseNumber || null,
      floorNumber: userShippingAddress.floorNumber || null,
      city: userShippingAddress.city,
      state: userShippingAddress.state,
      postalCode: userShippingAddress.postalCode,
      country: userShippingAddress.country,
      label: userShippingAddress.label,
      latitude: userShippingAddress.latitude,
      longitude: userShippingAddress.longitude,
    };

    if (
      !deliveryPreferenceType ||
      !["quick", "scheduled"].includes(deliveryPreferenceType)
    ) {
      res.status(400);
      throw new Error(
        "Invalid delivery preference type (quick or scheduled) for home delivery."
      );
    }
    finalDeliveryPreference.type = deliveryPreferenceType;
    if (deliveryPreferenceType === "scheduled") {
      if (!scheduledDate || !scheduledTimeSlot) {
        res.status(400);
        throw new Error(
          "Scheduled date and time slot are required for scheduled home delivery."
        );
      }
      const dateObj = new Date(scheduledDate);
      if (isNaN(dateObj.getTime())) {
        res.status(400);
        throw new Error("Invalid scheduled date format.");
      }
      finalDeliveryPreference.date = dateObj;
      finalDeliveryPreference.timeSlot = scheduledTimeSlot;
    }
  } else if (deliveryOption === "selfPickup") {
    if (
      !storeAddressDetails.addressLine ||
      !storeAddressDetails.city ||
      !storeAddressDetails.state ||
      !storeAddressDetails.postalCode ||
      !storeAddressDetails.country
    ) {
      console.error(
        "FATAL: Store address details missing in environment variables! Cannot create pickup order."
      );
      res.status(500);
      throw new Error("Store location is not configured.");
    }
    finalShippingAddress = storeAddressDetails;

    if (!scheduledDate || !scheduledTimeSlot) {
      res.status(400);
      throw new Error(
        "Preferred pickup date and time slot are required for self pickup."
      );
    }
    const dateObj = new Date(scheduledDate);
    if (isNaN(dateObj.getTime())) {
      res.status(400);
      throw new Error("Invalid pickup date format.");
    }
    finalDeliveryPreference = {
      type: "pickupScheduled",
      date: dateObj,
      timeSlot: scheduledTimeSlot,
    };
  }

  const itemIds = payloadOrderItems.map((item) => item.item);
  if (!itemIds.every((id) => mongoose.Types.ObjectId.isValid(id))) {
    res.status(400);
    throw new Error("Invalid item ID format in cart.");
  }

  const dbItems = await Item.find({
    _id: { $in: itemIds },
    status: "active",
  }).select(
    "name price images stock manageStock mrp unit slug isTaxable cgstRate sgstRate"
  );

  if (dbItems.length !== payloadOrderItems.length) {
    const foundItemIds = dbItems.map((item) => item._id.toString());
    const missingItemPayloads = payloadOrderItems.filter(
      (item) => !foundItemIds.includes(item.item)
    );
    const missingItemNames = missingItemPayloads.map(
      (item) => item.name || `ID: ${item.item}`
    );

    res.status(400);
    throw new Error(
      `Some items in your cart are no longer available or are inactive: ${missingItemNames.join(
        ", "
      )}. Please refresh your cart.`
    );
  }

  let backendCalculatedItemsPrice = 0;
  const processedOrderItems = [];

  for (const orderItem of payloadOrderItems) {
    const dbItem = dbItems.find(
      (item) => item._id.toString() === orderItem.item
    );

    if (!dbItem) {
      // This should ideally not happen if the previous check (dbItems.length) passed
      res.status(500);
      throw new Error(`Internal error processing item ${orderItem.item}.`);
    }

    const itemStock = dbItem.manageStock ? dbItem.stock : Infinity;
    if (orderItem.quantity <= 0 || !Number.isInteger(orderItem.quantity)) {
      res.status(400);
      throw new Error(
        `Invalid quantity for item ${dbItem.name}. Quantity must be a positive integer.`
      );
    }
    if (dbItem.manageStock && orderItem.quantity > itemStock) {
      res.status(400);
      throw new Error(
        `Insufficient stock for ${dbItem.name}. Only ${itemStock} available.`
      );
    }

    backendCalculatedItemsPrice += dbItem.price * orderItem.quantity;

    let displayImagePath = "/assets/images/placeholder-item.png";
    if (dbItem.images && dbItem.images.length > 0) {
      const primaryImg = dbItem.images.find((img) => img.isPrimary);
      displayImagePath = primaryImg
        ? primaryImg.path
        : dbItem.images[0]?.path || displayImagePath;
    }

    processedOrderItems.push({
      item: dbItem._id,
      name: dbItem.name,
      quantity: orderItem.quantity,
      priceAtPurchase: dbItem.price,
      image: displayImagePath,
      unit: dbItem.unit,
      cgstRateAtPurchase: dbItem.isTaxable ? dbItem.cgstRate || 0 : 0,
      sgstRateAtPurchase: dbItem.isTaxable ? dbItem.sgstRate || 0 : 0,
      isTaxableAtPurchase: dbItem.isTaxable || false,
    });
  }

  let backendCalculatedDiscountAmount = 0;
  let finalPromoCodeApplied = null;

  const couponCodeString = promoCodeInput
    ? typeof promoCodeInput === "string"
      ? promoCodeInput
      : promoCodeInput.code
    : null;

  if (couponCodeString) {
    const coupon = await Coupon.findOne({
      code: couponCodeString.toUpperCase(),
      isActive: true,
      startDate: { $lte: new Date() },
      expireDate: { $gte: new Date() },
    });

    if (coupon) {
      if (coupon.maxTotalUses > 0 && coupon.totalUsed >= coupon.maxTotalUses) {
        res.status(400);
        throw new Error(
          `Coupon "${coupon.code}" has reached its maximum usage limit.`
        );
      } else {
        let canUseCoupon = true;
        if (coupon.limitForSameUser > 0) {
          const userPastOrdersWithCoupon = await Order.countDocuments({
            user: userId,
            "promoCodeApplied.code": coupon.code.toUpperCase(),
            orderStatus: { $nin: ["Cancelled", "Payment Failed", "Refunded"] },
          });
          if (userPastOrdersWithCoupon >= coupon.limitForSameUser) {
            canUseCoupon = false;
            res.status(400);
            throw new Error(
              `You have already used coupon "${coupon.code}" the maximum number of times.`
            );
          }
        }

        if (canUseCoupon && backendCalculatedItemsPrice >= coupon.minPurchase) {
          if (coupon.discountType === "Percent") {
            backendCalculatedDiscountAmount =
              (backendCalculatedItemsPrice * coupon.discountAmount) / 100;
            if (
              coupon.maxDiscount > 0 &&
              backendCalculatedDiscountAmount > coupon.maxDiscount
            ) {
              backendCalculatedDiscountAmount = coupon.maxDiscount;
            }
          } else if (coupon.discountType === "Amount") {
            backendCalculatedDiscountAmount = coupon.discountAmount;
            if (
              coupon.maxDiscount > 0 &&
              backendCalculatedDiscountAmount > coupon.maxDiscount
            ) {
              backendCalculatedDiscountAmount = coupon.maxDiscount;
            }
          }
          backendCalculatedDiscountAmount = Math.min(
            backendCalculatedDiscountAmount,
            backendCalculatedItemsPrice
          );
          backendCalculatedDiscountAmount = Math.max(
            0,
            backendCalculatedDiscountAmount
          );

          finalPromoCodeApplied = {
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: coupon.discountAmount,
            appliedDiscount: backendCalculatedDiscountAmount,
          };
        } else if (
          canUseCoupon &&
          backendCalculatedItemsPrice < coupon.minPurchase
        ) {
          res.status(400);
          throw new Error(
            `Minimum purchase amount of ${formatCurrency(
              coupon.minPurchase
            )} not met for coupon "${
              coupon.code
            }". Current item total is ${formatCurrency(
              backendCalculatedItemsPrice
            )}.`
          );
        }
      }
    } else {
      res.status(400);
      throw new Error(
        `Coupon code "${couponCodeString}" is invalid or expired.`
      );
    }
  }

  let backendCalculatedTotalTaxPrice = 0;
  const subTotalAfterPromo =
    backendCalculatedItemsPrice - backendCalculatedDiscountAmount;

  for (const processedItem of processedOrderItems) {
    const dbItemDetails = dbItems.find(
      (db) => db._id.toString() === processedItem.item.toString()
    );
    if (!dbItemDetails || !dbItemDetails.isTaxable) continue;

    const itemOriginalSubtotal =
      processedItem.priceAtPurchase * processedItem.quantity;
    const itemPromoDiscountShare =
      backendCalculatedItemsPrice > 0
        ? (itemOriginalSubtotal / backendCalculatedItemsPrice) *
          backendCalculatedDiscountAmount
        : 0;
    let itemTaxableValue = itemOriginalSubtotal - itemPromoDiscountShare;
    itemTaxableValue = Math.max(0, itemTaxableValue);

    if (itemTaxableValue > 0) {
      const cgst = itemTaxableValue * ((dbItemDetails.cgstRate || 0) / 100);
      const sgst = itemTaxableValue * ((dbItemDetails.sgstRate || 0) / 100);
      backendCalculatedTotalTaxPrice += cgst + sgst;
    }
  }
  backendCalculatedTotalTaxPrice = parseFloat(
    backendCalculatedTotalTaxPrice.toFixed(2)
  );

  let backendCalculatedShippingPrice = 0;
  const freeDeliveryThreshold =
    parseFloat(process.env.FREE_DELIVERY_THRESHOLD) || 1000;
  const fixedDeliveryFee = parseFloat(process.env.FIXED_DELIVERY_FEE) || 50;

  if (deliveryOption === "homeDelivery") {
    const amountForDeliveryCheck =
      subTotalAfterPromo + backendCalculatedTotalTaxPrice;
    backendCalculatedShippingPrice =
      amountForDeliveryCheck >= freeDeliveryThreshold ? 0 : fixedDeliveryFee;
  }

  const totalPrice =
    subTotalAfterPromo +
    backendCalculatedTotalTaxPrice +
    backendCalculatedShippingPrice;

  const validatedOrderData = {
    orderItems: processedOrderItems,
    shippingAddress: finalShippingAddress,
    paymentMethod: "COD",
    paymentResult: null,
    itemsPrice: parseFloat(backendCalculatedItemsPrice.toFixed(2)),
    taxPrice: backendCalculatedTotalTaxPrice,
    shippingPrice: parseFloat(backendCalculatedShippingPrice.toFixed(2)),
    discountAmount: parseFloat(backendCalculatedDiscountAmount.toFixed(2)),
    totalPrice: parseFloat(totalPrice.toFixed(2)),
    deliveryOption: deliveryOption,
    deliveryPreference: finalDeliveryPreference,
    promoCodeApplied: finalPromoCodeApplied,
    orderNotes: orderNotes,
    isPaid: false,
    paidAt: null,
    orderStatus: "Pending",
  };

  const createdOrder = await _createOrderDocument(userId, validatedOrderData);
  res.status(201).json(createdOrder);
});

export const getOrderById = asyncHandler(async (req, res) => {
  const orderId = req.params.id;
  const userId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    res.status(400);
    throw new Error("Invalid Order ID format.");
  }

  const order = await Order.findOne({
    _id: orderId,
    user: userId,
  })
    .populate("user", "name email displayName profilePicture phone")
    .populate("orderItems.item", "name slug images unit price");

  if (order) {
    res.json(order);
  } else {
    res.status(404);
    throw new Error("Order not found or you are not authorized to view it.");
  }
});

export const getMyOrders = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const statusFilter = req.query.status;
  const dateFilter = req.query.date;

  const query = { user: userId };

  if (statusFilter) {
    const validStatuses = Order.schema.path("orderStatus").enumValues;
    const statusToMatch = validStatuses.find(
      (s) => s.toLowerCase() === statusFilter.toLowerCase()
    );
    if (statusToMatch) {
      query.orderStatus = statusToMatch;
    } else {
      console.warn(`Invalid status query for user orders: ${statusFilter}`);
    }
  }

  if (dateFilter) {
    const dateObj = new Date(dateFilter);
    if (!isNaN(dateObj.getTime())) {
      const startOfDay = new Date(dateObj);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dateObj);
      endOfDay.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: startOfDay, $lte: endOfDay };
    } else {
      console.warn(`Invalid date query for user orders: ${dateFilter}`);
    }
  }

  const totalCount = await Order.countDocuments(query);
  const orders = await Order.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select(
      "_id orderStatus totalPrice createdAt paymentMethod deliveryOption shippingAddress.city promoCodeApplied.appliedDiscount deliveryPreference.date deliveryPreference.timeSlot isPaid"
    );

  res.json({
    orders,
    page,
    pages: Math.ceil(totalCount / limit),
    totalCount,
  });
});

// ⭐ NEW CONTROLLER FOR CLIENT-SIDE DELIVERY ELIGIBILITY CHECK ⭐
export const checkDeliveryEligibilityController = asyncHandler(
  async (req, res) => {
    const userId = req.user._id;
    const { shippingAddressId } = req.body;

    if (!shippingAddressId) {
      res
        .status(400)
        .json({ eligible: false, message: "Shipping address ID is required." });
      return;
    }
    if (!mongoose.Types.ObjectId.isValid(shippingAddressId)) {
      res.status(400).json({
        eligible: false,
        message: "Invalid shipping address ID format.",
      });
      return;
    }

    try {
      // Call the existing validation helper, explicitly for "homeDelivery"
      const validatedAddress = await validateDeliveryEligibility(
        userId,
        shippingAddressId,
        "homeDelivery"
      );

      // If validateDeliveryEligibility does not throw, and returns an address object,
      // it means the address is eligible based on all criteria including zone check (if applicable).
      if (validatedAddress) {
        res.status(200).json({
          eligible: true,
          message: "Address is eligible for delivery.",
        });
      } else {
        // This case should ideally not be reached if deliveryOption is "homeDelivery"
        // as validateDeliveryEligibility would throw or return an address.
        // However, as a fallback:
        res.status(400).json({
          eligible: false,
          message: "Could not determine delivery eligibility.",
        });
      }
    } catch (error) {
      // Errors thrown by validateDeliveryEligibility (e.g., not found, no coords, outside zone)
      // will have statusCode and message.
      res
        .status(error.statusCode || 400)
        .json({ eligible: false, message: error.message });
    }
  }
);
// ⭐ END NEW CONTROLLER ⭐

export { _createOrderDocument };
