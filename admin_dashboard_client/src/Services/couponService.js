import api from "./api"; // Import the configured Axios instance

const COUPON_ADMIN_PATH = "/admin/coupons"; // Ensure this matches your API routes

/**
 * Fetches a list of coupons, optionally filtering by search term.
 * Assumes api.get() returns the response data directly.
 * @param {string} [searchTerm=''] - Optional search term for filtering by title or code.
 * @returns {Promise<object>} - A promise resolving to the data object from the API (expected: { success: true, coupons: Array<object> }).
 */
const fetchCoupons = async (searchTerm = "") => {
  const config = {
    params: searchTerm ? { search: searchTerm } : {},
  };
  console.log(`[couponService] GET ${COUPON_ADMIN_PATH} with config:`, config);
  try {
    // Assumes api.get returns the data object directly { success: true, coupons: [] }
    const responseData = await api.get(COUPON_ADMIN_PATH, config);
    if (responseData && Array.isArray(responseData.coupons)) {
      console.log(
        "[couponService] fetchCoupons: Coupons received:",
        responseData.coupons.length
      );
      return responseData;
    } else {
      console.error(
        "[couponService] fetchCoupons: Invalid response structure from API. Expected { coupons: [] }.",
        responseData
      );
      throw new Error(
        "Failed to fetch coupons due to invalid server response structure."
      );
    }
  } catch (error) {
    console.error("[couponService] Error fetching coupons:", error);
    // Re-throw the error, potentially enriched if it's an Axios error object
    throw error.response?.data || error;
  }
};

/**
 * Creates a new coupon.
 * Assumes api.post() returns the created coupon object directly.
 * @param {object} couponData - The data for the new coupon.
 * @returns {Promise<object>} - A promise resolving to the newly created coupon object.
 */
const createCoupon = async (couponData) => {
  const path = COUPON_ADMIN_PATH;
  console.log(`[couponService] POST ${path}`, couponData);
  try {
    const createdCoupon = await api.post(path, couponData);
    if (
      createdCoupon &&
      typeof createdCoupon === "object" &&
      createdCoupon._id
    ) {
      return createdCoupon;
    }
    console.error(
      `[couponService] Invalid or empty data received from POST ${path}. Response:`,
      createdCoupon
    );
    throw new Error("Server did not return valid coupon data after creation.");
  } catch (error) {
    console.error(
      `[couponService] Error creating coupon (POST ${path}):`,
      error
    );
    throw error.response?.data || error;
  }
};

/**
 * Updates an existing coupon.
 * Assumes api.put() returns the updated coupon object directly.
 * @param {string} id - The ID of the coupon to update.
 * @param {object} couponData - The updated data.
 * @returns {Promise<object>} - A promise resolving to the updated coupon object.
 */
const updateCoupon = async (id, couponData) => {
  const path = `${COUPON_ADMIN_PATH}/${id}`;
  console.log(`[couponService] PUT ${path}`, couponData);
  try {
    const updatedCoupon = await api.put(path, couponData);
    if (
      updatedCoupon &&
      typeof updatedCoupon === "object" &&
      updatedCoupon._id
    ) {
      return updatedCoupon;
    }
    console.error(
      `[couponService] Invalid or empty data received from PUT ${path}. Response:`,
      updatedCoupon
    );
    throw new Error("Server did not return valid coupon data after update.");
  } catch (error) {
    console.error(
      `[couponService] Error updating coupon (PUT ${path}):`,
      error
    );
    throw error.response?.data || error;
  }
};

/**
 * Deletes a coupon.
 * Assumes api.delete() returns a confirmation message/object directly.
 * @param {string} id - The ID of the coupon to delete.
 * @returns {Promise<object>} - A promise resolving to the deletion confirmation.
 */
const deleteCoupon = async (id) => {
  const path = `${COUPON_ADMIN_PATH}/${id}`;
  console.log(`[couponService] DELETE ${path}`);
  try {
    const responseData = await api.delete(path);
    // For DELETE, responseData might just be a success message or specific status.
    // Adjust validation if specific response structure is expected.
    if (responseData) {
      // Simple check, might need to be more specific
      return responseData;
    }
    console.error(
      `[couponService] Invalid or empty data received from DELETE ${path}. Response:`,
      responseData
    );
    throw new Error("Server did not confirm coupon deletion properly.");
  } catch (error) {
    console.error(
      `[couponService] Error deleting coupon (DELETE ${path}):`,
      error
    );
    throw error.response?.data || error;
  }
};

/**
 * Toggles the active status of a coupon.
 * Assumes api.patch() returns the updated coupon object directly.
 * @param {string} id - The ID of the coupon to toggle.
 * @returns {Promise<object>} - A promise resolving to the updated coupon object.
 */
const toggleCouponStatus = async (id) => {
  const path = `${COUPON_ADMIN_PATH}/${id}/status`;
  console.log(`[couponService] Attempting PATCH ${path}`);
  try {
    const updatedCoupon = await api.patch(path); // Assumes this returns the updated coupon data directly
    console.log(
      `[couponService] Received data from PATCH ${path}:`,
      updatedCoupon
    );

    if (
      updatedCoupon &&
      typeof updatedCoupon === "object" &&
      updatedCoupon._id &&
      typeof updatedCoupon.isActive !== "undefined"
    ) {
      console.log(
        `[couponService] Successfully validated coupon data from PATCH ${path}:`,
        updatedCoupon
      );
      return updatedCoupon; // This is the updated coupon object
    } else {
      console.error(
        `[couponService] Invalid or empty data received from PATCH ${path}. Data:`,
        updatedCoupon
      );
      // This error will be caught by the component and displayed
      throw new Error(
        "Server response for status toggle was invalid or malformed."
      );
    }
  } catch (error) {
    console.error(`[couponService] Error during PATCH ${path}:`, error.message);
    if (error.response) {
      console.error(
        `[couponService] Axios error details - Status: ${error.response.status}, Data:`,
        error.response.data
      );
    }
    // Re-throw the error so the component's catch block can handle it
    // If error.response.data exists and has a message, use that, otherwise use general error.message
    throw error.response?.data || error;
  }
};

const couponService = {
  fetchCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  toggleCouponStatus,
};

export default couponService;
