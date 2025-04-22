// ========================================================================
// FILE: client/src/Services/authService.js
// ========================================================================

import api from "./api"; // Import the configured Axios instance

// *** CORRECTED: Point to the admin authentication endpoints ***
const API_URL_PREFIX = "/admin/auth";
// ************************************************************

/**
 * Send OTP request to the backend for Admin registration/verification.
 * Handles the POST request to the /admin/auth/send-otp endpoint.
 *
 * @param {string} mobileNumber - The mobile number in +91XXXXXXXXXX format.
 * @returns {Promise<object>} Response data from the API (e.g., { success, message, sid }) on success.
 * @throws {object} Throws the processed error object from the Axios interceptor on failure.
 */
const sendOtp = async (mobileNumber) => {
  try {
    // The actual URL will be something like: http://localhost:5000/api/admin/auth/send-otp
    const data = await api.post(`${API_URL_PREFIX}/send-otp`, { mobileNumber });
    console.log("Admin Send OTP Service Success:", data);
    return data;
  } catch (error) {
    console.error("Admin Send OTP Service Error:", error.message, error);
    throw error;
  }
};

/**
 * Verify Admin OTP code with the backend.
 * Handles the POST request to the /admin/auth/verify-otp endpoint.
 *
 * @param {string} mobileNumber - The mobile number associated with the OTP.
 * @param {string} otp - The 6-digit OTP code entered by the user.
 * @returns {Promise<object>} Response data (e.g., { success, message }) on successful verification.
 * @throws {object} Throws the processed error object (e.g., for invalid OTP) on failure.
 */
const verifyOtp = async (mobileNumber, otp) => {
  try {
    const data = await api.post(`${API_URL_PREFIX}/verify-otp`, {
      mobileNumber,
      otp,
    });
    console.log("Admin Verify OTP Service Success:", data);
    return data;
  } catch (error) {
    console.error("Admin Verify OTP Service Error:", error.message, error);
    throw error;
  }
};

/**
 * Register a new admin user.
 * Handles the POST request to the /admin/auth/register endpoint.
 * Assumes OTP/mobile verification happened *before* calling this.
 *
 * @param {string} username - The desired username for the new admin account.
 * @param {string} password - The user's chosen password.
 * @param {string} mobileNumber - The user's verified mobile number.
 * @param {string} [email] - Optional email address.
 * @param {string} [firstName] - Optional first name.
 * @param {string} [lastName] - Optional last name.
 * @returns {Promise<object>} Response data (e.g., { success, message, user: userInfo }) on success.
 * @throws {object} Throws the processed error object on failure.
 */
const register = async (
  username,
  password,
  mobileNumber,
  email,
  firstName,
  lastName
  // Add 'role' if you allow setting it during registration
  // role
) => {
  try {
    const payload = {
      username,
      password,
      mobileNumber,
      email,
      firstName,
      lastName,
      // role, // Include if applicable
    };
    Object.keys(payload).forEach(
      (key) =>
        (payload[key] === undefined ||
          payload[key] === null ||
          payload[key] === "") &&
        delete payload[key]
    );

    const data = await api.post(`${API_URL_PREFIX}/register`, payload);
    console.log("Admin Register Service Success:", data);
    return data;
  } catch (error) {
    console.error("Admin Register Service Error:", error.message, error);
    throw error;
  }
};

/**
 * Log in an admin user.
 * Handles the POST request to the /admin/auth/login endpoint.
 *
 * @param {string} username - The username (or email) used for login.
 * @param {string} password - The user's password.
 * @returns {Promise<object>} Response data, typically { success, message, user: userInfo } on success.
 * @throws {object} Throws the processed error object on failure.
 */
const login = async (username, password) => {
  try {
    const data = await api.post(`${API_URL_PREFIX}/login`, {
      username,
      password,
    });
    console.log("Admin Login Service Success:", data);
    return data;
  } catch (error) {
    console.error("Admin Login Service Error:", error.message, error);
    throw error;
  }
};

/**
 * Log out the currently authenticated admin user.
 * Handles the POST request to the /admin/auth/logout endpoint.
 * Relies on `withCredentials: true` in api.js.
 *
 * @returns {Promise<object>} Response data (e.g., { success, message }) on successful logout.
 * @throws {object} Throws the processed error object on failure.
 */
const logout = async () => {
  try {
    const data = await api.post(`${API_URL_PREFIX}/logout`);
    console.log("Admin Logout Service Success:", data);
    return data;
  } catch (error) {
    console.error("Admin Logout Service Error:", error.message, error);
    throw error;
  }
};

/**
 * Check the current admin authentication status.
 * Handles the GET request to the /admin/auth/status endpoint.
 *
 * @returns {Promise<object>} Response data: { isAuthenticated: boolean, user: object | null, reason?: string }.
 * @throws {object} Throws processed error only on critical failures or specific auth errors needing context handling.
 */
const checkStatus = async () => {
  try {
    const data = await api.get(`${API_URL_PREFIX}/status`);
    // console.log("Admin Check Status Service Success:", data); // Can be noisy
    return data;
  } catch (error) {
    console.error("Admin Check Status Service Error:", error.message, error);
    if (error.status !== 401) {
      return {
        isAuthenticated: false,
        user: null,
        reason: "Status check failed due to network or server error.",
      };
    }
    throw error; // Re-throw 401 etc. if AuthContext needs to react
  }
};

// Export all functions as a single service object
const authService = {
  sendOtp,
  verifyOtp,
  register,
  login,
  logout,
  checkStatus,
};

export default authService;
