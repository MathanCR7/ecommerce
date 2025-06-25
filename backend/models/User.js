// backend/models/User.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto"; // Import crypto for referral code generation

const cartItemSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Item",
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, "Quantity cannot be less than 1."],
    default: 1,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required."],
      unique: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters."],
      maxlength: [30, "Username cannot exceed 30 characters."],
      match: [
        /^[a-zA-Z0-9_]+$/,
        "Username can only contain letters, numbers, and underscores.",
      ],
      index: true,
    },
    email: {
      type: String,
      required: [true, "Email is required."],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/\S+@\S+\.\S+/, "Please use a valid email address."],
      index: true,
    },
    password: {
      type: String,
      required: function () {
        return !this.googleId;
      },
      minlength: [8, "Password must be at least 8 characters long."],
      select: false,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    displayName: {
      type: String,
      trim: true,
      maxlength: [50, "Display name cannot exceed 50 characters."],
    },
    profilePicture: {
      type: String,
      default: "/assets/main-logo/default_avatar.png",
    },
    phone: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      index: true,
      match: [
        /^\+[1-9]\d{1,14}$/,
        "Invalid phone number format. Expected E.164 format (e.g., +911234567890).",
      ],
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    dob: {
      type: Date,
    },
    recentLogin: {
      type: Date,
      default: null,
    },
    // --- EXISTING FIELDS ---
    cart: [cartItemSchema],
    wishlist: [
      {
        item: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Item",
          required: true,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // --- NEW FEATURES FIELDS ---
    referralCode: {
      // Added Referral Code field
      type: String,
      unique: true,
      sparse: true, // Allows null values initially
      uppercase: true,
      trim: true,
      minlength: 6, // Ensure a minimum length for generated codes
      maxlength: 10, // Optional: set a max length
    },
    referredBy: {
      // Added field to track who referred this user
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    walletBalance: {
      // Added Wallet Balance field
      type: Number,
      default: 0,
      min: [0, "Wallet balance cannot be negative"],
    },
    walletTransactions: [
      // Added Wallet Transactions array (Subdocument array)
      {
        type: {
          type: String,
          enum: ["credit", "debit"],
          required: true,
        },
        amount: {
          type: Number,
          required: true,
          min: [0, "Transaction amount cannot be negative"],
        },
        description: {
          type: String,
          required: true,
          trim: true,
        },
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    loyaltyPoints: {
      // Added Loyalty Points field
      type: Number,
      default: 0,
      min: [0, "Loyalty points cannot be negative"],
    },
    loyaltyTransactions: [
      // Added Loyalty Transactions array (Subdocument array)
      {
        type: {
          type: String,
          enum: ["earn", "redeem", "adjustment"], // e.g., points earned from purchase, redeemed for discount, manually adjusted
          required: true,
        },
        points: {
          // Use 'points' instead of 'amount' for clarity
          type: Number,
          required: true,
          min: [0, "Loyalty points amount cannot be negative"],
        },
        description: {
          type: String,
          required: true,
          trim: true,
        },
        date: {
          type: Date,
          default: Date.now,
        },
        // Optional: Link to related order, etc.
        // order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
      },
    ],
    // --- END NEW FEATURES FIELDS ---
  },
  { timestamps: true }
);

// --- Mongoose Middleware (Hooks) ---

// Generate referral code before saving if it doesn't exist and is a new user
userSchema.pre("save", function (next) {
  if (this.isNew && !this.referralCode) {
    const code = crypto.randomBytes(3).toString("hex").toUpperCase();
    this.referralCode = code;
  }
  next();
});

userSchema.pre("save", async function (next) {
  if (this.isNew) {
    if (!this.recentLogin) {
      this.recentLogin = this.createdAt || new Date();
    }
    if (!this.displayName) {
      this.displayName = this.username;
    }
  }

  if (!this.isModified("password") || !this.password) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    console.error("Error hashing password:", error);
    next(error);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password || !candidatePassword) return false;
  let userWithPassword = this;
  if (!this.get("password", null, { getters: false })) {
    try {
      userWithPassword = await this.constructor
        .findById(this._id)
        .select("+password");
      if (!userWithPassword?.password) {
        console.error(
          `User ${this._id} password could not be fetched for comparison.`
        );
        return false;
      }
    } catch (fetchError) {
      console.error(
        `Error fetching user ${this._id} with password for comparison:`,
        fetchError
      );
      return false;
    }
  }
  try {
    return await bcrypt.compare(candidatePassword, userWithPassword.password);
  } catch (compareError) {
    console.error("Error comparing password:", compareError);
    return false;
  }
};

userSchema.methods.updateRecentLogin = async function () {
  this.recentLogin = new Date();
  try {
    await this.save({ validateBeforeSave: false });
  } catch (error) {
    console.error(`Error updating recentLogin for user ${this._id}:`, error);
  }
};

// --- NEW INSTANCE METHODS ---
// Add a transaction to the wallet
userSchema.methods.addWalletTransaction = function (type, amount, description) {
  if (!["credit", "debit"].includes(type))
    throw new Error("Invalid transaction type");
  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount) || numericAmount < 0)
    throw new Error("Transaction amount must be a non-negative number");
  this.walletTransactions.push({
    type,
    amount: numericAmount,
    description,
    date: new Date(),
  });
  if (type === "credit") this.walletBalance += numericAmount;
  else if (type === "debit") this.walletBalance -= numericAmount; // Add validation if debit shouldn't exceed balance
  this.markModified("walletBalance");
  this.markModified("walletTransactions");
};

// Add a loyalty points transaction
userSchema.methods.addLoyaltyTransaction = function (
  type,
  points,
  description
) {
  if (!["earn", "redeem", "adjustment"].includes(type))
    throw new Error("Invalid loyalty transaction type");
  const numericPoints = parseFloat(points);
  if (isNaN(numericPoints) || numericPoints < 0)
    throw new Error("Loyalty points amount must be a non-negative number");

  this.loyaltyTransactions.push({
    type,
    points: numericPoints,
    description,
    date: new Date(),
  });

  if (type === "earn" || type === "adjustment") {
    // 'adjustment' could be positive or negative, handle carefully
    this.loyaltyPoints += numericPoints;
  } else if (type === "redeem") {
    this.loyaltyPoints -= numericPoints;
  }

  this.markModified("loyaltyPoints");
  this.markModified("loyaltyTransactions");
};
// --- END NEW INSTANCE METHODS ---

const User = mongoose.model("User", userSchema);
export default User;
