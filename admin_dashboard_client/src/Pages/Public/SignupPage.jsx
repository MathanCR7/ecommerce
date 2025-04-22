import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import authService from "../../Services/authService"; // Correct path assuming structure
import loginImage from "../../Assets/fruit_bowl.png"; // Ensure path is correct
import logoImage from "../../Assets/logo.png"; // Ensure path is correct
import LoadingSpinner from "../../Components/Common/LoadingSpinner"; // Ensure path is correct
import { FaEye, FaEyeSlash, FaCheckCircle } from "react-icons/fa";
// Assuming App.css or index.css contains the '.auth-main', '.auth-form', etc. styles

// Regex for validation
const indianMobileRegex = /^\+91[6-9]\d{9}$/; // Starts with +91, then 6-9, then 9 digits
const otpRegex = /^\d{6}$/; // Exactly 6 digits

function SignupPage() {
  // --- Form Fields ---
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mobileNumber, setMobileNumber] = useState(""); // Should include +91
  const [otp, setOtp] = useState("");

  // --- UI State ---
  const [step, setStep] = useState(1); // 1: Details, 2: OTP Verification
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

  const navigate = useNavigate();

  // --- Step 1: Handle Submission of Details & Request OTP ---
  const handleSendOtp = async (e) => {
    e.preventDefault(); // Prevent default form submission
    setError("");
    setSuccessMessage("");

    // --- Frontend Validations ---
    if (
      !username.trim() ||
      !password ||
      !confirmPassword ||
      !mobileNumber.trim()
    ) {
      setError(
        "All fields (Username, Password, Confirm Password, Mobile Number) are required."
      );
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!indianMobileRegex.test(mobileNumber)) {
      setError(
        "Invalid Mobile Number. Format must be +91XXXXXXXXXX (starting with 6-9)."
      );
      return;
    }

    // --- Proceed to Send OTP ---
    setLoadingMessage("Sending OTP...");
    setIsLoading(true);
    try {
      // Call the backend service
      await authService.sendOtp(mobileNumber);
      setSuccessMessage("OTP sent successfully! Please check your mobile.");
      setStep(2); // Move to OTP verification step
      setError(""); // Clear any previous errors
    } catch (err) {
      // Handle errors from the backend (processed by api.js interceptor)
      setError(
        err.message ||
          "Failed to send OTP. Please check the number or try again."
      );
      console.error("Send OTP Error:", err); // Log the full error for debugging
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  // --- Step 2: Handle OTP Verification & Registration ---
  const handleVerifyOtpAndRegister = async (e) => {
    e.preventDefault(); // Prevent default form submission
    setError("");
    setSuccessMessage("");

    // --- Frontend OTP Validation ---
    if (!otp || !otpRegex.test(otp)) {
      setError("Please enter the 6-digit OTP received on your mobile.");
      return;
    }

    setLoadingMessage("Verifying OTP & Registering...");
    setIsLoading(true);

    try {
      // 1. Verify OTP with the backend
      await authService.verifyOtp(mobileNumber, otp);
      setSuccessMessage("OTP verified successfully!"); // Intermediate success message

      // 2. Register the user (only if OTP verification succeeds)
      setLoadingMessage("Registering your account...");
      // Pass only the necessary fields for registration
      const registrationData = await authService.register(
        username,
        password,
        mobileNumber
        // Add email, firstName, lastName here if your backend 'register' function expects them
        // email,
        // firstName,
        // lastName
      );

      // Final success message from registration
      setSuccessMessage(
        registrationData.message ||
          "Registration successful! Redirecting to login..."
      );
      setError(""); // Clear any previous errors

      // Redirect to login page after a short delay
      setTimeout(() => {
        navigate("/login");
      }, 2500); // 2.5 seconds delay
    } catch (err) {
      // Handle errors from verifyOtp or register calls
      console.error("Verify OTP / Register Error:", err);
      if (err.message?.toLowerCase().includes("otp")) {
        // Prioritize OTP-specific errors
        setError(err.message || "Invalid or expired OTP. Please try again.");
      } else if (err.status === 409) {
        // Handle conflicts like existing username/mobile
        setError(
          err.message ||
            "Registration failed. Username or mobile number might already be in use."
        );
      } else {
        // Generic registration failure
        setError(err.message || "Registration failed. Please try again later.");
      }
      setSuccessMessage(""); // Clear any intermediate success message on error
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  // --- Render Step 1 Form (User Details & Mobile) ---
  const renderStep1Form = () => (
    <form onSubmit={handleSendOtp} className="auth-form" noValidate>
      {/* Username Input */}
      <div className="form-group">
        <label htmlFor="signup-username">Username</label>
        <input
          id="signup-username"
          type="text"
          placeholder="Choose a Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          disabled={isLoading}
          maxLength={50}
          className="form-control" // Add base class if needed
        />
      </div>

      {/* Password Input */}
      <div className="form-group">
        <label htmlFor="signup-password">Password</label>
        <div className="password-input-wrapper">
          <input
            id="signup-password"
            type={passwordVisible ? "text" : "password"}
            placeholder="Create Password (min 6 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength="6"
            disabled={isLoading}
            className="form-control"
          />
          <button
            type="button"
            className="password-toggle-button"
            onClick={() => setPasswordVisible(!passwordVisible)}
            disabled={isLoading}
            aria-label={passwordVisible ? "Hide password" : "Show password"}
          >
            {passwordVisible ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>
      </div>

      {/* Confirm Password Input */}
      <div className="form-group">
        <label htmlFor="signup-confirm-password">Confirm Password</label>
        <div className="password-input-wrapper">
          <input
            id="signup-confirm-password"
            type={confirmPasswordVisible ? "text" : "password"}
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength="6"
            disabled={isLoading}
            className="form-control"
          />
          <button
            type="button"
            className="password-toggle-button"
            onClick={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
            disabled={isLoading}
            aria-label={
              confirmPasswordVisible
                ? "Hide confirmation password"
                : "Show confirmation password"
            }
          >
            {confirmPasswordVisible ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>
      </div>

      {/* Mobile Number Input */}
      <div className="form-group">
        <label htmlFor="signup-mobile">Mobile Number (for OTP)</label>
        <input
          id="signup-mobile"
          type="tel" // Use 'tel' for mobile numbers
          placeholder="+91XXXXXXXXXX"
          value={mobileNumber}
          onChange={(e) => setMobileNumber(e.target.value)}
          required
          pattern="\+91[6-9]\d{9}" // HTML5 pattern validation
          title="Enter Indian mobile number including +91 (e.g., +919876543210)"
          disabled={isLoading}
          className="form-control"
        />
      </div>

      {/* Error Message Display */}
      {error && <p className="auth-error-message">{error}</p>}

      {/* Submit Button for Step 1 */}
      <div className="auth-buttons">
        <button
          type="submit"
          className="btn btn-primary btn-full" // Use btn-full for full width if desired
          disabled={isLoading}
        >
          {isLoading ? loadingMessage : "Send OTP & Continue"}
        </button>
      </div>
    </form>
  );

  // --- Render Step 2 Form (OTP Verification) ---
  const renderStep2Form = () => (
    <form
      onSubmit={handleVerifyOtpAndRegister}
      className="auth-form"
      noValidate
    >
      {/* Info message showing the mobile number */}
      <p className="otp-info">
        An OTP has been sent to <strong>{mobileNumber}</strong>. Please enter
        the 6-digit code below to verify your mobile number and complete
        registration.
      </p>

      {/* OTP Input */}
      <div className="form-group">
        <label htmlFor="signup-otp">Enter OTP</label>
        <input
          id="signup-otp"
          type="text" // Use text to allow seeing digits
          inputMode="numeric" // Hint for numeric keyboard on mobile
          placeholder="6-Digit OTP"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          required
          maxLength="6"
          pattern="\d{6}" // HTML5 pattern validation
          title="Enter the 6-digit code"
          disabled={isLoading}
          className="form-control"
          autoComplete="one-time-code" // Helps browsers suggest OTPs from messages
        />
      </div>

      {/* Error Message Display */}
      {error && <p className="auth-error-message">{error}</p>}
      {/* Success Message Display (e.g., "OTP Verified!") */}
      {successMessage && !error && (
        <p className="auth-success-message">
          <FaCheckCircle /> {successMessage}
        </p>
      )}

      {/* Buttons for Step 2 */}
      <div className="auth-buttons">
        {/* Back Button */}
        <button
          type="button"
          className="btn btn-secondary" // Style for secondary action
          onClick={() => {
            // Reset state for going back
            setStep(1);
            setError("");
            setSuccessMessage("");
            setOtp(""); // Clear OTP field
            // Keep username, password, mobile filled in
          }}
          disabled={isLoading}
        >
          Back
        </button>
        {/* Submit Button for Step 2 */}
        <button type="submit" className="btn btn-primary" disabled={isLoading}>
          {isLoading ? loadingMessage : "Verify OTP & Register"}
        </button>
      </div>
      {/* Option to Resend OTP (Optional Enhancement) */}
      {/*
       <div style={{ textAlign: 'center', marginTop: '1rem' }}>
         <button type="button" className="btn btn-link" onClick={handleResendOtp} disabled={isLoading || isResendOtpDisabled}>
           {isResendOtpDisabled ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
         </button>
       </div>
       */}
    </form>
  );

  // --- Main Component Return ---
  return (
    <div className="auth-main">
      {" "}
      {/* Use shared auth page layout class */}
      {/* Full screen loading spinner */}
      {isLoading && (
        <LoadingSpinner
          message={loadingMessage || "Processing..."}
          isFullScreen={true} // Make spinner cover page if desired
        />
      )}
      {/* Left Panel (Image) */}
      <div className="auth-left">
        <img src={loginImage} alt="Signup Illustration" />
        <div className="image-overlay-text">
          <h1>Admin Signup</h1>
          <p>Create your secure admin account.</p>
        </div>
      </div>
      {/* Right Panel (Form) */}
      <div className="auth-right">
        <div className="auth-right-container">
          {/* Logo */}
          <div className="auth-logo">
            <img src={logoImage} alt="Company Logo" />
          </div>

          {/* Form Area */}
          <div className="auth-center">
            <h2>
              {step === 1 ? "Create Admin Account" : "Verify Mobile Number"}
            </h2>
            <p>
              {step === 1
                ? "Enter your details below"
                : "Enter the OTP sent to your mobile"}
            </p>

            {/* Render the correct form based on the current step */}
            {step === 1 ? renderStep1Form() : renderStep2Form()}

            {/* Link to Login Page */}
            <p className="auth-bottom-p">
              Already have an account?{" "}
              <Link to="/login" className="auth-link">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignupPage;
