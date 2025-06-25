// --- START OF FILE client/src/Pages/Admin/Orders/RefundedOrdersPage.jsx ---
import React, { useState, useEffect, useCallback } from "react";
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
} from "react-icons/fa";

// --- Helper Functions ---
const formatCurrency = (amount) => {
  /* ... same as above ... */
  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount)) return "N/A";
  return `₹${numericAmount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};
const formatDate = (dateString) => {
  /* ... same as above ... */
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
const formatTimeSlot = (timeSlot) => {
  /* ... same as above ... */
  return timeSlot || "N/A";
};
// --- End Helper Functions ---

const RefundedOrdersPage = () => {
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
  });
  const [paginationInfo, setPaginationInfo] = useState({
    pages: 1,
    totalCount: 0,
  });
  const navigate = useNavigate();

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    setOrders([]);
    try {
      const data = await orderService.getOrdersByStatus("Refunded", filters); // Status updated (or "Refunded" depending on your system)
      setOrders(Array.isArray(data.orders) ? data.orders : []);
      setPaginationInfo({
        pages: data.pages || 1,
        totalCount: data.totalCount || 0,
      });
    } catch (err) {
      setError(
        err.message ||
          err.response?.data?.message ||
          "Failed to fetch refunded orders."
      );
      setOrders([]);
      setPaginationInfo({ page: 1, pages: 1, totalCount: 0 });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleFilterChange = (e) =>
    setFilters((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
      page: 1,
    }));
  const handleSearchChange = (e) =>
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  const handleApplyFilters = () => setFilters((prev) => ({ ...prev, page: 1 }));
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
    if (newPage >= 1 && newPage <= paginationInfo.pages)
      setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      const exportFilters = { ...filters, export: true, limit: 0, page: 1 };
      const data = await orderService.getOrdersByStatus(
        "Refunded",
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
        "Delivery Date",
        "Time Slot",
        "Customer",
        "Branch",
        "Total Amount",
        "Order Status",
        "Order Type",
        "Created At",
      ];
      const csvRows = data.orders.map((order, index) =>
        [
          index + 1,
          `"${order._id}"`,
          formatDate(order.deliveryPreference?.date),
          formatTimeSlot(order.deliveryPreference?.timeSlot),
          order.user
            ? order.user.displayName || order.user.name || "N/A"
            : "Guest Customer",
          order.branch?.name || "N/A",
          parseFloat(order.totalPrice || 0).toFixed(2),
          order.orderStatus || "Unknown",
          order.deliveryOption === "homeDelivery"
            ? "Delivery"
            : order.deliveryOption === "selfPickup"
            ? "Self Pickup"
            : "N/A",
          order.createdAt ? new Date(order.createdAt).toLocaleString() : "N/A",
        ]
          .map((field) => {
            const stringField = String(field);
            return stringField.includes(",") ||
              stringField.includes('"') ||
              stringField.includes("\n")
              ? `"${stringField.replace(/"/g, '""')}"`
              : stringField;
          })
          .join(",")
      );
      const csvContent = [headers.join(","), ...csvRows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `refunded_orders_export_${new Date().toISOString().slice(0, 10)}.csv`
      );
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
      alert(
        `Export Failed: ${
          err.response?.data?.message || err.message || "Failed to export."
        }`
      );
    } finally {
      setExporting(false);
    }
  };

  if (loading && !exporting)
    return (
      <div className="order-list-page-container loading">
        <FaSpinner className="spinner-icon spin" /> Loading refunded orders...
      </div>
    );
  if (error && !exporting)
    return (
      <div className="order-list-page-container error-message">{error}</div>
    );

  return (
    <div className="order-list-page-container">
      <div className="page-header">
        <h2>
          Refunded Orders
          <span className="order-count">{paginationInfo.totalCount}</span>
        </h2>
      </div>
      <div className="filter-section-card">
        <div className="filter-card-header">Select Date Range</div>
        <div className="filters-row">
          <div className="filter-group">
            <select
              name="branch"
              value={filters.branch || ""}
              onChange={handleFilterChange}
              disabled
            >
              <option value="">All Branch</option>
            </select>
          </div>
          <div className="filter-group">
            <input
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
            />
            <FaCalendarAlt className="input-icon" />
          </div>
          <div className="filter-group">
            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
            />
            <FaCalendarAlt className="input-icon" />
          </div>
          <button
            className="btn btn-primary"
            onClick={handleApplyFilters}
            disabled={loading || exporting}
          >
            {loading ? (
              <FaSpinner className="spinner-icon spin" />
            ) : (
              "Show Data"
            )}
          </button>
        </div>
      </div>
      <div className="search-actions-card">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleApplyFilters();
          }}
          className="search-form"
        >
          <div className="search-input-group">
            <input
              type="text"
              placeholder="Ex: Search by ID or customer name"
              name="search"
              value={filters.search}
              onChange={handleSearchChange}
              disabled={loading || exporting}
            />
            <button
              type="submit"
              className="btn btn-search"
              disabled={loading || exporting}
            >
              <FaSearch />
            </button>
          </div>
        </form>
        <button
          className="btn btn-secondary"
          onClick={handleClearFilters}
          disabled={loading || exporting}
        >
          Clear
        </button>
        <div className="export-button-container">
          <button
            className="btn btn-export"
            onClick={handleExport}
            disabled={loading || exporting || orders.length === 0}
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
          className="message-feedback-container error"
          style={{ marginTop: "10px" }}
        >
          {error}
        </div>
      )}
      <div className="orders-table-wrapper">
        <table className="orders-table">
          <thead>
            <tr>
              <th>SL</th>
              <th>Order ID</th>
              <th>Delivery Date</th>
              <th>Time Slot</th>
              <th>Customer</th>
              <th>Branch</th>
              <th>Total Amount</th>
              <th>Order Status</th>
              <th>Order Type</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && !loading ? (
              <tr>
                <td colSpan={10} className="no-orders">
                  No refunded orders found.
                </td>
              </tr>
            ) : (
              orders.map((order, index) => (
                <tr key={order._id || index}>
                  <td>{(filters.page - 1) * filters.limit + index + 1}</td>
                  <td>
                    {order._id
                      ? order._id.substring(0, 8).toUpperCase()
                      : "N/A"}
                    {order._id && order._id.length > 8 ? "..." : ""}
                  </td>
                  <td>{formatDate(order.deliveryPreference?.date)}</td>
                  <td>{formatTimeSlot(order.deliveryPreference?.timeSlot)}</td>
                  <td>
                    {order.user
                      ? order.user.displayName || order.user.name || "N/A"
                      : "Guest Customer"}
                  </td>
                  <td>{order.branch?.name || "N/A"}</td>
                  <td>{formatCurrency(order.totalPrice)}</td>
                  <td>
                    <span
                      className={`status-badge status-${
                        order.orderStatus?.toLowerCase().replace(/\s+/g, "-") ||
                        "unknown"
                      }`}
                    >
                      {order.orderStatus || "Unknown"}
                    </span>
                  </td>
                  <td>
                    {order.deliveryOption === "homeDelivery"
                      ? "Delivery"
                      : order.deliveryOption === "selfPickup"
                      ? "Self Pickup"
                      : "N/A"}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        onClick={() => handleViewDetails(order._id)}
                        className="action-btn view-btn"
                        title="View Details"
                        disabled={!order._id || loading || exporting}
                      >
                        <FaEye />
                      </button>
                      <button
                        onClick={() => handlePrintInvoice(order._id)}
                        className="action-btn print-btn"
                        title="Print Invoice"
                        disabled={!order._id || loading || exporting}
                      >
                        <FaPrint />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {paginationInfo.pages > 1 && (
        <div className="pagination-controls">
          <button
            onClick={() => handlePageChange(filters.page - 1)}
            disabled={filters.page <= 1 || loading || exporting}
          >
            Previous
          </button>
          <span>
            {" "}
            Page {filters.page} of {paginationInfo.pages}{" "}
          </span>
          <button
            onClick={() => handlePageChange(filters.page + 1)}
            disabled={
              filters.page >= paginationInfo.pages || loading || exporting
            }
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
export default RefundedOrdersPage;
// --- END OF FILE client/src/Pages/Admin/Orders/RefundedOrdersPage.jsx ---
