// src/pages/profilepage/ProfilePage.jsx
import React, { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { getServerBaseUrl } from "../../services/api";
import toast from "react-hot-toast";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import "./ProfilePage.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBox,
  faTruckFast,
  faUserEdit,
  faMapMarkerAlt,
  faHeadset,
  faTags,
  faUsers,
  faBell,
  faWallet,
  faStar,
  faEnvelope,
  faShieldAlt, // Used for Change Password link icon
  faFileContract,
  faInfoCircle,
  faSignOutAlt,
  faUser,
  faImage,
  faChevronRight,
  faSpinner,
  // faTrashAlt, // Removed as Delete Account is removed
} from "@fortawesome/free-solid-svg-icons";

const ProfilePage = () => {
  // Ensure AuthContext provides 'user', 'loading', 'logout', 'refreshUser'
  const { user, loading, logout } = useContext(AuthContext); // Removed refreshUser as it's not used here
  const navigate = useNavigate();
  const [serverBaseURL, setServerBaseURL] = useState("");

  useEffect(() => {
    // Redirect if not logged in after initial loading check
    if (!loading && !user) {
      toast.error("Please log in to view your profile.", {
        id: "profile-login-redirect", // Prevents duplicate toasts
      });
      navigate("/login", { replace: true });
    }
    // Set server base URL once user is loaded
    if (user) {
      setServerBaseURL(getServerBaseUrl());
    }
  }, [user, loading, navigate]); // Depend on user, loading, and navigate

  const handleLogout = async () => {
    // The logout context function should handle the API call,
    // clearing user state, showing success toast, and navigating.
    await logout();
  };

  // Removed handleDeleteAccount function as the button is removed

  // Render loading state with Header and Footer
  if (loading) {
    return (
      <>
        <Header />
        <div className="profile-page-wrapper">
          <div className="profile-page-loading">
            <FontAwesomeIcon icon={faSpinner} spin size="2x" />
            <span>Loading Profile...</span>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // This check is a safeguard, ProtectedRoute should prevent reaching here without a user
  // But including it makes the component robust. The useEffect above handles the redirect.
  if (!user) {
    return null; // Or a simple message if redirect is pending
  }

  // --- Profile Picture Logic ---
  let profilePictureUrl = "/assets/main-logo/default_avatar.png"; // Fallback default
  let hasCustomPicture = false;
  let placeholderIcon = faUser; // Default placeholder icon

  // Determine if a custom picture is set and get its URL
  if (user.profilePicture) {
    if (user.profilePicture.startsWith("http")) {
      profilePictureUrl = user.profilePicture;
      hasCustomPicture = true;
    } else if (user.profilePicture.startsWith("users/")) {
      // Use serverBaseURL for relative paths
      if (serverBaseURL) {
        profilePictureUrl = `${serverBaseURL}/uploads/${user.profilePicture}`;
        hasCustomPicture = true;
      } else {
        // If serverBaseURL isn't ready, indicate image is expected but not ready
        placeholderIcon = faImage;
        hasCustomPicture = false; // Treat as no *ready* custom picture
      }
    } else if (user.profilePicture !== "/assets/main-logo/default_avatar.png") {
      // Handle other potential non-URL paths that aren't the explicit default
      if (serverBaseURL) {
        profilePictureUrl = `${serverBaseURL}/${user.profilePicture.replace(
          /^\//,
          ""
        )}`;
        hasCustomPicture = true;
      } else {
        placeholderIcon = faImage;
        hasCustomPicture = false;
      }
    }
  }

  // Determine if the placeholder should be shown
  const showPlaceholder =
    !hasCustomPicture ||
    (profilePictureUrl.startsWith(serverBaseURL) && !serverBaseURL);

  // --- End Profile Picture Logic ---

  const profileItems = [
    { name: "My Orders", icon: faBox, link: "/my-orders" },
    { name: "Track My Order", icon: faTruckFast, link: "/track-order" },
    { name: "Edit Profile", icon: faUserEdit, link: "/profile/settings" },
    {
      name: "Manage Addresses",
      icon: faMapMarkerAlt,
      link: "/profile/addresses", // Ensure this matches the route in AllRoutes.jsx
    },
    { name: "Customer Support", icon: faHeadset, link: "/support" },
    { name: "My Coupons", icon: faTags, link: "/coupons" },
    { name: "Refer & Earn", icon: faUsers, link: "/refer-earn" },
    { name: "Notifications", icon: faBell, link: "/notifications" },
    { name: "My Wallet", icon: faWallet, link: "/wallet" },
    { name: "Loyalty Points", icon: faStar, link: "/loyalty" },
    { name: "Contact Us", icon: faEnvelope, link: "/contact-us" },
    { name: "Privacy Policy", icon: faShieldAlt, link: "/privacy-policy" },
    {
      name: "Terms & Conditions",
      icon: faFileContract,
      link: "/terms-and-conditions",
    },
    { name: "About Us", icon: faInfoCircle, link: "/about-us" },
  ];

  return (
    <>
      <Header />
      <div className="profile-page-wrapper">
        <div className="profile-page-container">
          <div className="profile-header-card">
            <div className="profile-header-content">
              <div className="profile-avatar-container">
                {/* Render img only if hasCustomPicture is true AND we have a reliable URL */}
                {hasCustomPicture && !showPlaceholder && (
                  <img
                    src={profilePictureUrl}
                    alt={user.displayName || user.username}
                    className="profile-avatar-img"
                    onError={(e) => {
                      console.error(
                        "Failed to load profile image:",
                        profilePictureUrl,
                        e
                      );
                      e.target.onerror = null; // Prevent infinite loop
                      e.target.style.display = "none"; // Hide broken image
                      // Find and show the placeholder sibling div
                      const placeholderEl =
                        e.target.parentElement.querySelector(
                          ".profile-avatar-placeholder"
                        );
                      if (placeholderEl) placeholderEl.style.display = "flex";
                    }}
                  />
                )}
                {/* Always render placeholder, show it if showPlaceholder is true, or if image fails */}
                <div
                  className="profile-avatar-placeholder"
                  style={{ display: showPlaceholder ? "flex" : "none" }}
                >
                  <FontAwesomeIcon icon={placeholderIcon} />
                </div>
              </div>
              <h1 className="profile-display-name">
                {user.displayName || user.username}
              </h1>
              <p className="profile-email">{user.email}</p>
              {/* Display phone if available */}
              {user.phone && (
                <p className="profile-phone">Phone: {user.phone}</p>
              )}
              {/* Display phone verified status */}
              {user.phone && (
                <p
                  className={`profile-phone-status ${
                    user.isPhoneVerified ? "verified" : "unverified"
                  }`}
                >
                  Phone: {user.phone} (
                  {user.isPhoneVerified ? "Verified" : "Unverified"})
                </p>
              )}
              {/* Hint for Google users without phone */}
              {user.googleId && !user.phone && (
                <p className="profile-phone-instruction">
                  Consider adding a phone number for account security.
                </p>
              )}
            </div>

            {/* --- Profile Actions Section --- */}
            <div className="profile-actions">
              {/* ADDED Condition: Only show Change Password if user.googleId is NOT present */}
              {!user.googleId && (
                <Link to="/change-password" className="profile-action-link">
                  <FontAwesomeIcon
                    icon={faShieldAlt}
                    style={{ marginRight: "8px" }}
                  />
                  Change Password
                </Link>
              )}
              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="profile-action-button logout-button"
                role="button" // Explicitly define as button for accessibility
                tabIndex="0" // Make div focusable
                onKeyPress={(e) =>
                  (e.key === "Enter" || e.key === " ") && handleLogout()
                }
              >
                <FontAwesomeIcon
                  icon={faSignOutAlt}
                  style={{ marginRight: "8px" }}
                />
                Logout
              </button>
              {/* Delete Account Link Removed */}
            </div>
            {/* --- End Profile Actions Section --- */}
          </div>

          {/* --- Other Profile Options Grid --- */}
          <div className="profile-options-grid">
            {profileItems.map((item) => (
              <Link
                to={item.link}
                key={item.name}
                className="profile-option-card"
              >
                <div className="profile-option-icon-wrapper">
                  <FontAwesomeIcon icon={item.icon} />
                </div>
                <span className="profile-option-name">{item.name}</span>
                <FontAwesomeIcon
                  icon={faChevronRight}
                  className="profile-option-arrow"
                />
              </Link>
            ))}
          </div>
          {/* --- End Other Profile Options Grid --- */}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default ProfilePage;
