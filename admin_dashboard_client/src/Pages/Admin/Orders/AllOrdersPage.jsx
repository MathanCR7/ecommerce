import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
// Assuming this service exists and includes a getOrdersByStatus method that
// accepts filters (search?, startDate, endDate, page, limit, export: boolean) and
// returns { orders, pages, totalCount, statusCounts? }.
import orderService from "../../../Services/orderService";
import "./AllOrdersPage.css"; // Link to the new CSS file
import {
  FaEye,
  FaPrint,
  FaSearch, // Keep icon for placeholder/visuals if needed
  FaCalendarAlt,
  FaSpinner,
  FaFileExport,
  FaBoxOpen, // Pending icon from screenshot
  FaCheckCircle, // Confirmed icon from screenshot
  FaTruckLoading, // Processing/Packaging icon - assuming a relevant icon
  FaShippingFast, // Out For Delivery icon - assuming a relevant icon
  FaBox, // Delivered icon from screenshot
  FaBan, // Canceled icon from screenshot
  FaUndo, // Refunded icon - assuming a relevant icon
  FaTimesCircle, // Failed To Deliver icon from screenshot
  FaUsers, // Icon for total orders count
  // FaCreditCard, // Example: Payment processing icon if needed
} from "react-icons/fa";

// --- Helper Functions ---
const formatCurrency = (amount) => {
  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount)) return "N/A";
  // Change to Indian Rupee symbol ₹ and use Indian locale for formatting
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
    // Match screenshot style closer (e.g., 26 May 2025)
    const options = { year: "numeric", month: "long", day: "numeric" };
    // Using 'en-US' locale for "Month Day, Year" format as in screenshot
    // Adjust locale if you need a different format (e.g., 'en-GB' for DD Month YYYY)
    return date.toLocaleDateString("en-US", options);
  } catch (e) {
    console.error("Error formatting date:", dateString, e);
    // Fallback to a simple string representation or a standard ISO format if parse failed but string exists
    return typeof dateString === "string" ? dateString : "N/A";
  }
};

// Helper to format Order ID
const formatOrderId = (orderId) => {
  if (!orderId) return "N/A";
  const idString = String(orderId); // Ensure it's a string
  const displayLength = 8;
  if (idString.length <= displayLength) {
    return idString.toUpperCase();
  }
  // Get the last 'displayLength' characters
  const displayPart = idString.slice(-displayLength).toUpperCase();
  return `${displayPart}...`; // Append "..."
};

