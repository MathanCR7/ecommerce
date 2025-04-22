// ========================================================================
// FILE: client/src/Services/itemService.js
// CORRECTION: Directing Admin CUD operations to '/admin/items'
//             Providing separate functions for Public reads on '/items'
// ========================================================================

import api from "./api"; // Import the configured Axios instance

// --- Endpoints ---
const ADMIN_API_URL_PREFIX = "/admin/items"; // For Admin CUD and reads
const PUBLIC_API_URL_PREFIX = "/items"; // For Public reads

// --- Admin Operations ---

/**
 * Fetch all items from the backend (Admin Context - uses Admin endpoint).
 * Ensures access to all item statuses and potentially more fields.
 * @returns {Promise<Array<object>>} An array of item objects (populated).
 * @throws {Error} Throws processed error object on failure.
 */
const getAllAdminItems = async () => {
  try {
    const response = await api.get(ADMIN_API_URL_PREFIX);
    if (response && response.success && Array.isArray(response.items)) {
      return response.items;
    } else {
      console.warn("getAllAdminItems response format unexpected:", response);
      return [];
    }
  } catch (error) {
    console.error("Get All Admin Items Service Error:", error.message || error);
    throw error;
  }
};

/**
 * Fetch a single item by its ID (Admin Context - uses Admin endpoint).
 * Ensures access regardless of item status.
 * @param {string} itemId - The ID of the item.
 * @returns {Promise<object>} The item object (populated).
 * @throws {Error} Throws processed error object on failure (e.g., 404).
 */
const getAdminItemById = async (itemId) => {
  try {
    const response = await api.get(`${ADMIN_API_URL_PREFIX}/${itemId}`);
    if (response && response.success && response.item) {
      return response.item;
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
 * Create a new item (Admin Action - uses Admin endpoint).
 * @param {FormData} formData - FormData containing item fields and optional 'image' file.
 * @returns {Promise<object>} The newly created item object (populated).
 * @throws {Error} Throws processed error object on failure.
 */
const createItem = async (formData) => {
  try {
    // *** CORRECTED: POST to the ADMIN endpoint ***
    const response = await api.post(ADMIN_API_URL_PREFIX, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    if (response && response.success && response.item) {
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
    throw error; // Let the calling component handle UI feedback
  }
};

/**
 * Update an existing item (Admin Action - uses Admin endpoint).
 * @param {string} itemId - The ID of the item to update.
 * @param {FormData} formData - FormData containing updated fields and optional 'image' file.
 * @returns {Promise<object>} The updated item object (populated).
 * @throws {Error} Throws processed error object on failure.
 */
const updateItem = async (itemId, formData) => {
  try {
    // *** CORRECTED: PUT to the ADMIN endpoint ***
    const response = await api.put(
      `${ADMIN_API_URL_PREFIX}/${itemId}`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    if (response && response.success && response.item) {
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
 * Delete a single item by its ID (Admin Action - uses Admin endpoint).
 * @param {string} itemId - The ID of the item to delete.
 * @returns {Promise<object>} Response data (e.g., { success, message: "..." }).
 * @throws {Error} Throws processed error object on failure.
 */
const deleteItem = async (itemId) => {
  try {
    // *** CORRECTED: DELETE from the ADMIN endpoint ***
    const response = await api.delete(`${ADMIN_API_URL_PREFIX}/${itemId}`);
    return response; // Backend typically returns { success, message }
  } catch (error) {
    console.error(
      `Delete Admin Item (${itemId}) Service Error:`,
      error.message || error
    );
    throw error;
  }
};

/**
 * Delete multiple items by their IDs (Admin Action - uses Admin endpoint).
 * @param {Array<string>} ids - An array of item IDs to delete.
 * @returns {Promise<object>} Response data (e.g., { success, message, deletedCount, errors? }).
 * @throws {Error} Throws processed error object on failure.
 */
const deleteMultipleItems = async (ids) => {
  try {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error(
        "Invalid input: Array of IDs is required for bulk delete."
      );
    }
    // *** CORRECTED: POST to the ADMIN delete-multiple endpoint ***
    const response = await api.post(`${ADMIN_API_URL_PREFIX}/delete-multiple`, {
      ids,
    });
    return response; // Backend returns { success, message, deletedCount, errors? }
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
 * Fetch all PUBLIC items from the backend (uses Public endpoint).
 * Filters out non-active items and sensitive fields.
 * @param {object} [params] - Optional query parameters like { page, limit, sort, category, search }.
 * @returns {Promise<object>} An object containing items array and pagination info.
 * @throws {Error} Throws processed error object on failure.
 */
const getPublicItems = async (params = {}) => {
  try {
    // GET from the PUBLIC endpoint
    const response = await api.get(PUBLIC_API_URL_PREFIX, { params });
    if (response && response.success && Array.isArray(response.items)) {
      return response; // Return full response with pagination
    } else {
      console.warn("getPublicItems response format unexpected:", response);
      return {
        success: false,
        items: [],
        page: 1,
        pages: 0,
        count: 0,
        message: "Unexpected response format",
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
 * Fetch a single PUBLIC item by its ID (uses Public endpoint).
 * Ensures item is active and excludes sensitive fields.
 * @param {string} itemId - The ID of the item.
 * @returns {Promise<object>} The item object.
 * @throws {Error} Throws processed error object on failure (e.g., 404).
 */
const getPublicItemById = async (itemId) => {
  try {
    // GET from the PUBLIC endpoint
    const response = await api.get(`${PUBLIC_API_URL_PREFIX}/${itemId}`);
    if (response && response.success && response.item) {
      return response.item;
    } else {
      console.warn(
        `getPublicItemById (${itemId}) response format unexpected:`,
        response
      );
      throw new Error(
        response?.message ||
          "Failed to fetch public item or response format incorrect."
      );
    }
  } catch (error) {
    console.error(
      `Get Public Item By ID (${itemId}) Service Error:`,
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
  createItem, // Targets POST /api/admin/items
  updateItem, // Targets PUT /api/admin/items/:id
  deleteItem, // Targets DELETE /api/admin/items/:id
  deleteMultipleItems, // Targets POST /api/admin/items/delete-multiple

  // Public functions
  getPublicItems, // Targets GET /api/items
  getPublicItemById, // Targets GET /api/items/:id
};

export default itemService;
