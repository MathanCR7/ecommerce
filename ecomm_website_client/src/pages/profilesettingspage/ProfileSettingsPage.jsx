// frontend/src/pages/profilesettingspage/ProfileSettingsPage.jsx
import React, { useState, useEffect, useContext, useRef } from "react";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import { AuthContext } from "../../context/AuthContext";
import toast from "react-hot-toast";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCamera,
  faCheckCircle,
  faSpinner,
  faSave,
  faPaperPlane,
  faExclamationTriangle,
  faEdit,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import { faUserCircle } from "@fortawesome/free-regular-svg-icons";
import {
  getUserProfileApi,
  updateUserProfileApi,
  uploadProfilePictureApi,
  getServerBaseUrl,
} from "../../services/api";

import "./ProfileSettingsPage.css";

const DEFAULT_AVATAR_PATH = "/assets/main-logo/default_avatar.png";

const ProfileSettingsPage = () => {
  const {
    user,
    loading: authLoading,
    refreshUser,
    sendOtpForPhoneVerification,
    verifyAndUpdateUserPhone,
  } = useContext(AuthContext);

  const [loadingPage, setLoadingPage] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [formData, setFormData] = useState({
    displayName: "",
    dob: "",
  });

  const [currentPhoneNumber, setCurrentPhoneNumber] = useState("");
  const [isEditingPhoneNumber, setIsEditingPhoneNumber] = useState(false);
  const [otpSentForNumber, setOtpSentForNumber] = useState("");
  const [otpInput, setOtpInput] = useState("");

  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [imageRenderError, setImageRenderError] = useState(false); // For when avatar image fails

  const fileInputRef = useRef(null);
  const initialPhoneRef = useRef("");

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setLoadingPage(false);
        return;
      }
      try {
        const res = await getUserProfileApi();
        const fetchedUser = res.data.user;
        setProfileData(fetchedUser);
        setFormData({
          displayName: fetchedUser.displayName || fetchedUser.username || "",
          dob: fetchedUser.dob
            ? new Date(fetchedUser.dob).toISOString().split("T")[0]
            : "",
        });
        const userPhone = fetchedUser.phone || "";
        setCurrentPhoneNumber(userPhone);
        initialPhoneRef.current = userPhone;

        if (!userPhone || !fetchedUser.isPhoneVerified) {
          setIsEditingPhoneNumber(true);
        } else {
          setIsEditingPhoneNumber(false);
        }
        setOtpSentForNumber("");
        setOtpInput("");
        setImageRenderError(false); // Reset image error on profile fetch
      } catch (error) {
        console.error("Error fetching profile:", error);
        toast.error(
          error.response?.data?.message || "Failed to fetch profile data."
        );
      } finally {
        setLoadingPage(false);
      }
    };

    if (user && !authLoading) {
      fetchProfile();
    } else if (!authLoading) {
      setLoadingPage(false);
    }
  }, [user, authLoading, refreshUser]);

  const resolvedProfilePictureUrl = React.useMemo(() => {
    setImageRenderError(false); // Reset error state when dependencies change

    const sourceUser = profileData || user;

    if (
      !sourceUser ||
      !sourceUser.profilePicture ||
      sourceUser.profilePicture.trim() === ""
    ) {
      return DEFAULT_AVATAR_PATH;
    }

    const picturePath = sourceUser.profilePicture.trim();
    const serverBase = getServerBaseUrl();

    if (picturePath.startsWith("http")) {
      return picturePath;
    }

    if (picturePath === DEFAULT_AVATAR_PATH) {
      return DEFAULT_AVATAR_PATH;
    }

    if (picturePath.startsWith("users/")) {
      if (serverBase) {
        return `${serverBase}/uploads/${picturePath.replace(/\\/g, "/")}`;
      } else {
        console.warn(
          "ProfileSettingsPage: serverBaseURL not available for 'users/' path:",
          picturePath,
          ". Falling back to default avatar."
        );
        return DEFAULT_AVATAR_PATH;
      }
    }

    if (picturePath.startsWith("/")) {
      return picturePath; // Handles /assets/... or other root-relative paths
    }

    if (serverBase) {
      return `${serverBase}/${picturePath
        .replace(/\\/g, "/")
        .replace(/^\//, "")}`;
    }

    console.warn(
      "ProfileSettingsPage: Could not fully resolve profile picture URL for path:",
      picturePath,
      ". Falling back to default avatar."
    );
    return DEFAULT_AVATAR_PATH;
  }, [profileData, user]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePhoneInputChange = (value) => {
    const newNum = value || "";
    setCurrentPhoneNumber(newNum);
    if (newNum !== otpSentForNumber && otpSentForNumber) {
      setOtpSentForNumber("");
      setOtpInput("");
    }
  };

  const handleEditPhoneNumber = () => {
    setIsEditingPhoneNumber(true);
    setOtpSentForNumber("");
    setOtpInput("");
  };

  const handleCancelEditPhoneNumber = () => {
    setIsEditingPhoneNumber(false);
    setCurrentPhoneNumber(initialPhoneRef.current);
    setOtpSentForNumber("");
    setOtpInput("");
  };

  const handleSendOtp = async () => {
    if (!currentPhoneNumber || !isValidPhoneNumber(currentPhoneNumber)) {
      toast.error(
        "Please enter a valid phone number in international format (e.g., +911234567890)."
      );
      return;
    }

    if (currentPhoneNumber === user?.phone && user?.isPhoneVerified) {
      toast.info("This phone number is already verified.");
      setIsEditingPhoneNumber(false);
      setOtpSentForNumber("");
      setOtpInput("");
      return;
    }

    setIsSendingOtp(true);
    toast.loading(`Sending OTP to ${currentPhoneNumber}...`, {
      id: "otp-send",
    });
    try {
      const success = await sendOtpForPhoneVerification(currentPhoneNumber);
      if (success) {
        toast.success(`OTP sent to ${currentPhoneNumber}!`, { id: "otp-send" });
        setOtpSentForNumber(currentPhoneNumber);
        setOtpInput("");
      } else {
        toast.error("Failed to send OTP. Please try again.", {
          id: "otp-send",
        });
        setOtpSentForNumber("");
      }
    } catch (error) {
      console.error("Error sending OTP:", error);
      toast.error(
        error.response?.data?.message ||
          "Failed to send OTP. Ensure number is correct.",
        { id: "otp-send" }
      );
      setOtpSentForNumber("");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpInput || !/^\d{6}$/.test(otpInput)) {
      toast.error("Please enter a valid 6-digit OTP.");
      return;
    }
    if (
      !otpSentForNumber ||
      otpSentForNumber !== currentPhoneNumber ||
      !isValidPhoneNumber(otpSentForNumber)
    ) {
      toast.error("Error: Please send OTP first before verifying.", {
        id: "otp-verify",
      });
      setOtpSentForNumber("");
      setOtpInput("");
      return;
    }

    setIsVerifyingOtp(true);
    toast.loading("Verifying OTP...", { id: "otp-verify" });
    try {
      const updatedUser = await verifyAndUpdateUserPhone(
        otpSentForNumber,
        otpInput
      );

      if (updatedUser) {
        toast.success("Phone number verified and updated!", {
          id: "otp-verify",
        });
        setIsEditingPhoneNumber(false);
        setOtpSentForNumber("");
        setOtpInput("");
      } else {
        toast.error("OTP verification failed.", { id: "otp-verify" });
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      toast.error(
        error.response?.data?.message ||
          "OTP verification failed. Invalid OTP or expired.",
        { id: "otp-verify" }
      );
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleSubmitProfile = async (e) => {
    e.preventDefault();
    const updates = {};
    let hasChanges = false;

    const currentDisplayName =
      profileData?.displayName || profileData?.username || "";
    if (formData.displayName.trim() !== currentDisplayName.trim()) {
      updates.displayName = formData.displayName.trim();
      hasChanges = true;
    }

    const currentDobString = profileData?.dob
      ? new Date(profileData.dob).toISOString().split("T")[0]
      : "";
    if (formData.dob !== currentDobString) {
      updates.dob = formData.dob ? formData.dob : null;
      hasChanges = true;
    }

    if (!hasChanges) {
      toast.success("No changes detected in personal information to save.", {
        icon: "👍",
      });
      return;
    }

    setIsSubmittingProfile(true);
    toast.loading("Saving personal info...", { id: "profile-save" });
    try {
      await updateUserProfileApi(updates);
      await refreshUser();
      toast.success("Personal information updated successfully!", {
        id: "profile-save",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(
        error.response?.data?.message ||
          "Failed to update personal information.",
        { id: "profile-save" }
      );
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  const handlePictureChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Please select JPEG, PNG, GIF, or WebP.", {
        icon: <FontAwesomeIcon icon={faExclamationTriangle} />,
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSizeInBytes) {
      toast.error("File is too large. Maximum size is 5MB.", {
        icon: <FontAwesomeIcon icon={faExclamationTriangle} />,
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const imageFormData = new FormData();
    imageFormData.append("profilePicture", file);

    setIsUploadingPicture(true);
    toast.loading("Uploading profile picture...", { id: "pic-upload" });
    try {
      await uploadProfilePictureApi(imageFormData);
      await refreshUser(); // This will trigger re-calculation of resolvedProfilePictureUrl
      toast.success("Profile picture updated successfully!", {
        id: "pic-upload",
      });
      setImageRenderError(false); // Explicitly reset error after successful upload
    } catch (error) {
      console.error("Error uploading picture:", error);
      toast.error(
        error.response?.data?.message || "Profile picture upload failed.",
        {
          id: "pic-upload",
        }
      );
    } finally {
      setIsUploadingPicture(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const isUserHasPhone = !!profileData?.phone;
  const isPhoneVerified = !!profileData?.isPhoneVerified;
  const showVerifiedPhoneDisplay =
    isUserHasPhone && isPhoneVerified && !isEditingPhoneNumber;
  const showAddPhoneButton = !isUserHasPhone && !isEditingPhoneNumber;
  const showUnverifiedPhoneDisplay =
    isUserHasPhone && !isPhoneVerified && !isEditingPhoneNumber;
  const showPhoneEditSection = isEditingPhoneNumber;

  const showSendOtpButton =
    showPhoneEditSection &&
    currentPhoneNumber &&
    isValidPhoneNumber(currentPhoneNumber) &&
    !isSendingOtp &&
    !isVerifyingOtp &&
    (!otpSentForNumber || otpSentForNumber !== currentPhoneNumber) &&
    !(currentPhoneNumber === initialPhoneRef.current && isPhoneVerified);

  const showOtpInputSection =
    showPhoneEditSection &&
    otpSentForNumber === currentPhoneNumber &&
    currentPhoneNumber &&
    isValidPhoneNumber(currentPhoneNumber);

  const showCancelEditPhoneButton =
    showPhoneEditSection && !!initialPhoneRef.current;

  if (loadingPage || authLoading) {
    return (
      <>
        <Header />
        <div className="profile-settings-page-loader">
          <FontAwesomeIcon icon={faSpinner} spin size="3x" />
          <p>Loading Your Profile...</p>
        </div>
        <Footer />
      </>
    );
  }
  if (!user) {
    return (
      <>
        <Header />
        <div className="profile-settings-page-loader">
          <p>Please log in to manage your profile.</p>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="profile-settings-page-container">
        <div className="profile-settings-card">
          <div className="profile-header-section">
            <h1>Profile Settings</h1>
            <p>Update your personal information and preferences.</p>
          </div>
          <div className="profile-avatar-section">
            <div
              className="avatar-wrapper"
              onClick={() =>
                !isUploadingPicture &&
                !imageRenderError && // Prevent click if placeholder is shown due to unfixable error
                fileInputRef.current?.click()
              }
              title={
                imageRenderError
                  ? "Default avatar (image load failed)"
                  : "Change profile picture"
              }
              role="button"
              tabIndex={0}
              onKeyPress={(e) =>
                (e.key === "Enter" || e.key === " ") &&
                !isUploadingPicture &&
                !imageRenderError &&
                fileInputRef.current?.click()
              }
            >
              {!imageRenderError ? (
                <img
                  key={resolvedProfilePictureUrl}
                  src={resolvedProfilePictureUrl}
                  alt={
                    profileData?.displayName ||
                    profileData?.username ||
                    user?.displayName ||
                    user?.username ||
                    "User"
                  }
                  className="avatar-image"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.target.onerror = null;
                    const currentSrc = e.target.src;
                    const isDefaultFailing =
                      currentSrc.endsWith(DEFAULT_AVATAR_PATH) ||
                      currentSrc ===
                        new URL(DEFAULT_AVATAR_PATH, window.location.origin)
                          .href;

                    if (!isDefaultFailing) {
                      console.warn(
                        `ProfileSettingsPage: Profile picture failed to load (src: ${currentSrc}). Falling back to default.`
                      );
                      e.target.src = DEFAULT_AVATAR_PATH;
                    } else {
                      console.error(
                        `ProfileSettingsPage: Default avatar at "${DEFAULT_AVATAR_PATH}" also failed to load. Displaying placeholder icon.`
                      );
                      setImageRenderError(true);
                    }
                  }}
                />
              ) : (
                <FontAwesomeIcon
                  icon={faUserCircle}
                  className="avatar-placeholder-icon"
                />
              )}
              {!imageRenderError && ( // Only show overlay if image (or attempt) is there
                <div className="avatar-upload-overlay">
                  {isUploadingPicture ? (
                    <FontAwesomeIcon icon={faSpinner} spin />
                  ) : (
                    <FontAwesomeIcon icon={faCamera} />
                  )}
                  <span>{isUploadingPicture ? "Uploading..." : "Change"}</span>
                </div>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handlePictureChange}
              disabled={isUploadingPicture}
            />
            <h2>{profileData?.displayName || profileData?.username}</h2>
            <p className="user-email-display">{profileData?.email}</p>
          </div>

          <form onSubmit={handleSubmitProfile} className="profile-form">
            <div className="form-section-title">Personal Information</div>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  type="text"
                  id="username"
                  value={profileData?.username || ""}
                  readOnly
                  disabled
                />
              </div>
              <div className="form-group">
                <label htmlFor="displayName">Display Name</label>
                <input
                  type="text"
                  id="displayName"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleInputChange}
                  disabled={isSubmittingProfile}
                  placeholder="e.g., John Doe"
                />
              </div>
              <div className="form-group full-width">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  value={profileData?.email || ""}
                  readOnly
                  disabled
                />
              </div>
              <div className="form-group">
                <label htmlFor="dob">Date of Birth</label>
                <input
                  type="date"
                  id="dob"
                  name="dob"
                  value={formData.dob}
                  onChange={handleInputChange}
                  disabled={isSubmittingProfile}
                  max={new Date().toISOString().split("T")[0]}
                />
              </div>
            </div>
            <div className="profile-form-actions">
              <button
                type="submit"
                className="profile-btn profile-btn-primary"
                disabled={
                  isSubmittingProfile ||
                  isUploadingPicture ||
                  isSendingOtp ||
                  isVerifyingOtp
                }
              >
                {isSubmittingProfile ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin /> Saving...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faSave} /> Save Personal Info
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="form-section-title">Phone Number</div>
          <div className="phone-management-section">
            {showVerifiedPhoneDisplay && (
              <div className="phone-display-verified">
                <label>Current Phone Number</label>
                <div className="phone-number-text">
                  <FontAwesomeIcon
                    icon={faCheckCircle}
                    className="verified-icon"
                  />
                  {profileData.phone} (Verified)
                </div>
                <button
                  type="button"
                  onClick={handleEditPhoneNumber}
                  className="profile-btn profile-btn-secondary edit-phone-btn"
                  disabled={
                    isSubmittingProfile ||
                    isUploadingPicture ||
                    isSendingOtp ||
                    isVerifyingOtp
                  }
                >
                  <FontAwesomeIcon icon={faEdit} /> Change Phone
                </button>
              </div>
            )}

            {showUnverifiedPhoneDisplay && (
              <div className="phone-display-unverified">
                <label>Current Phone Number</label>
                <div className="phone-number-text unverified-text">
                  <FontAwesomeIcon
                    icon={faExclamationTriangle}
                    className="unverified-icon"
                  />
                  {profileData.phone} (Unverified)
                </div>
                <button
                  type="button"
                  onClick={handleEditPhoneNumber}
                  className="profile-btn profile-btn-warning verify-now-btn"
                  disabled={
                    isSubmittingProfile ||
                    isUploadingPicture ||
                    isSendingOtp ||
                    isVerifyingOtp
                  }
                >
                  <FontAwesomeIcon icon={faEdit} /> Verify Now
                </button>
              </div>
            )}

            {showAddPhoneButton && (
              <button
                type="button"
                onClick={handleEditPhoneNumber}
                className="profile-btn profile-btn-neutral add-phone-btn"
                disabled={
                  isSubmittingProfile ||
                  isUploadingPicture ||
                  isSendingOtp ||
                  isVerifyingOtp
                }
              >
                <FontAwesomeIcon icon={faEdit} /> Add Phone Number
              </button>
            )}

            {showPhoneEditSection && (
              <>
                <div className="form-group">
                  <label htmlFor="phone">
                    {isUserHasPhone && isPhoneVerified
                      ? "New Phone Number (e.g., +91...)"
                      : "Phone Number (e.g., +91...)"}
                  </label>
                  <div className="phone-input-actions-group">
                    <PhoneInput
                      id="phone"
                      placeholder="Enter phone number"
                      value={currentPhoneNumber}
                      onChange={handlePhoneInputChange}
                      defaultCountry="IN"
                      international
                      countryCallingCodeEditable={false}
                      disabled={
                        isSendingOtp ||
                        isVerifyingOtp ||
                        (otpSentForNumber === currentPhoneNumber &&
                          otpSentForNumber !== "")
                      }
                      className={`PhoneInputStyled ${
                        currentPhoneNumber &&
                        !isValidPhoneNumber(currentPhoneNumber)
                          ? "input-invalid"
                          : ""
                      }`}
                    />
                    {showSendOtpButton && (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        className="profile-btn profile-btn-neutral phone-action-btn"
                        disabled={
                          isSendingOtp ||
                          isVerifyingOtp ||
                          !currentPhoneNumber ||
                          !isValidPhoneNumber(currentPhoneNumber)
                        }
                      >
                        {isSendingOtp ? (
                          <>
                            <FontAwesomeIcon icon={faSpinner} spin /> Sending...
                          </>
                        ) : (
                          <>
                            <FontAwesomeIcon icon={faPaperPlane} /> Send OTP
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  {showPhoneEditSection &&
                    currentPhoneNumber &&
                    !isValidPhoneNumber(currentPhoneNumber) && (
                      <p className="phone-status unverified">
                        <FontAwesomeIcon icon={faExclamationTriangle} /> Invalid
                        phone number format. Use international format (e.g.,
                        +911234567890).
                      </p>
                    )}
                  {otpSentForNumber === currentPhoneNumber &&
                    !showOtpInputSection && ( // Check if it should be showOtpInputSection instead of !showOtpInputSection
                      <p className="phone-status info">
                        OTP sent. Waiting for verification...
                      </p>
                    )}
                </div>

                {showOtpInputSection && (
                  <div className="otp-input-section">
                    <p className="otp-info-text">
                      An OTP was sent to <strong>{otpSentForNumber}</strong>.
                      Enter the 6-digit code below to verify.
                    </p>
                    <div className="form-group">
                      <label htmlFor="otpInput">Enter 6-Digit OTP</label>
                      <div className="otp-input-actions-group">
                        <input
                          type="text"
                          pattern="\d*"
                          id="otpInput"
                          name="otpInput"
                          value={otpInput}
                          onChange={(e) =>
                            setOtpInput(
                              e.target.value.replace(/\D/g, "").slice(0, 6)
                            )
                          }
                          maxLength="6"
                          disabled={isVerifyingOtp}
                          placeholder="XXXXXX"
                          className="otp-input-field"
                          autoComplete="one-time-code"
                        />
                        <button
                          type="button"
                          onClick={handleVerifyOtp}
                          className="profile-btn profile-btn-primary phone-action-btn"
                          disabled={isVerifyingOtp || otpInput.length !== 6}
                        >
                          {isVerifyingOtp ? (
                            <>
                              <FontAwesomeIcon icon={faSpinner} spin />{" "}
                              Verifying...
                            </>
                          ) : (
                            <>
                              <FontAwesomeIcon icon={faCheckCircle} /> Verify &
                              Update
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {showCancelEditPhoneButton && (
                  <button
                    type="button"
                    onClick={handleCancelEditPhoneNumber}
                    className="profile-btn profile-btn-danger cancel-edit-phone-btn"
                    disabled={isSendingOtp || isVerifyingOtp}
                  >
                    <FontAwesomeIcon icon={faTimes} /> Cancel Phone Change
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default ProfileSettingsPage;
