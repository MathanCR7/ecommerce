// backend/controllers/paymentController.js
import asyncHandler from "express-async-handler";
import Razorpay from "razorpay";
import crypto from "crypto";
import Order from "../models/Order.js";
import Item from "../models/Item.js";
import Address from "../models/Address.js";
import Coupon from "../models/Coupon.js";
import {
  _createOrderDocument,
  validateDeliveryEligibility, // ⭐ IMPORT THE HELPER
} from "./orderController.js";
import mongoose from "mongoose";
// Removed unused imports for isPointInPolygon and getDeliveryZonePolygon from here
// as they are used within validateDeliveryEligibility which is imported.

import dotenv from "dotenv";
dotenv.config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

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

export const createRazorpayOrder = asyncHandler(async (req, res) => {
  const {
    amount,
    currency = process.env.RAZORPAY_CURRENCY || "INR",
    shippingAddressId, // ⭐ NEW: For pre-validation
    deliveryOption, // ⭐ NEW: For pre-validation
    notes: clientNotes, // Existing notes from request body
  } = req.body;

  const userId = req.user._id;
  const amountInt = Number(amount);

  if (!Number.isInteger(amountInt) || amountInt <= 0) {
    res.status(400);
    console.error(`Received invalid amount for payment: ${amount}`);
    throw new Error("Invalid payment amount provided.");
  }

  // ⭐ PRE-PAYMENT DELIVERY ELIGIBILITY CHECK ⭐
  if (deliveryOption === "homeDelivery") {
    try {
      // This will throw an error if not eligible, which will be caught by asyncHandler
      await validateDeliveryEligibility(
        userId,
        shippingAddressId,
        deliveryOption
      );
      console.log(
        `Pre-payment: Delivery to address ${shippingAddressId} is eligible.`
      );
    } catch (validationError) {
      console.error(
        "Pre-payment delivery eligibility check failed:",
        validationError.message
      );
      res.status(validationError.statusCode || 400);
      throw new Error(validationError.message); // Re-throw to stop processing
    }
  }
  // ⭐ END PRE-PAYMENT CHECK ⭐

  const amountInPaise = amountInt;

  const options = {
    amount: amountInPaise,
    currency: currency,
    receipt: `receipt_${Date.now()}_${req.user._id.toString().slice(-5)}`,
    payment_capture: 1,
    notes: {
      // Keep notes for Razorpay dashboard useful
      userId: req.user._id.toString(),
      orderInitiatedAt: new Date().toISOString(),
      shippingAddressId: shippingAddressId || null, // Store if provided
      deliveryOption: deliveryOption || null, // Store if provided
      ...(clientNotes || {}), // Spread client-provided notes
    },
  };

  try {
    console.log("Attempting to create Razorpay order with options:", options);
    const order = await razorpay.orders.create(options);
    console.log("Razorpay order created:", order.id);
    res.json({
      id: order.id,
      currency: order.currency,
      amount: order.amount,
    });
  } catch (error) {
    console.error("Razorpay order creation error:", error);
    const razorpayErrorMessage =
      error.error?.description ||
      error.message ||
      "An error occurred with Razorpay.";
    res.status(error.statusCode || 500);
    throw new Error(`Failed to create Razorpay order: ${razorpayErrorMessage}`);
  }
});

