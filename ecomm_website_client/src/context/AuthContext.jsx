// Example Structure (Your actual implementation might vary)
import React, { createContext, useState, useEffect, useCallback } from "react";
import api from "../services/api"; // Your API service
import Cookies from "js-cookie"; // If using js-cookie

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Start loading initially

  // Function to fetch user profile based on token/cookie
  const fetchUserProfile = useCallback(async () => {
    // Check if accessToken cookie exists first
    const token = Cookies.get("accessToken");
    if (!token) {
      // console.log("No access token found, user not logged in.");
      setUser(null);
      setLoading(false);
      // Clear user cookie if token is missing
      Cookies.remove("user");
      return;
    }

    // console.log("Access token found, attempting to fetch profile...");
    try {
      const response = await api.get("/auth/profile"); // Your protected profile endpoint
      // console.log("Profile fetched successfully:", response.data.user);
      setUser(response.data.user);
      // Update user cookie if needed (optional, depends if backend sets it)
      Cookies.set("user", JSON.stringify(response.data.user), {
        expires: 1,
        path: "/",
        domain:
          window.location.hostname === "localhost"
            ? "localhost"
            : ".yourdomain.com",
      }); // Adjust domain
    } catch (error) {
      // console.error("Failed to fetch profile:", error.response?.data?.message || error.message);
      setUser(null); // Failed to verify token or fetch user
      // Clear potentially invalid cookies
      Cookies.remove("accessToken");
      Cookies.remove("user");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch profile on initial load
  useEffect(() => {
    // console.log("AuthProvider Mounted: Fetching user profile...");
    fetchUserProfile();
  }, [fetchUserProfile]);

  // Function to update user state in context (and cookies) after changes
  const updateUserContext = useCallback((updatedUserData) => {
    // console.log("Updating user context with:", updatedUserData);
    setUser(updatedUserData);
    // Update the 'user' cookie as well
    Cookies.set("user", JSON.stringify(updatedUserData), {
      expires: 1,
      path: "/",
      domain:
        window.location.hostname === "localhost"
          ? "localhost"
          : ".yourdomain.com",
    }); // Adjust domain
  }, []);

  // Function for logging out
  const logout = useCallback(async () => {
    // console.log("Logging out user...");
    try {
      await api.post("/auth/logout"); // Call backend logout endpoint
    } catch (error) {
      console.error("Logout API call failed:", error);
      // Proceed with frontend logout regardless
    } finally {
      setUser(null);
      Cookies.remove("accessToken");
      Cookies.remove("user");
      // Optionally redirect to home or login page
      // window.location.href = '/login';
      console.log("User logged out, context and cookies cleared.");
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, fetchUserProfile, updateUserContext, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};
