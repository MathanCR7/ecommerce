// --- START OF FILE client/src/Pages/Admin/Orders/CanceledOrdersPage.jsx ---
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
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
  FaBoxOpen,
  FaCheckCircle,
  FaTruckLoading,
  FaShippingFast,
  FaBox,
  FaBan,
  FaUndo,
  FaTimesCircle,
  FaUsers,
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
    const options = { year: "numeric", month: "long", day: "numeric" };
    return date.toLocaleDateString("en-US", options);
  } catch (e) {
    return String(dateString);
  }
};
const formatOrderId = (orderId) => {
  if (!orderId) return "N/A";
  const idString = String(orderId);
  const displayLength = 8;
  if (idString.length <= displayLength) {
    return idString.toUpperCase();
  }
  const displayPart = idString.slice(-displayLength).toUpperCase();
  return `${displayPart}...`;
};
const getCustomerNameDisplay = (order) =>
  order.user
    ? order.user.displayName || order.user.name || "N/A"
    : "Guest Customer";
const getOrderTypeDisplay = (deliveryOption) => {
  if (deliveryOption === "homeDelivery") return "Delivery";
  if (deliveryOption === "selfPickup") return "Self Pickup";
  return "Unknown";
};
const getDeliveryDateColumnDisplay = (order) => {
  if (order.deliveryPreference) {
    if (order.deliveryPreference.type === "quick") {
      return "Quick Delivery";
    } else if (order.deliveryPreference.date) {
      return formatDate(order.deliveryPreference.date);
    }
  }
  return "N/A";
};
const formatTimeSlot = (timeSlot) => timeSlot || "N/A";
// --- End Common Helper Functions ---

