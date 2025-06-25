// frontend/services/api.js
import axios from "axios";

const API_SERVICE_PATH = "/api";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
const API_BASE_URL = `${BACKEND_URL}${API_SERVICE_PATH}`;

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || "";
      if (
        !url.includes("/auth/login") &&
        !url.includes("/auth/signup") &&
        !url.includes("/auth/status") &&
        !url.includes("/auth/forgot-password")
      ) {
        console.warn(
          "API request Unauthorized (401). Token might be invalid or expired. URL:",
          url
        );
        // Consider using AuthContext to trigger logout or redirect to login
        // This is important for UX. For now, just logging.
        // Example:
        // import { AuthContext } from '../context/AuthContext';
        // const { logout } = useContext(AuthContext);
        // if (logout) logout();
      }
    }
    return Promise.reject(error);
  }
);

export const getServerBaseUrl = () => BACKEND_URL;

// --- Search Suggestions API ---
export const searchSuggestionsApi = (query) =>
  api.get("/search/suggestions", { params: { q: query } });

// --- User Authentication ---
export const loginUserApi = (credentials) =>
  api.post("/auth/login", credentials);
export const signupUserApi = (userData) => api.post("/auth/signup", userData);
export const logoutUserApi = () => api.post("/auth/logout");
export const checkAuthStatusApi = () => api.get("/auth/status");
export const sendOtpApi = (phoneData) => api.post("/auth/send-otp", phoneData);
export const checkExistingUserApi = (checkData) =>
  api.post("/auth/check-existing", checkData);
export const googleAuthUrl = `${API_BASE_URL}/auth/google`;

// --- User Profile ---
export const getUserProfileApi = () => api.get("/profile");
export const updateUserProfileApi = (profileData) =>
  api.put("/profile", profileData);
export const uploadProfilePictureApi = (formData) =>
  api.post("/profile/picture", formData);
export const verifyOtpAndUpdatePhoneApi = (data) =>
  api.put("/profile/phone-verification", data);

// --- Password Management ---
export const forgotPasswordApi = (identifierData) =>
  api.post("/auth/forgot-password", identifierData);
export const changePasswordApi = (passwordData) =>
  api.post("/auth/change-password", passwordData);

// --- User Addresses ---
export const getUserAddressesApi = () => api.get("/profile/addresses");
export const addAddressApi = (addressData) =>
  api.post("/profile/addresses", addressData);
export const updateAddressApi = (addressId, addressData) =>
  api.put(`/profile/addresses/${addressId}`, addressData);
export const deleteAddressApi = (addressId) =>
  api.delete(`/profile/addresses/${addressId}`);
export const setDefaultAddressApi = (addressId) =>
  api.put(`/profile/addresses/${addressId}/default`);

// --- Orders ---
// createOrderApi is used for COD directly posting to /api/orders
export const createOrderApi = (orderData) => api.post("/orders", orderData);
export const getMyOrdersApi = (params) =>
  api.get("/orders/myorders", { params }); // Added params for pagination/filtering
export const getOrderByIdApi = (orderId) => api.get(`/orders/${orderId}`);

// ⭐ NEW API FUNCTION for delivery eligibility check ⭐
export const checkDeliveryEligibilityApi = (shippingAddressId) => {
  // Corrected to use 'api' instance defined in this file
  return api.post("/orders/validate-delivery-address", { shippingAddressId });
};

// --- Payment APIs ---
// createRazorpayOrderApi is used to get a Razorpay order ID from backend
export const createRazorpayOrderApi = (
  amountDetails // Accepts object { amount, currency, shippingAddressId, deliveryOption, notes }
) => api.post("/payments/razorpay/order", amountDetails); // Pass the object

// verifyRazorpayPaymentApi sends Razorpay response + order payload to backend for final order creation
export const verifyRazorpayPaymentApi = (
  verificationData // Accepts object { paymentDetails, orderPayload }
) => api.post("/payments/razorpay/verify", verificationData); // Pass the object

// --- Cart APIs (NEW) ---
export const getCartApi = () => api.get("/cart");
// `addToCartApi` now handles both adding and updating quantity
export const addToCartApi = (itemId, quantity) =>
  api.post("/cart", { itemId, quantity });
export const removeFromCartApi = (itemId) => api.delete(`/cart/${itemId}`);
export const clearCartApi = () => api.delete("/cart");

// --- Wishlist APIs (NEW) ---
export const getWishlistApi = () => api.get("/wishlist");
export const toggleWishlistApi = (itemId) =>
  api.post(`/wishlist/toggle/${itemId}`);

// --- Coupon APIs (NEW) ---
export const getPublicCouponsApi = () => api.get("/coupons");
// Added/Corrected: validateCouponApi should send the code and potentially the cart total
export const validateCouponApi = (couponCode, cartSubtotal) =>
  api.post("/coupons/validate", { code: couponCode, cartTotal: cartSubtotal });

// --- Public Item/Category (already present, ensure correct paths) ---
// Example: export const getPublicItemsApi = (params) => api.get("/items", { params });
// Example: export const getPublicCategoriesApi = () => api.get("/categories");
// --- ADDED: Referral, Wallet, Loyalty API calls ---
export const getReferralCodeApi = () => api.get("/profile/referral-code"); // Get Referral Code
export const getWalletDetailsApi = () => api.get("/profile/wallet"); // Get Wallet Details (Balance + Transactions)
export const getLoyaltyDetailsApi = () => api.get("/profile/loyalty"); // Get Loyalty Details
// --- END ADDED ---

// --- ADDED: Top Selling Items API ---
export const getTopSellingItemsApi = () => api.get("/items/top-selling"); // Assuming this is your new endpoint
// --- END ADDED ---

export default api;
