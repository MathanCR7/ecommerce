// ========================================================================
// FILE: client/src/Services/api.js (Corrected & Final Version)
// ========================================================================

import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

console.log(`[API Service] Axios baseURL set to: ${API_BASE_URL}`);

// --- Create Axios Instance for API Calls ---
const api = axios.create({
  baseURL: API_BASE_URL,
  // This is the single most important setting for your session-based authentication.
  // It tells the browser to automatically send the 'connect.sid' cookie with every request.
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// --- REMOVED: REQUEST INTERCEPTOR ---
// The entire 'api.interceptors.request' block has been removed.
// Your backend uses session cookies (managed by `passport.js`), NOT Bearer tokens.
// The old code was trying to add an 'Authorization: Bearer <token>' header,
// which your backend ignores. This was the source of the confusion and is not needed.

// --- Response Interceptor (This part is excellent and should be kept) ---
// It standardizes error handling across your application.
api.interceptors.response.use(
  (response) => {
    // If the response is successful (status 2xx), return the data part directly.
    return response.data;
  },
  (error) => {
    // Log detailed error information for debugging purposes.
    console.error(`[API Response Error]`, {
      message: error.message,
      url: error.config?.url, // Relative path requested
      baseURL: error.config?.baseURL, // Base URL used
      method: error.config?.method, // HTTP method
      status: error.response?.status, // HTTP status code from response
      responseData: error.response?.data, // Actual error payload from backend
    });

    let errorMessage = "An unexpected error occurred. Please try again later.";
    let statusCode = null;

    if (error.response) {
      // The server responded with a status code outside the 2xx range.
      statusCode = error.response.status;
      const responseData = error.response.data;

      // Extract a more specific error message from the backend response.
      errorMessage =
        responseData?.message ||
        responseData?.error ||
        JSON.stringify(responseData) || // Fallback to the full object
        error.response.statusText; // Fallback to HTTP status text

      // Specific Status Code Handling
      if (statusCode === 401) {
        errorMessage =
          responseData?.message ||
          "Unauthorized. Your session may have expired. Please log in again.";
        // You could add logic here to automatically redirect to the login page if desired.
        // For example: window.location.href = '/admin/login';
      } else if (statusCode === 403) {
        errorMessage =
          responseData?.message ||
          "Forbidden. You do not have permission to perform this action.";
      } else if (statusCode === 404) {
        errorMessage =
          responseData?.message || `API endpoint not found: ${error.config?.url}`;
      } else if (statusCode === 500) {
        errorMessage =
          responseData?.message ||
          "An error occurred on the server. Please try again or contact support.";
      }
    } else if (error.request) {
      // The request was made but no response was received (e.g., network error, server down).
      errorMessage =
        "Network Error: Unable to connect to the server. Please check your internet connection.";
    } else {
      // Something happened in setting up the request that triggered an error.
      errorMessage = `Request setup error: ${error.message}`;
    }

    // Create a new, cleaner error object to be passed down to your components' .catch() blocks.
    const processedError = new Error(errorMessage);
    processedError.statusCode = statusCode; // Make the status code easily accessible
    return Promise.reject(processedError);
  }
);

export default api;