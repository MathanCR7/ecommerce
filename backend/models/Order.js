// backend/models/Order.js
import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  priceAtPurchase: { type: Number, required: true }, // Price per unit at the time of order
  image: { type: String }, // Main image path
  item: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Item",
  },
  unit: { type: String }, // e.g., "500g", "1 pc"
});

const shippingAddressSchema = new mongoose.Schema({
  contactName: { type: String, required: true },
  contactNumber: { type: String, required: true },
  addressLine: { type: String, required: true },
  streetNumber: { type: String },
  houseNumber: { type: String },
  floorNumber: { type: String },
  city: { type: String, required: true },
  state: { type: String, required: true },
  postalCode: { type: String, required: true },
  country: { type: String, required: true },
  label: { type: String }, // e.g., Home, Work, Store Location Label
  latitude: { type: Number },
  longitude: { type: Number },
});

const paymentResultSchema = new mongoose.Schema({
  id: { type: String }, // Transaction ID from payment provider (e.g., Razorpay payment_id)
  status: { type: String }, // e.g., 'captured', 'authorized', 'failed'
  update_time: { type: String }, // Timestamp from payment provider
  email_address: { type: String }, // Payer email
  method: { type: String }, // e.g., 'card', 'upi', 'wallet'
  description: { type: String }, // Payment description
  razorpay_order_id: { type: String }, // Store Razorpay's order ID
  // Do NOT store razorpay_signature
});

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    orderItems: [orderItemSchema],
    // Use the shippingAddressSchema for both delivery and pickup snapshot
    shippingAddress: { type: shippingAddressSchema, required: true },
    paymentMethod: {
      type: String,
      required: true,
      enum: ["COD", "Online"], // Explicitly define allowed methods
      default: "COD",
    },
    paymentResult: { type: paymentResultSchema },
    itemsPrice: {
      // Sum of (item.priceAtPurchase * item.quantity)
      type: Number,
      required: true,
      default: 0.0,
    },
    taxPrice: {
      // Calculated tax
      type: Number,
      required: true,
      default: 0.0,
    },
    shippingPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },
    discountAmount: {
      // The actual amount deducted by the promo
      type: Number,
      required: true,
      default: 0.0,
    },
    totalPrice: {
      // itemsPrice + taxPrice + shippingPrice - discountAmount
      type: Number,
      required: true,
      default: 0.0,
    },
    orderStatus: {
      type: String,
      required: true,
      enum: [
        "Pending",
        "Payment Processing",
        "Payment Failed",
        "Confirmed", // <<< ADDED
        "Processing",
        "Shipped",
        "Out For Delivery",
        "Ready for Pickup",
        "Delivered",
        "Picked Up",
        "Cancelled",
        "Refunded",
        "Failed to Deliver",
      ],
      default: "Pending",
    },
    deliveryOption: {
      // 'homeDelivery' or 'selfPickup'
      type: String,
      required: true,
      enum: ["homeDelivery", "selfPickup"], // Enforce valid options
    },
    deliveryPreference: {
      // Details about requested delivery/pickup time
      type: {
        type: String,
        enum: ["quick", "scheduled", "pickupScheduled"], // 'quick' for HD, 'scheduled' for HD, 'pickupScheduled' for pickup
      },
      date: { type: Date }, // Selected date
      timeSlot: { type: String }, // Selected time slot string
    },
    promoCodeApplied: {
      // Snapshot of the coupon applied
      code: { type: String },
      discountType: { type: String, enum: ["Percent", "Amount"] },
      discountValue: { type: Number }, // The coupon's original % or amount
      appliedDiscount: { type: Number }, // The actual calculated discount amount for *this* order
    },
    orderNotes: {
      type: String,
      trim: true,
    },
    orderImage: {
      // For custom order image upload, if applicable
      type: String, // Path to uploaded image
    },
    isPaid: {
      type: Boolean,
      required: true,
      default: false,
    },
    paidAt: {
      type: Date,
    },
    isDelivered: {
      type: Boolean,
      required: true,
      default: false,
    },
    deliveredAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to calculate totalPrice - KEEP THIS SERVER SIDE
orderSchema.pre("save", function (next) {
  // Only recalculate if relevant fields are modified
  if (
    this.isModified("itemsPrice") ||
    this.isModified("taxPrice") ||
    this.isModified("shippingPrice") ||
    this.isModified("discountAmount")
  ) {
    // Ensure prices are numbers and handle potential NaN
    const items = Number(this.itemsPrice) || 0;
    const tax = Number(this.taxPrice) || 0;
    const shipping = Number(this.shippingPrice) || 0;
    const discount = Number(this.discountAmount) || 0;

    // Basic calculation
    let calculatedTotal = items + tax + shipping - discount;

    // Ensure total is not negative (e.g., if discount exceeds item price)
    this.totalPrice = Math.max(0, calculatedTotal);
  }
  next();
});

const Order = mongoose.model("Order", orderSchema);
export default Order;
