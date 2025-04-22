import React, { useContext } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();

  if (loading) {
    // Optional: Show a loading indicator while authentication check is in progress
    // This prevents flashing the login page briefly if the user is actually logged in.
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        {/* Replace with a proper loading spinner component */}
        Loading...
      </div>
    );
  }

  if (!user) {
    // User is not logged in, redirect them to the /login page
    // state={{ from: location }} passes the intended destination page
    // So after successful login, the user can be redirected back.
    // replace={true} replaces the current entry in the history stack,
    // so the user doesn't return to the protected route by pressing 'back'.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // User is authenticated, render the child components (the protected page)
  return children;
};

export default ProtectedRoute;
