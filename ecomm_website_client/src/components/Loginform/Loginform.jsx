import React, { useState, useContext } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import toast from "react-hot-toast";
import { FaGoogle } from "react-icons/fa"; // Google Icon
import "./loginform.css"; // Link the CSS file

const LoginForm = () => {
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const { login, loading } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  // Get redirect path from location state or default to home '/'
  const from = location.state?.from?.pathname || "/";

  // Handle local form submission
  const handleLogin = async (event) => {
    event.preventDefault();
    if (!loginIdentifier || !password) {
      toast.error("Please enter your credentials.");
      return;
    }
    const success = await login(loginIdentifier, password); // Call login from context
    if (success) {
      // Redirect to the page the user was trying to access, or home
      navigate(from, { replace: true });
    }
    // Error toasts are handled within the login context function
  };

  // Function to initiate Google Login flow
  const handleGoogleLogin = () => {
    // Construct the backend Google auth URL
    const backendUrl =
      import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
    // Redirect the browser to the backend endpoint to start OAuth
    window.location.href = `${backendUrl}/auth/google`;
  };

  return (
    <section className="loginform-section">
      {" "}
      {/* Updated class */}
      <div className="login-container">
        {" "}
        {/* Updated class */}
        <div className="login-wrapper">
          {" "}
          {/* Updated class */}
          <div className="login-heading">
            {" "}
            {/* Updated class */}
            <h1>Sign In</h1>
            <p>
              New User?{" "}
              <Link to="/registration" className="link-style">
                Create an account
              </Link>
            </p>
          </div>
          {/* Login Form */}
          <form onSubmit={handleLogin} className="login-form-element">
            {" "}
            {/* Updated class */}
            <div className="input-group">
              <label htmlFor="loginIdentifierInput">
                Username, Email, or Phone
              </label>
              <input
                id="loginIdentifierInput"
                type="text"
                name="loginIdentifier"
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                required
                disabled={loading} // Disable while processing
                placeholder="Enter username, email, or phone"
              />
            </div>
            <div className="input-group">
              <label htmlFor="passwordInput">Password</label>
              <input
                id="passwordInput"
                type="password" // Important: Use password type
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                placeholder="Enter your password"
              />
            </div>
            <p className="forgot-pass">
              Forgot Password?{" "}
              {/* Update this link if/when forgot password page exists */}
              <Link to="/forgot-password" className="link-style">
                Click here to reset
              </Link>
            </p>
            {/* Submit Button */}
            <button
              type="submit"
              className="btn-submit btn-primary" // Added btn-primary for potential shared styling
              disabled={loading}
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>
          {/* Divider */}
          <div className="divider">
            <span>OR</span>
          </div>
          {/* Google Login Button */}
          <button
            onClick={handleGoogleLogin}
            className="btn-google"
            disabled={loading}
          >
            <FaGoogle className="google-icon" /> Sign in with Google
          </button>
        </div>
      </div>
    </section>
  );
};

export default LoginForm;
