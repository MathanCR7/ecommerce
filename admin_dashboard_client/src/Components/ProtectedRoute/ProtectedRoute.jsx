// ========================================================================
// FILE: client/src/Components/ProtectedRoute/ProtectedRoute.jsx
// ========================================================================

import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../Context/AuthContext";
import LoadingSpinner from "../Common/LoadingSpinner";

/**
 * A wrapper component for routes that require authentication.
 * - Checks authentication status using AuthContext.
 * - Shows a loading indicator during the initial auth check.
 * - Redirects unauthenticated users to the login page.
 * - Renders the nested route components (via <Outlet />) for authenticated users.
 */
const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation(); // Get current location to redirect back after login

  // Show loading spinner only during the initial authentication verification phase
  if (isLoading) {
    console.log("ProtectedRoute: Checking authentication...");
    // Use a full-screen spinner for initial load blocking
    return <LoadingSpinner message="Verifying access..." isFullScreen={true} />;
  }

  // If loading is finished and user is NOT authenticated
  if (!isAuthenticated) {
    console.log("ProtectedRoute: Not authenticated. Redirecting to login.");
    // Redirect to login page, passing the current location in state
    // so the user can be redirected back after successful login.
    return <Navigate to="/login" state={{ from: location }} replace />;
    // 'replace' prevents the current (protected) route from being added to history.
  }

  // If loading is finished and user IS authenticated, render the child routes
  // <Outlet /> renders the matched nested route component (e.g., AdminLayout)
  console.log("ProtectedRoute: Authenticated. Rendering content.");
  return <Outlet />;
};

export default ProtectedRoute;
