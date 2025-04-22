// backend/models/AdminActivity.js
import mongoose from "mongoose";

const adminActivitySchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
      unique: true,
      index: true,
    },
    lastLogin: { type: Date, default: null },
    lastLogout: { type: Date, default: null },
    ipAddress: { type: String, trim: true, default: null },
    userAgent: { type: String, trim: true, default: null },
    // failedLoginAttempts: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const AdminActivity = mongoose.model("AdminActivity", adminActivitySchema);
export default AdminActivity;
