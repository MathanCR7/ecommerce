// backend/models/Admin.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import AdminActivity from "./AdminActivity.js"; // For cascade delete
import AdminDetails from "./AdminDetails.js"; // For cascade delete

const adminSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
      select: false, // Hide password by default
    },
    mobileNumber: {
      type: String,
      required: [true, "Mobile number is required"],
      unique: true,
      trim: true,
      match: [
        /^\+91[6-9]\d{9}$/,
        "Please fill a valid Indian mobile number (+91...)",
      ],
    },
    email: {
      type: String,
      unique: true,
      sparse: true, // Allow null/missing emails, but unique if provided
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please fill a valid email address",
      ],
    },
    isMobileVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Pre-save: Hash password
adminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method: Compare password
adminSchema.methods.matchPassword = async function (enteredPassword) {
  if (!enteredPassword) return false; // Handle empty password case
  let adminToCheck = this;
  // If password wasn't selected on the current instance, fetch it explicitly
  if (!this.password) {
    adminToCheck = await this.constructor
      .findById(this._id)
      .select("+password");
    if (!adminToCheck || !adminToCheck.password) {
      console.error(
        `Could not fetch password for admin ${this._id} during matchPassword.`
      );
      return false; // Cannot compare if password cannot be fetched
    }
  }
  return await bcrypt.compare(enteredPassword, adminToCheck.password);
};

// Pre-remove Hook: Delete associated details and activity
adminSchema.pre(
  "deleteOne",
  { document: true, query: false },
  async function (next) {
    const adminId = this._id;
    console.log(`--- [HOOK Admin Delete ${adminId}] ---`);
    try {
      console.log(`[HOOK Admin Delete ${adminId}] Deleting AdminDetails...`);
      await AdminDetails.deleteOne({ adminId: adminId });
      console.log(`[HOOK Admin Delete ${adminId}] Deleting AdminActivity...`);
      await AdminActivity.deleteOne({ adminId: adminId });
      console.log(`[HOOK Admin Delete ${adminId}] Pre-deleteOne completed.`);
      next();
    } catch (error) {
      console.error(
        `[HOOK Admin Delete ${adminId}] Error during cascade delete:`,
        error
      );
      next(error); // Pass error to potentially halt deletion
    }
    console.log(`--- [END HOOK Admin Delete ${adminId}] ---`);
  }
);

const Admin = mongoose.model("Admin", adminSchema);
export default Admin;
