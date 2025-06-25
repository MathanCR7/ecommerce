// ========================================================================
// FILE: client/src/Services/api.js
// ========================================================================
import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"; // Default fallback
console.log(`[API Service] Axios baseURL set to: ${API_BASE_URL}`);

// --- Create Axios Instance for API Calls ---
const api = axios.create({
  baseURL: API_BASE_URL, // Base URL *includes* /api
  withCredentials: true, // Send cookies with requests
  headers: {
    "Content-Type": "application/json",
  },
});

// --- Request Interceptor (Add Auth Token if available and needed) ---
api.interceptors.request.use(
  (config) => {
    // Only add token for admin-specific routes (adjust pattern if needed)
    // This pattern assumes admin routes live under a path containing '/admin/' within the API
    if (config.url?.includes("/admin/")) {
      const adminInfoString = localStorage.getItem("adminInfo"); // Or your storage key for admin credentials/token
      if (adminInfoString) {
        try {
          const adminInfo = JSON.parse(adminInfoString);
          const token = adminInfo?.token; // Assuming the token is stored within adminInfo object
          if (token) {
            // console.log(`[API Interceptor] Adding token for admin request to ${config.url}`);
            config.headers["Authorization"] = `Bearer ${token}`;
          }
        } catch (e) {
          console.error(
            "[API Interceptor] Error parsing adminInfo from localStorage:",
            e
          );
          localStorage.removeItem("adminInfo"); // Clean up potentially invalid data
        }
      }
    }
    // console.log(`[API Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => {
    console.error("[API Request Interceptor Error]", error);
    return Promise.reject(error); // Propagate the error
  }
);

// --- Response Interceptor (Handle Errors Globally and Extract Data) ---
api.interceptors.response.use(
  (response) => {
    // If the response is successful (status 2xx), return the data part directly
    // console.log(`[API Response Success] Status: ${response.status} Data:`, response.data);
    return response.data;
  },
  (error) => {
    // Log detailed error information for debugging purposes
    console.error(`[API Response Error]`, {
      message: error.message,
      url: error.config?.url, // Relative path requested
      baseURL: error.config?.baseURL, // Base URL used
      method: error.config?.method, // HTTP method
      status: error.response?.status, // HTTP status code from response (if available)
      responseData: error.response?.data, // Actual error payload from backend (if available)
    });

    let errorMessage = "An unexpected error occurred. Please try again later."; // Default error message
    let statusCode = null;

    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      statusCode = error.response.status;
      const responseData = error.response.data;

      // Try to extract a more specific error message from the backend response
      if (responseData) {
        if (typeof responseData === "string") {
          errorMessage = responseData; // Backend sent a plain string error
        } else if (typeof responseData === "object" && responseData !== null) {
          // Common backend error patterns: { message: '...' } or { error: '...' }
          errorMessage =
            responseData.message ||
            responseData.error ||
            JSON.stringify(responseData); // Fallback to stringifying the object
        } else {
          // Use HTTP status text if data is unhelpful
          errorMessage =
            error.response.statusText ||
            `Request failed with status ${statusCode}`;
        }
      } else {
        // No response data, use status text
        errorMessage =
          error.response.statusText ||
          `Request failed with status ${statusCode}`;
      }

      // --- Specific Status Code Handling (Customize as needed) ---
      if (statusCode === 401) {
        // Unauthorized - Token might be invalid or missing
        errorMessage =
          responseData?.message ||
          "Unauthorized. Please check your login credentials or session.";
        // Optional: Trigger logout or redirect to login page
        // Example: window.location.href = '/admin/login'; localStorage.removeItem('adminInfo');
      } else if (statusCode === 403) {
        // Forbidden - User authenticated but lacks permission
        errorMessage =
          responseData?.message ||
          "Forbidden. You do not have permission to perform this action.";
      } else if (statusCode === 404) {
        // Not Found - Check for potential configuration issues first
        const fullUrl = `${error.config?.baseURL || ""}${
          error.config?.url || ""
        }`;
        if (fullUrl.includes("/api/api/")) {
          // Check for accidental double '/api'
          errorMessage = `Configuration Error: Request URL has duplicate '/api' segment (${fullUrl}). Check Axios baseURL and service call paths.`;
          console.error("DOUBLE API ERROR DETECTED");
        } else {
          // Standard 404 message
          errorMessage =
            responseData?.message ||
            `API endpoint not found: ${error.config?.url}`;
        }
      } else if (statusCode === 413) {
        // Payload Too Large (often file uploads)
        errorMessage = `Upload failed: The file is too large.`;
      } else if (statusCode === 500) {
        // Internal Server Error
        errorMessage =
          responseData?.message ||
          "An error occurred on the server. Please try again or contact support.";
      }
      // Add more handlers for other status codes (e.g., 400 for validation errors) if needed
    } else if (error.request) {
      // The request was made but no response was received
      // `error.request` is an instance of XMLHttpRequest in the browser
      // Common causes: network error, CORS issue (check browser console), server offline
      errorMessage =
        "Network Error: Unable to connect to the server. Please check your internet connection or try again later.";
    } else {
      // Something happened in setting up the request that triggered an Error
      // e.g., an error in the request interceptor
      errorMessage = `Request setup error: ${error.message}`;
    }

    // Create a new error object to be passed down to the calling code's .catch() block
    // This ensures a consistent error structure with a user-friendly message.
    const processedError = new Error(errorMessage);
    processedError.originalError = error; // Attach the original Axios error object for potential deeper inspection
    processedError.statusCode = statusCode; // Make the status code easily accessible

    return Promise.reject(processedError); // Reject the promise with our processed error
  }
);

export default api; // Export the configured Axios instance for use in other service files
