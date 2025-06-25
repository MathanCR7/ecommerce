// src/components/ForgotPassword/ForgotPassword.jsx
import React, { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { AuthContext } from "../../context/AuthContext";
import Header from "../Header/Header"; // Import Header
import Footer from "../Footer/Footer"; // Import Footer
import "./ForgotPassword.css";

const ForgotPassword = () => {
  const [identifier, setIdentifier] = useState("");
  const { forgotPassword, loading } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) {
      toast.error("Please enter your email or phone number.");
      return;
    }

    const success = await forgotPassword(identifier.trim());
    if (success) {
      // The toast message about success is handled in AuthContext or by the API response directly.
      // Here, we can set a flag for the login page to prompt password change.
      sessionStorage.setItem("promptChangePasswordOnLogin", "true");
      toast.info(
        "If your account exists, a temporary password has been sent. Please check your email/SMS and login.",
        { duration: 6000 }
      );
      navigate("/login"); // Redirect to login page
    }
    // Error toasts are handled by AuthContext
  };

  return (
    <>
      {" "}
      {/* Added fragment to wrap Header, Footer and content */}
      <Header />
      {/* The existing section acts as the main content container */}
      <section className="forgot-password-page-section">
        <div className="forgot-password-card-container">
          <h1 className="forgot-password-title">Forgot Your Password?</h1>
          <p className="forgot-password-subtitle">
            No worries! Enter your email address or phone number below, and
            we'll help you reset it.
          </p>

          <form onSubmit={handleSubmit} className="forgot-password-main-form">
            <div className="forgot-password-input-group">
              <label htmlFor="identifier">Email or Phone Number</label>
              <input
                type="text"
                id="identifier"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                placeholder="Enter your registered email or phone"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="forgot-password-btn forgot-password-btn-submit"
              disabled={loading}
            >
              {loading ? "Sending..." : "Send Reset Instructions"}
            </button>

            <div className="forgot-password-links">
              <Link to="/login" className="forgot-password-text-link">
                Back to Login
              </Link>
            </div>
          </form>
        </div>
      </section>
      <Footer />
    </>
  );
};

export default ForgotPassword;
