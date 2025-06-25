import api from "./api"; // Import the configured Axios instance

const BANNERS_URL_PREFIX = "/admin/banners"; // Relative to the base API URL in api.js

// --- API Functions ---
const fetchBanners = async (pageNumber = 1, keyword = "") => {
  // ... (existing implementation as provided) ...
  const operationContext = "fetchBanners";
  try {
    const params = { pageNumber, keyword };
    console.log(`[${operationContext}] Requesting: GET ${BANNERS_URL_PREFIX}`, {
      params,
    });
    const data = await api.get(BANNERS_URL_PREFIX, { params });
    return data;
  } catch (error) {
    console.error(
      `[Service Error - ${operationContext}]`,
      error.message || error
    );
    throw error;
  }
};

const createBanner = async (formData) => {
  // ... (existing implementation as provided) ...
  const operationContext = "createBanner";
  try {
    console.log(`[${operationContext}] Requesting: POST ${BANNERS_URL_PREFIX}`);
    const data = await api.post(BANNERS_URL_PREFIX, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    console.log(`[${operationContext}] Success. Response Data:`, data);
    return data;
  } catch (error) {
    console.error(
      `[Service Error - ${operationContext}]`,
      error.message || error
    );
    throw error;
  }
};

const updateBanner = async (bannerId, formData) => {
  // ... (existing implementation as provided) ...
  const operationContext = "updateBanner";
  try {
    const requestUrl = `${BANNERS_URL_PREFIX}/${bannerId}`;
    console.log(`[${operationContext}] Requesting: PUT ${requestUrl}`);
    const data = await api.put(requestUrl, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    console.log(`[${operationContext}] Success. Response Data:`, data);
    return data;
  } catch (error) {
    console.error(
      `[Service Error - ${operationContext}]`,
      error.message || error
    );
    throw error;
  }
};

const deleteBanner = async (bannerId) => {
  // ... (existing implementation as provided) ...
  const operationContext = "deleteBanner";
  try {
    const requestUrl = `${BANNERS_URL_PREFIX}/${bannerId}`;
    console.log(`[${operationContext}] Requesting: DELETE ${requestUrl}`);
    const data = await api.delete(requestUrl);
    console.log(`[${operationContext}] Success. Response Data:`, data);
    return data;
  } catch (error) {
    console.error(
      `[Service Error - ${operationContext}]`,
      error.message || error
    );
    throw error;
  }
};

const toggleStatus = async (bannerId) => {
  // ... (existing implementation as provided) ...
  const operationContext = "toggleStatus";
  try {
    const requestUrl = `${BANNERS_URL_PREFIX}/${bannerId}/status`;
    console.log(`[${operationContext}] Requesting: PATCH ${requestUrl}`);
    const data = await api.patch(requestUrl, {});
    console.log(`[${operationContext}] Success. Response Data:`, data);
    return data;
  } catch (error) {
    console.error(
      `[Service Error - ${operationContext}]`,
      error.message || error
    );
    throw error;
  }
};

// --- NEW FUNCTIONS FOR CATEGORIES AND ITEMS ---
/**
 * Fetch active categories for select dropdowns.
 * @returns {Promise<Array>} Array of category objects (e.g., [{ _id, name, slug }, ...]).
 * @throws {Error} Processed error from the interceptor.
 */
const fetchActiveCategoriesForSelect = async () => {
  const operationContext = "fetchActiveCategoriesForSelect";
  try {
    // Ensure your backend route for categories is /admin/categories/list-for-select
    console.log(
      `[${operationContext}] Requesting: GET /admin/categories/list-for-select`
    );
    const responseData = await api.get("/admin/categories/list-for-select");
    // Assuming backend returns { success: true, categories: [...] } or similar
    return responseData.categories || [];
  } catch (error) {
    console.error(
      `[Service Error - ${operationContext}]`,
      error.message || error
    );
    throw error;
  }
};

/**
 * Fetch active items for select dropdowns, optionally filtered by category.
 * @param {string|null} [categoryId=null] - Optional category ID to filter items.
 * @returns {Promise<Array>} Array of item objects (e.g., [{ _id, name, sku }, ...]).
 * @throws {Error} Processed error from the interceptor.
 */
const fetchActiveItemsForSelect = async (categoryId = null) => {
  const operationContext = "fetchActiveItemsForSelect";
  try {
    // Ensure your backend route for items is /admin/items/list-for-select
    const params = {};
    if (categoryId) {
      params.categoryId = categoryId;
    }
    console.log(
      `[${operationContext}] Requesting: GET /admin/items/list-for-select with params:`,
      params
    );
    const responseData = await api.get("/admin/items/list-for-select", {
      params,
    });
    // Assuming backend returns { success: true, items: [...] } or similar
    return responseData.items || [];
  } catch (error) {
    console.error(
      `[Service Error - ${operationContext}]`,
      error.message || error
    );
    throw error;
  }
};

const bannerService = {
  fetchBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  toggleStatus,
  fetchActiveCategoriesForSelect, // Added
  fetchActiveItemsForSelect, // Added
};

export default bannerService;
