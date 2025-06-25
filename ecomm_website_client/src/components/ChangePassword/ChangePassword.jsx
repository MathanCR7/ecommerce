// src/components/ChangePassword/ChangePassword.jsx
import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { AuthContext } from "../../context/AuthContext";
import Header from "../Header/Header"; // Import Header
import Footer from "../Footer/Footer"; // Import Footer
import "./ChangePassword.css";

const ChangePassword = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  // Assuming changePassword is in AuthContext, added logout
  const { changePassword, loading, user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  // Redirect if no user is authenticated
  // This check is essential as ChangePassword is a ProtectedRoute
  if (!user) {
    // ProtectedRoute should handle this, but this is a fallback.
    // A simple null return or loading state might be appropriate depending on ProtectedRoute's behavior
    // If ProtectedRoute ensures `user` is available, this check is less critical but harmless.
    // Assuming ProtectedRoute works, the useEffect in ProfilePage handles initial unauthenticated access.
    // For direct access to /change-password when not logged in, ProtectedRoute should redirect.
    // If somehow reached, navigate to login.
    navigate("/login");
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      toast.error("Please fill in all fields.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters long.");
      return;
    }
    // Prevent changing to the exact same password (optional but good practice)
    if (currentPassword === newPassword) {
      toast.error("New password must be different from the current password.");
      return;
    }

    const success = await changePassword({ currentPassword, newPassword });
    if (success) {
      toast.success(
        "Password changed successfully! Please log in again with your new password."
      );
      // Logout user after successful password change to enforce re-login
      // This is a good security practice. The backend might also invalidate all existing sessions.
      await logout(); // Call logout from context
      // After logout completes (and navigates to /), explicitly navigate to login
      navigate("/login", { replace: true });
    }
    // Error toasts handled by AuthContext or changePassword function
  };

  return (
    <>
      {" "}
      {/* Added fragment to wrap Header, Footer and content */}
      <Header />
      {/* The existing section acts as the main content container */}
      <section className="change-password-page-section">
        <div className="change-password-card-container">
          <h1 className="change-password-title">Change Your Password</h1>
          <p className="change-password-subtitle">
            Create a new, strong password for your account.
          </p>

          <form onSubmit={handleSubmit} className="change-password-main-form">
            <div className="change-password-input-group">
              <label htmlFor="currentPassword">Current Password</label>
              <input
                type="password"
                id="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                placeholder="Enter your current (or temporary) password"
                disabled={loading}
                autoComplete="current-password"
              />
            </div>

            <div className="change-password-input-group">
              <label htmlFor="newPassword">New Password</label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="At least 8 characters"
                minLength="8"
                disabled={loading}
                autoComplete="new-password"
              />
            </div>

            <div className="change-password-input-group">
              <label htmlFor="confirmNewPassword">Confirm New Password</label>
              <input
                type="password"
                id="confirmNewPassword"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
                placeholder="Re-type new password"
                disabled={loading}
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              className="change-password-btn change-password-btn-submit"
              disabled={loading}
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </section>
      <Footer />
    </>
  );
};

export default ChangePassword;
