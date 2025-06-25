// src/components/Loginform/Loginform.jsx
import React, { useState, useContext } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import toast from "react-hot-toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGoogle } from "@fortawesome/free-brands-svg-icons";
import "./Loginform.css";

const Loginform = () => {
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const { login, loginWithGoogle, loading } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!loginIdentifier || !password) {
      toast.error("Please provide both identifier and password.");
      return;
    }
    const loggedInUser = await login({ loginIdentifier, password });
    if (loggedInUser) {
      toast.success(
        `Welcome back, ${loggedInUser.displayName || loggedInUser.username}!`,
        {
          icon: "👋",
          style: {
            borderRadius: "10px",
            background: "#333",
            color: "#fff",
          },
        }
      );
      // Check if password change is prompted
      const promptChange = sessionStorage.getItem(
        "promptChangePasswordOnLogin"
      );
      if (promptChange === "true") {
        sessionStorage.removeItem("promptChangePasswordOnLogin");
        toast.info("Please change your temporary password.", {
          duration: 5000,
        });
        navigate("/change-password", { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    }
  };

  const handleGoogleLogin = async () => {
    const googleUser = await loginWithGoogle();
    if (googleUser) {
      toast.success(
        `Signed in with Google as ${
          googleUser.displayName || googleUser.email
        }!`,
        {
          icon: "🚀",
        }
      );
      navigate(from, { replace: true });
    }
  };

  return (
    <section className="login-page-section">
      <div className="login-card-container">
        <h1 className="login-title">Login</h1>

        <form onSubmit={handleSubmit} className="login-main-form">
          <div className="login-form-columns">
            {/* Left Column: Form Fields */}
            <div className="login-fields-column">
              <div className="login-input-group">
                <label htmlFor="loginIdentifier">Email or Username</label>
                <input
                  type="text"
                  id="loginIdentifier"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  required
                  placeholder="Enter Your Email or Username"
                  disabled={loading}
                  autoComplete="username"
                />
              </div>

              <div className="login-input-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Please Enter Your Password"
                  disabled={loading}
                  autoComplete="current-password"
                />
              </div>
            </div>

            {/* Right Column: Social Login */}
            <div className="login-social-column">
              <button
                type="button"
                className="login-btn login-btn-social login-btn-google"
                onClick={handleGoogleLogin}
                disabled={loading}
              >
                <FontAwesomeIcon icon={faGoogle} className="social-icon" />
                Login with Google
              </button>
            </div>
          </div>

          <div className="login-bottom-actions">
            <div className="login-action-group-left">
              <button
                type="submit"
                className="login-btn login-btn-submit"
                disabled={loading}
              >
                {loading ? "Logging In..." : "Login"}
              </button>
              <Link to="/registration" className="login-text-link">
                Create An Account
              </Link>
            </div>
            {/* MODIFIED: Added Forgot Password link */}
            <Link to="/forgot-password" className="login-text-link">
              Forgot Password?
            </Link>
          </div>
        </form>
      </div>
    </section>
  );
};

export default Loginform;
