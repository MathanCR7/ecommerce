// ========================================================================
// FILE: client/src/services/orderService.js
// Description: Frontend service to interact with admin order backend APIs.
// ========================================================================
import axios from "axios"; // Retaining axios import though 'api' is primary
import api from "./api"; // Import the configured Axios instance

// *** IMPORTANT: Update this URL if your admin API path is different ***
const API_BASE_URL = "/admin/orders"; // Using the base URL you provided

// The shared 'api' instance from ./api should handle setting Authorization header
// and general error logging/handling.

// @desc    Get orders by status for admin with filtering and pagination
// @route   GET /admin/orders?status=...&search=...&page=...&limit=...&startDate=...&endDate=...
// MODIFIED: Expects statusCounts in the response data if backend provides them.
const getOrdersByStatus = async (status = "all", filters = {}) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      startDate = "",
      endDate = "",
      // branch = "", // Removed frontend branch filter input, but keeping here if backend uses it
    } = filters;

    const params = {
      status: status.toLowerCase(),
      page,
      limit,
      search,
      startDate,
      endDate,
      // branch, // Pass branch param if backend expects it, even if frontend input removed
    };

    console.log("[orderService] Fetching orders with params:", params); // Log parameters sent

    // Using 'api' instance which should return response.data directly if configured so
    // If 'api' is raw axios, then response.data is needed.
    // Based on your current code: const ordersData = response; (implies 'api' returns data directly)
    const response = await api.get(API_BASE_URL, { params });
    const ordersData = response; // Assuming 'api' instance is configured to return data directly

    console.log("[orderService] Received response data:", ordersData); // Log received data

    // Backend Fix Note: The error "Can't use $options" when searching (e.g., search='3')
    // indicates a backend issue in how the search parameter is used in the Mongoose query,
    // likely when casting the search term across different schema types (like ObjectId).
    // The frontend correctly sends the 'search' param; the backend controller must
    // handle it robustly (e.g., using $or with specific casting/regex for different fields).

    const isDataValid =
      ordersData &&
      typeof ordersData === "object" &&
      typeof ordersData.page === "number" &&
      typeof ordersData.pages === "number" &&
      typeof ordersData.totalCount === "number" &&
      typeof ordersData.limit === "number" &&
      Array.isArray(ordersData.orders);

    if (!isDataValid) {
      console.error(
        `[orderService] Unexpected response structure from ${API_BASE_URL}.`,
        ordersData
      );
      const error = new Error("Unexpected response structure from the server.");
      error.responseData = ordersData;
      // error.responseStatus = response?.status; // If 'api' is raw axios, this would be response.status
      throw error;
    }

    // Return statusCounts if provided by the backend
    return {
      orders: ordersData.orders,
      page: ordersData.page,
      pages: ordersData.pages,
      totalCount: ordersData.totalCount,
      limit: ordersData.limit,
      statusCounts: ordersData.statusCounts || {}, // Return counts or an empty object
    };
  } catch (error) {
    console.error(`Error fetching admin orders (status: ${status}):`, error);
    throw error;
  }
};

// @desc    Get a single order by ID for admin
// @route   GET /admin/orders/:id
const getOrderById = async (orderId) => {
  if (!orderId) {
    console.error("[orderService] Order ID is required to fetch details.");
    const error = new Error("Order ID is missing.");
    error.status = 400; // Or a more appropriate client error code
    throw error;
  }

  try {
    const response = await api.get(`${API_BASE_URL}/${orderId}`);
    const responseData = response; // Assuming 'api' instance returns data directly

    if (
      !responseData ||
      typeof responseData !== "object" ||
      responseData === null ||
      !responseData._id // Basic check for a valid order object
    ) {
      console.error(
        `[orderService] API response for order ID "${orderId}" was unexpected:`,
        responseData
      );
      const error = new Error(
        "Unexpected response structure for order details."
      );
      error.responseData = responseData;
      // error.responseStatus = response?.status; // If 'api' is raw axios
      throw error;
    }
    return responseData;
  } catch (error) {
    console.error(
      `[orderService] Error fetching admin order ${orderId}:`,
      error
    );
    throw error;
  }
};

// @desc    Update order status for admin
// @route   PUT /admin/orders/:id/status
const updateOrderStatus = async (orderId, newStatus, paymentStatus) => {
  if (!orderId || !newStatus) {
    console.error(
      "[orderService] Order ID and new status are required for update."
    );
    const error = new Error("Missing update data for order status.");
    error.status = 400;
    throw error;
  }

  try {
    const payload = { status: newStatus };
    if (paymentStatus !== undefined && paymentStatus !== null) {
      payload.isPaid = paymentStatus === "Paid";
    }

    const response = await api.put(
      `${API_BASE_URL}/${orderId}/status`,
      payload
    );
    const responseData = response; // Assuming 'api' instance returns data directly

    if (
      !responseData ||
      typeof responseData !== "object" ||
      responseData === null ||
      !responseData._id
    ) {
      console.error(
        `[orderService] API response for updating status for order "${orderId}" was unexpected:`,
        responseData
      );
      const error = new Error(
        "Unexpected response structure after status update."
      );
      error.responseData = responseData;
      // error.responseStatus = response?.status;
      throw error;
    }
    return responseData;
  } catch (error) {
    console.error(
      `[orderService] Error updating status for order ${orderId} to "${newStatus}":`,
      error
    );
    throw error;
  }
};

