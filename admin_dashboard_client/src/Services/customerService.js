// client/src/services/customerService.js
import api from "./api"; // Your configured Axios instance

const API_BASE_URL = "/admin/customers";

const getCustomers = async (filters = {}) => {
  try {
    const { page = 1, limit = 10, search = "" } = filters;
    const params = { page, limit, search };

    console.log("[customerService] Fetching customers with params:", params);
    const response = await api.get(API_BASE_URL, { params });
    const customersData = response; // ASSUMPTION: 'api' instance returns data directly

    console.log("[customerService] Received response data:", customersData);

    // Validate the structure of the received data
    const isDataValid =
      customersData && // Check if customersData itself is not null/undefined
      typeof customersData === "object" &&
      typeof customersData.page === "number" &&
      typeof customersData.pages === "number" &&
      typeof customersData.totalCount === "number" &&
      // typeof customersData.limit === "number" && // Backend might not return limit if it's fixed or Echoed
      Array.isArray(customersData.customers);

    if (!isDataValid) {
      console.error(
        `[customerService] Unexpected response structure from ${API_BASE_URL}.`,
        customersData // Log the actual data received that failed validation
      );
      const error = new Error("Unexpected response structure from the server.");
      error.responseData = customersData;
      // If 'response' is the data object, it won't have a 'status' property.
      // The status would be on the original Axios response, which 'api' might have abstracted away.
      // error.responseStatus = response?.status; // This line might be problematic if 'response' is data.
      throw error;
    }

    return {
      customers: customersData.customers,
      page: customersData.page,
      pages: customersData.pages,
      totalCount: customersData.totalCount,
      limit: customersData.limit || limit, // Use passed limit if backend doesn't return it
    };
  } catch (error) {
    // If the error is from the 'throw error' above, it will be caught here.
    // If it's an error from api.get itself, 'error.response.data' might contain backend error message.
    console.error(
      "Error fetching admin customers:",
      error.responseData || error.response?.data || error.message || error // Log more details
    );
    // Re-throw for the component to handle UI updates (e.g., show error message)
    throw error;
  }
};

const searchCustomers = async (keyword) => {
  try {
    const response = await api.get(`${API_BASE_URL}/search`, {
      params: { keyword },
    });
    return response; // Assuming 'api' returns data directly
  } catch (error) {
    console.error(
      "Error searching customers:",
      error.response?.data || error.message || error
    );
    throw error;
  }
};

const createCustomer = async (customerData) => {
  try {
    const response = await api.post(API_BASE_URL, customerData);
    return response; // Assuming 'api' returns data directly
  } catch (error) {
    console.error(
      "Error creating customer:",
      error.response?.data || error.message || error
    );
    throw error;
  }
};

const getCustomerById = async (customerId) => {
  try {
    const response = await api.get(`${API_BASE_URL}/${customerId}`);
    // Backend is expected to return an object: { user: UserDocument, orders: OrderArray }
    // Ensure the response data structure matches this.
    if (!response || !response.user) {
      console.error(
        `[customerService] Unexpected response structure for customer ID "${customerId}":`,
        response
      );
      const error = new Error(
        "Unexpected response structure for customer details."
      );
      error.responseData = response;
      throw error;
    }
    return response; // Returns the object { user, orders }
  } catch (error) {
    console.error(
      `Error fetching customer ${customerId}:`,
      error.response?.data || error.message || error
    );
    throw error;
  }
};

// Placeholder for delete customer
// const deleteCustomer = async (customerId) => {
//   try {
//     const response = await api.delete(`${API_BASE_URL}/${customerId}`);
//     return response; // Assuming 'api' returns data directly
//   } catch (error) {
//     console.error(`Error deleting customer ${customerId}:`, error.response?.data || error.message || error);
//     throw error;
//   }
// };

// Placeholder for update customer status
// const updateCustomerStatus = async (customerId, isActive) => {
//   try {
//     const response = await api.put(`${API_BASE_URL}/${customerId}/status`, { isActive });
//     return response; // Assuming 'api' returns data directly
//   } catch (error) {
//     console.error(`Error updating status for customer ${customerId}:`, error.response?.data || error.message || error);
//     throw error;
//   }
// };

const customerService = {
  getCustomers,
  searchCustomers,
  createCustomer,
  getCustomerById,
  // deleteCustomer,
  // updateCustomerStatus,
};

export default customerService;
