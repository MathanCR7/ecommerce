// ========================================================================
// FILE: client/src/Services/itemService.js
// CORRECTION: Directing Admin CUD operations to '/admin/items'
//             Providing separate functions for Public reads on '/items'
//             MODIFIED: getAllAdminItems to accept filter parameters
// ========================================================================
import api from "./api"; // Import the configured Axios instance
// --- Endpoints ---
const ADMIN_API_URL_PREFIX = "/admin/items"; // For Admin CUD and reads
const PUBLIC_API_URL_PREFIX = "/items"; // For Public reads
// --- Admin Operations ---
/**
Fetch all items from the backend (Admin Context - uses Admin endpoint).
Ensures access to all item statuses and potentially more fields.
ACCEPTS categoryId and searchTerm for filtering.
@param {string} [categoryId=null] - Optional ID of the category to filter by.
@param {string} [searchTerm=null] - Optional search term to filter item names.
@returns {Promise<Array<object>>} An array of item objects (populated).
@throws {Error} Throws processed error object on failure.
*/
const getAllAdminItems = async (categoryId = null, searchTerm = null) => {
  // <<<<<< MODIFIED PARAMS
  try {
    const params = {}; // <<<<<< ADDED PARAMS OBJECT
    if (categoryId) params.categoryId = categoryId;
    if (searchTerm && searchTerm.trim() !== "")
      params.searchTerm = searchTerm.trim();
    // The api instance should automatically handle adding the token
    // if it's configured with an interceptor for authentication.
    const response = await api.get(ADMIN_API_URL_PREFIX, { params }); // <<<<<< PASS PARAMS
    // Assuming your api interceptor processes the response and directly returns response.data
    // or you're expecting the structure { success: true, items: [] } from the actual data property.
    // Let's adjust based on the common pattern where api.get returns the Axios response object.
    // And the actual data is in response.data.
    // If api is a raw Axios instance or its interceptor returns the full Axios response:
    // const actualData = response.data;
    // if (actualData && actualData.success && Array.isArray(actualData.items)) {
    //   return actualData.items;
    // }
    // If your api interceptor directly returns the backend's JSON payload (e.g. {success, items}):
    if (response && response.success && Array.isArray(response.items)) {
      return response.items;
    } else if (Array.isArray(response)) {
      // If backend directly returns an array for this endpoint
      return response;
    } else {
      console.warn("getAllAdminItems response format unexpected:", response);
      if (response && response.message) throw new Error(response.message);
      return []; // Return empty array on unexpected format if no error thrown
    }
  } catch (error) {
    // Error should be the processed error from the api interceptor
    console.error("Get All Admin Items Service Error:", error.message || error);
    throw error; // Re-throw the processed error
  }
};
/**
Fetch a single item by its ID (Admin Context - uses Admin endpoint).
Ensures access regardless of item status.
@param {string} itemId - The ID of the item.
@returns {Promise<object>} The item object (populated).
@throws {Error} Throws processed error object on failure (e.g., 404).
*/
const getAdminItemById = async (itemId) => {
  try {
    const response = await api.get(`${ADMIN_API_URL_PREFIX}/${itemId}`);
    // Assuming response is the direct JSON payload from backend due to api interceptor
    if (response && response.success && response.item) {
      // If backend sends {success, item}
      return response.item;
    } else if (response && response._id) {
      // If backend directly sends the item object
      return response;
    } else {
      console.warn(
        `getAdminItemById (${itemId}) response format unexpected:`,
        response
      );
      throw new Error(
        response?.message ||
          "Failed to fetch admin item or response format incorrect."
      );
    }
  } catch (error) {
    console.error(
      `Get Admin Item By ID (${itemId}) Service Error:`,
      error.message || error
    );
    throw error;
  }
};
/**
Create a new item (Admin Action - uses Admin endpoint).
@param {FormData} formData - FormData containing item fields and image files.
The backend controller for createAdminItem expects images as an array of files.
It also expects other fields like imageAltTexts and primaryImageIndex.
@returns {Promise<object>} The newly created item object (populated).
@throws {Error} Throws processed error object on failure.
*/
const createItem = async (formData) => {
  try {
    // api.post will use the interceptor to set Content-Type and Auth token
    const response = await api.post(ADMIN_API_URL_PREFIX, formData, {
      headers: { "Content-Type": "multipart/form-data" }, // Ensure multipart for FormData
    });
    if (response && response._id) {
      // If backend directly returns the created item
      return response;
    } else if (response && response.success && response.item) {
      // If backend sends { success, item }
      return response.item;
    } else {
      console.warn("createItem (admin) response format unexpected:", response);
      throw new Error(
        response?.message ||
          "Failed to create item or response format incorrect."
      );
    }
  } catch (error) {
    console.error("Create Admin Item Service Error:", error.message || error);
    throw error;
  }
};
/**
Update an existing item (Admin Action - uses Admin endpoint).
@param {string} itemId - The ID of the item to update.
@param {FormData} formData - FormData containing updated fields and optional 'image' file.
@returns {Promise<object>} The updated item object (populated).
@throws {Error} Throws processed error object on failure.
*/
const updateItem = async (itemId, formData) => {
  try {
    const response = await api.put(
      `${ADMIN_API_URL_PREFIX}/${itemId}`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" }, // Ensure multipart for FormData
      }
    );
    if (response && response._id) {
      // If backend directly returns the updated item
      return response;
    } else if (response && response.success && response.item) {
      // If backend sends { success, item }
      return response.item;
    } else {
      console.warn(
        `updateItem (admin) (${itemId}) response format unexpected:`,
        response
      );
      throw new Error(
        response?.message ||
          "Failed to update item or response format incorrect."
      );
    }
  } catch (error) {
    console.error(
      `Update Admin Item (${itemId}) Service Error:`,
      error.message || error
    );
    throw error;
  }
};
/**
Delete a single item by its ID (Admin Action - uses Admin endpoint).
@param {string} itemId - The ID of the item to delete.
@returns {Promise<object>} Response data (e.g., { success, message: "..." }).
@throws {Error} Throws processed error object on failure.
*/
const deleteItem = async (itemId) => {
  try {
    // api.delete will use interceptor for auth
    const response = await api.delete(`${ADMIN_API_URL_PREFIX}/${itemId}`);
    return response; // Expecting { success: true, message: "..." }
  } catch (error) {
    console.error(
      `Delete Admin Item (${itemId}) Service Error:`,
      error.message || error
    );
    throw error;
  }
};
/**
Delete multiple items by their IDs (Admin Action - uses Admin endpoint).
@param {Array<string>} ids - An array of item IDs to delete.
@returns {Promise<object>} Response data (e.g., { success, message, deletedCount, errors? }).
@throws {Error} Throws processed error object on failure.
*/
const deleteMultipleItems = async (ids) => {
  try {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error(
        "Invalid input: Array of IDs is required for bulk delete."
      );
    }
    // api.post for body, interceptor handles auth
    const response = await api.post(`${ADMIN_API_URL_PREFIX}/delete-multiple`, {
      ids, // Backend expects an object with an 'ids' array
    });
    return response; // Expecting { success: true, message: "...", ... }
  } catch (error) {
    console.error(
      "Delete Multiple Admin Items Service Error:",
      error.message || error
    );
    throw error;
  }
};
// --- Public Operations ---
/**
Fetch publicly available items, potentially with pagination and filtering.
@param {object} [params={}] - Query parameters (e.g., page, limit, category, sortBy, searchTerm).
@returns {Promise<object>} An object containing items array and pagination info.
Example: { success: true, items: [], page, pages, count }
@throws {Error} Throws processed error object on failure.
*/
const getPublicItems = async (params = {}) => {
  try {
    // api.get doesn't need auth for public routes
    const response = await api.get(PUBLIC_API_URL_PREFIX, { params });
    // Assuming response is the direct JSON payload from backend
    if (response && response.success && Array.isArray(response.items)) {
      return response; // Expecting { success: true, items: [], page, pages, count }
    } else {
      console.warn("getPublicItems response format unexpected:", response);
      // Provide a default structure for graceful failure in UI
      return {
        success: false,
        items: [],
        page: params.page || 1,
        pages: 0,
        count: 0,
        message:
          response?.message ||
          "Unexpected response format while fetching public items.",
      };
    }
  } catch (error) {
    console.error(
      "Get All Public Items Service Error:",
      error.message || error
    );
    throw error;
  }
};
/**
Fetch a single publicly available item by its ID or slug.
@param {string} identifier - The ID or slug of the item.
@returns {Promise<object>} The item object.
@throws {Error} Throws processed error object on failure.
*/
const getPublicItemById = async (identifier) => {
  // Changed param name to identifier
  try {
    const response = await api.get(`${PUBLIC_API_URL_PREFIX}/${identifier}`);
    // Assuming response is the direct JSON payload from backend
    if (response && response.success && response.item) {
      // If backend sends { success, item }
      return response.item;
    } else if (response && response._id) {
      // If backend directly sends the item object
      return response;
    } else {
      console.warn(
        `getPublicItemById (${identifier}) response format unexpected:`,
        response
      );
      throw new Error(
        response?.message ||
          "Failed to fetch public item or response format incorrect."
      );
    }
  } catch (error) {
    console.error(
      `Get Public Item By ID/Slug (${identifier}) Service Error:`,
      error.message || error
    );
    throw error;
  }
};
// --- Export ---
const itemService = {
  // Admin functions
  getAllAdminItems,
  getAdminItemById,
  createItem,
  updateItem,
  deleteItem,
  deleteMultipleItems,
  // Public functions
  getPublicItems,
  getPublicItemById,
};
export default itemService;