// @desc    Update order delivery date/time preference for admin
// @route   PUT /admin/orders/:id/delivery
const updateOrderDeliveryPreference = async (orderId, date, timeSlot) => {
  if (!orderId) {
    console.error(
      "[orderService] Order ID is required to update delivery preference."
    );
    const error = new Error("Order ID is missing.");
    error.status = 400;
    throw error;
  }

  const payload = {
    date: date || null,
    timeSlot: timeSlot || null,
  };

  try {
    const response = await api.put(
      `${API_BASE_URL}/${orderId}/delivery`,
      payload
    );
    const responseData = response; // Assuming 'api' instance returns data directly

    if (
      !responseData ||
      typeof responseData !== "object" ||
      responseData === null ||
      !responseData._id
    ) {
      console.error(
        `[orderService] API response for updating delivery preference for order "${orderId}" was unexpected:`,
        responseData
      );
      const error = new Error(
        "Unexpected response structure after delivery preference update."
      );
      error.responseData = responseData;
      // error.responseStatus = response?.status;
      throw error;
    }
    return responseData;
  } catch (error) {
    console.error(
      `[orderService] Error updating delivery preference for order ${orderId}:`,
      error
    );
    throw error;
  }
};

// @desc    Get orders for a specific user ID
// @route   GET /admin/orders?userId=... (or a specific route like /admin/orders/user/:userId)
// @param   {string} userId - The ID of the user whose orders are to be fetched.
// @param   {object} filters - Optional filters like page, limit, status.
const getOrdersByUserId = async (userId, filters = {}) => {
  if (!userId) {
    console.error("[orderService] User ID is required to fetch their orders.");
    const error = new Error("User ID is missing.");
    error.status = 400;
    throw error;
  }

  try {
    const { page = 1, limit = 10, status = "" } = filters;
    const params = {
      userId, // Key for filtering by user
      page,
      limit,
      // Only include status if it's not empty, to avoid sending 'status='
      ...(status && { status: status.toLowerCase() }),
    };

    console.log(
      `[orderService] Fetching orders for user ${userId} with params:`,
      params
    );

    // Assuming your backend's GET /admin/orders endpoint can filter by `userId` query parameter.
    // If you have a dedicated endpoint like /admin/orders/user/:userId, adjust the URL:
    // const response = await api.get(`${API_BASE_URL}/user/${userId}`, { params: { page, limit, status } });
    const response = await api.get(API_BASE_URL, { params });
    const ordersData = response; // Assuming 'api' returns data directly

    console.log(
      `[orderService] Received orders for user ${userId}:`,
      ordersData
    );

    // Validate the structure for a list of orders (similar to getOrdersByStatus)
    const isDataValid =
      ordersData &&
      typeof ordersData === "object" &&
      Array.isArray(ordersData.orders) && // Primary check for orders array
      // These pagination fields might not always be present if fetching all orders for a user without pagination
      // Or if the backend endpoint for user orders returns a simpler structure.
      // Adjust validation based on your backend's actual response for this specific call.
      (typeof ordersData.page === "number" || ordersData.page === undefined) &&
      (typeof ordersData.pages === "number" ||
        ordersData.pages === undefined) &&
      (typeof ordersData.totalCount === "number" ||
        ordersData.totalCount === undefined);

    if (!isDataValid) {
      console.error(
        `[orderService] Unexpected response structure when fetching orders for user ${userId}.`,
        ordersData
      );
      const error = new Error(
        "Unexpected response structure from the server for user orders."
      );
      error.responseData = ordersData;
      throw error;
    }

    // Ensure a consistent return structure, even if pagination fields are missing
    return {
      orders: ordersData.orders,
      page: ordersData.page || 1,
      pages: ordersData.pages || 1,
      totalCount: ordersData.totalCount || ordersData.orders.length,
      // limit is often part of request, backend might not always echo it
      // For consistency, you might want backend to return it or use the requested limit
      limit: ordersData.limit || limit,
    };
  } catch (error) {
    console.error(
      `[orderService] Error fetching orders for user ${userId}:`,
      error.response?.data || error.message || error
    );
    throw error;
  }
};

const getLatestAdminOrder = async () => {
  try {
    // The 'api' instance should handle the full URL construction including /api prefix
    const response = await api.get(`${API_BASE_URL}/latest`);
    // Assuming 'api' returns data directly.
    // If response is the full axios response object, use response.data
    return response; // This should be the order object or specific structure from 'api' wrapper
  } catch (error) {
    // Gracefully handle 404 (no orders found) without breaking the polling
    if (
      error.response &&
      (error.response.status === 404 ||
        (error.responseData && error.responseData.status === 404)) // Check based on how 'api' wrapper structures errors
    ) {
      // console.log("[orderService] No latest order found (404), returning null.");
      return null;
    }
    console.error("[orderService] Error fetching latest admin order:", error);
    throw error; // Re-throw other errors to be potentially caught by UI
  }
};

const orderService = {
  getOrdersByStatus,
  getOrderById,
  updateOrderStatus,
  updateOrderDeliveryPreference,
  getOrdersByUserId,
  getLatestAdminOrder, // Add the new function to the exported object
};
export default orderService;
