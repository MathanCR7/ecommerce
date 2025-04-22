// ========================================================================
// FILE: client/src/Services/categoryService.js
// ========================================================================

import api from "./api"; // Import the configured Axios instance

const ADMIN_API_URL_PREFIX = "/admin/categories";

/**
 * Fetch all categories (Admin context - uses admin endpoint for consistency).
 * @returns {Promise<Array<object>>} An array of category objects.
 * @throws {Error} Throws processed error object on failure.
 */
const getAllCategories = async () => {
  try {
    const response = await api.get(ADMIN_API_URL_PREFIX);
    if (response && response.success && Array.isArray(response.categories)) {
      return response.categories;
    } else {
      console.warn("getAllCategories response format unexpected:", response);
      return [];
    }
  } catch (error) {
    console.error(
      "Get All Admin Categories Service Error:",
      error.message || error
    );
    throw error;
  }
};

/**
 * Fetch a single category by its ID (Admin context).
 * @param {string} categoryId - The ID of the category.
 * @returns {Promise<object>} The category object.
 * @throws {Error} Throws processed error object on failure (e.g., 404).
 */
const getCategoryById = async (categoryId) => {
  try {
    const response = await api.get(`${ADMIN_API_URL_PREFIX}/${categoryId}`);
    if (response && response.success && response.category) {
      return response.category;
    } else {
      console.warn(
        `getCategoryById (${categoryId}) response format unexpected:`,
        response
      );
      throw new Error(
        response?.message ||
          "Failed to fetch category or response format incorrect."
      );
    }
  } catch (error) {
    console.error(
      `Get Admin Category By ID (${categoryId}) Service Error:`,
      error.message || error
    );
    throw error;
  }
};

/**
 * Create a new category (Admin action).
 * @param {FormData} formData - FormData containing 'name', 'description', 'image'.
 * @returns {Promise<object>} The newly created category object.
 * @throws {Error} Throws processed error object on failure.
 */
const createCategory = async (formData) => {
  try {
    const response = await api.post(ADMIN_API_URL_PREFIX, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    if (response && response.success && response.category) {
      return response.category;
    } else {
      console.warn("createCategory response format unexpected:", response);
      throw new Error(
        response?.message ||
          "Failed to create category or response format incorrect."
      );
    }
  } catch (error) {
    console.error(
      "Create Admin Category Service Error:",
      error.message || error
    );
    throw error;
  }
};

/**
 * Update an existing category (Admin action).
 * @param {string} categoryId - The ID of the category to update.
 * @param {FormData} formData - FormData containing updated fields.
 * @returns {Promise<object>} The updated category object.
 * @throws {Error} Throws processed error object on failure.
 */
const updateCategory = async (categoryId, formData) => {
  try {
    const response = await api.put(
      `${ADMIN_API_URL_PREFIX}/${categoryId}`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    if (response && response.success && response.category) {
      return response.category;
    } else {
      console.warn(
        `updateCategory (${categoryId}) response format unexpected:`,
        response
      );
      throw new Error(
        response?.message ||
          "Failed to update category or response format incorrect."
      );
    }
  } catch (error) {
    console.error(
      `Update Admin Category (${categoryId}) Service Error:`,
      error.message || error
    );
    throw error;
  }
};

/**
 * Delete a single category by its ID (Admin action - triggers backend cascade).
 * @param {string} categoryId - The ID of the category to delete.
 * @returns {Promise<object>} Response data (e.g., { success, message: "..." }).
 * @throws {Error} Throws processed error object on failure.
 */
const deleteCategory = async (categoryId) => {
  try {
    // This still calls the original delete which cascades item deletion via hook
    const response = await api.delete(`${ADMIN_API_URL_PREFIX}/${categoryId}`);
    return response;
  } catch (error) {
    console.error(
      `Delete Admin Category (${categoryId}) Service Error:`,
      error.message || error
    );
    throw error;
  }
};

/**
 * Delete multiple categories by their IDs (Admin action - triggers backend cascade).
 * @param {Array<string>} ids - An array of category IDs to delete.
 * @returns {Promise<object>} Response data.
 * @throws {Error} Throws processed error object on failure.
 */
const deleteMultipleCategories = async (ids) => {
  try {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error(
        "Invalid input: Array of IDs is required for bulk delete."
      );
    }
    const response = await api.post(`${ADMIN_API_URL_PREFIX}/delete-multiple`, {
      ids,
    });
    return response;
  } catch (error) {
    console.error(
      "Delete Multiple Admin Categories Service Error:",
      error.message || error
    );
    throw error;
  }
};

// *** NEW FUNCTION ***
/**
 * Moves items from one category to another, then deletes the original category.
 * @param {string} categoryIdToDelete - The ID of the category to delete.
 * @param {string} targetCategoryId - The ID of the category to move items to.
 * @returns {Promise<object>} Response data from the backend.
 * @throws {Error} Throws processed error object on failure.
 */
const moveItemsAndDeleteCategory = async (
  categoryIdToDelete,
  targetCategoryId
) => {
  try {
    // POST request to the new backend endpoint
    const response = await api.post(
      `${ADMIN_API_URL_PREFIX}/${categoryIdToDelete}/move-delete`,
      { targetCategoryId } // Send target ID in the body
    );
    return response;
  } catch (error) {
    console.error(
      `Move Items & Delete Category (${categoryIdToDelete} -> ${targetCategoryId}) Service Error:`,
      error.message || error
    );
    throw error;
  }
};

// Export the service functions
const categoryService = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory, // Keep original delete for multi-delete and direct delete option
  deleteMultipleCategories,
  moveItemsAndDeleteCategory, // Add the new function
};

export default categoryService;