const CanceledOrdersPage = () => {
  const navigate = useNavigate();
  const [fetchedOrders, setFetchedOrders] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    search: "",
    startDate: "",
    endDate: "",
    page: 1,
    limit: 10,
  });
  const [paginationInfo, setPaginationInfo] = useState({
    pages: 1,
    totalCount: 0,
  });
  const searchTimeoutRef = useRef(null);

  // --- Status Management (Copied & Adapted from AllOrdersPage.jsx) ---
  const statusSummaryCardData = useMemo(
    () => [
      {
        id: "pending",
        label: "Pending",
        icon: <FaBoxOpen />,
        iconClass: "status-icon-pending",
        navigateTo: "/admin/orders/pending",
      },
      {
        id: "confirmed",
        label: "Confirmed",
        icon: <FaCheckCircle />,
        iconClass: "status-icon-confirmed",
        navigateTo: "/admin/orders/confirmed",
      },
      {
        id: "processing",
        label: "Processing",
        icon: <FaTruckLoading />,
        iconClass: "status-icon-processing",
        navigateTo: "/admin/orders/confirmed",
      },
      {
        id: "out for delivery",
        label: "Out For Delivery",
        icon: <FaShippingFast />,
        iconClass: "status-icon-out-for-delivery",
        navigateTo: "/admin/orders/out-for-delivery",
      },
      {
        id: "delivered",
        label: "Delivered",
        icon: <FaBox />,
        iconClass: "status-icon-delivered",
        navigateTo: "/admin/orders/delivered",
      },
      {
        id: "cancelled",
        label: "Canceled",
        icon: <FaBan />,
        iconClass: "status-icon-cancelled",
        navigateTo: "/admin/orders/canceled",
      },
      {
        id: "refunded",
        label: "Refunded",
        icon: <FaUndo />,
        iconClass: "status-icon-refunded",
        navigateTo: "/admin/orders/refunded",
      },
      {
        id: "failed to deliver",
        label: "Failed To Deliver",
        icon: <FaTimesCircle />,
        iconClass: "status-icon-failed-to-deliver",
        navigateTo: "/admin/orders/failed",
      },
    ],
    []
  );

  const expectedStatusKeys = useMemo(
    () => statusSummaryCardData.map((card) => card.id),
    [statusSummaryCardData]
  );

  const [statusCounts, setStatusCounts] = useState(() => {
    const initialCounts = {};
    expectedStatusKeys.forEach((key) => {
      initialCounts[key] = 0;
    });
    return initialCounts;
  });

  const calculateStatusCounts = useCallback((ordersToCalculate, statusKeys) => {
    const counts = {};
    statusKeys.forEach((key) => (counts[key] = 0));
    if (!Array.isArray(ordersToCalculate)) return counts;
    ordersToCalculate.forEach((order) => {
      const status =
        typeof order.orderStatus === "string"
          ? order.orderStatus.toLowerCase()
          : null;
      if (status && counts.hasOwnProperty(status)) counts[status]++;
    });
    return counts;
  }, []);

  const orderStatusDisplayMap = useMemo(() => {
    const map = {};
    statusSummaryCardData.forEach((card) => (map[card.id] = card.label));
    map["refunded"] = "Refunded";
    map["pending payment"] = "Pending Payment";
    map["offlinepaymentpendingverification"] =
      "Offline Payment Pending Verification";
    return map;
  }, [statusSummaryCardData]);

  const statusBadgeMap = useMemo(() => {
    const map = {};
    statusSummaryCardData.forEach((card) => (map[card.id] = card.id));
    map["refunded"] = "refunded";
    map["offlinepaymentpendingverification"] = "pending";
    map["canceled"] = "cancelled"; // Ensure 'canceled' (single l) also maps to 'cancelled' class
    map["failed"] = "failed-to-deliver"; // Map 'failed' from backend to 'failed-to-deliver' class
    return map;
  }, [statusSummaryCardData]);

  const getOrderStatusDisplay = useCallback(
    (status) => {
      const lowerStatus =
        typeof status === "string" ? status.toLowerCase() : null;
      if (!lowerStatus) return "Unknown";
      if (lowerStatus === "canceled")
        return orderStatusDisplayMap["cancelled"] || "Canceled";
      if (lowerStatus === "failed")
        return (
          orderStatusDisplayMap["failed to deliver"] || "Failed To Deliver"
        );
      return orderStatusDisplayMap[lowerStatus] || status;
    },
    [orderStatusDisplayMap]
  );

  const getOrderStatusBadgeClass = useCallback(
    (status) => {
      const lowerStatus =
        typeof status === "string" ? status.toLowerCase() : null;
      if (!lowerStatus) return "unknown";
      if (lowerStatus === "canceled")
        return statusBadgeMap["cancelled"] || "unknown";
      if (lowerStatus === "failed")
        return statusBadgeMap["failed to deliver"] || "unknown";
      return statusBadgeMap[lowerStatus] || "unknown";
    },
    [statusBadgeMap]
  );

  // --- Client-Side Filtering Logic ---
  const applyClientSideFilter = useCallback((ordersToFilter, searchTerm) => {
    if (!searchTerm) return ordersToFilter;
    const lowerSearchTerm = searchTerm.toLowerCase();
    return ordersToFilter.filter(
      (order) =>
        String(order._id).toLowerCase().includes(lowerSearchTerm) ||
        formatOrderId(order._id).toLowerCase().includes(lowerSearchTerm) ||
        getCustomerNameDisplay(order).toLowerCase().includes(lowerSearchTerm) ||
        order.user?.email?.toLowerCase().includes(lowerSearchTerm) ||
        order.user?.phone?.toLowerCase().includes(lowerSearchTerm) ||
        order.shippingAddress?.city?.toLowerCase().includes(lowerSearchTerm) ||
        order.deliveryPreference?.timeSlot
          ?.toLowerCase()
          .includes(lowerSearchTerm)
    );
  }, []);

  const performFiltering = useCallback(
    (ordersToFilter, searchTerm) => {
      const clientFilteredOrders = applyClientSideFilter(
        ordersToFilter,
        searchTerm
      );
      setOrders(clientFilteredOrders);
      const calculatedCounts = calculateStatusCounts(
        fetchedOrders,
        expectedStatusKeys
      ); // Count based on all fetched orders for the current page
      setStatusCounts(calculatedCounts);
    },
    [
      applyClientSideFilter,
      calculateStatusCounts,
      expectedStatusKeys,
      fetchedOrders,
    ] // Added fetchedOrders dependency
  );

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    setOrders([]);
    setFetchedOrders([]);
    setStatusCounts(
      expectedStatusKeys.reduce((acc, key) => {
        acc[key] = 0;
        return acc;
      }, {})
    );

    try {
      const backendFilters = {
        startDate: filters.startDate,
        endDate: filters.endDate,
        page: filters.page,
        limit: filters.limit,
      };
      const data = await orderService.getOrdersByStatus(
        "Cancelled",
        backendFilters
      );
      const receivedOrders = Array.isArray(data.orders) ? data.orders : [];
      setFetchedOrders(receivedOrders);
      setPaginationInfo({
        pages: data.pages || 1,
        totalCount: data.totalCount || 0,
      });
      performFiltering(receivedOrders, filters.search); // This will also update statusCounts
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to fetch cancelled orders."
      );
      setOrders([]);
      setFetchedOrders([]);
      setPaginationInfo({ pages: 1, totalCount: 0 });
      setStatusCounts(
        expectedStatusKeys.reduce((acc, key) => {
          acc[key] = 0;
          return acc;
        }, {})
      );
    } finally {
      setLoading(false);
    }
  }, [
    filters.startDate,
    filters.endDate,
    filters.page,
    filters.limit,
    performFiltering,
    filters.search,
    expectedStatusKeys,
  ]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (loading) return; // Don't filter if main data is loading

    if (filters.search) {
      searchTimeoutRef.current = setTimeout(() => {
        performFiltering(fetchedOrders, filters.search);
      }, 500);
    } else {
      performFiltering(fetchedOrders, "");
    }
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [filters.search, fetchedOrders, performFiltering, loading]);

  const handleFilterChange = (e) =>
    setFilters((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
      page:
        e.target.name === "startDate" || e.target.name === "endDate"
          ? 1
          : prev.page,
    }));

  const handleSearchInputChange = (e) =>
    setFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }));

  const handleApplyDateFilters = () => {
    if (filters.page !== 1) {
      setFilters((prev) => ({ ...prev, page: 1 }));
    } else {
      fetchOrders();
    }
  };

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
    if (
      !loading &&
      newPage >= 1 &&
      newPage <= paginationInfo.pages &&
      newPage !== filters.page
    )
      setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const handleStatusCardClick = (path) => {
    if (path) navigate(path);
  };

  const handleStatusCardKeyDown = (event, path) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleStatusCardClick(path);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      const exportFilters = {
        search: filters.search,
        startDate: filters.startDate,
        endDate: filters.endDate,
        export: true,
      };
      const data = await orderService.getOrdersByStatus(
        "Cancelled",
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
        "Total Amount",
        "Order Status",
        "Order Type",
        "Created At",
      ];
      const csvRows = data.orders.map((order, index) =>
        [
          index + 1,
          `"${order._id}"`, // Full ID for export
          getDeliveryDateColumnDisplay(order),
          formatTimeSlot(order.deliveryPreference?.timeSlot),
          getCustomerNameDisplay(order),
          parseFloat(order.totalPrice || 0).toFixed(2),
          getOrderStatusDisplay(order.orderStatus),
          getOrderTypeDisplay(order.deliveryOption),
          order.createdAt ? new Date(order.createdAt).toLocaleString() : "N/A",
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
      const filename = `cancelled_orders_export_${filters.startDate || "all"}_${
        filters.endDate || "all"
      }${
        filters.search
          ? `_${filters.search.replace(/\W+/g, "_").substring(0, 20)}`
          : ""
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
      <div className="message-feedback-container loading">
        <FaSpinner className="spinner-icon spin" /> Loading cancelled orders...
      </div>
    );
  else if (error && !exporting)
    // Show general error only if not an export error (export error shown separately)
    content = (
      <div className="message-feedback-container error">Error: {error}</div>
    );
  else if (!loading && fetchedOrders.length === 0 && !error)
    content = (
      <div className="message-feedback-container">
        No cancelled orders found for the selected date filters.
      </div>
    );
  else if (
    !loading &&
    fetchedOrders.length > 0 &&
    orders.length === 0 &&
    filters.search
  )
    content = (
      <div className="message-feedback-container">
        No orders found matching "{filters.search}" with the current date
        filters.
      </div>
    );
  else
    content = (
      <>
        <div className="orders-table-view-container custom-scrollbar">
          <table className="orders-table">
            <thead>
              <tr>
                <th>SL</th>
                <th>Order ID</th>
                <th>Delivery Date</th>
                <th>Time Slot</th>
                <th>Customer</th>
                <th>Total Amount</th>
                <th>Order Status</th>
                <th>Order Type</th>
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
                  <td
                    className="order-id-cell"
                    onClick={() => handleViewDetails(order._id)}
                    title={`View details for ${formatOrderId(order._id)}`}
                  >
                    {formatOrderId(order._id)}
                  </td>
                  <td>{getDeliveryDateColumnDisplay(order)}</td>
                  <td>{formatTimeSlot(order.deliveryPreference?.timeSlot)}</td>
                  <td>{getCustomerNameDisplay(order)}</td>
                  <td className="total-amount-cell">
                    <div>{formatCurrency(order.totalPrice)}</div>
                    {order.isPaid !== undefined ? (
                      order.isPaid === true ? (
                        <span className="payment-status-indicator paid">
                          Paid
                        </span>
                      ) : (
                        <span className="payment-status-indicator unpaid">
                          Unpaid
                        </span>
                      )
                    ) : (
                      <span className="payment-status-indicator unknown">
                        N/A
                      </span>
                    )}
                  </td>
                  <td>
                    <span
                      className={`status-badge status-${getOrderStatusBadgeClass(
                        order.orderStatus
                      )}`}
                    >
                      {getOrderStatusDisplay(order.orderStatus)}
                    </span>
                  </td>
                  <td>{getOrderTypeDisplay(order.deliveryOption)}</td>
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
          <div className="orders-pagination-controls">
            <button
              onClick={() => handlePageChange(filters.page - 1)}
              disabled={filters.page <= 1 || loading}
              aria-label="Previous Page"
            >
              Previous
            </button>
            {Array.from({ length: paginationInfo.pages }, (_, i) => i + 1).map(
              (pageNumber) => (
                <button
                  key={pageNumber}
                  onClick={() => handlePageChange(pageNumber)}
                  className={filters.page === pageNumber ? "active" : ""}
                  disabled={loading}
                  aria-label={`Page ${pageNumber}`}
                >
                  {pageNumber}
                </button>
              )
            )}
            <button
              onClick={() => handlePageChange(filters.page + 1)}
              disabled={filters.page >= paginationInfo.pages || loading}
              aria-label="Next Page"
            >
              Next
            </button>
          </div>
        )}
      </>
    );

  return (
    <div className="order-list-page-container">
      {" "}
      {/* Changed from all-orders-page-container */}
      <div className="orders-page-header">
        <h2>
          Cancelled Orders
          <span className="orders-count-badge">
            <FaUsers /> {paginationInfo.totalCount}
          </span>
        </h2>
      </div>
      <div className="orders-filter-bar-card">
        <div className="filter-bar-header">Select Date Range</div>
        <div className="filter-control-group">
          <label htmlFor="startDate">Start Date:</label>
          <div className="date-input-container">
            <input
              type="date"
              id="startDate"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
              disabled={isAnyLoading}
            />
            <FaCalendarAlt className="input-icon" />
          </div>
        </div>
        <div className="filter-control-group">
          <label htmlFor="endDate">End Date:</label>
          <div className="date-input-container">
            <input
              type="date"
              id="endDate"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
              disabled={isAnyLoading}
            />
            <FaCalendarAlt className="input-icon" />
          </div>
        </div>
        <div className="filter-action-buttons">
          <button
            className="btn btn-secondary btn-clear-filters"
            onClick={handleClearFilters}
            disabled={isAnyLoading}
          >
            Clear
          </button>
          <button
            className="btn btn-primary btn-show-data"
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
      <div className="status-summary-container">
        {statusSummaryCardData.map((status) => (
          <div
            key={status.id}
            className="status-card"
            onClick={() => handleStatusCardClick(status.navigateTo)}
            onKeyDown={(e) => handleStatusCardKeyDown(e, status.navigateTo)}
            role="button"
            tabIndex={0}
            aria-label={`View ${status.label} orders`}
          >
            <span className={`status-card-icon ${status.iconClass}`}>
              {status.icon}
            </span>
            <div className="status-card-info">
              <strong>
                {statusCounts[status.id] !== undefined
                  ? statusCounts[status.id]
                  : 0}
              </strong>
              <p>{status.label}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="search-export-action-row">
        <div className="search-input-container">
          <input
            type="text"
            placeholder="Ex: Search by ID, customer name, email, city..."
            value={filters.search}
            onChange={handleSearchInputChange}
            disabled={isAnyLoading}
          />
          {/* Removed search button, search is debounced on input change */}
        </div>
        <div className="export-button-container">
          <button
            className="btn btn-secondary btn-export-orders"
            onClick={handleExport}
            disabled={isAnyLoading || paginationInfo.totalCount === 0}
          >
            {exporting ? (
              <FaSpinner className="spinner-icon spin" />
            ) : (
              <FaFileExport />
            )}{" "}
            Export
          </button>
        </div>
      </div>
      {error &&
        exporting && ( // Specific message area for export errors
          <div
            className="message-feedback-container error"
            style={{ marginTop: "10px" }}
          >
            {error}
          </div>
        )}
      {content}
    </div>
  );
};
export default CanceledOrdersPage;
