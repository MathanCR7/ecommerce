// ========================================================================
// FILE: client/src/Context/AuthContext.jsx
// ========================================================================

import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import authService from "../Services/authService";
import LoadingSpinner from "../Components/Common/LoadingSpinner"; // Use your loading component

// Create the context
const AuthContext = createContext(null);

// Custom hook to consume the context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // Store user object { _id, username, email, ... }
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Start loading on initial mount

  // Function to verify authentication status (e.g., on app load/refresh)
  const verifyAuthStatus = useCallback(async () => {
    console.log("Verifying auth status...");
    try {
      // No need to set isLoading here, it's true initially
      const data = await authService.checkStatus();
      if (data.isAuthenticated && data.user) {
        setUser(data.user);
        setIsAuthenticated(true);
        console.log("Auth Status: Authenticated", data.user.username);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        console.log("Auth Status: Not Authenticated", data.reason || "");
      }
    } catch (error) {
      // Network error or server issue during status check
      console.error("Auth verification failed:", error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      // Set loading to false only after the *initial* check completes
      if (isLoading) {
        setIsLoading(false);
        console.log("Initial auth check complete.");
      }
    }
  }, [isLoading]); // Depend on isLoading to ensure it only sets loading false once

  // Run verification check when the provider mounts
  useEffect(() => {
    verifyAuthStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array ensures this runs only once on mount

  // Login function: Called from LoginPage AFTER successful API call
  // Updates the context state based on data received from authService.login
  const login = useCallback((userData) => {
    if (userData) {
      setUser(userData);
      setIsAuthenticated(true);
      console.log("AuthContext: User logged in -", userData.username);
      // Optionally store user data in localStorage if needed for persistence across refreshes
      // localStorage.setItem('user', JSON.stringify(userData));
    } else {
      console.error(
        "AuthContext: Login function called with invalid user data"
      );
      setUser(null);
      setIsAuthenticated(false);
    }
  }, []);

  // Logout function: Calls the logout service and updates state
  const logout = useCallback(async () => {
    console.log("AuthContext: Attempting logout...");
    setIsLoading(true); // Show loading during logout API call
    try {
      await authService.logout();
      setUser(null);
      setIsAuthenticated(false);
      // Optionally clear localStorage
      // localStorage.removeItem('user');
      console.log("AuthContext: User logged out successfully.");
    } catch (error) {
      console.error("AuthContext: Logout failed:", error);
      // Decide if you want to force state clear even if API fails
      setUser(null);
      setIsAuthenticated(false);
      // localStorage.removeItem('user');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Memoize the context value to prevent unnecessary re-renders of consumers
  const contextValue = useMemo(
    () => ({
      user,
      isAuthenticated,
      isLoading, // Expose loading state for potential use in UI
      login,
      logout,
      verifyAuthStatus, // Expose verify if needed elsewhere (e.g., manual refresh button)
    }),
    [user, isAuthenticated, isLoading, login, logout, verifyAuthStatus]
  );

  // Render a loading indicator ONLY during the initial authentication check
  // This prevents rendering protected routes or redirecting before auth status is known
  if (isLoading && !isAuthenticated && user === null) {
    // More specific condition to only show on initial load
    return (
      <LoadingSpinner message="Initializing session..." isFullScreen={true} />
    );
  }

  // Render the children wrapped in the context provider
  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};
