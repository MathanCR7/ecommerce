// ========================================================================
// FILE: client/src/Pages/Admin/Products/Categories/EditCategoryPage.jsx
// ========================================================================

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import categoryService from "../../../../Services/categoryService";
import { useAuth } from "../../../../Context/AuthContext";
import LoadingSpinner from "../../../../Components/Common/LoadingSpinner";
import { FaInfoCircle, FaImage, FaTimes } from "react-icons/fa";
import "./NewCategoryPage.css"; // Reuse styles from NewCategoryPage

// *** CORRECTED: Base URL without /api for constructing public asset URLs ***
const API_DOMAIN_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(
  "/api",
  ""
);
// Example: If VITE_API_BASE_URL="http://localhost:5000/api", API_DOMAIN_BASE="http://localhost:5000"

const EditCategoryPage = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // State
  const [categoryName, setCategoryName] = useState("");
  const [description, setDescription] = useState("");
  const [currentImagePath, setCurrentImagePath] = useState(null); // Relative path from DB
  const [imageFile, setImageFile] = useState(null); // For new file selection
  const [imagePreview, setImagePreview] = useState(null); // For previewing NEW file
  const [isLoadingData, setIsLoadingData] = useState(true); // For initial load
  const [isUpdating, setIsUpdating] = useState(false); // For submission
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState("");
  const fileInputRef = useRef(null);

  // --- Fetch Category Data ---
  const fetchCategoryData = useCallback(async () => {
    if (!categoryId) {
      setError("Category ID missing from URL.");
      setIsLoadingData(false);
      return;
    }
    if (!isAuthenticated) {
      // This should ideally be handled by ProtectedRoute, but good as a safeguard
      setError("Authentication required.");
      setIsLoadingData(false);
      return;
    }

    console.log(`Fetching data for category: ${categoryId}`);
    setIsLoadingData(true);
    setError(null); // Clear previous errors before fetch
    try {
      // categoryService.getCategoryById now returns category object directly
      const data = await categoryService.getCategoryById(categoryId);
      setCategoryName(data.name || "");
      setDescription(data.description || "");
      setCurrentImagePath(data.imagePath || null); // Store relative path (e.g., 'categories/image.png')
      console.log("Fetched category data:", data);
    } catch (err) {
      console.error("Fetch Category Error:", err);
      setError(err.message || "Failed to load category data.");
      // Optional: Navigate back if category not found (status 404)
      if (err.status === 404) {
        setTimeout(() => {
          navigate("/admin/products/categories/list", {
            replace: true,
            state: { error: "Category not found." },
          });
        }, 2500);
      }
    } finally {
      setIsLoadingData(false);
    }
  }, [categoryId, isAuthenticated, navigate]);

  useEffect(() => {
    fetchCategoryData();
  }, [fetchCategoryData]);

  // --- Handlers ---
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setError(null); // Clear previous errors

    if (!file) {
      // If user cancels file selection, revert to showing the current image (if any)
      setImageFile(null);
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = null;
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError(
        "Invalid file type. Please select an image (jpg, png, gif, webp)."
      );
      setImageFile(null);
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = null;
      return;
    }
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError(
        `File is too large. Maximum size allowed is ${maxSize / 1024 / 1024}MB.`
      );
      setImageFile(null);
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = null;
      return;
    }
    // Set the new file and generate its preview URL
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const clearImageSelection = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = null;
    setError(null); // Clear potential file-related errors
  };

  // --- Update Handler ---
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccess("");

    if (!categoryName.trim()) {
      setError("Category Name is required.");
      return;
    }

    setIsUpdating(true);

    const formData = new FormData();
    formData.append("name", categoryName.trim());
    // Send description even if empty to potentially clear it on backend
    formData.append("description", description.trim());
    // Only append image if a *new* file has been selected
    if (imageFile) {
      formData.append("image", imageFile);
    }
    // Backend handles logic: if 'image' is present in FormData, update/replace; otherwise, keep existing.

    try {
      console.log("Submitting update for category:", categoryId);
      // updateCategory service now returns the updated category object
      const updatedCategory = await categoryService.updateCategory(
        categoryId,
        formData
      );
      console.log("Category updated:", updatedCategory);

      setSuccess(`Category "${updatedCategory.name}" updated successfully!`);
      setError(null); // Clear any previous errors on success

      // Update state to reflect the potentially changed image path from the response
      setCurrentImagePath(updatedCategory.imagePath || null);
      // Clear the preview and file selection state as the update is complete
      clearImageSelection();

      // Navigate back after delay
      setTimeout(() => navigate("/admin/products/categories/list"), 1500);
    } catch (err) {
      console.error("Update Category Error:", err);
      setError(err.message || "An unexpected error occurred during update.");
      setSuccess(""); // Clear success message on error
    } finally {
      setIsUpdating(false);
    }
  };

  // --- Image Error Handler ---
  const handleImageError = (e) => {
    console.warn(`Failed to load image: ${e.target.src}`);
    e.target.style.display = "none"; // Hide broken image
    // Find the sibling placeholder and display it
    const placeholder = e.target
      .closest(".image-preview-container")
      ?.querySelector(".image-preview-placeholder");
    if (placeholder) {
      placeholder.style.display = "flex"; // Use flex for centering icon/text
    }
  };

  // --- Render ---
  if (isLoadingData) {
    return (
      <LoadingSpinner message="Loading Category Data..." isFullScreen={true} />
    );
  }

  // Determine which image source to show: new preview > current full URL > null
  let finalImageSource = null;
  if (imagePreview) {
    finalImageSource = imagePreview; // Show the selected new image preview
  } else if (currentImagePath) {
    // Construct the full URL for the existing image
    const relativeImagePath = currentImagePath.replace(/\\/g, "/");
    // *** CORRECTED IMAGE URL CONSTRUCTION ***
    finalImageSource = `${API_DOMAIN_BASE}/uploads/${relativeImagePath}`;
  }

  return (
    <div className="page-container form-page edit-category-page">
      {isUpdating && (
        <LoadingSpinner message="Updating Category..." isFullScreen={true} />
      )}

      <div className="form-header">
        <h1 className="form-title page-title">Edit Category</h1>
        <p className="form-subtitle page-subtitle">
          Update the details for this category.
        </p>
      </div>

      {/* Display Load Error or Success/Update Errors */}
      {error &&
        !isUpdating && ( // Only show submit errors when not submitting
          <div className="alert alert-danger" role="alert">
            <FaInfoCircle /> {error}
          </div>
        )}
      {success && (
        <div className="alert alert-success" role="alert">
          <FaInfoCircle /> {success}
        </div>
      )}
      {/* Show specific message if category data couldn't be loaded and no data exists */}
      {!isLoadingData && !categoryName && error && !isUpdating && (
        <div className="alert alert-warning" role="alert">
          Could not load category details. You may need to go back.
        </div>
      )}

      {/* Only render form if data loaded successfully OR if it's just an update error */}
      {
        (!isLoadingData && categoryName) || (!isLoadingData && !error) ? (
          <form
            onSubmit={handleSubmit}
            className="stylish-form category-form"
            noValidate
          >
            <fieldset
              disabled={isUpdating || isLoadingData} // Keep disabled during initial load too
              className="form-fieldset"
            >
              {/* Name */}
              <div className="form-group">
                <label htmlFor="categoryName" className="form-label required">
                  Category Name
                </label>
                <input
                  type="text"
                  id="categoryName"
                  className="form-control"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  required
                  maxLength={100}
                />
              </div>

              {/* Description */}
              <div className="form-group">
                <label htmlFor="description" className="form-label">
                  Description <span className="optional-text">(Optional)</span>
                </label>
                <textarea
                  id="description"
                  className="form-control"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows="4"
                  maxLength={500}
                />
              </div>

              {/* Image Upload */}
              <div className="form-group">
                <label htmlFor="categoryImage" className="form-label">
                  Change Category Image{" "}
                  <span className="optional-text">(Optional, Max 5MB)</span>
                </label>

                {/* Image Preview Area */}
                <div className="image-preview-wrapper">
                  <div
                    className={`image-preview-container ${
                      finalImageSource ? "active" : "" // Activate border/styles if there's an image to show
                    }`}
                  >
                    {/* Render img tag if we have a source (preview or existing) */}
                    {finalImageSource ? (
                      <>
                        <img
                          src={finalImageSource}
                          alt={
                            imagePreview
                              ? "New category preview"
                              : "Current category"
                          }
                          className="image-preview"
                          onError={handleImageError} // Use the error handler
                          loading="lazy"
                        />
                        {/* Show clear button ONLY if a NEW file is selected (imagePreview exists) */}
                        {imagePreview && (
                          <button
                            type="button"
                            className="btn-icon image-clear-btn"
                            onClick={clearImageSelection}
                            title="Clear selection"
                            aria-label="Clear selected image"
                            disabled={isUpdating} // Also disable when updating
                          >
                            <FaTimes />
                          </button>
                        )}
                      </>
                    ) : null}
                    {/* Placeholder - always rendered, shown/hidden via style */}
                    <div
                      className="image-preview-placeholder"
                      // Display flex only if no finalImageSource exists (or if img errors out)
                      style={{ display: finalImageSource ? "none" : "flex" }}
                    >
                      <FaImage />
                      <span>No Image Available</span>
                    </div>
                  </div>
                </div>

                <input
                  type="file"
                  id="categoryImage"
                  ref={fileInputRef}
                  className="form-control file-input"
                  onChange={handleFileChange}
                  accept="image/png, image/jpeg, image/gif, image/webp"
                  // Disabled state handled by fieldset
                />
                <small className="form-text">
                  Select a new image to replace the current one. Allowed types:
                  jpg, png, gif, webp. Max size: 5MB.
                </small>
              </div>

              {/* Actions */}
              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => navigate("/admin/products/categories/list")}
                  disabled={isUpdating} // Only disable based on update status
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isUpdating} // Only disable based on update status
                >
                  {isUpdating ? "Updating..." : "Update Category"}
                </button>
              </div>
            </fieldset>
          </form>
        ) : null /* Don't render form if initial load failed catastrophically */
      }
    </div>
  );
};

export default EditCategoryPage;
