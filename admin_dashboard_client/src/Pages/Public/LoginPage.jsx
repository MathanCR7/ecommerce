// ========================================================================
// FILE: client/src/Pages/Public/LoginPage.jsx
// ========================================================================

import React, { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../../Context/AuthContext"; // Use AuthContext
import authService from "../../Services/authService"; // Use AuthService
import loginImage from "../../Assets/fruit_bowl.png"; // Keep assets
import logoImage from "../../Assets/logo.png";
import LoadingSpinner from "../../Components/Common/LoadingSpinner";
import { FaEye, FaEyeSlash } from "react-icons/fa"; // Icons for password toggle
import "./AuthPage.css"; // Shared styles for Login/Signup

function LoginPage() {
  const [username, setUsername] = useState(""); // Can be username or email
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const { login } = useAuth(); // Get the login function from context
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect to intended page after login, or dashboard by default
  const from = location.state?.from?.pathname || "/admin/dashboard";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!username || !password) {
      setError("Username/Email and Password are required.");
      return;
    }
    setIsLoading(true);

    try {
      // authService.login now directly returns the data on success
      // or throws the processed error object on failure
      const data = await authService.login(username, password);

      if (data && data.user) {
        console.log("Login successful!", data.user);
        login(data.user); // Update context state
        navigate(from, { replace: true }); // Redirect to intended page or dashboard
      } else {
        // This case should be less likely with the interceptor handling
        console.error("Login Response Missing User Data:", data);
        setError("Login failed. Unexpected response from server.");
      }
    } catch (err) {
      // The error 'err' here is the processed object from the Axios interceptor
      console.error("Login Page Error:", err);
      setError(
        err.message ||
          "Login failed. Please check your credentials or try again later."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-main">
      {isLoading && (
        <LoadingSpinner message="Signing In..." isFullScreen={true} />
      )}
      <div className="auth-left">
        <img src={loginImage} alt="Organic Food and Healthy Lifestyle" />
        <div className="image-overlay-text">
          <h1>Admin Dashboard</h1>
          <p>Manage your business efficiently.</p>
        </div>
      </div>
      <div className="auth-right">
        <div className="auth-right-container">
          <div className="auth-logo">
            <img src={logoImage} alt="Company Logo" />
          </div>
          <div className="auth-center">
            <h2>Admin Login</h2>
            <p>Please enter your credentials</p>
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="login-username">Username or Email</label>
                <input
                  id="login-username"
                  type="text"
                  placeholder="Enter Username or Email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  aria-label="Username or Email"
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="login-password">Password</label>
                <div className="password-input-wrapper">
                  <input
                    id="login-password"
                    type={passwordVisible ? "text" : "password"}
                    placeholder="Enter your Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    aria-label="Password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="password-toggle-button"
                    onClick={() => setPasswordVisible(!passwordVisible)}
                    aria-label={
                      passwordVisible ? "Hide password" : "Show password"
                    }
                    disabled={isLoading}
                  >
                    {passwordVisible ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              {error && <p className="auth-error-message">{error}</p>}

              <div className="auth-options">
                {/* Placeholder for alignment or future options */}
                <span></span>
                {/* Optional: Forgot Password link */}
                {/* <Link to="/forgot-password" className="forgot-pass-link">Forgot Password?</Link> */}
              </div>

              <div className="auth-buttons">
                <button
                  type="submit"
                  className="btn btn-primary btn-full"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing In..." : "Sign In"}
                </button>
              </div>

              <p className="auth-bottom-p">
                Don't have an admin account?{" "}
                <Link to="/signup" className="auth-link">
                  Sign Up
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
