// ========================================================================
// FILE: client/src/Pages/Admin/Orders/OrderDetailsPage.jsx
// Description: Admin page component to display detailed information about a single order.
// Refactored based on screenshot layout and user requirements (currency, delivery type, customer name, primary image).
// Fix: Removed extraneous whitespace between <td> elements within <tr> to resolve hydration error.
// Image Handling: Adjusted to use IMAGE_API_BASE_URL and handle the single image path in order item snapshots.
// MODIFIED: Display full Order ID instead of truncated version.
// MODIFIED: Conditional display/options for status, payment, and delivery time based on deliveryOption.
// ========================================================================
import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom"; // Hook to get URL parameters, added Link for potential customer link
import orderService from "../../../Services/orderService"; // Import the admin order service (ensure this path is correct)
import "./OrderDetailsPage.css"; // Import CSS for styling
import {
  FaMapMarkerAlt, // Icon for map/location
  FaPrint, // Icon for print
  FaBoxOpen, // Icon for items section
  FaUser, // Icon for customer section
  FaClipboardList, // Icon for price/setup sections
  FaTruck, // Icon for delivery man / Order Type
  FaCreditCard, // Icon for payment info (used for Payment Verification/Info section)
  FaSpinner, // Icon for loading states
  FaCalendarAlt, // Icon for date
  FaClock, // Icon for time
  FaEdit, // Icon for edit (delivery info)
  FaImage, // Icon for placeholder image
} from "react-icons/fa"; // React Icons library

// --- Constants & Helper Functions ---

// Use the same base URL logic as ItemListPage
const IMAGE_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(
  "/api",
  ""
);

