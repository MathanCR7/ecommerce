// backend/controllers/addressController.js
import Address from "../models/Address.js"; // Ensure .js if using ES Modules
import asyncHandler from "../middleware/asyncHandler.js"; // Ensure .js

// @desc    Get all addresses for a logged-in user
// @route   GET /api/profile/addresses
// @access  Private
export const getUserAddresses = asyncHandler(async (req, res, next) => {
  const addresses = await Address.find({ user: req.user.id }).sort({
    isDefault: -1, // Default address first
    createdAt: -1, // Latest added first
  });
  // Backend returns the addresses array in the 'data' property - this is correct
  res
    .status(200)
    .json({ success: true, count: addresses.length, data: addresses });
});

// @desc    Add a new address for a logged-in user
// @route   POST /api/profile/addresses
// @access  Private
export const addAddress = asyncHandler(async (req, res, next) => {
  req.body.user = req.user.id;

  const userAddressesCount = await Address.countDocuments({
    user: req.user.id,
  });
  if (userAddressesCount === 0) {
    // Automatically set the first address as default
    req.body.isDefault = true;
  } else if (req.body.isDefault) {
    // If the new address is explicitly marked default, unset existing ones
    // This ensures only one address is default at a time
    await Address.updateMany({ user: req.user.id }, { isDefault: false });
  } else {
    // If it's not the first and not explicitly default, ensure isDefault is false
    req.body.isDefault = false;
  }

  const address = await Address.create(req.body);
  // Return the created address
  res.status(201).json({ success: true, data: address });
});

// @desc    Update an address for a logged-in user
// @route   PUT /api/profile/addresses/:addressId
// @access  Private
export const updateAddress = asyncHandler(async (req, res, next) => {
  let address = await Address.findById(req.params.addressId);

  if (!address) {
    const error = new Error(
      `Address not found with id of ${req.params.addressId}`
    );
    error.statusCode = 404;
    return next(error);
  }

  // Ensure the address belongs to the logged-in user
  if (address.user.toString() !== req.user.id) {
    const error = new Error(`Not authorized to update this address`);
    error.statusCode = 403; // Changed from 401 to 403 for Forbidden
    return next(error);
  }

  // Handle setting or unsetting default status
  if (req.body.isDefault === true && !address.isDefault) {
    // If becoming default, unset all others for this user
    await Address.updateMany(
      { user: req.user.id, _id: { $ne: req.params.addressId } },
      { isDefault: false }
    );
  } else if (req.body.isDefault === false && address.isDefault) {
    // If unsetting default, check if it's the last one
    const otherAddressesCount = await Address.countDocuments({
      user: req.user.id,
      _id: { $ne: req.params.addressId },
    });
    if (otherAddressesCount === 0) {
      // Cannot unset the only address as default
      const error = new Error(`Cannot unset the only address as default.`);
      error.statusCode = 400;
      return next(error);
    }
  }

  // Prevent user and _id fields from being updated via the request body
  delete req.body.user;
  delete req.body._id;
  delete req.body.createdAt; // Assuming createdAt shouldn't be updated
  delete req.body.updatedAt; // Assuming updatedAt is managed by timestamps

  // Explicitly set isDefault based on req.body, allowing unsetting if not the last address
  // If req.body does *not* include isDefault, it won't be changed unless the above logic prevented unsetting
  const updateData = { ...req.body };
  if (req.body.hasOwnProperty("isDefault")) {
    updateData.isDefault = req.body.isDefault;
  }

  // Find the address again to apply updates using save() to trigger middleware
  // Or use findByIdAndUpdate and handle default logic separately if preferred
  address = await Address.findByIdAndUpdate(req.params.addressId, updateData, {
    new: true, // Return the updated document
    runValidators: true, // Run schema validators on update
  });

  // After update, ensure at least one address is default if any exist
  // This handles the case where the default was updated to false, or the last address was deleted (though we prevent deleting the last now)
  const defaultCheck = await Address.findOne({
    user: req.user.id,
    isDefault: true,
  });
  if (!defaultCheck) {
    // If no default exists, set the most recently created as default
    const anyAddress = await Address.findOne({ user: req.user.id }).sort({
      createdAt: -1,
    });
    if (anyAddress) {
      anyAddress.isDefault = true;
      await anyAddress.save(); // Use save to trigger the pre hook
    }
  }

  res.status(200).json({
    success: true,
    data: address,
    message: "Address updated successfully.",
  });
});

// @desc    Delete an address for a logged-in user
// @route   DELETE /api/profile/addresses/:addressId
// @access  Private
export const deleteAddress = asyncHandler(async (req, res, next) => {
  // Find the address first to check ownership and default status
  const address = await Address.findById(req.params.addressId);

  if (!address) {
    const error = new Error(
      `Address not found with id of ${req.params.addressId}`
    );
    error.statusCode = 404;
    return next(error);
  }

  // Ensure the address belongs to the logged-in user
  if (address.user.toString() !== req.user.id) {
    const error = new Error(`Not authorized to delete this address`);
    error.statusCode = 403; // Forbidden
    return next(error);
  }

  const wasDefault = address.isDefault;

  // Check if this is the last address BEFORE attempting deletion
  const userAddressesCount = await Address.countDocuments({
    user: req.user.id,
  });
  if (userAddressesCount === 1) {
    const error = new Error(
      `Cannot delete the last address. You must keep at least one address.`
    );
    error.statusCode = 400;
    return next(error);
  }

  // FIX: Use deleteOne() method on the document instance (Mongoose 6+)
  await address.deleteOne();

  // If the deleted address was the default, set a new default among the remaining ones
  if (wasDefault) {
    // Find the most recently created address among the remaining ones
    const newDefault = await Address.findOne({ user: req.user.id }).sort({
      createdAt: -1,
    });
    // Ensure a new default is set if other addresses exist
    if (newDefault) {
      newDefault.isDefault = true;
      // Use save() to trigger pre-save hook if it's active and handle unsetting others.
      // Or you could explicitly unset others here if preferred.
      await newDefault.save();
    }
  }

  res.status(200).json({
    success: true,
    data: {},
    message: "Address deleted successfully.",
  });
});

// @desc    Set an address as default
// @route   PUT /api/profile/addresses/:addressId/default
// @access  Private
export const setDefaultAddress = asyncHandler(async (req, res, next) => {
  const addressId = req.params.addressId;
  const userId = req.user.id;

  // Find the address and ensure it belongs to the user
  const addressToSetDefault = await Address.findOne({
    _id: addressId,
    user: userId,
  });

  if (!addressToSetDefault) {
    const error = new Error(`Address not found or not owned by user`);
    error.statusCode = 404;
    return next(error);
  }

  // If it's already default, do nothing and return success
  if (addressToSetDefault.isDefault) {
    return res.status(200).json({
      success: true,
      message: "Address is already default.",
      data: addressToSetDefault,
    });
  }

  // Unset default flag for all other addresses of this user
  // Use updateMany for efficiency
  await Address.updateMany(
    { user: userId, _id: { $ne: addressId } },
    { isDefault: false }
  );

  // Set the target address as default
  addressToSetDefault.isDefault = true;
  await addressToSetDefault.save(); // Use save to potentially trigger pre-save hooks if any relevant ones exist

  res.status(200).json({
    success: true,
    message: "Address set as default.",
    data: addressToSetDefault,
  });
});