// --- Component ---
const AllOrdersPage = () => {
  const navigate = useNavigate();
  // State to hold orders fetched from backend (before client-side search filter)
  const [fetchedOrders, setFetchedOrders] = useState([]);
  // State to hold orders currently displayed (after client-side search filter)
  const [orders, setOrders] = useState([]);

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false); // New state for export loading
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({
    search: "", // This state will store the search input value
    startDate: "",
    endDate: "",
    page: 1,
    limit: 10, // Set a default limit for pagination
  });

  const [paginationInfo, setPaginationInfo] = useState({
    pages: 1,
    totalCount: 0, // Total count from backend for the date range (before client-side search)
  });

  // Ref for the debounce timeout
  const searchTimeoutRef = useRef(null);

  // --- Status Management ---
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
        id: "processing", // Note: App.jsx doesn't have a dedicated /processing route.
        label: "Processing", // This will navigate to 'confirmed' as a common handling point.
        icon: <FaTruckLoading />,
        iconClass: "status-icon-processing",
        navigateTo: "/admin/orders/confirmed", // Or /admin/orders/all if preferred
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
        id: "cancelled", // Note: App.jsx uses "canceled" (single 'l')
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
        id: "failed to deliver", // Note: App.jsx uses "failed"
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
    statusKeys.forEach((key) => {
      counts[key] = 0;
    });

    if (!Array.isArray(ordersToCalculate)) {
      console.warn("[calculateStatusCounts] Input orders is not an array.");
      return counts;
    }

    ordersToCalculate.forEach((order) => {
      const status =
        typeof order.orderStatus === "string"
          ? order.orderStatus.toLowerCase()
          : null;
      if (status && counts.hasOwnProperty(status)) {
        counts[status]++;
      }
    });
    return counts;
  }, []);

  const orderStatusDisplayMap = useMemo(() => {
    const map = {};
    statusSummaryCardData.forEach((card) => {
      map[card.id] = card.label;
    });
    // Extend with other potential backend statuses if they differ from card IDs
    map["refunded"] = "Refunded"; // Example
    map["pending payment"] = "Pending Payment";
    // Ensure all card IDs are mapped (redundant but safe)
    map["processing"] = map["processing"] || "Processing";
    map["out for delivery"] = map["out for delivery"] || "Out For Delivery";
    map["delivered"] = map["delivered"] || "Delivered";
    map["cancelled"] = map["cancelled"] || "Canceled"; // Ensure 'cancelled' (double l) is mapped if backend uses it
    map["canceled"] = map["canceled"] || "Canceled"; // Ensure 'canceled' (single l) is mapped
    map["refunded"] = map["refunded"] || "Refunded";
    map["failed to deliver"] = map["failed to deliver"] || "Failed To Deliver";
    map["offlinepaymentpendingverification"] =
      "Offline Payment Pending Verification"; // Added for clarity

    return map;
  }, [statusSummaryCardData]);

  const statusBadgeMap = useMemo(() => {
    const map = {};
    statusSummaryCardData.forEach((card) => {
      map[card.id] = card.id; // Maps to the ID for CSS class consistency
    });
    map["refunded"] = "refunded"; // Example
    map["offlinepaymentpendingverification"] = "pending"; // Map to pending style
    map["canceled"] = "cancelled"; // Ensure CSS class consistency if backend uses 'canceled'
    map["failed"] = "failed-to-deliver"; // Ensure CSS class consistency if backend uses 'failed'
    return map;
  }, [statusSummaryCardData]);

  // --- Client-Side Filtering Logic ---
  const applyClientSideFilter = useCallback(
    (ordersToFilter, searchTerm) => {
      if (!searchTerm) {
        return ordersToFilter;
      }
      const lowerSearchTerm = searchTerm.toLowerCase();
      return ordersToFilter.filter((order) => {
        const orderIdMatch =
          order._id &&
          String(order._id).toLowerCase().includes(lowerSearchTerm); // Ensure ID is treated as string
        const customerNameMatch =
          order.user &&
          (order.user.displayName?.toLowerCase().includes(lowerSearchTerm) ||
            order.user.name?.toLowerCase().includes(lowerSearchTerm));
        const customerEmailMatch = order.user?.email
          ?.toLowerCase()
          .includes(lowerSearchTerm);
        const customerPhoneMatch = order.user?.phone
          ?.toLowerCase()
          .includes(lowerSearchTerm);
        const cityMatch = order.shippingAddress?.city
          ?.toLowerCase()
          .includes(lowerSearchTerm);
        const timeSlotMatch = order.deliveryPreference?.timeSlot
          ?.toLowerCase()
          .includes(lowerSearchTerm);

        // Also include search on last 8 digits of order ID
        const last8IdMatch =
          order._id &&
          formatOrderId(order._id).toLowerCase().includes(lowerSearchTerm);

        return (
          orderIdMatch ||
          last8IdMatch || // Include search by last 8 digits
          customerNameMatch ||
          customerEmailMatch ||
          customerPhoneMatch ||
          cityMatch ||
          timeSlotMatch // Add time slot to search
        );
      });
    },
    [] // formatOrderId is stable, no need to include if it doesn't use props/state
  );

  const performFiltering = useCallback(
    (ordersToFilter, searchTerm) => {
      const clientFilteredOrders = applyClientSideFilter(
        ordersToFilter,
        searchTerm
      );
      setOrders(clientFilteredOrders);
      const calculatedCounts = calculateStatusCounts(
        clientFilteredOrders, // Calculate counts based on client-filtered orders
        expectedStatusKeys
      );
      setStatusCounts(calculatedCounts);
    },
    [applyClientSideFilter, calculateStatusCounts, expectedStatusKeys]
  );

  // --- Data Fetching ---
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    setOrders([]); // Clear currently displayed orders
    setFetchedOrders([]); // Clear backend-fetched orders
    setStatusCounts(
      // Reset status counts to 0
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
        // Removed filters.search here - search is now primarily client-side for display
        // Backend search might still be used for export or if client-side becomes too slow for large datasets on initial fetch.
      };

      const data = await orderService.getOrdersByStatus("all", backendFilters);
      console.log("[AllOrdersPage] Data received from service:", data);

      const receivedOrders = Array.isArray(data.orders) ? data.orders : [];
      setFetchedOrders(receivedOrders); // Store all orders fetched for this page/date range

      setPaginationInfo({
        pages: data.pages || 1,
        totalCount: data.totalCount || 0,
      });

      // Apply client-side filter (if any) to the newly fetched data.
      // This will also update statusCounts based on the client-filtered results.
      performFiltering(receivedOrders, filters.search);
    } catch (err) {
      console.error("[AllOrdersPage] Error fetching orders:", err);
      const errorMessage =
        err.response?.data?.message || err.message || "Failed to fetch orders.";
      setError(errorMessage);
      setOrders([]);
      setFetchedOrders([]);
      setPaginationInfo({ totalCount: 0, pages: 1 });
      setStatusCounts(
        // Reset status counts on error
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
    filters.search, // Added filters.search because performFiltering uses it
    performFiltering,
    expectedStatusKeys,
  ]);

  // Effect hook to fetch orders when date filters or pagination change.
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]); // Depends on the memoized fetchOrders

  // --- Debounced Client-Side Filtering Effect for Search Input ---
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // If loading, don't apply client-side filter yet; wait for fetchOrders to complete
    if (loading) {
      return;
    }

    if (filters.search) {
      searchTimeoutRef.current = setTimeout(() => {
        console.log(
          `[AllOrdersPage] Applying client-side search (debounced): "${filters.search}"`
        );
        performFiltering(fetchedOrders, filters.search);
      }, 500); // Reduced delay to 0.5 seconds for better responsiveness
    } else {
      console.log(
        `[AllOrdersPage] Applying client-side search (immediate, empty): "${filters.search}"`
      );
      performFiltering(fetchedOrders, "");
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [filters.search, fetchedOrders, performFiltering, loading]);

  // --- Event Handlers ---
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prevFilters) => ({
      ...prevFilters,
      [name]: value,
      page: name === "startDate" || name === "endDate" ? 1 : prevFilters.page, // Reset to page 1 on date change
    }));
  };

  const handleSearchInputChange = (e) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      search: e.target.value,
      page: 1,
    })); // Reset to page 1 on search
  };

  const handleApplyDateFilters = () => {
    // fetchOrders is already triggered by changes to filters.startDate, filters.endDate, filters.page
    // This button primarily serves as a visual cue for users if they prefer clicking after setting dates.
    // If dates haven't changed, but user clicks, ensure fetchOrders is called if page was not 1.
    if (filters.page !== 1) {
      setFilters((prev) => ({ ...prev, page: 1 }));
    } else {
      fetchOrders(); // Explicitly call if page is already 1 and dates might have been re-selected
    }
  };

  const handleClearFilters = () => {
    setFilters({
      search: "",
      startDate: "",
      endDate: "",
      page: 1,
      limit: filters.limit, // Keep the current limit
    });
    // fetchOrders will be triggered by the useEffect watching these filter changes.
  };

  const handleViewDetails = (orderId) => {
    if (orderId) {
      navigate(`/admin/orders/${orderId}`);
    } else {
      console.warn("Attempted to view details for an order with no ID.");
    }
  };

  const handlePrintInvoice = (orderId) => {
    if (orderId) {
      alert(`Print invoice for order ${orderId} not implemented.`);
    } else {
      console.warn("Attempted to print invoice for an order with no ID.");
    }
  };

  const handlePageChange = (newPage) => {
    if (
      !loading &&
      newPage >= 1 &&
      newPage <= paginationInfo.pages &&
      newPage !== filters.page
    ) {
      setFilters((prevFilters) => ({ ...prevFilters, page: newPage }));
    }
  };

  const handleStatusCardClick = (path) => {
    if (path) {
      navigate(path);
    }
  };

  const handleStatusCardKeyDown = (event, path) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleStatusCardClick(path);
    }
  };

  // --- Export Functionality ---
  const handleExport = async () => {
    setExporting(true);
    setError(null);

    try {
      const exportFilters = {
        search: filters.search, // Include current search term for export
        startDate: filters.startDate,
        endDate: filters.endDate,
        export: true, // Indicate to backend this is an export request (fetch all matching)
        // No page/limit for export; backend should return all matching records
      };

      const data = await orderService.getOrdersByStatus("all", exportFilters);

      if (!Array.isArray(data.orders) || data.orders.length === 0) {
        alert("No data found for export with the current filters.");
        setExporting(false);
        return;
      }

      const headers = [
        "SL",
        "Order ID",
        "Delivery Date",
        "Time Slot",
        "Customer Name",
        "Order Type",
        "Total Amount (INR)",
        "Payment Status",
        "Order Status",
        "Created At",
        "City",
        "Full Shipping Address",
        "Customer Email",
        "Customer Phone",
      ];

      const csvRows = data.orders.map((order, index) => {
        const customer = order.user || {};
        const shippingAddress = order.shippingAddress || {};
        const fullAddress = [
          shippingAddress.street,
          shippingAddress.city,
          shippingAddress.state,
          shippingAddress.zip,
          shippingAddress.country,
        ]
          .filter(Boolean)
          .join(", ");

        let deliveryDisplayForCSV = "N/A";
        if (order.deliveryPreference) {
          if (order.deliveryPreference.type === "quick") {
            deliveryDisplayForCSV = "Quick Delivery";
          } else if (order.deliveryPreference.date) {
            deliveryDisplayForCSV = formatDate(order.deliveryPreference.date);
          }
        }

        return [
          index + 1,
          `"${order._id}"`,
          deliveryDisplayForCSV,
          order.deliveryPreference?.timeSlot || "N/A",
          getCustomerNameDisplay(order),
          getOrderTypeDisplay(order.deliveryOption),
          parseFloat(order.totalPrice || 0).toFixed(2),
          order.isPaid !== undefined
            ? order.isPaid
              ? "Paid"
              : "Unpaid"
            : "N/A",
          getOrderStatusDisplay(order.orderStatus),
          order.createdAt ? new Date(order.createdAt).toLocaleString() : "N/A",
          shippingAddress.city || "N/A",
          fullAddress || "N/A",
          customer.email || "N/A",
          customer.phone || "N/A",
        ]
          .map((field) => {
            const stringField = String(field);
            if (
              stringField.includes(",") ||
              stringField.includes('"') ||
              stringField.includes("\n")
            ) {
              return `"${stringField.replace(/"/g, '""')}"`;
            }
            return stringField;
          })
          .join(",");
      });

      const csvContent = [headers.join(","), ...csvRows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      const filename = `orders_export_${filters.startDate || "all"}_${
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
      console.error("[AllOrdersPage] Error exporting orders:", err);
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Failed to export orders.";
      setError(`Export Error: ${errorMessage}`);
      alert(`Export Failed: ${errorMessage}`);
    } finally {
      setExporting(false);
    }
  };

  // --- Render Helpers ---
  const getOrderTypeDisplay = (deliveryOption) => {
    if (deliveryOption === "homeDelivery") return "Delivery";
    if (deliveryOption === "selfPickup") return "Self Pickup";
    return "Unknown";
  };

  const getCustomerNameDisplay = (order) => {
    return order.user
      ? order.user.displayName || order.user.name || "N/A"
      : "Guest Customer";
  };

  const getOrderStatusDisplay = (status) => {
    const lowerStatus =
      typeof status === "string" ? status.toLowerCase() : null;
    if (!lowerStatus) return "Unknown";
    // Handle variations like "cancelled" vs "canceled" or "failed to deliver" vs "failed"
    if (lowerStatus === "canceled")
      return orderStatusDisplayMap["cancelled"] || "Canceled";
    if (lowerStatus === "failed")
      return orderStatusDisplayMap["failed to deliver"] || "Failed To Deliver";
    return orderStatusDisplayMap[lowerStatus] || status;
  };

  const getOrderStatusBadgeClass = (status) => {
    const lowerStatus =
      typeof status === "string" ? status.toLowerCase() : null;
    if (!lowerStatus) return "unknown";
    // Map potentially different backend status strings to consistent CSS class names from statusBadgeMap
    if (lowerStatus === "canceled")
      return statusBadgeMap["cancelled"] || "unknown"; // Map 'canceled' to 'cancelled' class
    if (lowerStatus === "failed")
      return statusBadgeMap["failed to deliver"] || "unknown"; // Map 'failed' to 'failed-to-deliver' class
    return statusBadgeMap[lowerStatus] || "unknown";
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

  const isAnyLoading = loading || exporting;
  const showMainSpinner = loading && !exporting;

  return (
    <div className="all-orders-page-container">
      <div className="orders-page-header">
        <h1>All Orders</h1>
        <span className="orders-count-badge">
          <FaUsers /> {paginationInfo.totalCount}
        </span>
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
            {showMainSpinner && <FaSpinner className="spinner-icon spin" />}{" "}
            Show Data
          </button>
        </div>
      </div>

      {/* Status Summary Cards */}
      <div className="status-summary-container">
        {statusSummaryCardData.map((status) => (
          <div
            key={status.id}
            className="status-card"
            onClick={() => handleStatusCardClick(status.navigateTo)}
            onKeyDown={(e) => handleStatusCardKeyDown(e, status.navigateTo)}
            role="button"
            tabIndex={0} // Make it focusable
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

      {/* Search and Export Row */}
      <div className="search-export-action-row">
        <div className="search-input-container">
          <input
            type="text"
            placeholder="Ex: Search by ID, customer name, email, city..."
            value={filters.search}
            onChange={handleSearchInputChange}
            disabled={isAnyLoading} // Disable search when main data is loading
          />
        </div>
        <div className="export-button-container">
          <button
            className="btn btn-secondary btn-export-orders"
            onClick={handleExport}
            disabled={
              isAnyLoading ||
              (fetchedOrders.length === 0 &&
                !filters.search &&
                !filters.startDate &&
                !filters.endDate)
            }
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

      {/* Feedback Messages (Loading, Error, No Data) */}
      {showMainSpinner && fetchedOrders.length === 0 && !error ? (
        <div className="message-feedback-container loading">
          <FaSpinner className="spinner-icon spin" /> Loading orders...
        </div>
      ) : error ? (
        <div className="message-feedback-container error">Error: {error}</div>
      ) : !loading &&
        fetchedOrders.length > 0 &&
        orders.length === 0 &&
        filters.search ? (
        <div className="message-feedback-container">
          No orders found matching "{filters.search}" with the current date
          filters.
        </div>
      ) : !loading && fetchedOrders.length === 0 && !error ? (
        <div className="message-feedback-container">
          No orders found for the selected date filters.
        </div>
      ) : (
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
                  <th>Order Type</th>
                  <th>Total Amount</th>
                  <th>Order Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order, index) => (
                  <tr key={order._id || `order-${index}`}>
                    <td>
                      {(filters.page - 1) * filters.limit +
                        fetchedOrders.findIndex((fo) => fo._id === order._id) + // Find index in originally fetched (unfiltered) list for correct SL
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
                    <td>
                      {order.deliveryPreference?.timeSlot || "Fast Delivery"}
                    </td>
                    <td>{getCustomerNameDisplay(order)}</td>
                    <td className="order-type-cell">
                      {getOrderTypeDisplay(order.deliveryOption)}
                    </td>
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
                          Status N/A
                        </span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`status-badge-table status-${getOrderStatusBadgeClass(
                          order.orderStatus
                        )}`}
                      >
                        {getOrderStatusDisplay(order.orderStatus)}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button
                        className="btn-icon-action btn-view-details"
                        onClick={() => handleViewDetails(order._id)}
                        title="View Details"
                        disabled={!order._id || isAnyLoading}
                      >
                        <FaEye />
                      </button>
                      <button
                        className="btn-icon-action btn-print-invoice"
                        onClick={() => handlePrintInvoice(order._id)}
                        title="Print Invoice"
                        disabled={!order._id || isAnyLoading}
                      >
                        <FaPrint />
                      </button>
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
              {Array.from(
                { length: paginationInfo.pages },
                (_, i) => i + 1
              ).map((pageNumber) => (
                <button
                  key={pageNumber}
                  onClick={() => handlePageChange(pageNumber)}
                  className={filters.page === pageNumber ? "active" : ""}
                  disabled={loading}
                  aria-label={`Page ${pageNumber}`}
                >
                  {pageNumber}
                </button>
              ))}
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
      )}
    </div>
  );
};

export default AllOrdersPage;
