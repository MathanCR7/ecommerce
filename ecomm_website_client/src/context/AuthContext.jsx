import React, { createContext, useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
  loginUserApi,
  signupUserApi,
  logoutUserApi,
  checkAuthStatusApi,
  sendOtpApi as sendOtp, // This is crucial for initial signup OTP
  verifyOtpAndUpdatePhoneApi, // This is for profile updates / Google signup post-verification
  googleAuthUrl,
  forgotPasswordApi,
  changePasswordApi,
} from "../services/api";
import { useNavigate } from "react-router-dom";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // const [token, setToken] = useState(null); // token is usually managed by httpOnly cookies
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();

  const handleError = (
    error,
    defaultMessage = "An unexpected error occurred."
  ) => {
    const errorMessage =
      error.response?.data?.message || error.message || defaultMessage;
    const errorsArray = error.response?.data?.errors;
    if (errorsArray && errorsArray.length > 0) {
      errorsArray.forEach((err) =>
        toast.error(err.msg, { id: `err-${err.param || Math.random()}` })
      );
    } else {
      toast.error(errorMessage);
    }
    console.error("Auth Context Error:", error.response || error);
    return null;
  };

  const checkAuthStatus = useCallback(async () => {
    // No setLoading(true) here initially to avoid content flash on every check
    // setLoading(true) will be set inside if truly needed, or by calling functions
    try {
      const response = await checkAuthStatusApi();
      if (response.data.isAuthenticated) {
        setUser(response.data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      // This is expected if no token or invalid token, so console.warn is fine
      // console.warn(
      //   "Auth status check: User not authenticated or error.",
      //   error.response?.data?.message || error.message
      // );
      setUser(null);
    } finally {
      setLoading(false); // Set loading to false after the first check completes
    }
  }, []);

  useEffect(() => {
    setLoading(true); // Set loading true when component mounts for initial check
    checkAuthStatus();
  }, [checkAuthStatus]);

  const login = async (credentials) => {
    setLoading(true);
    try {
      const response = await loginUserApi(credentials);
      setUser(response.data.user);
      toast.success(
        `Welcome back, ${
          response.data.user.displayName || response.data.user.username
        }!`
      );
      return response.data.user;
    } catch (error) {
      handleError(error, "Login failed.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (userData) => {
    setLoading(true);
    try {
      const response = await signupUserApi(userData); // Backend signup handles OTP if present
      setUser(response.data.user);
      // Toast is handled in Registrationform for successful signup
      return response.data.user;
    } catch (error) {
      handleError(error, "Signup failed.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = () => {
    // setLoading(true); // Optional: set loading before redirect
    window.location.href = googleAuthUrl;
  };

  const logout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    setLoading(true);
    try {
      await logoutUserApi();
      setUser(null);
      // setToken(null); // Not needed if using httpOnly cookies
      sessionStorage.removeItem("promptChangePasswordOnLogin");
      sessionStorage.removeItem("googlePhoneModalShown"); // also clear this on logout
      toast.success("Logged out successfully.");
      navigate("/");
    } catch (error) {
      handleError(error, "Logout failed.");
    } finally {
      setLoading(false);
      setIsLoggingOut(false);
    }
  };

  const forgotPassword = async (identifier) => {
    setLoading(true);
    try {
      const response = await forgotPasswordApi({ identifier });
      toast.success(
        response.data.message ||
          "Password reset instructions sent if account exists."
      );
      return true;
    } catch (error) {
      handleError(error, "Failed to send password reset instructions.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (passwordData) => {
    setLoading(true);
    try {
      const response = await changePasswordApi(passwordData);
      toast.success(response.data.message || "Password changed successfully.");
      return true;
    } catch (error) {
      handleError(error, "Failed to change password.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // This function is for the *initial registration OTP flow*
  const sendOtpForPhoneVerification = async (phone) => {
    setLoading(true);
    try {
      // `sendOtp` is an alias for `sendOtpApi` from services/api.js
      // This API call should be to your backend endpoint that triggers Twilio for a *new, unauthenticated* user.
      const response = await sendOtp({ phone }); // Assuming sendOtpApi makes the call

      // Check backend response structure. If backend returns 2xx but with {success: false}, handle it.
      if (response && response.data && response.data.success !== false) {
        // Toast is usually handled in the component for better context,
        // but if you want it here:
        // toast.success(response.data.message || "OTP sent successfully.");
        return true; // Indicate success for UI to proceed
      } else {
        // Handle cases where backend returns 2xx (not an HTTP error) but indicates logical failure
        handleError(
          { response },
          response?.data?.message || "Backend indicated OTP send failure."
        );
        return false;
      }
    } catch (error) {
      // Catches HTTP errors (4xx, 5xx) from axios/fetch
      handleError(
        error,
        "Failed to send OTP due to a network or server error."
      );
      return false;
    } finally {
      setLoading(false);
    }
  };

  // This function is for verifying phone for an *already authenticated user* (e.g., Google signup completion or profile update)
  // It uses `verifyOtpAndUpdatePhoneApi` which calls `/api/profile/phone-verification`
  const verifyAndUpdateUserPhone = async (phone, otp) => {
    setLoading(true);
    try {
      const response = await verifyOtpAndUpdatePhoneApi({ phone, otp });
      if (response.data.success) {
        setUser(response.data.user); // Update user in context
        toast.success(
          response.data.message || "Phone number verified and updated!"
        );
        return response.data.user;
      } else {
        toast.error(response.data.message || "Failed to update phone number.");
        return null;
      }
    } catch (error) {
      handleError(error, "Failed to update phone number.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = useCallback(async () => {
    // Only refresh if not already loading to prevent multiple calls
    if (!loading) {
      setLoading(true);
      await checkAuthStatus(); // setLoading(false) is in checkAuthStatus's finally
    }
  }, [checkAuthStatus, loading]);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        setLoading,
        // token, // Not needed if httpOnly
        login,
        signup,
        logout,
        loginWithGoogle,
        checkAuthStatus,
        sendOtpForPhoneVerification, // For initial signup
        verifyAndUpdateUserPhone, // For authenticated user phone verification/update
        refreshUser,
        forgotPassword,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
