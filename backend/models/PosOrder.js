import mongoose from "mongoose";

const posOrderItemSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Item", // Assuming your product/item model is named 'Item'
    required: true,
  },
  name: {
    // Store name at time of order for historical data
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  priceAtPurchase: {
    // Store price at time of order
    type: Number,
    required: true,
  },
  imagePath: {
    // Optional: store image path at time of order
    type: String,
  },
});

const posOrderSchema = new mongoose.Schema(
  {
    orderNumber: {
      // You might want a custom order number generation logic
      type: String,
      unique: true,
      required: true,
    },
    customer: {
      // Can be a registered user or a guest/walk-in
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Link to your User model if customer is registered
      default: null, // For walk-in customers
    },
    customerName: {
      // For walk-in or quick reference
      type: String,
      required: true,
    },
    customerPhone: {
      type: String,
    },
    branch: {
      type: String,
      required: true,
      default: "Main",
    },
    orderType: {
      type: String,
      enum: ["Take Away", "Home Delivery"],
      required: true,
    },
    items: [posOrderItemSchema],
    subTotal: {
      type: Number,
      required: true,
    },
    productDiscount: {
      // Total discount applied to products before extra discount
      type: Number,
      default: 0,
    },
    extraDiscount: {
      // Overall discount applied at cart level
      type: Number,
      default: 0,
    },
    taxRate: {
      // Store the tax rate applied
      type: Number,
      default: 0,
    },
    taxAmount: {
      type: Number,
      required: true,
    },
    deliveryCharge: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["Cash", "Card", "Online", "Other"], // Add more as needed
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Completed", "Cancelled", "Processing"],
      default: "Completed", // Or 'Pending' if you have a processing step
    },
    notes: {
      type: String,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin", // Assuming your admin model is named 'Admin'
      required: true,
    },
  },
  { timestamps: true }
);

// Helper to generate a unique order number (customize as needed)
posOrderSchema.pre("save", async function (next) {
  if (this.isNew) {
    // Example: POS-YYMMDD-XXXX (XXXX is a sequence)
    const today = new Date();
    const year = today.getFullYear().toString().slice(-2);
    const month = (today.getMonth() + 1).toString().padStart(2, "0");
    const day = today.getDate().toString().padStart(2, "0");
    const datePrefix = `POS-${year}${month}${day}-`;

    const lastOrder = await mongoose
      .model("PosOrder", posOrderSchema)
      .findOne({ orderNumber: new RegExp(`^${datePrefix}`) })
      .sort({ createdAt: -1 });

    let sequence = 1;
    if (lastOrder && lastOrder.orderNumber) {
      const lastSeqStr = lastOrder.orderNumber.split("-").pop();
      const lastSeq = parseInt(lastSeqStr, 10);
      if (!isNaN(lastSeq)) {
        sequence = lastSeq + 1;
      }
    }
    this.orderNumber = `${datePrefix}${sequence.toString().padStart(4, "0")}`;
  }
  next();
});

const PosOrder = mongoose.model("PosOrder", posOrderSchema);
export default PosOrder;
