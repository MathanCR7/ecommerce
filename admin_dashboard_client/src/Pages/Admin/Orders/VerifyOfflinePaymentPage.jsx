// --- START OF FILE client/src/Pages/Admin/Orders/VerifyOfflinePaymentPage.jsx ---
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import orderService from "../../../Services/orderService";
import "./OrderStatusListPage.css";
import {
  FaEye,
  FaPrint,
  FaSearch,
  FaFileExport,
  FaSpinner,
  FaCalendarAlt,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";

// --- Common Helper Functions ---
const formatCurrency = (amount) => {
  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount)) return "N/A";
  return `₹${numericAmount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};
const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid Date";
    const options = { year: "numeric", month: "short", day: "numeric" };
    return date.toLocaleDateString("en-GB", options);
  } catch (e) {
    return String(dateString);
  }
};
// formatTimeSlot is not used in this specific table's default columns but kept for consistency if needed
// const formatTimeSlot = (timeSlot) => timeSlot || "N/A";
const getCustomerNameDisplay = (order) =>
  order.user
    ? order.user.displayName || order.user.name || "N/A"
    : "Guest Customer";
// getOrderTypeDisplay is not used in this specific table's default columns but kept for consistency if needed
// const getOrderTypeDisplay = (deliveryOption) => { if (deliveryOption === "homeDelivery") return "Delivery"; if (deliveryOption === "selfPickup") return "Self Pickup"; return "N/A"; };
// --- End Common Helper Functions ---

const VerifyOfflinePaymentPage = () => {
  const [fetchedOrders, setFetchedOrders] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    search: "",
    startDate: "",
    endDate: "",
  }); // Removed branch
  const [paginationInfo, setPaginationInfo] = useState({
    pages: 1,
    totalCount: 0,
  });
  const navigate = useNavigate();
  const searchTimeoutRef = useRef(null);

  const applyClientSideFilter = useCallback((ordersToFilter, searchTerm) => {
    if (!searchTerm) return ordersToFilter;
    const lowerSearchTerm = searchTerm.toLowerCase();
    return ordersToFilter.filter(
      (order) =>
        (order._id && order._id.toLowerCase().includes(lowerSearchTerm)) ||
        getCustomerNameDisplay(order).toLowerCase().includes(lowerSearchTerm)
    );
  }, []);
  const performFiltering = useCallback(
    (ordersToFilter, searchTerm) => {
      const clientFilteredOrders = applyClientSideFilter(
        ordersToFilter,
        searchTerm
      );
      setOrders(clientFilteredOrders);
    },
    [applyClientSideFilter]
  );

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    setOrders([]);
    setFetchedOrders([]);
    try {
      const backendFilters = {
        startDate: filters.startDate,
        endDate: filters.endDate,
        page: filters.page,
        limit: filters.limit,
      };
      const data = await orderService.getOrdersByStatus(
        "OfflinePaymentPendingVerification",
        backendFilters
      ); // Specific query
      const receivedOrders = Array.isArray(data.orders) ? data.orders : [];
      setFetchedOrders(receivedOrders);
      setPaginationInfo({
        pages: data.pages || 1,
        totalCount: data.totalCount || 0,
      });
      performFiltering(receivedOrders, filters.search);
    } catch (err) {
      setError(
        err.message ||
          err.response?.data?.message ||
          "Failed to fetch orders for offline payment verification."
      );
      setOrders([]);
      setFetchedOrders([]);
      setPaginationInfo({ page: 1, pages: 1, totalCount: 0 });
    } finally {
      setLoading(false);
    }
  }, [
    filters.startDate,
    filters.endDate,
    filters.page,
    filters.limit,
    performFiltering,
  ]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (filters.search) {
      searchTimeoutRef.current = setTimeout(
        () => performFiltering(fetchedOrders, filters.search),
        2500
      );
    } else {
      performFiltering(fetchedOrders, "");
    }
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [filters.search, fetchedOrders, performFiltering]);

  const handleDateFilterChange = (e) =>
    setFilters((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
      page: 1,
    }));
  const handleSearchInputChange = (e) =>
    setFilters((prev) => ({ ...prev, search: e.target.value }));
  const handleApplyDateFilters = () =>
    setFilters((prev) => ({ ...prev, page: 1 }));
  const handleClearFilters = () =>
    setFilters((prev) => ({
      page: 1,
      limit: prev.limit,
      search: "",
      startDate: "",
      endDate: "",
    }));
  const handleViewDetails = (orderId) => navigate(`/admin/orders/${orderId}`);
  const handlePrintInvoice = (orderId) =>
    alert(`Print invoice for Order ID: ${orderId}`);
  const handlePageChange = (newPage) => {
    if (!loading && newPage >= 1 && newPage <= paginationInfo.pages)
      setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const handleApprovePayment = async (orderId) => {
    if (
      !window.confirm(
        `Are you sure you want to approve payment for order ${orderId}?`
      )
    )
      return;
    // Example: await orderService.updatePaymentVerification(orderId, "approved");
    // For demo, we'll just update the local state and show an alert.
    // In a real app, this would involve an API call.
    try {
      // This is a placeholder. You'd call your service here.
      // e.g., await orderService.approveOfflinePayment(orderId);
      alert(`Payment approved for order ${orderId}. (This is a mock action)`);
      // Optimistically update UI or refetch
      // For simplicity, refetching the list:
      fetchOrders();
    } catch (apiError) {
      alert(
        `Failed to approve payment: ${apiError.message || "Unknown error"}`
      );
    }
  };
  const handleRejectPayment = async (orderId) => {
    if (
      !window.confirm(
        `Are you sure you want to reject payment for order ${orderId}?`
      )
    )
      return;
    // Example: await orderService.updatePaymentVerification(orderId, "rejected");
    try {
      // Placeholder for API call
      // e.g., await orderService.rejectOfflinePayment(orderId);
      alert(`Payment rejected for order ${orderId}. (This is a mock action)`);
      fetchOrders();
    } catch (apiError) {
      alert(`Failed to reject payment: ${apiError.message || "Unknown error"}`);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      const exportFilters = { ...filters, export: true, limit: 0, page: 1 };
      const data = await orderService.getOrdersByStatus(
        "OfflinePaymentPendingVerification",
        exportFilters
      );
      if (!Array.isArray(data.orders) || data.orders.length === 0) {
        alert("No data for export.");
        setExporting(false);
        return;
      }
      const headers = [
        "SL",
        "Order ID",
        "Order Date",
        "Customer",
        "Total Amount",
        "Payment Method",
        "Payment Status",
        "Verification Status",
      ];
      const csvRows = data.orders.map((order, index) =>
        [
          index + 1,
          `"${order._id}"`,
          formatDate(order.createdAt),
          getCustomerNameDisplay(order),
          parseFloat(order.totalPrice || 0).toFixed(2),
          order.paymentMethod || "N/A",
          order.isPaid ? "Paid" : "Unpaid",
          order.paymentVerificationStatus || "Pending",
        ]
          .map((field) => {
            const s = String(field);
            return s.includes(",") || s.includes('"') || s.includes("\n")
              ? `"${s.replace(/"/g, '""')}"`
              : s;
          })
          .join(",")
      );
      const csvContent = [headers.join(","), ...csvRows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      const filename = `offline_payment_verification_export_${
        filters.startDate || "all"
      }_${filters.endDate || "all"}${
        filters.search ? `_${filters.search.replace(/\W+/g, "_")}` : ""
      }_${new Date().toISOString().slice(0, 10)}.csv`;
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        `Export Error: ${
          err.response?.data?.message || err.message || "Failed to export."
        }`
      );
      alert(`Export Failed.`);
    } finally {
      setExporting(false);
    }
  };

  const isAnyLoading = loading || exporting;
  const showMainSpinner = loading && !exporting;
  let content;
  if (showMainSpinner && fetchedOrders.length === 0 && !error)
    content = (
      <div className="order-list-page-container loading">
        <FaSpinner className="spinner-icon spin" /> Loading orders for offline
        payment verification...
      </div>
    );
  else if (error && !showMainSpinner)
    content = (
      <div className="order-list-page-container error-message">{error}</div>
    );
  else if (fetchedOrders.length === 0 && !showMainSpinner && !error)
    content = (
      <div
        className="orders-table-wrapper"
        style={{ marginTop: "20px", padding: "20px", textAlign: "center" }}
      >
        No orders awaiting offline payment verification.
      </div>
    );
  else if (fetchedOrders.length > 0 && orders.length === 0 && filters.search)
    content = (
      <div
        className="orders-table-wrapper"
        style={{ marginTop: "20px", padding: "20px", textAlign: "center" }}
      >
        No orders found matching "{filters.search}" on this page.
      </div>
    );
  else
    content = (
      <>
        <div className="orders-table-wrapper">
          <table className="orders-table">
            <thead>
              <tr>
                <th>SL</th>
                <th>Order ID</th>
                <th>Order Date</th>
                <th>Customer</th>
                <th>Total Amount</th>
                <th>Payment Method</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order._id}>
                  <td>
                    {(filters.page - 1) * filters.limit +
                      fetchedOrders.findIndex((fo) => fo._id === order._id) +
                      1}
                  </td>
                  <td>
                    {order._id
                      ? order._id.substring(0, 8).toUpperCase()
                      : "N/A"}
                    {order._id && order._id.length > 8 ? "..." : ""}
                  </td>
                  <td>{formatDate(order.createdAt)}</td>
                  <td>{getCustomerNameDisplay(order)}</td>
                  <td>{formatCurrency(order.totalPrice)}</td>
                  <td>{order.paymentMethod || "N/A"}</td>
                  <td>
                    <span
                      className={`status-badge status-${
                        order.isPaid
                          ? "paid"
                          : order.paymentVerificationStatus
                              ?.toLowerCase()
                              .replace(/\s+/g, "-") ||
                            "offline-payment-pending-verification"
                      }`}
                    >
                      {order.isPaid
                        ? "Paid"
                        : order.paymentVerificationStatus ||
                          "Pending Verification"}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        onClick={() => handleViewDetails(order._id)}
                        className="action-btn view-btn"
                        title="View Details"
                        disabled={!order._id || isAnyLoading}
                      >
                        <FaEye />
                      </button>
                      {!order.isPaid && (
                        <>
                          <button
                            onClick={() => handleApprovePayment(order._id)}
                            className="action-btn"
                            title="Approve Payment"
                            style={{ color: "green" }}
                            disabled={isAnyLoading}
                          >
                            <FaCheckCircle />
                          </button>
                          <button
                            onClick={() => handleRejectPayment(order._id)}
                            className="action-btn"
                            title="Reject Payment"
                            style={{ color: "red" }}
                            disabled={isAnyLoading}
                          >
                            <FaTimesCircle />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handlePrintInvoice(order._id)}
                        className="action-btn print-btn"
                        title="Print Invoice"
                        disabled={!order._id || isAnyLoading}
                      >
                        <FaPrint />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!exporting && paginationInfo.pages > 1 && (
          <div className="pagination-controls">
            <button
              onClick={() => handlePageChange(filters.page - 1)}
              disabled={filters.page <= 1 || loading}
            >
              Previous
            </button>
            <span>
              {" "}
              Page {filters.page} of {paginationInfo.pages}{" "}
            </span>
            <button
              onClick={() => handlePageChange(filters.page + 1)}
              disabled={filters.page >= paginationInfo.pages || loading}
            >
              Next
            </button>
          </div>
        )}
      </>
    );

  return (
    <div className="order-list-page-container">
      <div className="page-header">
        <h2>
          Verify Offline Payments
          <span className="order-count">{paginationInfo.totalCount}</span>
        </h2>
      </div>
      <div className="filter-section-card">
        <div className="filter-card-header">Select Date Range</div>
        <div className="filters-row">
          <div className="filter-group">
            <input
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleDateFilterChange}
              disabled={isAnyLoading}
            />
            <FaCalendarAlt className="input-icon" />
          </div>
          <div className="filter-group">
            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleDateFilterChange}
              disabled={isAnyLoading}
            />
            <FaCalendarAlt className="input-icon" />
          </div>
          <button
            className="btn btn-primary"
            onClick={handleApplyDateFilters}
            disabled={isAnyLoading}
          >
            {showMainSpinner && fetchedOrders.length === 0 ? (
              <FaSpinner className="spinner-icon spin" />
            ) : (
              "Show Data"
            )}
          </button>
        </div>
      </div>
      <div className="search-actions-card">
        <div
          className="search-input-group"
          style={{ flexGrow: 1, maxWidth: "450px" }}
        >
          <input
            type="text"
            placeholder="Ex: Search by ID or customer name"
            name="search"
            value={filters.search}
            onChange={handleSearchInputChange}
            disabled={isAnyLoading}
            style={{
              borderRadius: "var(--radius-small)",
              borderRight: "1px solid var(--border-color)",
            }}
          />
        </div>
        <button
          className="btn btn-secondary"
          onClick={handleClearFilters}
          disabled={isAnyLoading}
        >
          Clear
        </button>
        <div className="export-button-container">
          <button
            className="btn btn-export"
            onClick={handleExport}
            disabled={isAnyLoading || paginationInfo.totalCount === 0}
          >
            {exporting ? (
              <FaSpinner className="spinner-icon spin" />
            ) : (
              <FaFileExport />
            )}{" "}
            Export <span className="dropdown-arrow">▼</span>
          </button>
        </div>
      </div>
      {error && exporting && (
        <div
          className="order-list-page-container error-message"
          style={{ marginTop: "10px", padding: "10px" }}
        >
          {error}
        </div>
      )}
      {content}
    </div>
  );
};
export default VerifyOfflinePaymentPage;
// --- END OF FILE client/src/Pages/Admin/Orders/VerifyOfflinePaymentPage.jsx ---
