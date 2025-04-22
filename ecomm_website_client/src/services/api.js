import axios from "axios";

// Get backend URL from environment variable or default
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // IMPORTANT: Send cookies with requests
});

// Optional: Add interceptors for global error handling or request modification
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Example: Globally handle 401 Unauthorized (e.g., token expired)
    if (error.response?.status === 401) {
      // Check if it's not already a login/signup failure
      if (
        !error.config.url.includes("/auth/login") &&
        !error.config.url.includes("/auth/signup")
      ) {
        console.warn(
          "API request Unauthorized (401). Token might be invalid or expired."
        );
        // Potentially trigger logout or redirect here if needed, but AuthContext handles profile fetch failure.
        // Example: window.location.href = '/login';
      }
    }
    // Add other global error handling if desired
    return Promise.reject(error);
  }
);

export default api;
