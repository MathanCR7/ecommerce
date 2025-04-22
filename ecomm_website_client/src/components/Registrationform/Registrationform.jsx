import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api"; // Use the configured Axios instance
import toast from "react-hot-toast";
import "./registrationform.css"; // Link the specific CSS

const RegistrationForm = () => {
  const [step, setStep] = useState(1); // 1: Details, 2: OTP
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "", // Added for confirmation
    phone: "", // E.164 format (+91...)
    dob: "", // YYYY-MM-DD
  });
  const [otp, setOtp] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  // We don't need AuthContext.signup here as we call API directly and redirect
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- Input Validation ---
  const validateStep1 = () => {
    if (formData.username.length < 3) {
      toast.error("Username must be at least 3 characters.");
      return false;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      toast.error(
        "Username can only contain letters, numbers, and underscores."
      );
      return false;
    }
    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
      toast.error("Please enter a valid email address.");
      return false;
    }
    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match.");
      return false;
    }
    if (!formData.phone) {
      toast.error("Please enter a phone number.");
      return false;
    }
    // Basic E.164 check - backend has stricter validation
    if (!/^\+\d{10,15}$/.test(formData.phone)) {
      toast.error(
        "Invalid phone format. Use +CountryCodeNumber (e.g., +911234567890)."
      );
      return false;
    }
    if (formData.dob && new Date(formData.dob) > new Date()) {
      toast.error("Date of Birth cannot be in the future.");
      return false;
    }
    return true; // All checks passed
  };

  // --- Step 1: Validate details and Send OTP ---
  const handleSendOtp = async (event) => {
    event.preventDefault();
    if (!validateStep1()) return; // Stop if validation fails

    setIsSendingOtp(true);
    const toastId = toast.loading("Validating details & sending OTP...");

    try {
      // 1. Check if username/email/phone exists
      const checkRes = await api.post("/auth/check-existing", {
        username: formData.username,
        email: formData.email,
        phone: formData.phone,
      });

      if (checkRes.data.exists) {
        toast.error(
          `This ${checkRes.data.field} is already registered. Please login or use different details.`,
          {
            id: toastId,
            duration: 4000,
          }
        );
        setIsSendingOtp(false);
        return;
      }

      // 2. If checks pass, send OTP
      toast.loading("Sending OTP...", { id: toastId }); // Update toast message
      await api.post("/auth/send-otp", { phone: formData.phone });

      toast.success("OTP sent successfully to your phone!", { id: toastId });
      setStep(2); // Move to OTP verification step
    } catch (error) {
      console.error("Send OTP/Check Existing Error:", error);
      const errorMsg =
        error.response?.data?.message ||
        "Failed to send OTP. Please check details or try again later.";
      // Handle specific Twilio errors shown to user if desired
      if (
        errorMsg.includes("Invalid parameter") ||
        errorMsg.includes("Invalid phone number")
      ) {
        toast.error(
          "Invalid phone number format. Please check and try again.",
          { id: toastId }
        );
      } else if (errorMsg.includes("Max send attempts reached")) {
        toast.error(
          "Max OTP attempts reached for this number. Please try again later.",
          { id: toastId }
        );
      } else {
        toast.error(errorMsg, { id: toastId });
      }
    } finally {
      setIsSendingOtp(false);
    }
  };

  // --- Step 2: Verify OTP and complete registration ---
  const handleRegister = async (event) => {
    event.preventDefault();
    if (step !== 2) return; // Safeguard

    if (!otp || otp.length < 4 || otp.length > 6 || !/^\d+$/.test(otp)) {
      toast.error("Please enter a valid OTP (4-6 digits).");
      return;
    }

    setIsSigningUp(true);
    // Prepare data for the final signup request (exclude confirmPassword)
    const { confirmPassword, ...signupData } = formData;
    const finalData = { ...signupData, otp };
    const toastId = toast.loading("Verifying OTP & registering...");

    try {
      // Call the backend signup endpoint
      const response = await api.post("/auth/signup", finalData);

      toast.success("Registration successful! Redirecting to login...", {
        id: toastId,
        duration: 3000,
      });
      // Don't set user context here, let login handle it
      // Redirect to login page after a short delay
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error) {
      console.error("Registration Error:", error);
      const errorMsg = error.response?.data?.message || "Registration failed.";
      if (errorMsg.includes("Invalid or expired OTP")) {
        toast.error(
          "Invalid or expired OTP. Please check the code or go back to resend.",
          { id: toastId }
        );
      } else if (errorMsg.includes("already exists")) {
        toast.error(errorMsg + " Please login instead.", { id: toastId });
      } else {
        toast.error(errorMsg, { id: toastId });
      }
    } finally {
      setIsSigningUp(false);
    }
  };

  return (
    <section className="registrationform-section">
      <div className="registration-container">
        <div className="registration-wrapper">
          <div className="registration-heading">
            <h1>Create Account</h1>
            <p>
              Already have an account?{" "}
              <Link to="/login" className="link-style">
                Login here
              </Link>
            </p>
          </div>

          {/* --- Step 1 Form: Details --- */}
          {step === 1 && (
            <form
              onSubmit={handleSendOtp}
              className="registration-form-element"
            >
              {/* Username */}
              <div className="input-group">
                <label htmlFor="regUsername">Username*</label>
                <input
                  id="regUsername"
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                  minLength="3"
                  disabled={isSendingOtp}
                  placeholder="Choose a unique username"
                />
              </div>
              {/* Email */}
              <div className="input-group">
                <label htmlFor="regEmail">Email*</label>
                <input
                  id="regEmail"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  disabled={isSendingOtp}
                  placeholder="your.email@example.com"
                />
              </div>
              {/* Password */}
              <div className="input-group">
                <label htmlFor="regPassword">
                  Password* (min 8 characters)
                </label>
                <input
                  id="regPassword"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  minLength="8"
                  disabled={isSendingOtp}
                  placeholder="Create a strong password"
                />
              </div>
              {/* Confirm Password */}
              <div className="input-group">
                <label htmlFor="regConfirmPassword">Confirm Password*</label>
                <input
                  id="regConfirmPassword"
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                  minLength="8"
                  disabled={isSendingOtp}
                  placeholder="Retype your password"
                />
              </div>
              {/* Phone Number */}
              <div className="input-group">
                <label htmlFor="regPhone">Phone Number* (for OTP)</label>
                <input
                  id="regPhone"
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+911234567890"
                  required
                  disabled={isSendingOtp}
                />
              </div>
              {/* Date of Birth */}
              <div className="input-group">
                <label htmlFor="regDob">Date of Birth (Optional)</label>
                <input
                  id="regDob"
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleInputChange}
                  disabled={isSendingOtp}
                  max={new Date().toISOString().split("T")[0]} // Prevent future dates
                />
              </div>

              <button
                type="submit"
                className="btn-send-otp"
                disabled={isSendingOtp}
              >
                {isSendingOtp ? "Processing..." : "Send OTP & Continue"}
              </button>
            </form>
          )}

          {/* --- Step 2 Form: OTP Verification --- */}
          {step === 2 && (
            <form
              onSubmit={handleRegister}
              className="registration-form-element"
            >
              <p className="otp-info">
                An OTP has been sent to <strong>{formData.phone}</strong>.
                Please enter it below. It might take a moment to arrive.
              </p>
              {/* OTP Input */}
              <div className="input-group">
                <label htmlFor="regOtp">Enter OTP*</label>
                <input
                  id="regOtp"
                  type="number"
                  name="otp" // Use number for better mobile input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  maxLength="6"
                  minLength="4"
                  disabled={isSigningUp}
                  placeholder="Enter 4-6 digit OTP"
                  inputMode="numeric" // Hint for mobile keyboards
                  pattern="\d*" // Allow only digits visually
                />
              </div>
              <button
                type="submit"
                className="btn-register"
                disabled={isSigningUp}
              >
                {isSigningUp ? "Registering..." : "Verify OTP & Register"}
              </button>
              {/* Back button allows user to correct details if needed */}
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn-back"
                disabled={isSigningUp}
              >
                Go Back & Edit Details
              </button>
            </form>
          )}

          {/* Terms and Conditions Link */}
          <p className="terms-info">
            By signing up you agree to our{" "}
            <Link
              to="/terms-and-conditions"
              className="link-style"
              target="_blank"
              rel="noopener noreferrer"
            >
              Terms & Conditions
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
};

export default RegistrationForm;
