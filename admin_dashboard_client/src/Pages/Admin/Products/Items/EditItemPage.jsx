// ========================================================================
// FILE: client/src/Pages/Admin/Products/Items/EditItemPage.jsx
// ========================================================================

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom"; // Added useLocation
import itemService from "../../../../Services/itemService";
import categoryService from "../../../../Services/categoryService";
import LoadingSpinner from "../../../../Components/Common/LoadingSpinner";
import {
  FaInfoCircle,
  FaImage,
  FaTimes,
  FaDollarSign,
  FaBoxes,
} from "react-icons/fa";
import "./NewItemPage.css"; // Reuse styles

const IMAGE_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(
  "/api",
  ""
);

const EditItemPage = () => {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const location = useLocation(); // Get location state

  // Form State
  const [itemName, setItemName] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState("active");
  const [currentImagePath, setCurrentImagePath] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Categories State
  const [categories, setCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  // General State
  const [isLoadingData, setIsLoadingData] = useState(true); // For item data load
  const [isUpdating, setIsUpdating] = useState(false); // For submission
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState("");
  const fileInputRef = useRef(null);

  // Check for messages passed via navigation state
  useEffect(() => {
    if (location.state?.error) {
      setError(location.state.error);
      navigate(location.pathname, { replace: true, state: {} });
    }
    if (location.state?.success) {
      setSuccess(location.state.success);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  // --- Fetch Categories ---
  const fetchCategories = useCallback(async () => {
    setIsLoadingCategories(true);
    // Don't clear main error here, focus on category loading status
    let categoryFetchError = null;
    try {
      // Using admin endpoint for categories as this is admin panel
      const fetchedCategories = await categoryService.getAllCategories();
      setCategories(Array.isArray(fetchedCategories) ? fetchedCategories : []);
      if (!Array.isArray(fetchedCategories) || fetchedCategories.length === 0) {
        categoryFetchError =
          "No categories found. Please create a category first.";
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
      categoryFetchError =
        err.message || "Could not load categories. Please try again later.";
      setCategories([]);
    } finally {
      setIsLoadingCategories(false);
      // Set error only if a category error occurred
      if (categoryFetchError) {
        setError((prev) => prev || categoryFetchError); // Show category error if no other error exists
      }
    }
    // *** REMOVED isLoadingData dependency ***
  }, []); // Empty dependency array: fetchCategories defined once on mount

  // --- Fetch Item Data ---
  const fetchItemData = useCallback(async () => {
    if (!itemId) {
      setError("Item ID missing from URL.");
      setIsLoadingData(false);
      return;
    }
    console.log(`Fetching data for item: ${itemId}`);
    setIsLoadingData(true);
    setError(null); // Clear previous errors before fetching item
    try {
      const data = await itemService.getAdminItemById(itemId); // Use admin function
      setItemName(data.name || "");
      setSku(data.sku || "");
      setDescription(data.description || "");
      setPrice(data.price?.toString() || "0");
      setStock(data.stock?.toString() || "0");
      setCategoryId(data.category?._id || "");
      setStatus(data.status || "active");
      setCurrentImagePath(data.imagePath || null);
      console.log("Fetched item data:", data);
    } catch (err) {
      console.error("Fetch Item Error:", err);
      setError(err.message || "Failed to load item data.");
      if (err.status === 404) {
        setTimeout(() => {
          navigate("/admin/products/items/list", {
            replace: true,
            state: { error: "Item not found." },
          });
        }, 2500);
      }
    } finally {
      setIsLoadingData(false);
    }
  }, [itemId, navigate]); // Dependencies are stable after mount

  // Fetch both categories and item data on mount
  useEffect(() => {
    fetchCategories();
    fetchItemData();
    // Dependencies fetchCategories/fetchItemData are stable now
  }, [fetchCategories, fetchItemData]);

  // --- Handlers (File, Price, Stock, ClearImage - unchanged) ---
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setError(null);
    if (!file) {
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
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError(`File too large (Max ${maxSize / 1024 / 1024}MB).`);
      setImageFile(null);
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = null;
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };
  const clearImageSelection = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = null;
    setError(null);
  };
  const handlePriceChange = (e) => {
    const value = e.target.value;
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setPrice(value);
    }
  };
  const handleStockChange = (e) => {
    const value = e.target.value;
    if (value === "" || /^(0|[1-9]\d*)$/.test(value)) {
      setStock(value);
    }
  };

  // --- Update Handler (unchanged) ---
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccess("");

    // Validation
    if (!itemName.trim()) {
      setError("Item Name is required.");
      return;
    }
    if (!categoryId) {
      setError("Category is required.");
      return;
    }
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) {
      setError("Valid Price (>= 0) is required.");
      return;
    }
    const intStock = parseInt(stock, 10);
    if (isNaN(intStock) || intStock < 0) {
      setError("Valid Stock (>= 0) is required.");
      return;
    }
    // Prevent submission if categories failed to load
    if (isLoadingCategories || categories.length === 0) {
      setError("Cannot update item: Categories are not available.");
      return;
    }

    setIsUpdating(true);

    const formData = new FormData();
    formData.append("name", itemName.trim());
    formData.append("sku", sku.trim());
    formData.append("description", description.trim());
    formData.append("price", numPrice.toString());
    formData.append("stock", intStock.toString());
    formData.append("categoryId", categoryId);
    formData.append("status", status);
    if (imageFile) formData.append("image", imageFile);

    try {
      console.log("Submitting update for item:", itemId);
      const updatedItem = await itemService.updateItem(itemId, formData); // Uses admin endpoint
      console.log("Item updated:", updatedItem);
      setSuccess(`Item "${updatedItem.name}" updated successfully!`);
      setError(null);
      setCurrentImagePath(updatedItem.imagePath || null);
      clearImageSelection();
      setTimeout(() => navigate("/admin/products/items/list"), 1500);
    } catch (err) {
      console.error("Update Item Error:", err);
      setError(
        err.message || "An unexpected error occurred during item update."
      );
      setSuccess("");
    } finally {
      setIsUpdating(false);
    }
  };

  // --- Image Error Handler (unchanged) ---
  const handleImageError = (e) => {
    console.warn(`Failed to load image: ${e.target.src}`);
    e.target.style.display = "none";
    const placeholder = e.target
      .closest(".image-preview-container")
      ?.querySelector(".image-preview-placeholder");
    if (placeholder) placeholder.style.display = "flex";
  };

  // --- Render ---
  // Combine loading states for the main spinner
  const showOverallLoader = isLoadingData || isLoadingCategories;

  if (showOverallLoader && !isUpdating) {
    // Show full screen loader only on initial load
    return (
      <LoadingSpinner message="Loading Item Data..." isFullScreen={true} />
    );
  }

  // Determine image source
  let displayImageSource = null;
  if (imagePreview) {
    displayImageSource = imagePreview;
  } else if (currentImagePath) {
    const relativeImagePath = currentImagePath.replace(/\\/g, "/");
    displayImageSource = `${IMAGE_API_BASE_URL}/uploads/${relativeImagePath}`;
  }

  // More specific form disabling conditions
  const isFormDisabled = isUpdating || (!isLoadingData && !itemName && !!error); // Disable if updating or initial load failed critically
  const isSubmitDisabled =
    isUpdating ||
    isLoadingCategories ||
    (!isLoadingCategories && categories.length === 0); // Disable submit if updating or categories unavailable

  return (
    <div className="page-container form-page edit-item-page">
      {isUpdating && (
        <LoadingSpinner message="Updating Item..." isFullScreen={true} />
      )}

      <div className="form-header">
        <h1 className="form-title page-title">Edit Item</h1>
        <p className="form-subtitle page-subtitle">
          Update the product details below.
        </p>
      </div>

      {error && !isUpdating && (
        <div className="alert alert-danger" role="alert">
          <FaInfoCircle /> {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success" role="alert">
          <FaInfoCircle /> {success}
        </div>
      )}
      {!isLoadingCategories && categories.length === 0 && !error && (
        <div className="alert alert-warning" role="alert">
          Cannot save item: No categories loaded. Please check category
          management.
        </div>
      )}

      {/* Render form unless initial item load failed completely */}
      {!isLoadingData && itemName ? (
        <form
          onSubmit={handleSubmit}
          className="stylish-form item-form"
          noValidate
        >
          <fieldset
            disabled={isFormDisabled || isUpdating}
            className="form-fieldset"
          >
            {/* Row for Name & SKU */}
            <div className="form-row">
              <div className="form-group form-group-half">
                <label htmlFor="itemName" className="form-label required">
                  Item Name
                </label>
                <input
                  type="text"
                  id="itemName"
                  className="form-control"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  required
                  maxLength={150}
                />
              </div>
              <div className="form-group form-group-half">
                <label htmlFor="sku" className="form-label">
                  SKU <span className="optional-text">(Unique)</span>
                </label>
                <input
                  type="text"
                  id="sku"
                  className="form-control"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  maxLength={50}
                />
              </div>
            </div>

            {/* Description */}
            <div className="form-group">
              <label htmlFor="itemDescription" className="form-label">
                Description <span className="optional-text">(Optional)</span>
              </label>
              <textarea
                id="itemDescription"
                className="form-control"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows="4"
                maxLength={1000}
              />
            </div>

            {/* Row for Price, Stock, Category */}
            <div className="form-row">
              <div className="form-group form-group-third">
                <label htmlFor="itemPrice" className="form-label required">
                  Price
                </label>
                <div className="input-with-icon">
                  {" "}
                  <FaDollarSign />{" "}
                  <input
                    type="text"
                    id="itemPrice"
                    className="form-control"
                    value={price}
                    onChange={handlePriceChange}
                    required
                    inputMode="decimal"
                    placeholder="0.00"
                  />{" "}
                </div>
              </div>
              <div className="form-group form-group-third">
                <label htmlFor="itemStock" className="form-label required">
                  Stock Quantity
                </label>
                <div className="input-with-icon">
                  {" "}
                  <FaBoxes />{" "}
                  <input
                    type="text"
                    id="itemStock"
                    className="form-control"
                    value={stock}
                    onChange={handleStockChange}
                    required
                    inputMode="numeric"
                    placeholder="0"
                  />{" "}
                </div>
              </div>
              <div className="form-group form-group-third">
                <label htmlFor="itemCategory" className="form-label required">
                  Category
                </label>
                <select
                  id="itemCategory"
                  className="form-control"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                  disabled={isLoadingCategories || categories.length === 0}
                >
                  <option value="" disabled>
                    {isLoadingCategories
                      ? "Loading..."
                      : "-- Select Category --"}{" "}
                  </option>
                  {!isLoadingCategories && categories.length === 0 && (
                    <option value="" disabled>
                      No categories found
                    </option>
                  )}
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status */}
            <div className="form-group">
              <label htmlFor="itemStatus" className="form-label">
                Status
              </label>
              <select
                id="itemStatus"
                className="form-control"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="out-of-stock">Out of Stock</option>
                <option value="discontinued">Discontinued</option>
              </select>
            </div>

            {/* Image Upload */}
            <div className="form-group">
              <label htmlFor="itemImage" className="form-label">
                Change Item Image{" "}
                <span className="optional-text">(Optional, Max 5MB)</span>
              </label>
              <div className="image-preview-wrapper">
                <div
                  className={`image-preview-container ${
                    displayImageSource ? "active" : ""
                  }`}
                >
                  {displayImageSource ? (
                    <>
                      <img
                        src={displayImageSource}
                        alt={imagePreview ? "New item preview" : "Current item"}
                        className="image-preview"
                        onError={handleImageError}
                        loading="lazy"
                      />
                      {imagePreview && (
                        <button
                          type="button"
                          className="btn-icon image-clear-btn"
                          onClick={clearImageSelection}
                          title="Clear selection"
                          disabled={isUpdating}
                        >
                          {" "}
                          <FaTimes />{" "}
                        </button>
                      )}
                    </>
                  ) : null}
                  <div
                    className="image-preview-placeholder"
                    style={{ display: displayImageSource ? "none" : "flex" }}
                  >
                    {" "}
                    <FaImage /> <span>No Image Available</span>{" "}
                  </div>
                </div>
              </div>
              <input
                type="file"
                id="itemImage"
                ref={fileInputRef}
                className="form-control file-input"
                onChange={handleFileChange}
                accept="image/png, image/jpeg, image/gif, image/webp"
              />
              <small className="form-text">
                Select a new image to replace the current one. Max 5MB.
              </small>
            </div>

            {/* Actions */}
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate("/admin/products/items/list")}
                disabled={isUpdating}
              >
                Cancel
              </button>
              {/* Disable submit based on combined state */}
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitDisabled}
              >
                {" "}
                {isUpdating ? "Updating..." : "Update Item"}{" "}
              </button>
            </div>
          </fieldset>
        </form>
      ) : (
        !showOverallLoader &&
        error && (
          <div className="alert alert-danger">
            Could not load item data for editing. Please go back and try again.
          </div>
        ) // Show error if initial load failed
      )}
    </div>
  );
};

export default EditItemPage;
