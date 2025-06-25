// backend/models/Address.js
import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    contactName: {
      type: String,
      required: [true, "Contact person name is required."],
      trim: true,
    },
    contactNumber: {
      type: String,
      required: [true, "Contact person number is required."],
      trim: true,
      // Basic validation, more specific can be added
      match: [/^\+?[1-9]\d{1,14}$/, "Please fill a valid contact number"],
    },
    label: {
      // E.g., Home, Workplace, Other
      type: String,
      required: true,
      enum: ["Home", "Workplace", "Other"],
      default: "Home",
    },
    addressLine: {
      // Includes Area, Street, Landmark
      type: String,
      required: [true, "Address line is required."],
      trim: true,
    },
    streetNumber: { type: String, trim: true }, // Or specific street details
    houseNumber: { type: String, trim: true }, // House/Flat/Block No.
    floorNumber: { type: String, trim: true },
    city: {
      type: String,
      required: [true, "City is required."],
      trim: true,
    },
    state: {
      type: String,
      required: [true, "State is required."],
      trim: true,
    },
    postalCode: {
      type: String,
      required: [true, "Postal code is required."],
      trim: true,
    },
    country: {
      type: String,
      required: [true, "Country is required."],
      default: "India",
      trim: true,
    },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    isDefault: {
      type: Boolean,
      default: false,
    },
    // Optional: deliveryInstructions: { type: String, trim: true },
  },
  { timestamps: true }
);

// Ensure only one default address per user
addressSchema.pre("save", async function (next) {
  if (this.isModified("isDefault") && this.isDefault) {
    // Set all other addresses for this user to not be default
    await this.constructor.updateMany(
      { user: this.user, _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  next();
});

const Address = mongoose.model("Address", addressSchema);
export default Address;
