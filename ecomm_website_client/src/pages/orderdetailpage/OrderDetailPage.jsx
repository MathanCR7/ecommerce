// frontend/src/pages/orderdetailpage/OrderDetailPage.jsx
import React, { useState, useEffect, useContext } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getOrderByIdApi } from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import {
  FaSpinner,
  FaInfoCircle,
  FaMapMarkerAlt,
  FaBoxOpen,
  FaCreditCard,
  FaClipboardList,
} from "react-icons/fa";
import "./OrderDetailPage.css"; // Create this CSS file

const OrderDetailPage = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, loading: authLoading } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // Redirect to login, remembering the current page to return after login
      navigate("/login", { state: { from: `/my-orders/${orderId}` } });
      return;
    }

    const fetchOrderDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await getOrderByIdApi(orderId);
        if (data && data._id) {
          // Backend returns the order object directly
          setOrder(data);
        } else {
          // Handle cases where data exists but doesn't have _id (shouldn't happen with valid API)
          throw new Error("Invalid order data received.");
        }
      } catch (err) {
        console.error("Error fetching order details:", err);
        const errorMessage =
          err.response?.data?.message ||
          err.message ||
          "Failed to fetch order details.";
        setError(errorMessage);
        toast.error(errorMessage);
        if (err.response?.status === 404 || err.response?.status === 401) {
          // If 404 (not found) or 401 (unauthorized for this user)
          navigate("/my-orders", { replace: true }); // Redirect, user shouldn't stay on this URL
        }
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchOrderDetails();
    } else {
      setError("Order ID is missing in the URL.");
      setLoading(false);
      toast.error("Invalid order link.");
      navigate("/my-orders", { replace: true }); // Redirect if URL is malformed
    }
  }, [orderId, user, navigate, authLoading]); // Added dependencies

  const formatPriceToINR = (price) => {
    const numPrice = Number(price);
    return `₹${isNaN(numPrice) ? "0.00" : numPrice.toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    // Ensure dateString is a valid Date object or parseable string
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "Invalid Date"; // Handle invalid date strings
      }
      return date.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      console.error("Error formatting date:", dateString, e);
      return "Invalid Date";
    }
  };

  // Render full page loader if authentication or initial data is loading
  if (authLoading || loading) {
    return (
      <>
        <Header
          // Use placeholder cart count while loading if order isn't available yet
          cartItemCount={0} // Or maybe pass a prop from App.jsx if global cart state is available
        />
        <div
          className="loading-full-page"
          style={{
            minHeight: "calc(100vh - 120px)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <FaSpinner className="fa-spin" size="2em" />
          <p style={{ marginTop: "10px" }}>Loading order details...</p>
        </div>
        <Footer />
      </>
    );
  }

  // Render error state if fetching failed or order is null/undefined after loading
  if (error || !order) {
    return (
      <>
        <Header /> {/* Consider showing cart count if available */}
        <div
          className="container order-detail-page error-state"
          style={{
            minHeight: "calc(100vh - 120px)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <h2>
            <FaInfoCircle /> Error Loading Order
          </h2>
          <p>{error || "Order data could not be loaded."}</p>
          {/* Only show back button if not already redirected */}
          {!error.includes("redirect") && ( // Simple check, refine if needed
            <Link
              to="/my-orders"
              className="btn-primary"
              style={{ marginTop: "15px" }}
            >
              Back to My Orders
            </Link>
          )}
        </div>
        <Footer />
      </>
    );
  }

  const {
    _id,
    orderItems, // This is the array causing the key warning when mapped
    shippingAddress,
    paymentMethod,
    itemsPrice,
    taxPrice,
    shippingPrice,
    discountAmount,
    totalPrice,
    orderStatus,
    deliveryOption,
    promoCodeApplied,
    orderNotes,
    createdAt,
    isPaid,
    paidAt,
    isDelivered, // Use this for final status check
    deliveredAt, // Use this for final status date
    // Add deliveryPreference if you want to display scheduled/pickup time
    deliveryPreference,
  } = order;

  // Helper to display delivery/pickup date and time
  const renderDeliveryTime = () => {
    if (
      !deliveryPreference ||
      (!deliveryPreference.date && !deliveryPreference.timeSlot)
    ) {
      return null; // No scheduled preference
    }

    const date = deliveryPreference.date
      ? new Date(deliveryPreference.date)
      : null;
    const timeSlot = deliveryPreference.timeSlot;

    if (!date && !timeSlot) return null;

    const datePart =
      date && !isNaN(date.getTime())
        ? date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
        : null;
    const timePart = timeSlot || null;

    if (datePart && timePart) {
      return `${datePart} - ${timePart}`;
    } else if (datePart) {
      return datePart;
    } else if (timePart) {
      return timePart;
    }
    return null; // Should not happen
  };

  // Helper to format order ID for display
  const displayOrderId = _id ? `#${_id.slice(-8).toUpperCase()}` : "N/A";

  return (
    <>
      <Header
        cartItemCount={orderItems.reduce((sum, item) => sum + item.quantity, 0)}
      />
      <main className="order-detail-page-wrapper">
        <div className="container order-detail-page">
          <div className="order-detail-header">
            <h1>Order Details</h1>
            <div className="header-info">
              <span className="order-id-detail">ID: {displayOrderId}</span>
              <span
                className={`order-status-badge status-${orderStatus
                  ?.toLowerCase()
                  .replace(/\s+/g, "-")}`}
              >
                {orderStatus}
              </span>
            </div>
            <p className="order-placed-date">
              Placed on: {formatDate(createdAt)}
            </p>
          </div>

          <div className="order-detail-grid">
            <div className="order-items-section">
              <h2>
                <FaBoxOpen /> Items in this Order ({orderItems.length})
              </h2>
              {orderItems.map((item) => (
                <div
                  className="order-item-detail-card"
                  // FIX 1: Use the unique _id of the order item subdocument as the key
                  key={item._id}
                >
                  <img
                    src={
                      item.image?.startsWith("http") // Check if image is a full URL
                        ? item.image
                        : `${import.meta.env.VITE_BACKEND_URL || ""}${
                            item.image?.startsWith("/") ? "" : "/"
                          }${item.image}` // Assume uploads are in /uploads or root
                    }
                    alt={item.name}
                    className="item-image"
                    // Add fallback for image errors
                    onError={(e) => {
                      e.target.onerror = null; // Prevents infinite loop
                      e.target.src = "/assets/images/placeholder-item.png"; // Path to your placeholder image
                    }}
                  />
                  <div className="item-info">
                    {/* Link to item details page using the original item's _id */}
                    {/* Make sure orderItems.item is populated in the backend controller */}
                    {item.item?._id ? (
                      <Link to={`/item/${item.item._id}`} className="item-name">
                        {item.name}
                      </Link>
                    ) : (
                      <span className="item-name">{item.name}</span> // Render as span if item ID is not populated
                    )}

                    <p className="item-unit-price">
                      {formatPriceToINR(item.priceAtPurchase)} x {item.quantity}{" "}
                      {item.unit ? `(${item.unit})` : ""}
                    </p>
                  </div>
                  <p className="item-subtotal">
                    {formatPriceToINR(item.priceAtPurchase * item.quantity)}
                  </p>
                </div>
              ))}
            </div>

            <div className="order-summary-and-info">
              <div className="info-section shipping-address-section">
                <h2>
                  <FaMapMarkerAlt />{" "}
                  {deliveryOption === "selfPickup"
                    ? "Pickup Location"
                    : "Shipping Address"}
                </h2>
                {shippingAddress ? (
                  <>
                    <p>
                      <strong>{shippingAddress.contactName}</strong>
                    </p>
                    <p>{shippingAddress.contactNumber}</p>
                    {/* Render different address lines based on availability */}
                    <p>
                      {shippingAddress.houseNumber &&
                        `${shippingAddress.houseNumber}, `}
                      {shippingAddress.addressLine}
                    </p>
                    {shippingAddress.streetNumber && (
                      <p>{shippingAddress.streetNumber}</p>
                    )}
                    {shippingAddress.floorNumber && (
                      <p>Floor: {shippingAddress.floorNumber}</p>
                    )}
                    <p>
                      {shippingAddress.city}, {shippingAddress.state} -{" "}
                      {shippingAddress.postalCode}
                    </p>
                    <p>{shippingAddress.country}</p>
                    {shippingAddress.label && (
                      <p className="address-label-chip">
                        {shippingAddress.label}
                      </p>
                    )}
                  </>
                ) : (
                  <p>Address details not available.</p>
                )}
              </div>

              <div className="info-section payment-info-section">
                <h2>
                  <FaCreditCard /> Payment Information
                </h2>
                <p>
                  <strong>Payment Method:</strong> {paymentMethod}
                </p>
                <p>
                  <strong>Payment Status:</strong>{" "}
                  {isPaid ? `Paid on ${formatDate(paidAt)}` : "Pending Payment"}
                </p>
              </div>

              <div className="info-section delivery-info-section">
                <h2>
                  {deliveryOption === "selfPickup" ? "Pickup" : "Delivery"}{" "}
                  Information
                </h2>
                <p>
                  <strong>Option:</strong>{" "}
                  {deliveryOption === "homeDelivery"
                    ? "Home Delivery"
                    : "Self Pickup"}
                </p>
                {deliveryPreference?.type && (
                  <p>
                    <strong>Type:</strong>{" "}
                    {deliveryPreference.type === "quick"
                      ? "Quick"
                      : "Scheduled"}
                  </p>
                )}
                {/* Display scheduled date/time if available */}
                {renderDeliveryTime() && (
                  <p>
                    <strong>
                      {deliveryOption === "selfPickup"
                        ? "Preferred Pickup Time"
                        : "Scheduled Time"}
                      :
                    </strong>{" "}
                    {renderDeliveryTime()}
                  </p>
                )}

                <p>
                  <strong>Order Status:</strong>{" "}
                  <span
                    className={`status-text status-${orderStatus
                      ?.toLowerCase()
                      .replace(/\s+/g, "-")}`}
                  >
                    {orderStatus}
                  </span>
                </p>
              </div>

              {orderNotes && (
                <div className="info-section order-notes-section">
                  <h2>
                    <FaClipboardList /> Order Notes
                  </h2>
                  <p>{orderNotes}</p>
                </div>
              )}

              <div className="info-section cost-summary-detail">
                <h2>Order Summary</h2>
                <div className="cost-row">
                  {/* FIX 2: Replace span_label with span */}
                  <span>Items Total:</span>{" "}
                  <span>{formatPriceToINR(itemsPrice)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="cost-row discount">
                    {/* FIX 2: Replace span_label with span */}
                    <span>
                      Discount{" "}
                      {promoCodeApplied?.code
                        ? `(${promoCodeApplied.code})`
                        : ""}
                      :
                    </span>
                    <span>- {formatPriceToINR(discountAmount)}</span>
                  </div>
                )}
                <div className="cost-row">
                  {/* FIX 2: Replace span_label with span */}
                  <span>
                    {deliveryOption === "homeDelivery"
                      ? "Delivery Fee"
                      : "Pickup Fee"}
                    :
                  </span>{" "}
                  <span>
                    {shippingPrice > 0
                      ? formatPriceToINR(shippingPrice)
                      : "FREE"}
                  </span>
                </div>
                <div className="cost-row">
                  {/* FIX 2: Replace span_label with span */}
                  <span>VAT/Tax:</span>{" "}
                  {/* Consider displaying the percentage here if known */}
                  <span>+ {formatPriceToINR(taxPrice)}</span>
                </div>
                <hr />
                <div className="cost-row total">
                  <strong>Total Paid:</strong>{" "}
                  <strong>{formatPriceToINR(totalPrice)}</strong>
                </div>
              </div>
            </div>
          </div>
          {/* Use isDelivered status and deliveredAt date for final confirmation */}
          {isDelivered && deliveredAt && (
            <p className="delivery-status-final">
              {deliveryOption === "selfPickup" ? "Picked Up" : "Delivered"} on:{" "}
              {formatDate(deliveredAt)}
            </p>
          )}
          {/* Maybe add tracking link section if applicable */}
          {/* {order.trackingNumber && (
               <div className="info-section tracking-info">
                  <h2>Tracking</h2>
                  <p>Tracking Number: {order.trackingNumber}</p>
                  // Add link to courier website if trackingUrl is stored
                  {order.trackingUrl && <p><a href={order.trackingUrl} target="_blank" rel="noopener noreferrer">Track Your Order</a></p>}
               </div>
           )} */}
        </div>
      </main>
      <Footer />
    </>
  );
};

export default OrderDetailPage;
