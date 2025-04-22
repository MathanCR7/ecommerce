// ========================================================================
// FILE: client/src/Pages/Admin/Products/Categories/NewCategoryPage.jsx
// ========================================================================

import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import categoryService from "../../../../Services/categoryService"; // Use the service
import LoadingSpinner from "../../../../Components/Common/LoadingSpinner";
import { FaInfoCircle, FaImage, FaTimes } from "react-icons/fa";
import "./NewCategoryPage.css"; // Reuse styles

const NewCategoryPage = () => {
  const navigate = useNavigate();
  const [categoryName, setCategoryName] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null); // Ref to clear file input

  // --- Handlers ---
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setError(null); // Clear previous file errors

    if (!file) {
      setImageFile(null);
      setImagePreview(null);
      return;
    }

    // Check type
    if (!file.type.startsWith("image/")) {
      setError(
        "Invalid file type. Please select an image (jpg, png, gif, webp)."
      );
      setImageFile(null);
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = null; // Reset input
      return;
    }

    // Check size (5MB limit)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError(
        `File is too large. Maximum size allowed is ${maxSize / 1024 / 1024}MB.`
      );
      setImageFile(null);
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = null;
      return;
    }

    // If valid, set file and generate preview
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = null; // Reset the file input visually
    setError(null); // Clear potential file-related errors
  };

  // --- Submit Handler ---
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccess("");

    if (!categoryName.trim()) {
      setError("Category Name is required.");
      return;
    }

    setIsLoading(true);

    // Create FormData
    const formData = new FormData();
    formData.append("name", categoryName.trim());
    // Only append description if it has content
    if (description.trim()) {
      formData.append("description", description.trim());
    }
    // Append image file if selected
    if (imageFile) {
      formData.append("image", imageFile); // Backend expects 'image' field name
    }

    try {
      // categoryService.createCategory now returns the created category object directly
      const createdCategory = await categoryService.createCategory(formData);
      console.log("Category created:", createdCategory);

      setSuccess(`Category "${createdCategory.name}" created successfully!`);
      setError(null);

      // Reset form
      setCategoryName("");
      setDescription("");
      clearImage(); // Use the clear image function

      // Navigate after a short delay to show success message
      setTimeout(() => navigate("/admin/products/categories/list"), 1500);
    } catch (err) {
      console.error("Failed to create category:", err);
      setError(
        err.message || "An unexpected error occurred during category creation."
      );
      setSuccess(""); // Clear success message on error
    } finally {
      setIsLoading(false);
    }
  };

  // --- Render ---
  return (
    <div className="page-container form-page new-category-page">
      {isLoading && (
        <LoadingSpinner message="Creating Category..." isFullScreen={true} />
      )}

      <div className="form-header">
        <h1 className="form-title page-title">Add New Product Category</h1>
        <p className="form-subtitle page-subtitle">
          Fill in the details below.
        </p>
      </div>

      {/* Display Messages */}
      {error && (
        <div className="alert alert-danger" role="alert">
          <FaInfoCircle /> {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success" role="alert">
          <FaInfoCircle /> {success}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="stylish-form category-form"
        noValidate
      >
        <fieldset disabled={isLoading} className="form-fieldset">
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
              placeholder="e.g., Fresh Vegetables, Smartphones"
              maxLength={100} // Add max length
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
              placeholder="Provide a brief description of the category"
              maxLength={500} // Add max length
            />
          </div>

          {/* Image Upload */}
          <div className="form-group">
            <label htmlFor="categoryImage" className="form-label">
              Category Image{" "}
              <span className="optional-text">(Optional, Max 5MB)</span>
            </label>
            <input
              type="file"
              id="categoryImage"
              ref={fileInputRef} // Attach ref
              className="form-control file-input"
              onChange={handleFileChange}
              accept="image/png, image/jpeg, image/gif, image/webp" // Be specific
            />
            {/* Image Preview Area */}
            <div className="image-preview-wrapper">
              {imagePreview ? (
                <div className="image-preview-container active">
                  <img
                    src={imagePreview}
                    alt="Category Preview"
                    className="image-preview"
                  />
                  <button
                    type="button"
                    className="btn-icon image-clear-btn"
                    onClick={clearImage}
                    title="Remove image"
                    aria-label="Remove selected image"
                    disabled={isLoading} // Disable clear button while loading
                  >
                    <FaTimes />
                  </button>
                </div>
              ) : (
                <div className="image-preview-placeholder">
                  <FaImage />
                  <span>No Image Selected</span>
                </div>
              )}
            </div>
            <small className="form-text">
              Allowed types: jpg, png, gif, webp. Max size: 5MB.
            </small>
          </div>

          {/* Actions */}
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate("/admin/products/categories/list")}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? "Creating..." : "Create Category"}
            </button>
          </div>
        </fieldset>
      </form>
    </div>
  );
};

export default NewCategoryPage;
