// ========================================================================
// FILE: client/src/Services/api.js (Example - Adapt to your actual file)
// ========================================================================

import axios from "axios";

// Define the base URL for your API from environment variables or hardcoded
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"; // Adjust if needed

// Create the Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  // **** THIS IS THE CRUCIAL PART ****
  withCredentials: true, // <--- ADD THIS LINE
  // **********************************
  headers: {
    "Content-Type": "application/json", // Default Content-Type (can be overridden)
  },
  timeout: 10000, // Example: 10 second timeout
});

// --- Axios Interceptors (Keep your existing interceptors) ---

// Request Interceptor (Optional: Example for logging or adding headers)
api.interceptors.request.use(
  (config) => {
    console.log(
      `Axios Request: ${config.method?.toUpperCase()} ${config.url}`,
      config.data ? `| Data: ${JSON.stringify(config.data)}` : ""
    );
    // If you were using JWT tokens, you'd add the header here:
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers['Authorization'] = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    console.error("Axios Request Error:", error);
    return Promise.reject(error);
  }
);

// Response Interceptor (Keep your existing one for error handling)
api.interceptors.response.use(
  // Successful response: Return data directly
  (response) => response.data, // Return response.data on success

  // Error response: Process and throw a structured error
  (error) => {
    console.error("Axios Response Error Interceptor:", error);

    let processedError = {
      message: "An unexpected error occurred.",
      status: error.response?.status,
      details: null, // Or any specific error structure from backend
      originalError: error, // Keep original error for debugging
    };

    if (error.response) {
      // Server responded with a status code outside the 2xx range
      console.error("API Error Response:", error.response);
      processedError.message =
        error.response.data?.message || // Use backend message if available
        error.response.data?.error || // Check for 'error' field too
        error.message || // Fallback to Axios error message
        `Request failed with status code ${error.response.status}`;
      processedError.details = error.response.data; // Attach full data
    } else if (error.request) {
      // The request was made but no response was received
      console.error("API No Response:", error.request);
      processedError.message =
        "No response received from server. Check network or server status.";
      processedError.status = 503; // Service Unavailable often appropriate
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error("API Request Setup Error:", error.message);
      processedError.message = `Request setup failed: ${error.message}`;
    }

    // Throw the processed error so service calls can catch it
    return Promise.reject(processedError);
  }
);

export default api;
