// backend/models/AdminDetails.js
import mongoose from "mongoose";

const adminDetailsSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
      unique: true,
      index: true,
    },
    firstName: { type: String, trim: true, default: "" },
    lastName: { type: String, trim: true, default: "" },
    role: {
      type: String,
      enum: ["Admin", "SuperAdmin", "ContentManager", "Support", "Viewer"],
      default: "Admin",
      required: true,
    },
    profilePictureUrl: { type: String, trim: true, default: null },
    // address: { street: String, city: String, postalCode: String, country: String },
    // department: String,
    // permissions: [ { type: String, trim: true } ],
  },
  { timestamps: true }
);

// Virtual for full name
adminDetailsSchema.virtual("fullName").get(function () {
  let name = "";
  if (this.firstName) name += this.firstName;
  if (this.lastName) name += (name ? " " : "") + this.lastName;
  return name || "N/A";
});

adminDetailsSchema.set("toJSON", { virtuals: true });
adminDetailsSchema.set("toObject", { virtuals: true });

const AdminDetails = mongoose.model("AdminDetails", adminDetailsSchema);
export default AdminDetails;
