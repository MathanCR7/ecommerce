// backend/models/User.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

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
    googleId: { type: String, unique: true, sparse: true, index: true },
    displayName: {
      type: String,
      trim: true,
      maxlength: [50, "Display name cannot exceed 50 characters."],
    },
    profilePicture: {
      // Stores relative path like 'users/user-123.jpg' or external URL
      type: String,
      default: "/assets/main-logo/default_avatar.png", // Path relative to frontend assets? Or change to server path like /uploads/defaults/avatar.png
    },
    phone: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      index: true,
    },
    isPhoneVerified: { type: Boolean, default: false },
    dob: { type: Date },
    recentLogin: { type: Date, default: null },
  },
  { timestamps: true }
);

// Pre-save Hook: Hash password
userSchema.pre("save", async function (next) {
  if (this.isNew && !this.recentLogin)
    this.recentLogin = this.createdAt || new Date();
  if (!this.isModified("password") || !this.password) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method: Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password || !candidatePassword) return false;
  // Re-fetch with password if it wasn't selected
  let userToCheck = this;
  if (!this.password) {
    userToCheck = await this.constructor.findById(this._id).select("+password");
    if (!userToCheck || !userToCheck.password) return false; // Safety check
  }
  try {
    return await bcrypt.compare(candidatePassword, userToCheck.password);
  } catch (error) {
    return false;
  }
};

const User = mongoose.model("User", userSchema);
export default User;
