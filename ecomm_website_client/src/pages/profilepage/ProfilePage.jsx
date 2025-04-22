import React, { useContext, useState, useEffect, useRef } from "react"; // Import useRef
import { AuthContext } from "../../context/AuthContext"; // Adjust path
import Header from "../../components/Header/Header"; // Adjust path
import Footer from "../../components/Footer/Footer"; // Adjust path
import api from "../../services/api"; // Adjust path
import toast from "react-hot-toast";
import "./ProfilePage.css"; // Ensure this CSS file exists and is linked

const ProfilePage = () => {
  const { user, loading, updateUserContext } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    displayName: "",
    phone: "",
    dob: "",
  });
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [currentProfilePic, setCurrentProfilePic] = useState("");
  const fileInputRef = useRef(null); // Ref for file input

  // Define the base URL for constructing image paths - USE YOUR ACTUAL BACKEND URL
  const API_DOMAIN = import.meta.env.VITE_API_DOMAIN || "http://localhost:5000"; // Your backend domain

  // Function to construct the profile picture URL robustly
  const getProfilePicUrl = (picturePath) => {
    if (!picturePath) {
      return "/assets/main-logo/default_avatar.png"; // Ensure this path is correct
    }
    try {
      // Check if it's already an absolute URL
      new URL(picturePath);
      return picturePath;
    } catch (_) {
      // Not an absolute URL, assume it's relative to the API domain
      // Ensure no double slashes if picturePath starts with / and API_DOMAIN ends with /
      const domain = API_DOMAIN.endsWith("/")
        ? API_DOMAIN.slice(0, -1)
        : API_DOMAIN;
      const path = picturePath.startsWith("/")
        ? picturePath
        : `/${picturePath}`;
      return `${domain}${path}`;
    }
  };

  useEffect(() => {
    if (user) {
      // console.log("User data received in ProfilePage:", user);
      setFormData({
        displayName: user.displayName || user.username || "", // Fallback display name
        phone: user.phone || "",
        dob: user.dob ? new Date(user.dob).toISOString().split("T")[0] : "",
      });
      // Use the refined function to set the profile picture URL
      setCurrentProfilePic(getProfilePicUrl(user.profilePicture));
    }
  }, [user]); // Dependency array includes user

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setProfilePictureFile(e.target.files[0]);
      // Optionally display a preview (requires URL.createObjectURL)
      // const reader = new FileReader();
      // reader.onloadend = () => {
      //   setCurrentProfilePic(reader.result); // Show local preview
      // }
      // reader.readAsDataURL(e.target.files[0]);
    } else {
      setProfilePictureFile(null);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsEditing(true);
    const toastId = toast.loading("Updating profile...");

    try {
      // Prepare updates, send only changed fields
      const updatesToSend = {};
      if (
        formData.displayName &&
        formData.displayName !== (user.displayName || user.username || "")
      ) {
        updatesToSend.displayName = formData.displayName;
      }
      if (formData.phone !== (user.phone || "")) {
        // Send even if empty to clear it
        // Basic validation (can be improved)
        if (formData.phone && !/^\+\d{10,15}$/.test(formData.phone)) {
          throw new Error("Invalid phone format. Use E.164 (e.g., +91...)");
        }
        updatesToSend.phone = formData.phone || null; // Send null if empty string
      }
      const currentDob = user.dob
        ? new Date(user.dob).toISOString().split("T")[0]
        : "";
      if (formData.dob !== currentDob) {
        // Send even if empty to clear it
        updatesToSend.dob = formData.dob || null; // Send null if empty string
      }

      if (Object.keys(updatesToSend).length === 0) {
        toast.dismiss(toastId);
        toast("No changes detected.", { icon: "ℹ️" });
        setIsEditing(false);
        return;
      }

      // console.log("Sending profile updates:", updatesToSend);
      const response = await api.put("/auth/profile", updatesToSend);
      // console.log("Profile update response:", response.data);

      updateUserContext(response.data.user); // Update context
      toast.success("Profile updated successfully!", { id: toastId });
      // Update form data with potentially corrected values from backend (like phone verification status change)
      setFormData({
        displayName:
          response.data.user.displayName || response.data.user.username || "",
        phone: response.data.user.phone || "",
        dob: response.data.user.dob
          ? new Date(response.data.user.dob).toISOString().split("T")[0]
          : "",
      });
    } catch (error) {
      console.error("Profile update error:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to update profile.";
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsEditing(false);
    }
  };

  const handlePictureUpload = async (e) => {
    e.preventDefault();
    if (!profilePictureFile) {
      toast.error("Please select an image file first.");
      return;
    }
    setIsUploading(true);
    const toastId = toast.loading("Uploading picture...");
    const pictureFormData = new FormData();
    pictureFormData.append("profilePicture", profilePictureFile);

    try {
      // console.log("Uploading profile picture...");
      const response = await api.post(
        "/auth/profile/picture",
        pictureFormData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      // console.log("Picture upload response:", response.data);

      updateUserContext(response.data.user); // Update context
      setCurrentProfilePic(getProfilePicUrl(response.data.user.profilePicture)); // Update displayed picture
      setProfilePictureFile(null); // Clear file state

      // Reset the file input visually using the ref
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      toast.success("Profile picture updated!", { id: toastId });
    } catch (error) {
      console.error("Picture upload error:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to upload picture.";
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  // Render loading state
  if (loading) {
    // Only check loading state
    return (
      <>
        <Header />
        <div className="container loading-container">
          {" "}
          {/* Add class for styling */}
          Loading profile... {/* Add a spinner? */}
        </div>
        <Footer />
      </>
    );
  }

  // Render message if not logged in (user is null after loading is false)
  if (!user) {
    return (
      <>
        <Header />
        <div className="container loading-container">
          <p>
            Please <Link to="/login">log in</Link> to view your profile.
          </p>
        </div>
        <Footer />
      </>
    );
  }

  // Render profile page content
  return (
    <>
      <Header />
      <div className="profile-page-container container">
        <h1>Your Profile</h1>
        <div className="profile-content">
          {/* Profile Picture Section */}
          <div className="profile-picture-section">
            <h2>Profile Picture</h2>
            <img
              src={currentProfilePic} // Use state variable for dynamic updates
              alt={`${user.displayName || user.username}'s profile`}
              className="profile-picture-img"
              onError={(e) => {
                // Fallback if image fails
                e.target.onerror = null;
                e.target.src = "/assets/main-logo/default_avatar.png";
              }}
            />
            <form
              onSubmit={handlePictureUpload}
              className="picture-upload-form"
            >
              <label
                htmlFor="profilePictureInput"
                className={`file-input-label btn-primary ${
                  isUploading ? "disabled" : ""
                }`}
              >
                {profilePictureFile ? "Change Picture" : "Choose Picture"}
              </label>
              <input
                id="profilePictureInput"
                ref={fileInputRef} // Assign ref
                type="file"
                accept="image/png, image/jpeg, image/gif" // Be specific
                onChange={handleFileChange}
                disabled={isUploading}
                style={{ display: "none" }}
              />
              {profilePictureFile && (
                <p className="file-name">Selected: {profilePictureFile.name}</p>
              )}
              <button
                type="submit"
                className="btn-primary"
                disabled={isUploading || !profilePictureFile}
              >
                {isUploading ? "Uploading..." : "Upload Picture"}
              </button>
            </form>
          </div>

          {/* Profile Details Section */}
          <div className="profile-details-section">
            <h2>Profile Details</h2>
            <p>
              <strong>Username:</strong> {user.username || "N/A"}
            </p>
            <p>
              <strong>Email:</strong> {user.email}
            </p>
            <hr style={{ margin: "20px 0" }} />
            <form
              onSubmit={handleUpdateProfile}
              className="profile-update-form"
            >
              <label htmlFor="displayNameInput">
                Display Name:
                <input
                  id="displayNameInput"
                  type="text"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleInputChange}
                  disabled={isEditing}
                  placeholder="Your public name"
                />
              </label>
              <label htmlFor="phoneInput">
                Phone Number (E.164):
                <input
                  id="phoneInput"
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+11234567890" // Example E.164 format
                  disabled={isEditing}
                />
                {user.phone && (
                  <span
                    className={
                      user.isPhoneVerified ? "verified" : "not-verified"
                    }
                  >
                    {user.isPhoneVerified ? " (Verified)" : " (Not Verified)"}
                  </span>
                )}
                {/* Add info text if phone was changed and needs verification */}
                {formData.phone &&
                  user.phone &&
                  formData.phone !== user.phone &&
                  !user.isPhoneVerified && (
                    <p className="info-text">
                      Verification needed for new number.
                    </p>
                  )}
              </label>
              <label htmlFor="dobInput">
                Date of Birth:
                <input
                  id="dobInput"
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleInputChange}
                  disabled={isEditing}
                  max={new Date().toISOString().split("T")[0]} // Prevent future dates
                />
              </label>
              <button
                type="submit"
                className="btn-primary"
                disabled={isEditing}
              >
                {isEditing ? "Saving..." : "Save Changes"}
              </button>
            </form>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default ProfilePage;
