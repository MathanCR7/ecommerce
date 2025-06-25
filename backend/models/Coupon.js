import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    couponType: {
      type: String,
      required: [true, "Coupon type is required"],
      enum: ["Default", "First Order", "Free Delivery", "Customer Wise"],
      default: "Default",
    },
    title: {
      type: String,
      required: [true, "Coupon title is required"],
      trim: true,
    },
    code: {
      type: String,
      required: [true, "Coupon code is required"],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: [4, "Code must be at least 4 characters"],
      maxlength: [20, "Code cannot exceed 20 characters"],
    },
    limitForSameUser: {
      type: Number,
      required: [true, "Usage limit per user is required"],
      min: [0, "Limit cannot be negative"],
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} is not an integer value for limitForSameUser",
      },
    },
    discountType: {
      type: String,
      required: [true, "Discount type is required"],
      enum: ["Percent", "Amount"],
    },
    discountAmount: {
      type: Number,
      required: [true, "Discount amount/percentage is required"],
      min: [0, "Discount value cannot be negative"],
    },
    minPurchase: {
      type: Number,
      default: 0,
      min: [0, "Minimum purchase cannot be negative"],
    },
    maxDiscount: {
      type: Number,
      min: [0, "Maximum discount cannot be negative"],
      default: 0,
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    expireDate: {
      type: Date,
      required: [true, "Expire date is required"],
    },
    isActive: {
      // This field determines the status
      type: Boolean,
      default: true,
    },
    totalUsed: {
      type: Number,
      default: 0,
      min: [0, "Total used cannot be negative"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

couponSchema.virtual("duration").get(function () {
  if (!this.startDate || !this.expireDate) {
    return "N/A";
  }
  try {
    const formatter = new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const start =
      this.startDate instanceof Date && !isNaN(this.startDate)
        ? formatter.format(this.startDate)
        : "Invalid Start";
    const end =
      this.expireDate instanceof Date && !isNaN(this.expireDate)
        ? formatter.format(this.expireDate)
        : "Invalid End";
    return `${start} - ${end}`;
  } catch (error) {
    console.error(
      "Error formatting coupon duration (virtual):",
      error,
      this.startDate,
      this.expireDate
    );
    return "Invalid Date Range";
  }
});

couponSchema.pre("save", function (next) {
  if (
    this.isModified("startDate") ||
    this.isModified("expireDate") ||
    this.isNew
  ) {
    if (this.startDate && this.expireDate) {
      const start = new Date(
        this.startDate.getFullYear(),
        this.startDate.getMonth(),
        this.startDate.getDate()
      );
      const expire = new Date(
        this.expireDate.getFullYear(),
        this.expireDate.getMonth(),
        this.expireDate.getDate()
      );

      if (expire < start) {
        const err = new Error(
          "Expire date must be on or after the start date."
        );
        err.name = "ValidationError";
        return next(err);
      }
    }
  }

  if (this.discountType === "Percent" && this.discountAmount > 100) {
    const err = new Error("Percentage discount cannot exceed 100.");
    err.name = "ValidationError";
    return next(err);
  }

  if (this.discountType === "Amount") {
    this.maxDiscount = 0;
  }

  next();
});

const Coupon = mongoose.model("Coupon", couponSchema);

export default Coupon;