export const verifyRazorpayPayment = asyncHandler(async (req, res) => {
  const { paymentDetails, orderPayload } = req.body;

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    paymentDetails || {};

  const userId = req.user._id;

  if (
    !razorpay_order_id ||
    !razorpay_payment_id ||
    !razorpay_signature ||
    !orderPayload ||
    !orderPayload.orderItems ||
    orderPayload.orderItems.length === 0 ||
    !orderPayload.deliveryOption
  ) {
    res.status(400);
    console.error(
      "Payment verification failed: Missing required payload data.",
      {
        razorpay_order_id: !!razorpay_order_id,
        razorpay_payment_id: !!razorpay_payment_id,
        razorpay_signature: !!razorpay_signature,
        orderPayloadPresent: !!orderPayload,
        orderItemsPresent: !!orderPayload?.orderItems,
        orderItemsLength: orderPayload?.orderItems?.length,
        deliveryOptionPresent: !!orderPayload?.deliveryOption,
      }
    );
    throw new Error("Missing payment verification details or order payload.");
  }

  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    res.status(400);
    console.error("Payment verification failed: Invalid signature.", {
      razorpay_order_id,
      razorpay_payment_id,
    });
    throw new Error("Payment verification failed: Invalid signature.");
  }

  let paymentDetailsFromApi;
  try {
    console.log(
      `Fetching payment details from Razorpay API for payment ID: ${razorpay_payment_id}`
    );
    paymentDetailsFromApi = await razorpay.payments.fetch(razorpay_payment_id);
    console.log("Payment details fetched:", {
      id: paymentDetailsFromApi.id,
      status: paymentDetailsFromApi.status,
      amount: paymentDetailsFromApi.amount,
      order_id: paymentDetailsFromApi.order_id,
      method: paymentDetailsFromApi.method,
      description: paymentDetailsFromApi.description,
      email: paymentDetailsFromApi.email,
    });
  } catch (apiError) {
    console.error(
      `Failed to fetch payment details for ${razorpay_payment_id} from Razorpay API:`,
      apiError
    );
    res.status(500);
    throw new Error("Failed to verify payment status with Razorpay.");
  }

  if (
    paymentDetailsFromApi.status !== "captured" ||
    paymentDetailsFromApi.order_id !== razorpay_order_id
  ) {
    res.status(400);
    console.error(
      "Payment verification failed: Payment not captured or Order ID mismatch.",
      {
        paymentStatus: paymentDetailsFromApi.status,
        paymentOrderId: paymentDetailsFromApi.order_id,
        expectedOrderId: razorpay_order_id,
      }
    );
    throw new Error(
      `Payment not captured or order mismatch. Current status: ${paymentDetailsFromApi.status}`
    );
  }

  const {
    orderItems: payloadOrderItems,
    shippingAddressId, // This is from the orderPayload sent from frontend
    deliveryOption, // This is from the orderPayload sent from frontend
    deliveryPreferenceType,
    scheduledDate,
    scheduledTimeSlot,
    promoCode: promoCodeInput,
    orderNotes,
  } = orderPayload;

  // ⭐ FINAL DELIVERY ELIGIBILITY CHECK (Safeguard) ⭐
  // This uses data from orderPayload, which was constructed on the client
  // before payment and sent again for verification.
  let validatedUserShippingAddress = null;
  if (deliveryOption === "homeDelivery") {
    try {
      validatedUserShippingAddress = await validateDeliveryEligibility(
        userId,
        shippingAddressId, // from orderPayload
        deliveryOption // from orderPayload
      );
      console.log(
        `Post-payment: Delivery to address ${shippingAddressId} re-validated.`
      );
    } catch (validationError) {
      // This is a critical issue: payment captured but delivery might not be possible.
      // Needs careful handling (e.g., auto-refund, manual review flag).
      console.error(
        "CRITICAL: Post-payment delivery eligibility check failed:",
        validationError.message,
        `RZP Order: ${razorpay_order_id}, Payment: ${razorpay_payment_id}`
      );
      // For now, we'll throw an error. In a real system, you might want to
      // still create the order with a special status and trigger a refund process.
      res.status(validationError.statusCode || 400);
      throw new Error(
        `${validationError.message} Payment was successful, but there's an issue with delivery. Please contact support regarding order ${razorpay_order_id}.`
      );
    }
  }
  // ⭐ END FINAL DELIVERY ELIGIBILITY CHECK ⭐

  const itemIds = payloadOrderItems.map((item) => item.item);
  if (!itemIds.every((id) => mongoose.Types.ObjectId.isValid(id))) {
    res.status(400);
    throw new Error("Invalid item ID format in order payload.");
  }

  const dbItems = await Item.find({
    _id: { $in: itemIds },
    status: "active",
  }).select(
    "name price images stock manageStock mrp unit slug isTaxable cgstRate sgstRate"
  );

  if (dbItems.length !== payloadOrderItems.length) {
    res.status(400);
    console.error(
      "Payment verification failed: Some items in payload are invalid or inactive.",
      { requestedItemIds: itemIds, dbItemIds: dbItems.map((item) => item._id) }
    );
    throw new Error(
      "Some items in your cart are no longer available. Please refresh your cart."
    );
  }

  let backendCalculatedItemsPrice = 0;
  const processedOrderItems = [];

  for (const orderItem of payloadOrderItems) {
    const dbItem = dbItems.find(
      (item) => item._id.toString() === orderItem.item.toString()
    );

    if (!dbItem) {
      console.error(
        `Critical: Item ${orderItem.item} from payload not found in DB items batch during verification.`
      );
      res.status(500);
      throw new Error("Internal error processing cart items.");
    }

    if (dbItem.price !== orderItem.priceAtPurchase) {
      console.warn(
        `Price mismatch for item ${dbItem.name} (${dbItem._id}): Frontend price ${orderItem.priceAtPurchase}, DB price ${dbItem.price}. Using DB price ${dbItem.price} for order.`
      );
    }

    const itemStock = dbItem.manageStock ? dbItem.stock : Infinity;
    const requestedQuantity = Number(orderItem.quantity) || 0;

    if (requestedQuantity <= 0 || !Number.isInteger(requestedQuantity)) {
      console.error(
        `Invalid quantity ${requestedQuantity} for item ${dbItem._id} during order processing.`
      );
      res.status(400);
      throw new Error(`Invalid quantity for item: ${dbItem.name}`);
    }

    if (dbItem.manageStock && requestedQuantity > itemStock) {
      res.status(400);
      console.error(
        `Payment verification failed: Insufficient stock for item ${dbItem._id}. Requested: ${requestedQuantity}, Available: ${itemStock}`
      );
      // Potentially trigger refund here or create order with "On Hold - Stock Issue"
      throw new Error(
        `Insufficient stock for ${dbItem.name}. Only ${itemStock} available. Payment may be refunded.`
      );
    }

    backendCalculatedItemsPrice += dbItem.price * requestedQuantity;

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
      quantity: requestedQuantity,
      priceAtPurchase: dbItem.price, // Use DB price
      image: displayImagePath,
      unit: dbItem.unit,
      cgstRateAtPurchase: dbItem.isTaxable ? dbItem.cgstRate || 0 : 0,
      sgstRateAtPurchase: dbItem.isTaxable ? dbItem.sgstRate || 0 : 0,
      isTaxableAtPurchase: dbItem.isTaxable || false,
    });
  }

  let finalShippingAddress = {};
  let finalDeliveryPreference = {};
  const storeAddressDetails = getStoreAddressDetails();

  if (deliveryOption === "homeDelivery") {
    // validatedUserShippingAddress comes from the re-validation check above
    if (!validatedUserShippingAddress) {
      // This should not happen if the re-validation logic is correct
      // and throws an error if `shippingAddressId` from payload is bad.
      // However, as a very defensive measure:
      console.error(
        `CRITICAL: validatedUserShippingAddress is null for home delivery for order ${razorpay_order_id} despite passing re-validation phase. This indicates a logic flaw.`
      );
      res.status(500);
      throw new Error(
        "Internal server error processing shipping address after payment. Contact support."
      );
    }
    finalShippingAddress = {
      contactName: validatedUserShippingAddress.contactName,
      contactNumber: validatedUserShippingAddress.contactNumber,
      addressLine: validatedUserShippingAddress.addressLine,
      streetNumber: validatedUserShippingAddress.streetNumber || null,
      houseNumber: validatedUserShippingAddress.houseNumber || null,
      floorNumber: validatedUserShippingAddress.floorNumber || null,
      city: validatedUserShippingAddress.city,
      state: validatedUserShippingAddress.state,
      postalCode: validatedUserShippingAddress.postalCode,
      country: validatedUserShippingAddress.country,
      label: validatedUserShippingAddress.label,
      latitude: validatedUserShippingAddress.latitude,
      longitude: validatedUserShippingAddress.longitude,
    };

    if (
      !deliveryPreferenceType ||
      !["quick", "scheduled"].includes(deliveryPreferenceType)
    ) {
      res.status(400);
      throw new Error(
        "Invalid delivery preference type (quick or scheduled) in payload for home delivery."
      );
    }
    finalDeliveryPreference = { type: deliveryPreferenceType };
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
        "FATAL: Store address details missing in environment variables for pickup during verification!"
      );
      res.status(500);
      throw new Error(
        "Store location is not configured correctly on the server."
      );
    }
    finalShippingAddress = storeAddressDetails;

    if (!scheduledDate || !scheduledTimeSlot) {
      res.status(400);
      throw new Error(
        "Preferred pickup date and time slot are required in payload for self pickup."
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
    // No need to check orderPayload.paymentMethod !== "Online" here
    // as this is post-payment for an online transaction.
  } else {
    res.status(400);
    throw new Error("Invalid delivery option specified in payload.");
  }

  let backendCalculatedDiscountAmount = 0;
  let finalPromoCodeApplied = null;

  const couponCodeString =
    promoCodeInput?.code ||
    (typeof promoCodeInput === "string" ? promoCodeInput : null);

  if (couponCodeString) {
    const coupon = await Coupon.findOne({
      code: couponCodeString.toUpperCase(),
      isActive: true,
      startDate: { $lte: new Date() },
      expireDate: { $gte: new Date() },
    });

    if (coupon) {
      if (coupon.maxTotalUses > 0 && coupon.totalUsed >= coupon.maxTotalUses) {
        console.log(
          `Coupon ${coupon.code} cannot be used for order ${razorpay_order_id}: global limit reached.`
        );
        // Don't throw error, just don't apply coupon. Price mismatch will be caught later.
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
            console.log(
              `User ${userId} has reached usage limit for coupon ${coupon.code} for order ${razorpay_order_id}.`
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
        } else if (!canUseCoupon) {
          // User limit reached, don't apply, price mismatch will be caught
        } else if (backendCalculatedItemsPrice < coupon.minPurchase) {
          console.log(
            `Coupon ${coupon.code} minimum purchase of ${coupon.minPurchase} not met by cart total ${backendCalculatedItemsPrice} for order ${razorpay_order_id}.`
          );
          // Don't apply, price mismatch will be caught
        }
      }
    } else {
      console.log(
        `Coupon code "${couponCodeString}" not found, invalid, or expired for order ${razorpay_order_id}.`
      );
      // Don't apply, price mismatch will be caught
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

  const calculatedTotalBackend =
    subTotalAfterPromo +
    backendCalculatedTotalTaxPrice +
    backendCalculatedShippingPrice;

  const calculatedTotalPaise = Math.round(calculatedTotalBackend * 100);
  const paidAmountPaise = paymentDetailsFromApi.amount;

  console.log(
    `Comparing backend calculated total (${calculatedTotalBackend.toFixed(
      2
    )} INR / ${calculatedTotalPaise} paise) with RZP paid amount (${paidAmountPaise} paise) for RZP order ${razorpay_order_id}.`
  );
  console.log(
    `Breakdown: ItemsPrice=${backendCalculatedItemsPrice.toFixed(
      2
    )}, Discount=${backendCalculatedDiscountAmount.toFixed(
      2
    )}, SubTotalAfterPromo=${subTotalAfterPromo.toFixed(
      2
    )}, Tax=${backendCalculatedTotalTaxPrice.toFixed(
      2
    )}, Shipping=${backendCalculatedShippingPrice.toFixed(2)}`
  );

  if (calculatedTotalPaise !== paidAmountPaise) {
    const difference = Math.abs(calculatedTotalPaise - paidAmountPaise);
    // Allow a small tolerance (e.g., 1 paisa) for floating point inaccuracies if needed,
    // but strict equality is generally preferred for financial transactions.
    // Here, we allow up to 1 paisa difference.
    if (difference > 1) {
      console.error(
        `Payment verification failed: Amount mismatch! Calculated backend total: ${calculatedTotalBackend.toFixed(
          2
        )} (${calculatedTotalPaise} paise), Paid amount: ${paidAmountPaise} paise. RZP Order ID: ${razorpay_order_id}. Order Payload:`,
        JSON.stringify(orderPayload, null, 2)
      );
      // CRITICAL: Amount mismatch. Potentially refund or flag for manual review.
      res.status(400);
      throw new Error(
        "Payment amount mismatch. Please contact support regarding your payment."
      );
    } else {
      console.warn(
        `Payment amount has a minor difference of ${difference} paise for RZP Order ${razorpay_order_id}. Accepting payment. Calculated: ${calculatedTotalPaise}, Paid: ${paidAmountPaise}.`
      );
    }
  }

  const validatedOrderData = {
    orderItems: processedOrderItems,
    shippingAddress: finalShippingAddress,
    paymentMethod: "Online",
    paymentResult: {
      id: paymentDetailsFromApi.id,
      status: paymentDetailsFromApi.status,
      update_time: new Date(
        paymentDetailsFromApi.created_at * 1000
      ).toISOString(),
      email_address: paymentDetailsFromApi.email,
      method: paymentDetailsFromApi.method,
      description: paymentDetailsFromApi.description,
      razorpay_order_id: paymentDetailsFromApi.order_id,
      razorpay_signature: razorpay_signature, // Storing signature here is generally not recommended long-term.
      // It's used for immediate verification but has no use later.
      // If stored, ensure security. Often, it's omitted from DB.
    },
    itemsPrice: parseFloat(backendCalculatedItemsPrice.toFixed(2)),
    taxPrice: backendCalculatedTotalTaxPrice,
    shippingPrice: parseFloat(backendCalculatedShippingPrice.toFixed(2)),
    discountAmount: parseFloat(backendCalculatedDiscountAmount.toFixed(2)),
    totalPrice: parseFloat(calculatedTotalBackend.toFixed(2)), // Use backend calculated total
    deliveryOption: deliveryOption,
    deliveryPreference: finalDeliveryPreference,
    promoCodeApplied: finalPromoCodeApplied,
    orderNotes: orderNotes,
    isPaid: true,
    paidAt: new Date(),
    orderStatus: "Confirmed", // Or "Processing" depending on your flow
  };

  console.log(
    `Payment verified for RZP order ${razorpay_order_id}. Creating order document for user ${userId}.`
  );
  const createdOrder = await _createOrderDocument(userId, validatedOrderData);
  console.log(
    `Order document ${createdOrder._id} created successfully for RZP order ${razorpay_order_id}.`
  );

  res.status(201).json({
    success: true,
    message: "Payment verified and order created successfully!",
    orderId: createdOrder._id,
  });
});