// Helper function to format currency - Changed to Indian Rupee symbol (₹)
const formatCurrency = (amount) => {
  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount)) return "N/A";
  return `₹${numericAmount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// Helper function to format date only (Consistent with AllOrdersPage)
const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid Date";
    // Format date to match screenshot style (e.g., 21 May 2025)
    const options = { year: "numeric", month: "long", day: "numeric" };
    return date.toLocaleDateString("en-US", options);
  } catch (e) {
    console.error("Error formatting date:", dateString, e);
    return String(dateString); // Fallback to original string
  }
};

// Helper function to format date and time (Consistent with AllOrdersPage)
const formatDateTime = (dateString) => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid Date";
    const dateOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
    };
    const timeOptions = {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true, // Use 12-hour format with AM/PM
    };
    // Combine date and time string
    return `${date.toLocaleDateString(
      undefined,
      dateOptions
    )} ${date.toLocaleTimeString(undefined, timeOptions)}`;
  } catch (e) {
    console.error("Error formatting date/time:", dateString, e);
    return String(dateString);
  }
};

// --- Component Implementation ---
const OrderDetailsPage = () => {
  // Get the 'id' parameter from the URL
  const { id: orderId } = useParams();

  // State for order data and fetch status
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for the "Change Order Status" control
  const [newStatus, setNewStatus] = useState(""); // Holds the status selected in the dropdown
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false); // Loading state for status update
  const [updateError, setUpdateError] = useState(null); // Error message for status update
  const [updateSuccess, setUpdateSuccess] = useState(false); // Success state for status update
  const [dynamicStatusOptions, setDynamicStatusOptions] = useState([]); // Holds status options based on delivery type

  // State for "Change Payment Status" control (based on screenshot)
  const [newPaymentStatus, setNewPaymentStatus] = useState(""); // e.g., "Paid", "Unpaid"
  const [isUpdatingPaymentStatus, setIsUpdatingPaymentStatus] = useState(false);
  const [paymentUpdateError, setPaymentUpdateError] = useState(null);
  const [paymentUpdateSuccess, setPaymentUpdateSuccess] = useState(false);

  // State for Delivery Date & Time (based on screenshot)
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryTimeSlot, setDeliveryTimeSlot] = useState(""); // Or time string
  const [isUpdatingDeliveryTime, setIsUpdatingDeliveryTime] = useState(false);
  const [deliveryUpdateError, setDeliveryUpdateError] = useState(null);
  const [deliveryUpdateSuccess, setDeliveryUpdateSuccess] = useState(false);

  // Base status options (master list, some might be filtered out based on deliveryType)
  // These are used for reference or if a direct string match is needed somewhere, like confirmation messages.
  const baseStatusOptions = [
    "Pending",
    "Processing",
    "Confirmed",
    "Out For Delivery",
    "Ready for Pickup",
    "Delivered",
    "Picked Up",
    "Cancelled",
    "Refunded",
    "Failed to Deliver",
  ];

  // Payment status options for the dropdown (based on screenshot)
  const paymentStatusOptions = [
    { value: "Paid", label: "Paid" },
    { value: "Unpaid", label: "Unpaid" },
    // Add other potential states like "Refunded" if applicable
  ];

  // Mapping backend status strings (lowercase) to CSS class suffixes for badges
  const statusBadgeMap = {
    pending: "pending",
    "payment processing": "payment-processing",
    "payment failed": "payment-failed",
    processing: "processing",
    confirmed: "confirmed",
    shipped: "shipped",
    "out for delivery": "out-for-delivery",
    "ready for pickup": "ready-for-pickup",
    delivered: "delivered",
    "picked up": "picked-up",
    cancelled: "cancelled",
    refunded: "refunded",
    "failed to deliver": "failed-to-deliver",
    unknown: "unknown", // Fallback
  };

  // Mapping internal payment status (Paid/Unpaid) to CSS class suffixes
  const paymentStatusClassMap = {
    paid: "paid",
    unpaid: "not-paid", // Use "not-paid" for Unpaid
    // Add other states like 'refunded' if needed
  };

  // Function to fetch order details from the backend API.
  const fetchOrderDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    setUpdateError(null);
    setUpdateSuccess(false);
    setPaymentUpdateError(null);
    setPaymentUpdateSuccess(false);
    setDeliveryUpdateError(null);
    setDeliveryUpdateSuccess(false);
    setOrder(null); // Clear previous order data
    setDynamicStatusOptions([]); // Clear previous dynamic options

    if (!orderId) {
      setError("No Order ID provided in URL.");
      setLoading(false);
      return; // Exit if no ID
    }

    try {
      const data = await orderService.getOrderById(orderId);
      setOrder(data); // Set the fetched order data in state

      let currentStatusOptions = [];
      if (data.deliveryOption === "selfPickup") {
        currentStatusOptions = [
          "Cancelled",
          "Ready for Pickup",
          "Delivered",
          "Confirmed",
        ];
        setNewPaymentStatus("Paid"); // For selfPickup, payment status is always Paid and non-editable by admin here
      } else if (data.deliveryOption === "homeDelivery") {
        currentStatusOptions = [
          "Pending",
          "Processing",
          "Confirmed",
          "Out For Delivery",
          "Delivered",
          "Cancelled",
          "Refunded",
          "Failed to Deliver",
        ];
        setNewPaymentStatus(data.isPaid ? "Paid" : "Unpaid"); // Editable for homeDelivery
      } else {
        // Fallback for unknown delivery options - use a comprehensive list
        currentStatusOptions = [...baseStatusOptions]; // Use a copy of the base options
        setNewPaymentStatus(data.isPaid ? "Paid" : "Unpaid");
      }
      setDynamicStatusOptions(currentStatusOptions);

      // Initialize the status dropdown with the current order status, if valid for the type
      if (data.orderStatus && currentStatusOptions.includes(data.orderStatus)) {
        setNewStatus(data.orderStatus);
      } else if (currentStatusOptions.length > 0) {
        // If current order status is not in the allowed list for this delivery type,
        // or if orderStatus is null/empty, default to the first valid option.
        setNewStatus(currentStatusOptions[0]);
      } else {
        setNewStatus(""); // Fallback if no dynamic options are available
      }

      // Initialize Delivery Date & Time inputs
      // This section will be conditionally rendered, but initialize state anyway
      if (data.deliveryPreference) {
        setDeliveryDate(
          data.deliveryPreference.date
            ? new Date(data.deliveryPreference.date).toISOString().split("T")[0]
            : ""
        );
        setDeliveryTimeSlot(data.deliveryPreference.timeSlot || "");
      } else {
        setDeliveryDate("");
        setDeliveryTimeSlot("");
      }

      console.log("Fetched order details:", data);
    } catch (err) {
      console.error(`Error fetching order ${orderId}:`, err);
      const errorMessage =
        err.response?.data?.message || "Failed to fetch order details.";
      setError(errorMessage);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [orderId]); // Depend on orderId

  // Effect hook to trigger fetchOrderDetails when the orderId URL parameter changes
  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]); // Depend on the memoized fetchOrderDetails function

  // Handler for updating order status
  const handleStatusChange = async (newStatusValue) => {
    // Find the status text from base options for display message (or use newStatusValue directly)
    const statusText =
      baseStatusOptions.find((s) => s === newStatusValue) || newStatusValue;

    if (
      isUpdatingStatus ||
      !newStatusValue ||
      (order?.orderStatus &&
        newStatusValue.toLowerCase() === order.orderStatus.toLowerCase())
    ) {
      setUpdateError(
        order?.orderStatus &&
          newStatusValue.toLowerCase() === order.orderStatus.toLowerCase()
          ? "Selected status is the same as current."
          : "Invalid status selected or no status change."
      );
      setUpdateSuccess(false);
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to change the order status to "${statusText}"?`
    );
    if (!confirmed) {
      setUpdateError(null);
      setUpdateSuccess(false);
      // Revert dropdown to current valid status or first valid option
      if (
        order?.orderStatus &&
        dynamicStatusOptions.includes(order.orderStatus)
      ) {
        setNewStatus(order.orderStatus);
      } else if (dynamicStatusOptions.length > 0) {
        setNewStatus(dynamicStatusOptions[0]);
      }
      return;
    }

    setIsUpdatingStatus(true);
    setUpdateError(null);
    setUpdateSuccess(false);
    setPaymentUpdateError(null); // Clear payment errors
    setDeliveryUpdateError(null); // Clear delivery errors

    try {
      const updatedOrder = await orderService.updateOrderStatus(
        orderId,
        newStatusValue,
        // For selfPickup, if newPaymentStatus is "Paid" (which it should be), send it.
        // For homeDelivery, newPaymentStatus reflects the dropdown.
        newPaymentStatus // Send the current newPaymentStatus state
      );

      setOrder(updatedOrder); // Update local state with fresh data

      // Re-evaluate dynamicStatusOptions based on potentially changed order (though deliveryOption shouldn't change here)
      let currentDynamicOptions = [];
      if (updatedOrder.deliveryOption === "selfPickup") {
        currentDynamicOptions = [
          "Cancelled",
          "Ready for Pickup",
          "Delivered",
          "Confirmed",
        ];
      } else if (updatedOrder.deliveryOption === "homeDelivery") {
        currentDynamicOptions = [
          "Pending",
          "Processing",
          "Confirmed",
          "Out For Delivery",
          "Delivered",
          "Cancelled",
          "Refunded",
          "Failed to Deliver",
        ];
      } else {
        currentDynamicOptions = [...baseStatusOptions];
      }
      setDynamicStatusOptions(currentDynamicOptions);

      // Sync dropdown with the new status from backend, ensuring it's valid for the type
      if (
        updatedOrder.orderStatus &&
        currentDynamicOptions.includes(updatedOrder.orderStatus)
      ) {
        setNewStatus(updatedOrder.orderStatus);
      } else if (currentDynamicOptions.length > 0) {
        setNewStatus(currentDynamicOptions[0]);
      } else {
        setNewStatus("");
      }

      // Sync payment status display for homeDelivery; selfPickup is fixed to "Paid"
      if (updatedOrder.deliveryOption === "homeDelivery") {
        setNewPaymentStatus(updatedOrder.isPaid ? "Paid" : "Unpaid");
      } else if (updatedOrder.deliveryOption === "selfPickup") {
        setNewPaymentStatus("Paid"); // Ensure it remains "Paid"
      }

      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (err) {
      console.error("Error updating status:", err);
      setUpdateError(
        err.response?.data?.message || "Failed to update order status."
      );
      setUpdateSuccess(false);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handler for updating payment status (Paid/Unpaid)
  const handlePaymentStatusChange = async (newPaymentStatusValue) => {
    // This function should only be effectively callable for homeDelivery
    if (order?.deliveryOption === "selfPickup") {
      setPaymentUpdateError(
        "Payment status for Self-Pickup orders cannot be changed from 'Paid'."
      );
      setNewPaymentStatus("Paid"); // Revert if somehow triggered
      return;
    }

    const currentIsPaid = order?.isPaid;
    const targetIsPaid = newPaymentStatusValue === "Paid";

    if (isUpdatingPaymentStatus || targetIsPaid === currentIsPaid) {
      setPaymentUpdateError(
        targetIsPaid === currentIsPaid
          ? "Selected payment status is the same."
          : "Invalid payment status."
      );
      setPaymentUpdateSuccess(false);
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to change the payment status to "${newPaymentStatusValue}"?`
    );
    if (!confirmed) {
      setPaymentUpdateError(null);
      setPaymentUpdateSuccess(false);
      setNewPaymentStatus(currentIsPaid ? "Paid" : "Unpaid"); // Revert dropdown
      return;
    }

    setIsUpdatingPaymentStatus(true);
    setPaymentUpdateError(null);
    setPaymentUpdateSuccess(false);
    setUpdateError(null); // Clear order status errors
    setDeliveryUpdateError(null); // Clear delivery errors

    try {
      const updatedOrder = await orderService.updateOrderStatus(
        orderId,
        order?.orderStatus, // Keep the current order status
        newPaymentStatusValue // Pass the new payment status string ("Paid" or "Unpaid")
      );

      setOrder(updatedOrder); // Update local state
      setNewPaymentStatus(updatedOrder.isPaid ? "Paid" : "Unpaid"); // Sync dropdown
      setPaymentUpdateSuccess(true);

      setTimeout(() => setPaymentUpdateSuccess(false), 3000);
    } catch (err) {
      console.error("Error updating payment status:", err);
      setPaymentUpdateError(
        err.response?.data?.message || "Failed to update payment status."
      );
      setPaymentUpdateSuccess(false);
    } finally {
      setIsUpdatingPaymentStatus(false);
    }
  };

  // Handler for updating delivery date and time slot
  const handleDeliveryDateTimeUpdate = async () => {
    // This section is hidden for homeDelivery, so this check is an additional safeguard
    if (order?.deliveryOption === "homeDelivery") {
      setDeliveryUpdateError(
        "Delivery date/time cannot be set for Home Delivery orders via this interface."
      );
      return;
    }

    if (!deliveryDate || !deliveryTimeSlot) {
      setDeliveryUpdateError("Please select both a date and a time slot.");
      setDeliveryUpdateSuccess(false);
      return;
    }

    const currentDate = order?.deliveryPreference?.date
      ? new Date(order.deliveryPreference.date).toISOString().split("T")[0]
      : "";
    const currentTimeSlot = order?.deliveryPreference?.timeSlot || "";

    if (deliveryDate === currentDate && deliveryTimeSlot === currentTimeSlot) {
      setDeliveryUpdateError("Delivery date and time are the same as current.");
      setDeliveryUpdateSuccess(false);
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to update the delivery date to "${deliveryDate}" and time to "${deliveryTimeSlot}"?`
    );
    if (!confirmed) {
      setDeliveryUpdateError(null);
      setDeliveryUpdateSuccess(false);
      setDeliveryDate(currentDate);
      setDeliveryTimeSlot(currentTimeSlot);
      return;
    }

    setIsUpdatingDeliveryTime(true);
    setDeliveryUpdateError(null);
    setDeliveryUpdateSuccess(false);
    setUpdateError(null);
    setPaymentUpdateError(null);

    try {
      const updatedOrder = await orderService.updateOrderDeliveryPreference(
        orderId,
        deliveryDate,
        deliveryTimeSlot
      );

      setOrder(updatedOrder);
      setDeliveryDate(
        updatedOrder.deliveryPreference.date
          ? new Date(updatedOrder.deliveryPreference.date)
              .toISOString()
              .split("T")[0]
          : ""
      );
      setDeliveryTimeSlot(updatedOrder.deliveryPreference.timeSlot);
      setDeliveryUpdateSuccess(true);
      setTimeout(() => setDeliveryUpdateSuccess(false), 3000);
    } catch (err) {
      console.error("Error updating delivery time:", err);
      setDeliveryUpdateError(
        err.response?.data?.message ||
          "Failed to update delivery date and time."
      );
      setDeliveryUpdateSuccess(false);
    } finally {
      setIsUpdatingDeliveryTime(false);
    }
  };

  // Handler for showing the delivery location on Google Maps
  const handleShowLocation = () => {
    const lat = order?.shippingAddress?.latitude;
    const lng = order?.shippingAddress?.longitude;

    if (typeof lat === "number" && typeof lng === "number") {
      if (
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180 &&
        (lat !== 0 || lng !== 0)
      ) {
        window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank");
      } else {
        alert(
          "Invalid or default location coordinates available for this order."
        );
        const address = fullAddress.replace(/, N\/A/g, "").trim();
        if (address && address !== "N/A") {
          window.open(
            `https://www.google.com/maps?q=${encodeURIComponent(address)}`,
            "_blank"
          );
        } else {
          window.open(`https://www.google.com/maps?q=location`, "_blank");
        }
      }
    } else {
      alert("Location coordinates not available for this order.");
      const address = fullAddress.replace(/, N\/A/g, "").trim();
      if (address && address !== "N/A") {
        window.open(
          `https://www.google.com/maps?q=${encodeURIComponent(address)}`,
          "_blank"
        );
      } else {
        window.open(`https://www.google.com/maps?q=location`, "_blank");
      }
    }
  };

  // Handler for printing the invoice (placeholder)
  const handlePrintInvoice = () => {
    alert("Print invoice functionality is not implemented yet.");
  };

  // Handler for assigning a delivery man (placeholder)
  const handleAssignDeliveryMan = () => {
    alert("Assign Delivery Man functionality is not implemented yet.");
  };

  // Helper to get order type display string
  const getOrderTypeDisplay = (deliveryOption) => {
    if (deliveryOption === "homeDelivery") {
      return "Home Delivery";
    } else if (deliveryOption === "selfPickup") {
      return "Self Pickup";
    }
    return "N/A";
  };

  // --- Render Logic ---

  if (loading) {
    return (
      <div className="order-details-container loading">
        <FaSpinner className="spinner-icon spin" /> Loading order details...
      </div>
    );
  }

  if (error) {
    return (
      <div className="order-details-container error-message">
        Error: {error}
      </div>
    );
  }

  if (!order) {
    return (
      <div className="order-details-container no-order-found">
        Order not found.
      </div>
    );
  }

  // --- Data Preparation for Display ---
  const subTotalPrice = (order.itemsPrice || 0) - (order.discountAmount || 0);
  const totalAmount = order.totalPrice || 0;

  // For display purposes, newPaymentStatus is authoritative for the UI if order is loaded
  const displayIsPaid =
    order.deliveryOption === "selfPickup" ? true : newPaymentStatus === "Paid";
  const paidStatusText = displayIsPaid ? "Paid" : "Unpaid";
  const paymentStatusClass =
    paymentStatusClassMap[paidStatusText.toLowerCase()] || "unknown";

  const amountPaidForDisplay = displayIsPaid ? totalAmount : 0;
  const amountDueForDisplay = displayIsPaid ? 0 : totalAmount;

  const customerName = order.user
    ? order.user.displayName || order.user.name || "N/A"
    : "Guest Customer";

  let paymentMethodDisplay = order.paymentMethod || "N/A";
  if (order.paymentMethod === "Online" && order.paymentResult?.method) {
    paymentMethodDisplay = `${order.paymentResult.method} (Online)`;
  } else if (order.paymentMethod === "COD") {
    paymentMethodDisplay = "Cash on Delivery (COD)";
  } else if (order.paymentMethod === "Offline Payment") {
    paymentMethodDisplay = "Offline Payment";
  }

  const addressParts = [
    order.shippingAddress?.addressLine,
    order.shippingAddress?.streetNumber,
    order.shippingAddress?.houseNumber
      ? `House ${order.shippingAddress.houseNumber}`
      : null,
    order.shippingAddress?.floorNumber
      ? `Floor ${order.shippingAddress.floorNumber}`
      : null,
    order.shippingAddress?.city,
    order.shippingAddress?.state,
    order.shippingAddress?.postalCode,
    order.shippingAddress?.country,
  ].filter(Boolean);

  const fullAddress = addressParts.join(", ") || "N/A";

  // --- Render the Order Details UI ---
  return (
    <div className="order-details-container">
      <div className="order-header">
        <div className="order-title-group">
          <h1 className="page-title">Order Details</h1>
          <span className="order-id">
            Order ID #{order._id ? order._id.toString().toUpperCase() : "N/A"}
          </span>
          <div className="order-created-at">
            <FaCalendarAlt /> {formatDateTime(order.createdAt)}
          </div>
        </div>
        <div className="order-header-actions">
          {order.deliveryOption === "homeDelivery" && order.shippingAddress && (
            <button
              className="btn btn-secondary btn-with-icon"
              onClick={handleShowLocation}
              title="Show Location on Map"
              disabled={
                !order.shippingAddress ||
                (typeof order.shippingAddress.latitude !== "number" &&
                  typeof order.shippingAddress.longitude !== "number")
              }
            >
              <FaMapMarkerAlt /> Show Location in Map
            </button>
          )}
          <button
            className="btn btn-primary btn-with-icon"
            onClick={handlePrintInvoice}
            title="Print Invoice"
            disabled={!order._id}
          >
            <FaPrint /> Print Invoice
          </button>
        </div>
      </div>

      <div className="order-details-grid">
        <div className="grid-left">
          {Array.isArray(order.orderItems) && order.orderItems.length > 0 ? (
            <div className="details-section order-items-section card-style">
              <h3>
                <FaBoxOpen className="section-icon" /> Item Details
              </h3>
              <div className="items-list">
                <div className="table-responsive-wrapper">
                  <table className="table stylish-table item-table">
                    <thead>
                      <tr>
                        <th>SL</th>
                        <th className="item-details-col">Item Details</th>
                        <th>Qty</th>
                        <th>Unit Price</th>
                        <th>Discount</th>
                        <th>Total Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.orderItems.map((item, index) =>
                        item ? (
                          <tr key={item._id || index}>
                            <td>{index + 1}</td>
                            <td className="item-details-cell">
                              <div className="item-image-container">
                                {item.image &&
                                typeof item.image === "string" &&
                                item.image.trim() !== "" ? (
                                  <img
                                    src={`${IMAGE_API_BASE_URL}/uploads/${item.image}`}
                                    alt={item.name || "Item Image"}
                                    className="item-thumbnail"
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.style.display = "none";
                                      const placeholder = e.target
                                        .closest(".item-image-container")
                                        ?.querySelector(
                                          ".item-image-placeholder"
                                        );
                                      if (placeholder)
                                        placeholder.style.display =
                                          "inline-flex";
                                    }}
                                    loading="lazy"
                                  />
                                ) : (
                                  <div
                                    className="item-image-placeholder"
                                    title="No image available"
                                  >
                                    <FaImage />
                                  </div>
                                )}
                              </div>
                              <div className="item-info">
                                <div className="item-name">
                                  {item.name || "N/A"}
                                </div>
                                <div className="item-meta">
                                  Unit: {item.unit || "N/A"}
                                </div>
                                <div className="item-meta item-meta-price">
                                  Unit Price :{" "}
                                  {formatCurrency(item.priceAtPurchase || 0)}
                                </div>
                                <div className="item-meta item-meta-qty">
                                  QTY : {item.quantity || 0}
                                </div>
                              </div>
                            </td>
                            <td>{item.quantity || 0}</td>
                            <td>{formatCurrency(item.priceAtPurchase || 0)}</td>
                            <td>{formatCurrency(0)}</td>
                            <td>
                              {formatCurrency(
                                (item.quantity || 0) *
                                  (item.priceAtPurchase || 0)
                              )}
                            </td>
                          </tr>
                        ) : null
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="details-section order-items-section card-style">
              <h3>
                <FaBoxOpen className="section-icon" /> Item Details
              </h3>
              <p>No items found for this order.</p>
            </div>
          )}

          {order.totalPrice !== undefined ? (
            <div className="details-section price-breakdown-section card-style">
              <h3>
                <FaClipboardList className="section-icon" /> Price Breakdown
              </h3>
              <div className="price-list">
                <div className="price-item">
                  <span>Items Price :</span>
                  <span>{formatCurrency(order.itemsPrice || 0)}</span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="price-item item-discount">
                    <span>Discount :</span>
                    <span>-{formatCurrency(order.discountAmount)}</span>
                  </div>
                )}
                <div className="price-item sub-total">
                  <span>Sub Total :</span>
                  <span>{formatCurrency(subTotalPrice)}</span>
                </div>
                <div className="price-item">
                  <span>TAX / VAT :</span>
                  <span>{formatCurrency(order.taxPrice || 0)}</span>
                </div>
                <div className="price-item">
                  <span>Delivery Fee :</span>
                  <span>{formatCurrency(order.shippingPrice || 0)}</span>
                </div>
                <div className="price-item total-price">
                  <span>Total :</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="details-section price-breakdown-section card-style">
              <h3>
                <FaClipboardList className="section-icon" /> Price Breakdown
              </h3>
              <p>Price breakdown information not available.</p>
            </div>
          )}
        </div>
        <div className="grid-right">
          <div className="details-section order-setup-section card-style">
            <h3>Order Setup</h3>
            <div className="setup-item change-order-status-control">
              <label htmlFor="status-select">Change Order Status:</label>
              <select
                id="status-select"
                value={newStatus}
                onChange={(e) => {
                  setNewStatus(e.target.value);
                  if (e.target.value) {
                    handleStatusChange(e.target.value);
                  }
                }}
                disabled={
                  isUpdatingStatus ||
                  !order ||
                  dynamicStatusOptions.length === 0
                }
              >
                {!newStatus && dynamicStatusOptions.length > 0 && (
                  <option value="" disabled>
                    Select Status
                  </option>
                )}
                {dynamicStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            {updateError && (
              <div className="status-update-message error">{updateError}</div>
            )}
            {updateSuccess && (
              <div className="status-update-message success">
                Status updated successfully!
              </div>
            )}
            <div className="setup-item change-payment-status-control">
              <label htmlFor="payment-status-select">Payment Status:</label>
              <select
                id="payment-status-select"
                value={newPaymentStatus}
                onChange={(e) => {
                  setNewPaymentStatus(e.target.value);
                  handlePaymentStatusChange(e.target.value);
                }}
                disabled={
                  order?.deliveryOption === "selfPickup" || // Disabled for selfPickup
                  isUpdatingPaymentStatus ||
                  !order ||
                  order.isPaid === undefined
                }
              >
                {paymentStatusOptions.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
            {paymentUpdateError && (
              <div className="status-update-message error">
                {paymentUpdateError}
              </div>
            )}
            {paymentUpdateSuccess && (
              <div className="status-update-message success">
                Payment status updated successfully!
              </div>
            )}

            {/* Conditional display for Delivery Date & Time controls */}
            {order?.deliveryOption !== "homeDelivery" && (
              <>
                <div className="setup-item change-delivery-datetime-control">
                  <label htmlFor="delivery-date">Delivery Date & Time:</label>
                  <div className="delivery-datetime-inputs">
                    <input
                      type="date"
                      id="delivery-date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      disabled={isUpdatingDeliveryTime || !order}
                    />
                    <input
                      type="text"
                      id="delivery-time-slot"
                      value={deliveryTimeSlot}
                      onChange={(e) => setDeliveryTimeSlot(e.target.value)}
                      placeholder="HH:MM AM/PM or Time Slot"
                      disabled={isUpdatingDeliveryTime || !order}
                    />
                  </div>
                  <button
                    className="btn btn-primary btn-update-delivery-time btn-with-icon"
                    onClick={handleDeliveryDateTimeUpdate}
                    disabled={
                      isUpdatingDeliveryTime ||
                      !order ||
                      !deliveryDate ||
                      !deliveryTimeSlot
                    }
                  >
                    {isUpdatingDeliveryTime ? (
                      <FaSpinner className="spinner-icon spin" />
                    ) : (
                      <FaEdit />
                    )}{" "}
                    Update
                  </button>
                </div>
                {deliveryUpdateError && (
                  <div className="status-update-message error">
                    {deliveryUpdateError}
                  </div>
                )}
                {deliveryUpdateSuccess && (
                  <div className="status-update-message success">
                    Delivery date & time updated successfully!
                  </div>
                )}
                {/* Current Delivery Date & Time Display (also conditional) */}
                {order.deliveryPreference?.date && (
                  <div className="setup-item current-delivery-datetime">
                    <strong>Scheduled:</strong>{" "}
                    {formatDate(order.deliveryPreference.date)} @{" "}
                    {order.deliveryPreference.timeSlot || "N/A"}
                  </div>
                )}
              </>
            )}

            {order.deliveryOption === "homeDelivery" && (
              <div className="setup-item assign-delivery-control">
                <button
                  className="btn btn-secondary btn-assign-delivery btn-with-icon"
                  onClick={handleAssignDeliveryMan}
                  disabled={!order._id || isUpdatingDeliveryTime}
                >
                  <FaTruck /> Assign Delivery Man Manually
                </button>
              </div>
            )}
          </div>

          {order.paymentResult ||
          order.paymentMethod === "COD" ||
          order.paymentMethod === "Offline Payment" ? (
            <div className="details-section payment-info-section card-style">
              <h3>
                <FaCreditCard className="section-icon" /> Payment Information
              </h3>
              <div className="info-list">
                <p>
                  <strong>Payment Method:</strong> {paymentMethodDisplay}
                </p>
                <p>
                  <strong>Payment Status:</strong>{" "}
                  <span className={`payment-status ${paymentStatusClass}`}>
                    {paidStatusText}{" "}
                    {/* Use dynamically determined paidStatusText */}
                  </span>
                </p>
                {order.paymentMethod === "COD" ? (
                  displayIsPaid ? ( // Use displayIsPaid
                    <p>
                      <strong>Amount Received:</strong>{" "}
                      {formatCurrency(totalAmount)}
                    </p>
                  ) : (
                    <p>
                      <strong>Amount Due:</strong> {formatCurrency(totalAmount)}
                    </p>
                  )
                ) : (
                  <>
                    {displayIsPaid ? ( // Use displayIsPaid
                      <p>
                        <strong>Amount Paid:</strong>{" "}
                        {formatCurrency(amountPaidForDisplay)}
                      </p>
                    ) : (
                      <p>
                        <strong>Amount Due:</strong>{" "}
                        {formatCurrency(amountDueForDisplay)}
                      </p>
                    )}

                    {order.paymentResult && (
                      <>
                        <p>
                          <strong>Transaction ID:</strong>{" "}
                          {order.paymentResult.id ||
                            order.paymentResult.transactionId ||
                            "N/A"}
                        </p>
                        {order.paymentResult.razorpay_payment_id && (
                          <p>
                            <strong>Payment Gateway ID:</strong>{" "}
                            {order.paymentResult.razorpay_payment_id}
                          </p>
                        )}
                        {order.paymentResult.status && (
                          <p>
                            <strong>Gateway Status:</strong>{" "}
                            {order.paymentResult.status}
                          </p>
                        )}
                        {order.paymentResult.method &&
                          order.paymentMethod === "Online" && (
                            <p>
                              <strong>Online Method:</strong>{" "}
                              {order.paymentResult.method}
                            </p>
                          )}
                      </>
                    )}
                    {order.paymentMethod === "Offline Payment" && (
                      <p>
                        <strong>Verification Status:</strong>
                        <span
                          className={`payment-verify-status status-${
                            order.paymentResult?.verifyStatus?.toLowerCase() ||
                            "pending"
                          }`}
                        >
                          {order.paymentResult?.verifyStatus ||
                            "Pending Verification"}
                        </span>
                      </p>
                    )}
                    {order.paymentResult?.note && (
                      <p className="payment-note">
                        <strong># Payment Note:</strong>{" "}
                        {order.paymentResult.note}
                      </p>
                    )}
                    {order.paymentMethod === "Offline Payment" &&
                      !order.isPaid && ( // Check actual order.isPaid for these buttons
                        <div className="payment-actions">
                          <button className="btn btn-success btn-sm" disabled>
                            Approve Payment (TODO)
                          </button>
                          <button
                            className="btn btn-danger btn-sm ms-2"
                            disabled
                          >
                            Reject Payment (TODO)
                          </button>
                        </div>
                      )}
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="details-section payment-info-section card-style">
              <h3>
                <FaCreditCard className="section-icon" /> Payment Information
              </h3>
              <p>Payment details not available.</p>
            </div>
          )}

          {order.shippingAddress ? (
            <div className="details-section delivery-info-section card-style">
              <h3>
                <FaTruck className="section-icon" /> Delivery/Pickup Information
              </h3>
              <div className="info-list">
                <p>
                  <strong>Type:</strong>{" "}
                  {getOrderTypeDisplay(order.deliveryOption)}
                </p>
                <p>
                  <strong>Contact Name:</strong>
                  {order.shippingAddress?.contactName || "N/A"}
                </p>
                <p>
                  <strong>Contact Number:</strong>
                  {order.shippingAddress?.contactNumber || "N/A"}
                </p>
                {order.deliveryOption === "homeDelivery" && (
                  <p>
                    <strong>Address:</strong> {fullAddress}
                  </p>
                )}
                {order.shippingAddress?.label && (
                  <p>
                    <strong>Label:</strong> {order.shippingAddress.label}
                  </p>
                )}
                {order.shippingAddress?.landmark && (
                  <p>
                    <strong>Landmark:</strong> {order.shippingAddress.landmark}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="details-section delivery-info-section card-style">
              <h3>
                <FaTruck className="section-icon" /> Delivery/Pickup Information
              </h3>
              <p>Address information not available for this order type.</p>
            </div>
          )}

          {order.user ? (
            <div className="details-section customer-info-section card-style">
              <h3>
                <FaUser className="section-icon" /> Customer Information
              </h3>
              <div className="info-list">
                <p>
                  <strong>Name:</strong> {customerName}
                </p>
                <p>
                  <strong>Phone:</strong> {order.user.phone || "N/A"}
                </p>
                <p>
                  <strong>Email:</strong> {order.user.email || "N/A"}
                </p>
                {order.user._id && (
                  <p>
                    <Link
                      to={`/admin/customers/${order.user._id}`}
                      className="btn btn-sm btn-outline-primary"
                    >
                      View Customer Profile
                    </Link>
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="details-section customer-info-section card-style">
              <h3>
                <FaUser className="section-icon" /> Customer Information
              </h3>
              <p>Guest Customer (User information not linked or available).</p>
            </div>
          )}

          {order.orderNotes && order.orderNotes.trim() !== "" && (
            <div className="details-section order-notes-section card-style">
              <h3>Order Notes</h3>
              <p>{order.orderNotes}</p>
            </div>
          )}

          {order.promoCodeApplied?.code && (
            <div className="details-section promo-code-section card-style">
              <h3>Promo Details</h3>
              <div className="info-list">
                <p>
                  <strong>Code:</strong> {order.promoCodeApplied.code}
                </p>
                <p>
                  <strong>Discount Type:</strong>{" "}
                  {order.promoCodeApplied.discountType || "N/A"}
                </p>
                <p>
                  <strong>Discount Value:</strong>
                  {order.promoCodeApplied.discountValue !== undefined
                    ? `${order.promoCodeApplied.discountValue}${
                        order.promoCodeApplied.discountType === "Percent"
                          ? "%"
                          : "₹"
                      }`
                    : "N/A"}
                </p>
                <p>
                  <strong>Applied Discount:</strong>{" "}
                  {formatCurrency(order.discountAmount || 0)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsPage;
