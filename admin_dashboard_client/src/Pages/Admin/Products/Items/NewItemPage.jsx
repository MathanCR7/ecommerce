// ========================================================================
// FILE: client/src/Pages/Admin/Products/Items/NewItemPage.jsx
// ========================================================================

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import itemService from "../../../../Services/itemService"; // Uses admin functions
import categoryService from "../../../../Services/categoryService"; // To fetch categories
import LoadingSpinner from "../../../../Components/Common/LoadingSpinner";
import {
  FaInfoCircle,
  FaImage,
  FaTimes,
  FaDollarSign,
  FaBoxes,
} from "react-icons/fa";
import "./NewItemPage.css"; // Specific or shared form styles

const NewItemPage = () => {
  const navigate = useNavigate();

  // Form State
  const [itemName, setItemName] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState("active");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Categories State
  const [categories, setCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  // General State
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false); // For form submission
  const fileInputRef = useRef(null);

  // Fetch Categories for Dropdown
  const fetchCategories = useCallback(async () => {
    setIsLoadingCategories(true);
    let categoryError = null;
    try {
      const fetchedCategories = await categoryService.getAllCategories();
      setCategories(Array.isArray(fetchedCategories) ? fetchedCategories : []);
      if (!Array.isArray(fetchedCategories) || fetchedCategories.length === 0) {
        categoryError = "No categories found. Please create a category first.";
      }
    } catch (err) {
      console.error("Failed to fetch categories for dropdown:", err);
      categoryError = "Could not load categories. Please try again later.";
      setCategories([]);
    } finally {
      setIsLoadingCategories(false);
      setError((prevError) => categoryError || prevError); // Set category error if occurred
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // --- Handlers ---
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setError(null); // Clear file-specific errors
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
    const maxSize = 5 * 1024 * 1024; // 5MB
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

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = null;
    setError(null); // Clear potential file-related errors
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
      // Allow 0 or positive integers
      setStock(value);
    }
  };

  // --- Submit Handler ---
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null); // Clear previous submission errors
    setSuccess("");

    // --- Validation ---
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

    // Prevent submission if categories haven't loaded or are empty
    if (isLoadingCategories || categories.length === 0) {
      setError("Cannot create item: Categories are not available.");
      return;
    }

    setIsLoading(true);

    const formData = new FormData();
    formData.append("name", itemName.trim());
    if (sku.trim()) formData.append("sku", sku.trim());
    if (description.trim()) formData.append("description", description.trim());
    formData.append("price", numPrice.toString());
    formData.append("stock", intStock.toString());
    formData.append("categoryId", categoryId);
    formData.append("status", status);
    if (imageFile) formData.append("image", imageFile);

    try {
      // Use createItem which targets the admin endpoint
      const createdItem = await itemService.createItem(formData);
      console.log("Item created:", createdItem);

      setSuccess(`Item "${createdItem.name}" created successfully!`);
      setError(null);

      // Reset form fields
      setItemName("");
      setSku("");
      setDescription("");
      setPrice("");
      setStock("");
      setCategoryId("");
      setStatus("active");
      clearImage(); // Also clear image selection

      // Navigate to list page after success
      setTimeout(() => navigate("/admin/products/items/list"), 1500);
    } catch (err) {
      console.error("Failed to create item:", err);
      setError(
        err.message || "An unexpected error occurred during item creation."
      );
      setSuccess(""); // Clear success on error
    } finally {
      setIsLoading(false);
    }
  };

  // --- Render ---
  const isSubmitDisabled =
    isLoading || isLoadingCategories || categories.length === 0;

  return (
    <div className="page-container form-page new-item-page">
      {isLoading && (
        <LoadingSpinner message="Creating Item..." isFullScreen={true} />
      )}

      <div className="form-header">
        <h1 className="form-title page-title">Add New Item</h1>
        <p className="form-subtitle page-subtitle">
          Enter the details for the new product.
        </p>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {" "}
          <FaInfoCircle /> {error}{" "}
        </div>
      )}
      {success && (
        <div className="alert alert-success" role="alert">
          {" "}
          <FaInfoCircle /> {success}{" "}
        </div>
      )}
      {!isLoadingCategories && categories.length === 0 && !error && (
        <div className="alert alert-warning" role="alert">
          Cannot create item: No categories found. Please add categories first.
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="stylish-form item-form"
        noValidate
      >
        <fieldset
          disabled={isLoading || isLoadingCategories}
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
                placeholder="e.g., Organic Apples"
                maxLength={150}
              />
            </div>
            <div className="form-group form-group-half">
              <label htmlFor="sku" className="form-label">
                SKU <span className="optional-text">(Optional, Unique)</span>
              </label>
              <input
                type="text"
                id="sku"
                className="form-control"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g., FRT-APL-001"
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
              placeholder="Detailed description of the item"
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
                  placeholder="0.00"
                  inputMode="decimal"
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
                  placeholder="0"
                  inputMode="numeric"
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
                  {isLoadingCategories ? "Loading..." : "-- Select Category --"}
                </option>
                {!isLoadingCategories && categories.length === 0 && (
                  <option value="" disabled>
                    No categories available
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
              Item Image{" "}
              <span className="optional-text">(Optional, Max 5MB)</span>
            </label>
            <input
              type="file"
              id="itemImage"
              ref={fileInputRef}
              className="form-control file-input"
              onChange={handleFileChange}
              accept="image/png, image/jpeg, image/gif, image/webp"
            />
            <div className="image-preview-wrapper">
              {imagePreview ? (
                <div className="image-preview-container active">
                  <img
                    src={imagePreview}
                    alt="Item Preview"
                    className="image-preview"
                  />
                  <button
                    type="button"
                    className="btn-icon image-clear-btn"
                    onClick={clearImage}
                    title="Remove image"
                    disabled={isLoading}
                  >
                    {" "}
                    <FaTimes />{" "}
                  </button>
                </div>
              ) : (
                <div className="image-preview-placeholder">
                  {" "}
                  <FaImage /> <span>No Image Selected</span>{" "}
                </div>
              )}
            </div>
            <small className="form-text">
              Allowed types: jpg, png, gif, webp. Max 5MB.
            </small>
          </div>

          {/* Actions */}
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate("/admin/products/items/list")}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitDisabled}
            >
              {" "}
              {isLoading ? "Creating..." : "Create Item"}{" "}
            </button>
          </div>
        </fieldset>
      </form>
    </div>
  );
};

export default NewItemPage;
