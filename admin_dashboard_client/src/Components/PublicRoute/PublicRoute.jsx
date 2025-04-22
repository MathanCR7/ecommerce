// ========================================================================
// FILE: client/src/Components/PublicRoute/PublicRoute.jsx
// ========================================================================

import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../Context/AuthContext";
import LoadingSpinner from "../Common/LoadingSpinner";

/**
 * A wrapper component for public routes (like Login, Signup).
 * - Checks authentication status using AuthContext.
 * - Shows loading indicator during initial check.
 * - If authenticated, redirects the user AWAY from the public page (e.g., to the admin dashboard).
 * - If not authenticated, renders the public page component (via <Outlet />).
 */
const PublicRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  // Still show loading during initial check to prevent premature rendering/redirect
  if (isLoading) {
    console.log("PublicRoute: Checking authentication...");
    return <LoadingSpinner message="Loading..." isFullScreen={true} />;
  }

  // If loading is finished and the user IS authenticated
  if (isAuthenticated) {
    console.log("PublicRoute: Authenticated. Redirecting to admin dashboard.");
    // Redirect authenticated users away from public pages (e.g., login/signup)
    // Redirect to the main admin dashboard or another default authenticated route.
    return <Navigate to="/admin/dashboard" replace />;
  }

  // If loading is finished and user is NOT authenticated, render the requested public route
  console.log("PublicRoute: Not authenticated. Rendering public content.");
  return <Outlet />; // Renders the child route component (e.g., LoginPage, SignupPage)
};

export default PublicRoute;
