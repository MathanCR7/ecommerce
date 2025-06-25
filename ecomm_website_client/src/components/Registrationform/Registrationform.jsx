import React, { useState, useContext, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import toast from "react-hot-toast";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGoogle } from "@fortawesome/free-brands-svg-icons"; // Still imported, but button removed
import { faSpinner } from "@fortawesome/free-solid-svg-icons"; // For loading spinners
import { checkExistingUserApi, sendOtpApi } from "../../services/api";
import "./Registrationform.css";

// PhoneVerificationModal (Remains the same as it's for a different flow - Google users)
const PhoneVerificationModal = ({
  isOpen,
  onClose,
  onVerified,
  initialPhone = "",
}) => {
  const [phone, setPhone] = useState(initialPhone);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [modalLoadingText, setModalLoadingText] = useState("");

  const { sendOtpForPhoneVerification, verifyAndUpdateUserPhone } =
    useContext(AuthContext);

  useEffect(() => {
    if (isOpen) {
      setPhone(initialPhone);
      setOtpSent(false);
      setOtp("");
      setModalLoadingText("");
    }
  }, [initialPhone, isOpen]);

  const handleSendOtpInternal = async () => {
    if (!phone || !isValidPhoneNumber(phone)) {
      toast.error("Please enter a valid phone number.");
      return;
    }
    setIsVerifying(true);
    setModalLoadingText("Sending OTP...");
    try {
      const success = await sendOtpForPhoneVerification(phone);
      if (success) {
        setOtpSent(true);
        toast.success("OTP successfully sent to your phone!");
      }
    } catch (error) {
      toast.error(error.message || "An error occurred while sending OTP.");
    } finally {
      setIsVerifying(false);
      setModalLoadingText("");
    }
  };

  const handleVerifyOtpInternal = async () => {
    if (!otp || !/^\d{4,6}$/.test(otp)) {
      toast.error("Please enter a valid OTP (4-6 digits).");
      return;
    }
    setIsVerifying(true);
    setModalLoadingText("Verifying...");
    try {
      const updatedUser = await verifyAndUpdateUserPhone(phone, otp);
      if (updatedUser) {
        onVerified(updatedUser);
      }
    } catch (error) {
      toast.error(
        error.message || "An error occurred during OTP verification."
      );
    } finally {
      setIsVerifying(false);
      setModalLoadingText("");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="registration-modal-overlay">
      <div className="registration-modal-content">
        <button
          aria-label="Close modal"
          className="registration-modal-close-btn"
          onClick={() => {
            if (isVerifying) return;
            setOtpSent(false);
            setOtp("");
            onClose();
          }}
          disabled={isVerifying}
        >
          ×
        </button>
        <div className="registration-modal-header">
          <h3>Verify Your Phone</h3>
          <p>
            We need to verify your phone number to complete your account setup.
          </p>
        </div>
        <div className="registration-modal-body">
          <div className="modal-input-group">
            <label htmlFor="modal-phone">Phone Number</label>
            <PhoneInput
              id="modal-phone"
              placeholder="Enter your phone number"
              value={phone}
              onChange={setPhone}
              defaultCountry="IN"
              international
              countryCallingCodeEditable={false}
              disabled={otpSent || isVerifying}
              className="PhoneInputInModal"
            />
          </div>
          {!otpSent ? (
            <button
              onClick={handleSendOtpInternal}
              disabled={isVerifying || !phone || !isValidPhoneNumber(phone)}
              className="registration-btn registration-btn-submit modal-btn"
            >
              {isVerifying ? (
                <>
                  <FontAwesomeIcon
                    icon={faSpinner}
                    spin
                    style={{ marginRight: "8px" }}
                  />
                  {modalLoadingText}
                </>
              ) : (
                "Send OTP"
              )}
            </button>
          ) : (
            <>
              <div className="modal-input-group">
                <label htmlFor="modal-otp">Enter OTP</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d{4,6}"
                  id="modal-otp"
                  value={otp}
                  onChange={(e) => {
                    if (/^\d{0,6}$/.test(e.target.value)) {
                      setOtp(e.target.value);
                    }
                  }}
                  placeholder="Enter OTP"
                  maxLength="6"
                  disabled={isVerifying}
                  className="modal-otp-input"
                />
              </div>
              <button
                onClick={handleVerifyOtpInternal}
                disabled={isVerifying || !otp || otp.length < 4}
                className="registration-btn registration-btn-submit modal-btn"
              >
                {isVerifying ? (
                  <>
                    <FontAwesomeIcon
                      icon={faSpinner}
                      spin
                      style={{ marginRight: "8px" }}
                    />
                    {modalLoadingText}
                  </>
                ) : (
                  "Verify & Save Phone"
                )}
              </button>
            </>
          )}
          <button
            onClick={() => {
              if (isVerifying) return;
              setOtpSent(false);
              setOtp("");
              onClose();
            }}
            disabled={isVerifying}
            className="registration-btn registration-btn-secondary modal-btn"
            style={{ marginTop: "10px" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

const Registrationform = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    dob: "",
    phone: "",
    otp: "",
  });

  const [otpSentForRegistration, setOtpSentForRegistration] = useState(false);
  const [otpVerificationMessage, setOtpVerificationMessage] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);

  const {
    signup,
    loginWithGoogle, // Still imported, but handler removed
    loading: authContextLoading,
    user,
    setUser,
  } = useContext(AuthContext);

  const navigate = useNavigate();
  const otpInputRef = useRef(null);

  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  useEffect(() => {
    if (user && user.googleId && !user.phone && !authContextLoading) {
      const hasShownModal = sessionStorage.getItem("googlePhoneModalShown");
      if (!hasShownModal) {
        setIsPhoneModalOpen(true);
        sessionStorage.setItem("googlePhoneModalShown", "true");
      }
    } else if (user && user.phone) {
      sessionStorage.removeItem("googlePhoneModalShown");
    }
  }, [user, authContextLoading]);

  useEffect(() => {
    if (
      otpSentForRegistration &&
      formData.phone &&
      isValidPhoneNumber(formData.phone) &&
      otpInputRef.current
    ) {
      otpInputRef.current.focus();
      setOtpVerificationMessage(
        `An OTP has been sent to ${formData.phone}. It might take a moment to arrive.`
      );
    }
  }, [otpSentForRegistration, formData.phone]);

  const handleUsernameChange = (e) => {
    const { value } = e.target;
    const validUsernameRegex = /^[a-z0-9]*$/;
    if (validUsernameRegex.test(value)) {
      setFormData({ ...formData, username: value });
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePhoneChange = (value) => {
    setFormData({ ...formData, phone: value || "", otp: "" });
    setOtpSentForRegistration(false);
    setOtpVerificationMessage("");
  };

  const handleSendOtpForRegistrationForm = async () => {
    if (!formData.phone || !isValidPhoneNumber(formData.phone)) {
      toast.error("Please enter a valid phone number.");
      return false;
    }

    setIsSendingOtp(true);
    setOtpVerificationMessage("");

    try {
      const existingRes = await checkExistingUserApi({ phone: formData.phone });
      if (existingRes.data.exists) {
        toast.error(
          "This phone number is already registered. Please log in or use a different number."
        );
        setOtpSentForRegistration(false);
        return false;
      }

      await sendOtpApi({ phone: formData.phone });
      setOtpSentForRegistration(true);
      // Message set in useEffect for focus
      toast.success("OTP sent successfully!");
      return true;
    } catch (error) {
      console.error("Failed to send OTP:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Could not send OTP. Please try again.";
      const errorsArray = error.response?.data?.errors;
      if (errorsArray && errorsArray.length > 0) {
        errorsArray.forEach((err) => toast.error(err.msg));
      } else {
        toast.error(errorMessage);
      }
      setOtpSentForRegistration(false);
      return false;
    } finally {
      setIsSendingOtp(false);
    }
  };

  // handleGoogleSignup function removed as the button is removed
  // const handleGoogleSignup = () => {
  //   sessionStorage.removeItem("googlePhoneModalShown");
  //   loginWithGoogle();
  // };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    const usernameRegex = /^[a-z0-9]+$/;
    if (!usernameRegex.test(formData.username)) {
      toast.error("Username must contain only lowercase letters and numbers.");
      return;
    }
    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }

    if (
      formData.phone &&
      isValidPhoneNumber(formData.phone) &&
      !otpSentForRegistration
    ) {
      await handleSendOtpForRegistrationForm();
      return;
    }

    const dataToSubmit = {
      username: formData.username,
      email: formData.email,
      password: formData.password,
      dob: formData.dob,
    };

    if (
      formData.phone &&
      isValidPhoneNumber(formData.phone) &&
      otpSentForRegistration
    ) {
      if (!formData.otp || !/^\d{4,6}$/.test(formData.otp)) {
        toast.error(
          "Please enter the valid OTP (4-6 digits) sent to your phone."
        );
        otpInputRef.current?.focus();
        return;
      }
      dataToSubmit.phone = formData.phone;
      dataToSubmit.otp = formData.otp;
    }

    setIsSigningUp(true);
    try {
      const signedUpUser = await signup(dataToSubmit);
      if (signedUpUser) {
        toast.success(
          `Welcome, ${
            signedUpUser.displayName || signedUpUser.username
          }! Your account is created.`,
          { duration: 4000 }
        );
        navigate("/");
      }
    } catch (error) {
      console.error("Signup process failed:", error);
      // If OTP was invalid, AuthContext's signup should ideally throw an error that indicates this.
      // For now, if signup fails and OTP was part of it, user might need to re-verify or correct OTP.
      // Consider resetting otpSentForRegistration if backend indicates OTP was the issue.
      // The AuthContext handleError should provide user-friendly messages.
    } finally {
      setIsSigningUp(false);
    }
  };

  const handlePhoneVerifiedInModal = (updatedUserFromModal) => {
    setUser(updatedUserFromModal); // Update user in context
    setIsPhoneModalOpen(false);
    toast.success("Phone number verified and added to your Google account!");
  };

  const overallLoading = authContextLoading || isSendingOtp || isSigningUp;

  let submitButtonText = "Sign Up";
  let showSpinnerInSubmit = false;

  if (isSendingOtp) {
    submitButtonText = "Sending OTP...";
    showSpinnerInSubmit = true;
  } else if (isSigningUp) {
    submitButtonText = "Processing...";
    showSpinnerInSubmit = true;
  } else if (formData.phone && isValidPhoneNumber(formData.phone)) {
    if (otpSentForRegistration) {
      submitButtonText = "Verify OTP & Sign Up";
    } else {
      submitButtonText = "Send OTP & Continue";
    }
  }

  const isSubmitDisabled =
    overallLoading ||
    (otpSentForRegistration &&
      formData.phone &&
      isValidPhoneNumber(formData.phone) &&
      (!formData.otp || formData.otp.length < 4));

  return (
    <>
      <section className="registration-page-section">
        <div className="registration-card-container">
          <div className="registration-form-heading">
            <h1>Create Your Account</h1>
            <p>
              Already have an account?{" "}
              <Link to="/login" className="form-link">
                Sign In
              </Link>
            </p>
          </div>
          <form
            onSubmit={handleSubmit}
            className="registration-main-form"
            noValidate
          >
            <div className="registration-input-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleUsernameChange}
                required
                disabled={overallLoading}
                placeholder="Lowercase letters & numbers (e.g., user123)"
                title="Username can only contain lowercase letters (a-z) and numbers (0-9)."
                pattern="^[a-z0-9]+$"
                autoComplete="username"
              />
            </div>
            <div className="registration-input-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={overallLoading}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <div className="registration-input-group">
              <label htmlFor="password">Create Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength="8"
                disabled={overallLoading}
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
              />
            </div>
            <div className="registration-input-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                disabled={overallLoading}
                placeholder="Re-type password"
                autoComplete="new-password"
              />
            </div>
            <div className="registration-input-group">
              <label htmlFor="dob">Date of Birth (Optional)</label>
              <input
                type="date"
                id="dob"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                disabled={overallLoading}
                max={new Date().toISOString().split("T")[0]} // Prevent future dates
              />
            </div>
            <div className="registration-input-group">
              <label htmlFor="phone">
                Phone Number (Optional, for verification)
              </label>
              <PhoneInput
                id="phone"
                placeholder="+91 Enter phone number"
                value={formData.phone}
                onChange={handlePhoneChange}
                defaultCountry="IN"
                international
                countryCallingCodeEditable={false} // Usually good practice
                disabled={overallLoading}
                className="PhoneInput"
              />
            </div>

            {/* OTP Section - appears when OTP is sent */}
            <div
              className={`registration-otp-section ${
                otpSentForRegistration &&
                formData.phone &&
                isValidPhoneNumber(formData.phone)
                  ? "visible"
                  : ""
              }`}
            >
              {otpVerificationMessage && (
                <div className="registration-otp-info-box">
                  {otpVerificationMessage}
                </div>
              )}
              <div className="registration-input-group">
                <label htmlFor="otp">One-Time Password (OTP)</label>
                <input
                  ref={otpInputRef}
                  type="text"
                  inputMode="numeric"
                  pattern="\d{4,6}"
                  id="otp"
                  name="otp"
                  value={formData.otp}
                  onChange={(e) => {
                    if (/^\d{0,6}$/.test(e.target.value)) {
                      setFormData({ ...formData, otp: e.target.value });
                    }
                  }}
                  required={otpSentForRegistration} // Required only if OTP was sent
                  title="Enter 4-6 digit OTP"
                  maxLength="6"
                  disabled={overallLoading}
                  placeholder="Enter OTP"
                  autoComplete="one-time-code"
                  className="registration-otp-input-field"
                />
              </div>
              <button
                type="button"
                onClick={handleSendOtpForRegistrationForm}
                className="registration-btn registration-btn-link registration-resend-otp-btn"
                disabled={overallLoading}
              >
                {isSendingOtp ? (
                  <>
                    <FontAwesomeIcon
                      icon={faSpinner}
                      spin
                      style={{ marginRight: "8px" }}
                    />
                    Sending...
                  </>
                ) : (
                  "Resend OTP"
                )}
              </button>
            </div>

            <button
              type="submit"
              className="registration-btn registration-btn-submit"
              disabled={isSubmitDisabled}
            >
              {showSpinnerInSubmit && (
                <FontAwesomeIcon
                  icon={faSpinner}
                  spin
                  style={{ marginRight: "8px" }}
                />
              )}
              {submitButtonText}
            </button>

            {/* The divider and the Google signup button are removed */}
            {/* <div className="registration-divider">
              <span>Or sign up with</span>
            </div>

            <button
              type="button"
              className="registration-btn registration-btn-social registration-btn-google"
              onClick={handleGoogleSignup}
              disabled={overallLoading}
            >
              <FontAwesomeIcon icon={faGoogle} className="social-icon" />
              Sign up with Google
            </button> */}

            <div className="registration-terms-info">
              By clicking Sign Up, you agree to our{" "}
              <Link
                to="/terms-and-conditions"
                className="registration-text-link"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link to="/privacy-policy" className="registration-text-link">
                Privacy Policy
              </Link>
              .
            </div>
          </form>
        </div>
      </section>

      <PhoneVerificationModal
        isOpen={isPhoneModalOpen}
        onClose={() => setIsPhoneModalOpen(false)}
        onVerified={handlePhoneVerifiedInModal}
        initialPhone={user?.phone || ""}
      />
    </>
  );
};

export default Registrationform;
