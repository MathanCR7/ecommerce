// client/src/Pages/Admin/Customers/CustomerDetailsPage.jsx
// This file is based on the version you provided in the prompt, which is well-suited for the task.
import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import customerService from "../../../Services/customerService";
import orderService from "../../../Services/orderService"; // Corrected path assuming "Services" is capitalized
import "./CustomerDetailsPage.css"; // Create this CSS file
import {
  FaUserCircle,
  FaWallet,
  FaGift,
  FaClipboardList,
  FaSearch,
  FaEye,
  FaPrint,
  FaSpinner,
  FaArrowLeft,
  FaEnvelope,
  FaPhone,
  FaHome,
  FaBoxOpen,
  FaCalendarAlt,
} from "react-icons/fa";

// --- Constants for Image Handling ---
const IMAGE_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(
  "/api",
  ""
);
const DEFAULT_AVATAR_URL = "/assets/main-logo/default_avatar.png";

// Helper function to format currency (use ₹)
const formatCurrency = (amount) => {
  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount)) return "N/A";
  return `₹${numericAmount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// Helper function to format date
const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid Date";
    const options = { day: "numeric", month: "short", year: "numeric" };
    return date.toLocaleDateString("en-GB", options); // e.g., 17 Sep 2024
  } catch (e) {
    return String(dateString);
  }
};

// Helper for masking (copied from CustomerListPage for consistency if desired, or keep distinct)
const maskEmail = (email) => {
  if (!email || !email.includes("@")) return email || "N/A";
  const parts = email.split("@");
  const localPart = parts[0];
  const domain = parts[1];
  if (localPart.length <= 1) return `${localPart.charAt(0)}********@${domain}`;
  if (localPart.length <= 2)
    return `${localPart.charAt(0)}${"*".repeat(9)}@${domain}`;
  return `${localPart.charAt(0)}${"*".repeat(
    Math.min(9, localPart.length - 2)
  )}${localPart.length > 1 ? localPart.slice(-1) : ""}@${domain}`;
};

const maskPhone = (phone) => {
  if (!phone || typeof phone !== "string") return "N/A";
  const numericPhone = phone.replace(/\D/g, "");

  if (phone.startsWith("+91") && numericPhone.length === 12) {
    return `+91 ${numericPhone.substring(2, 4)}******${numericPhone.substring(
      10,
      12
    )}`;
  } else if (phone.startsWith("+") && numericPhone.length > 4) {
    const codeAndPrefixLength = phone.length - numericPhone.length + 2;
    const code = phone.substring(
      0,
      codeAndPrefixLength > phone.length
        ? phone.indexOf(numericPhone.substring(0, 1)) + 2
        : codeAndPrefixLength
    );
    const numberPart = numericPhone.substring(code.replace(/\D/g, "").length); // get number part after inferred code
    if (numberPart.length > 4) {
      return `${code}${numberPart.substring(0, 2)}******${numberPart.substring(
        numberPart.length - 2
      )}`;
    }
    return `${code}********`;
  } else if (numericPhone.length > 4) {
    return `${numericPhone.substring(0, 2)}******${numericPhone.substring(
      numericPhone.length - 2
    )}`;
  }
  // Fallback for very short numbers or unhandled formats
  if (phone.length > 1) {
    return `${phone.charAt(0)}********${phone.charAt(phone.length - 1)}`;
  } else if (phone.length === 1) {
    return `${phone.charAt(0)}********`;
  }
  return "N/A";
};

const getProfilePictureSrc = (profilePicturePath) => {
  if (!profilePicturePath) {
    return DEFAULT_AVATAR_URL;
  }
  if (
    profilePicturePath.startsWith("http://") ||
    profilePicturePath.startsWith("https://")
  ) {
    return profilePicturePath;
  }
  // Check for default avatar path variants
  if (
    profilePicturePath === "default_avatar.png" ||
    profilePicturePath.endsWith("/default_avatar.png") ||
    profilePicturePath === DEFAULT_AVATAR_URL // Check against full default path
  ) {
    return DEFAULT_AVATAR_URL;
  }

  let relativePath = profilePicturePath;
  if (relativePath.startsWith("/")) {
    relativePath = relativePath.substring(1);
  }

  // Prepend base URL if it's a relative path from server uploads
  // Ensure it's not accidentally prepending to an already complete path fragment
  if (relativePath.startsWith("uploads/")) {
    return `${IMAGE_API_BASE_URL}/${relativePath}`;
  }
  // If it's not an absolute URL, not the default, and not clearly an 'uploads/' path,
  // it might be a path that's meant to be relative to the API base URL directly.
  // This part can be tricky depending on how paths are stored.
  // The primary case is `uploads/...`. Other cases might need more specific handling or review of DB storage.
  // For safety, if it's not recognized, prepending might be the best guess, with onError as fallback.
  // console.warn(`[getProfilePictureSrc] Ambiguous path, attempting to prepend base URL: ${profilePicturePath}`);
  return `${IMAGE_API_BASE_URL}/${relativePath}`; // Default to prepending if not absolute or known default
};

const CustomerDetailsPage = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]); // State for addresses
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orderSearchTerm, setOrderSearchTerm] = useState("");

  const fetchCustomerDetails = useCallback(async () => {
    if (!customerId) {
      setError("Customer ID not found in URL.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // customerService.getCustomerById should return { user, orders, addresses }
      const responseData = await customerService.getCustomerById(customerId);

      if (!responseData || !responseData.user) {
        throw new Error(
          "Customer data or user object is missing in the response."
        );
      }
      setCustomer(responseData.user);
      setAddresses(responseData.addresses || []); // Set addresses from response

      // Orders should be part of the responseData from getCustomerById
      if (responseData.orders) {
        setOrders(responseData.orders);
      } else {
        // Fallback, though ideally orders are included in the primary fetch
        console.warn(
          "Orders not included in customer details from getCustomerById, fetching separately using orderService."
        );
        // If this fallback is used, ensure orderService.getOrdersByUserId also fetches 'orderStatus'
        const customerOrdersData = await orderService.getOrdersByUserId(
          customerId
        );
        setOrders(customerOrdersData.orders || []);
      }
    } catch (err) {
      console.error("Error fetching customer details:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to load customer details."
      );
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchCustomerDetails();
  }, [fetchCustomerDetails]);

  const handleOrderSearch = (e) => {
    setOrderSearchTerm(e.target.value.toLowerCase());
  };

  const filteredOrders = orders.filter(
    (order) =>
      (order._id && order._id.toLowerCase().includes(orderSearchTerm)) ||
      (order.orderIdSuffix && // If you have a short/suffix ID
        order.orderIdSuffix?.toLowerCase().includes(orderSearchTerm))
  );

  const handlePrintOrderInvoice = (orderId) => {
    alert(`Print invoice for order ${orderId} - Not implemented`);
  };

  if (loading) {
    return (
      <div className="customer-details-loading">
        <FaSpinner className="spinner-icon spin" /> Loading customer details...
      </div>
    );
  }

  if (error) {
    return <div className="customer-details-error">Error: {error}</div>;
  }

  if (!customer) {
    return (
      <div className="customer-details-not-found">
        Customer data could not be loaded or customer not found.
      </div>
    );
  }

  return (
    <div className="customer-details-page">
      <div className="page-header-flex">
        <h1 className="page-main-title">Customer Details</h1>
        <button
          onClick={() => navigate("/admin/customers")} // Direct to list page
          className="btn btn-outline back-button"
        >
          <FaArrowLeft /> Back to List
        </button>
      </div>

      <div className="customer-meta-info">
        <span>Customer ID: #{customer._id}</span>
        <span>
          <FaCalendarAlt /> Joined on: {formatDate(customer.createdAt)}
        </span>
      </div>

      <div className="customer-summary-cards">
        <div className="summary-card wallet-card">
          <div className="card-icon-bg">
            <FaWallet className="card-icon" />
          </div>
          <div className="card-content">
            <h4>WALLET BALANCE</h4>
            <p>{formatCurrency(customer.walletBalance || 0)}</p>
          </div>
        </div>
        <div className="summary-card loyalty-card">
          <div className="card-icon-bg">
            <FaGift className="card-icon" />
          </div>
          <div className="card-content">
            <h4>LOYALTY POINT BALANCE</h4>
            <p>
              {customer.loyaltyPoints || 0}{" "}
              <span className="points-text">Points</span>
            </p>
          </div>
        </div>
      </div>

      <div className="customer-details-layout">
        <div className="customer-orders-section">
          <div className="section-header">
            <h3>
              <FaClipboardList /> Order History ({filteredOrders.length} /{" "}
              {orders.length})
            </h3>
            <div className="order-search-container">
              <FaSearch className="search-icon-input" />
              <input
                type="text"
                placeholder="Search by Order ID..."
                value={orderSearchTerm}
                onChange={handleOrderSearch}
                className="order-search-input"
              />
            </div>
          </div>
          <div className="table-responsive-wrapper">
            <table className="table stylish-table orders-table">
              <thead>
                <tr>
                  <th>SL</th>
                  <th>Order ID</th>
                  <th>Order Date</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((order, index) => (
                    <tr key={order._id}>
                      <td>{index + 1}</td>
                      <td>
                        <Link
                          to={`/admin/orders/${order._id}`}
                          title={`View order ${order._id}`}
                          className="order-id-link"
                        >
                          #{/* Use full _id or orderIdSuffix if available */}
                          {order.orderIdSuffix ||
                            order._id.toString().toUpperCase().slice(-8)}
                        </Link>
                      </td>
                      <td>{formatDate(order.createdAt)}</td>
                      <td>{formatCurrency(order.totalPrice)}</td>
                      <td>
                        {/* MODIFIED SECTION FOR STATUS DISPLAY */}
                        <span
                          className={`status-badge status-${
                            order.orderStatus // Use orderStatus
                              ?.toLowerCase()
                              .replace(/\s+/g, "-") || "unknown"
                          }`}
                        >
                          {order.orderStatus || "Unknown"}{" "}
                          {/* Displays order.orderStatus */}
                        </span>
                        {/* END MODIFIED SECTION */}
                      </td>
                      <td>
                        <div className="action-buttons">
                          <Link
                            to={`/admin/orders/${order._id}`}
                            className="action-btn view-btn"
                            title="View Order Details"
                          >
                            <FaEye />
                          </Link>
                          <button
                            onClick={() => handlePrintOrderInvoice(order._id)}
                            className="action-btn print-btn"
                            title="Print Invoice"
                          >
                            <FaPrint />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center">
                      No orders found
                      {orderSearchTerm && ` for "${orderSearchTerm}"`}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="customer-profile-sidebar">
          <div className="profile-card">
            <img
              src={getProfilePictureSrc(customer.profilePicture)}
              alt={customer.displayName || customer.username || "Avatar"}
              className="profile-avatar"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = DEFAULT_AVATAR_URL;
              }}
            />
            <h3>{customer.displayName || customer.username || "N/A"}</h3>
            {customer.username &&
              customer.username !== (customer.displayName || "N/A") && (
                <p className="profile-subtext username-text">
                  @{customer.username}
                </p>
              )}
            <p className="profile-subtext">
              <FaEnvelope /> {maskEmail(customer.email)}
            </p>
            <p className="profile-subtext">
              <FaPhone /> {maskPhone(customer.phone)}
            </p>
            <p className="profile-subtext">
              <FaBoxOpen /> {orders.length} Total Order(s)
            </p>
          </div>

          <div className="contact-info-card">
            <h4>
              <FaHome /> Saved Addresses ({addresses.length})
            </h4>
            {addresses && addresses.length > 0 ? (
              addresses.map((address, index) => (
                <div key={address._id || index} className="address-item">
                  <h5>
                    {address.label || `Address ${index + 1}`}
                    {address.isDefault && (
                      <span className="default-address-tag"> (Default)</span>
                    )}
                  </h5>
                  <p>
                    <strong>To:</strong>{" "}
                    {address.contactName || customer.displayName || "N/A"}
                  </p>
                  <p>
                    <strong>Phone:</strong>{" "}
                    {maskPhone(
                      address.contactNumber || customer.phone || "N/A"
                    )}
                  </p>
                  <p>
                    {address.houseNumber ? `${address.houseNumber}, ` : ""}
                    {address.floorNumber ? `${address.floorNumber}, ` : ""}
                    {address.streetNumber ? `${address.streetNumber}, ` : ""}
                    {address.addressLine || ""}
                  </p>
                  <p>
                    {address.city || "N/A"}, {address.state || "N/A"} -{" "}
                    {address.postalCode || "N/A"}
                  </p>
                  {address.country && <p>{address.country}</p>}
                  {/* Landmark is part of addressLine as per Address.js model comment, so separate display removed */}
                </div>
              ))
            ) : (
              <p>No saved addresses found for this customer.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetailsPage;
