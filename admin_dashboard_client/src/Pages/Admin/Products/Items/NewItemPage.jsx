// ========================================================================
// FILE: client/src/Pages/Admin/Products/Items/NewItemPage.jsx
// VERSION: Simplified from Advanced - Categories from general, No SEO/Org, Simplified Inventory
// ========================================================================
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import itemService from "../../../../Services/itemService";
import categoryService from "../../../../Services/categoryService"; // Using general category service
import LoadingSpinner from "../../../../Components/Common/LoadingSpinner";
import {
  FaInfoCircle,
  FaImage,
  FaBoxes,
  FaWeightHanging,
  FaRulerCombined,
  FaTrashAlt,
  FaStar,
  FaPercentage,
  FaRupeeSign,
  FaPlus, // For Add New Item title
  FaShippingFast, // For Shipping section
  FaMoneyBillWave, // For pricing section
} from "react-icons/fa";
import "./NewItemPage.css"; // Use the shared advanced CSS

const MAX_IMAGES = 5;
const MIN_IMAGES = 1;
const MAX_IMAGE_SIZE_MB = 5;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

// Helper to format currency (Indian Rupees)
const formatCurrencyForDisplay = (value) => {
  const number = Number(value);
  if (isNaN(number)) return "₹ 0.00";
  return `₹${number.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const NewItemPage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // --- Core Product Info ---
  const [itemName, setItemName] = useState("");
  const [sku, setSku] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [brand, setBrand] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState("draft"); // Default to 'draft'

  // --- Pricing ---
  const [mrp, setMrp] = useState("");
  const [discountType, setDiscountType] = useState("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [sellingPrice, setSellingPrice] = useState("0.00");

  // --- Inventory (Simplified) ---
  const [stock, setStock] = useState("");
  const [manageStock, setManageStock] = useState(true);
  const [lowStockThreshold, setLowStockThreshold] = useState("");

  // --- Shipping ---
  const [weight, setWeight] = useState("");
  const [dimensions, setDimensions] = useState({
    length: "",
    width: "",
    height: "",
    unit: "cm",
  });
  const [shippingClass, setShippingClass] = useState("");

  // --- Taxes ---
  const [isTaxable, setIsTaxable] = useState(false);
  const [cgstRate, setCgstRate] = useState("");
  const [sgstRate, setSgstRate] = useState("");

  // --- Images ---
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [imageAltTexts, setImageAltTexts] = useState([]);
  const [primaryImageIndex, setPrimaryImageIndex] = useState(0);

  // --- Other (Removed SEO & Organization) ---
  const [gtin, setGtin] = useState("");
  const [countryOfOrigin, setCountryOfOrigin] = useState("");
  const [warrantyInfo, setWarrantyInfo] = useState("");

  // --- UI State ---
  const [categories, setCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const fetchCategoriesCallback = useCallback(async () => {
    setIsLoadingCategories(true);
    let categoryError = null;
    try {
      const fetched = await categoryService.getAllCategories();
      setCategories(Array.isArray(fetched) ? fetched : []);
      if (!Array.isArray(fetched) || fetched.length === 0) {
        categoryError =
          "No categories found. Please create a category first to proceed.";
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
      categoryError =
        err.message || "Could not load categories. Please try again.";
      setCategories([]);
    } finally {
      setIsLoadingCategories(false);
      if (categoryError) setError((prev) => prev || categoryError);
    }
  }, []);

  useEffect(() => {
    fetchCategoriesCallback();
  }, [fetchCategoriesCallback]);

  useEffect(() => {
    const numMrp = parseFloat(mrp);
    const numDiscountValue = parseFloat(discountValue);

    if (isNaN(numMrp) || numMrp < 0) {
      setSellingPrice("0.00");
      return;
    }

    let calculatedPrice = numMrp;
    if (!isNaN(numDiscountValue) && numDiscountValue >= 0) {
      if (discountType === "percentage")
        calculatedPrice = numMrp - (numMrp * numDiscountValue) / 100;
      else if (discountType === "fixed")
        calculatedPrice = numMrp - numDiscountValue;
    }
    setSellingPrice(Math.max(0, calculatedPrice).toFixed(2));
  }, [mrp, discountType, discountValue]);

  const handleImageFileChange = (event) => {
    setError(null);
    const files = Array.from(event.target.files);
    if (!files.length) return;

    const newImageFilesTemp = [];
    // const newImagePreviewsTemp = []; // Not needed here, directly update state in reader.onloadend
    const newImageAltTextsTemp = [];
    let fileError = null;

    files.forEach((file) => {
      if (imageFiles.length + newImageFilesTemp.length >= MAX_IMAGES) {
        fileError = `Cannot upload more than ${MAX_IMAGES} images.`;
        return;
      }
      if (!file.type.startsWith("image/")) {
        fileError =
          "Invalid file type. Please select image files (jpg, png, gif, webp).";
        return;
      }
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        fileError = `File ${file.name} too large (Max ${MAX_IMAGE_SIZE_MB}MB).`;
        return;
      }

      newImageFilesTemp.push(file);
      newImageAltTextsTemp.push(
        itemName.trim() ||
          file.name.split(".")[0] ||
          `Image ${imageFiles.length + newImageFilesTemp.length + 1}`
      );

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });

    if (fileError) {
      setError(fileError);
    }

    setImageFiles((prev) => [...prev, ...newImageFilesTemp]);
    setImageAltTexts((prev) => [...prev, ...newImageAltTextsTemp]);

    if (imageFiles.length === 0 && newImageFilesTemp.length > 0) {
      setPrimaryImageIndex(0);
    }

    if (fileInputRef.current) fileInputRef.current.value = null;
  };

  const handleRemoveImage = (indexToRemove) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== indexToRemove));
    setImagePreviews((prev) => prev.filter((_, i) => i !== indexToRemove));
    setImageAltTexts((prev) => prev.filter((_, i) => i !== indexToRemove));

    if (primaryImageIndex === indexToRemove) {
      setPrimaryImageIndex(0);
    } else if (primaryImageIndex > indexToRemove) {
      setPrimaryImageIndex((prev) => prev - 1);
    }
  };

  const handleAltTextChange = (index, value) =>
    setImageAltTexts((prev) =>
      prev.map((alt, i) => (i === index ? value : alt))
    );

  const handleSetPrimaryImage = (index) => setPrimaryImageIndex(index);

  const handleInputChange = (setter) => (e) => setter(e.target.value);

  const handleNumberInputChange = (setter) => (e) => {
    const { value } = e.target;
    if (value === "" || /^\d*\.?\d*$/.test(value)) setter(value);
  };

  const handleIntegerInputChange = (setter) => (e) => {
    const { value } = e.target;
    // Allow empty string, 0, or positive integers without leading zeros (unless it's just "0")
    if (value === "" || /^(0|[1-9]\d*)$/.test(value)) setter(value);
  };

  const handleDimensionChange = (field) => (e) => {
    const { value } = e.target;
    // Allow empty string for clearing, or positive numbers (integers or decimals)
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setDimensions((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccess("");

    if (!itemName.trim()) {
      setError("Item Name is required.");
      return;
    }
    if (!categoryId) {
      setError("Category is required.");
      return;
    }
    if (imageFiles.length < MIN_IMAGES) {
      setError(`At least ${MIN_IMAGES} image is required.`);
      return;
    }
    if (imageFiles.length > MAX_IMAGES) {
      setError(`Maximum ${MAX_IMAGES} images allowed.`);
      return;
    }

    const numMrp = parseFloat(mrp);
    if (isNaN(numMrp) || numMrp <= 0) {
      setError("Valid MRP (> 0) is required.");
      return;
    }

    const intStock = parseInt(stock, 10);
    if (manageStock && (stock === "" || isNaN(intStock) || intStock < 0)) {
      setError("Valid Stock (>= 0) is required if managing stock.");
      return;
    }

    if (isLoadingCategories || (categories.length === 0 && !categoryId)) {
      setError("Categories are not available or not selected.");
      return;
    }

    setIsLoading(true);
    const formData = new FormData();

    formData.append("name", itemName.trim());
    if (sku.trim()) formData.append("sku", sku.trim());
    formData.append("shortDescription", shortDescription.trim());
    formData.append("description", description.trim());
    formData.append("brand", brand.trim());
    formData.append("categoryId", categoryId);
    formData.append("status", status);

    formData.append("mrp", numMrp.toString());
    formData.append("discountType", discountType);
    formData.append("discountValue", parseFloat(discountValue || 0).toString());

    formData.append(
      "stock",
      manageStock
        ? stock === "" || isNaN(intStock)
          ? "0"
          : intStock.toString()
        : "0"
    );
    formData.append("manageStock", manageStock.toString());
    if (lowStockThreshold.trim() && manageStock)
      formData.append("lowStockThreshold", lowStockThreshold.trim());

    if (weight.trim()) formData.append("weight", weight.trim());
    formData.append("dimensions", JSON.stringify(dimensions));
    formData.append("shippingClass", shippingClass.trim());

    formData.append("isTaxable", isTaxable.toString());
    if (isTaxable) {
      formData.append("cgstRate", parseFloat(cgstRate || 0).toString());
      formData.append("sgstRate", parseFloat(sgstRate || 0).toString());
    }

    imageFiles.forEach((file) => formData.append("images", file));
    formData.append("imageAltTexts", JSON.stringify(imageAltTexts));
    formData.append("primaryImageIndex", primaryImageIndex.toString());

    formData.append("gtin", gtin.trim());
    formData.append("countryOfOrigin", countryOfOrigin.trim());
    formData.append("warrantyInfo", warrantyInfo.trim());

    try {
      const createdItem = await itemService.createItem(formData);
      setSuccess(
        `Item "${createdItem.name || itemName}" created successfully! SKU: ${
          createdItem.sku || "N/A"
        }`
      );
      setError(null);
      // Consider a full form reset function here for better maintainability
      // For now, navigating away effectively "resets" for the next new item.
      setTimeout(
        () =>
          navigate("/admin/products/items/list", {
            state: { success: `Item "${createdItem.name}" created.` },
          }),
        2000
      );
    } catch (err) {
      console.error("Failed to create item:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          (err.response?.data?.errors
            ? JSON.stringify(err.response.data.errors)
            : "An unexpected error occurred.")
      );
      setSuccess("");
    } finally {
      setIsLoading(false);
    }
  };

  const isSubmitDisabled =
    isLoading ||
    isLoadingCategories ||
    (categories.length === 0 && !categoryId);

  return (
    <div className="page-container form-page item-form-container">
      {isLoading && (
        <LoadingSpinner message="Creating Item..." isFullScreen={true} />
      )}
      <div className="form-header">
        <h1 className="form-title page-title">
          <FaPlus /> Add New Item
        </h1>
        <p className="form-subtitle page-subtitle">
          Enter the details for the new product. Fields marked with{" "}
          <span className="required-asterisk">*</span> are mandatory.
        </p>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          <FaInfoCircle className="alert-icon" /> {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success" role="alert">
          <FaInfoCircle className="alert-icon" /> {success}
        </div>
      )}
      {!isLoadingCategories &&
        categories.length === 0 &&
        !error &&
        !categoryId && (
          <div className="alert alert-warning" role="alert">
            <FaInfoCircle className="alert-icon" />
            Cannot create item: No categories found. Please add categories
            first.
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
          {/* Section 1: Basic Information */}
          <div className="form-section card-style">
            <h2 className="form-section-title">
              <FaInfoCircle /> Basic Information
            </h2>
            <div className="form-group">
              <label htmlFor="itemName" className="form-label">
                Item Name <span className="required-asterisk">*</span>
              </label>
              <input
                type="text"
                id="itemName"
                className="form-control"
                value={itemName}
                onChange={handleInputChange(setItemName)}
                required
                maxLength={150}
                placeholder="e.g., Premium Cotton T-Shirt"
              />
            </div>
            <div className="form-row">
              <div className="form-group form-group-half">
                <label htmlFor="sku" className="form-label">
                  SKU{" "}
                  <span className="optional-text">
                    (Auto-generated if blank)
                  </span>
                </label>
                <input
                  type="text"
                  id="sku"
                  className="form-control"
                  value={sku}
                  onChange={handleInputChange(setSku)}
                  maxLength={50}
                  placeholder="e.g., TSHIRT-BLK-LG"
                />
              </div>
              <div className="form-group form-group-half">
                <label htmlFor="brand" className="form-label">
                  Brand <span className="optional-text">(Optional)</span>
                </label>
                <input
                  type="text"
                  id="brand"
                  className="form-control"
                  value={brand}
                  onChange={handleInputChange(setBrand)}
                  maxLength={100}
                  placeholder="e.g., YourBrand"
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="itemCategory" className="form-label">
                Category <span className="required-asterisk">*</span>
              </label>
              <select
                id="itemCategory"
                className="form-select"
                value={categoryId}
                onChange={handleInputChange(setCategoryId)}
                required
                disabled={isLoadingCategories || categories.length === 0}
              >
                <option value="" disabled>
                  {isLoadingCategories
                    ? "Loading Categories..."
                    : categories.length === 0
                    ? "No Categories Available"
                    : "-- Select Category --"}
                </option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {categories.length === 0 && !isLoadingCategories && (
                <small className="field-hint error-text">
                  No categories available. Please create one first.
                </small>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="shortDescription" className="form-label">
                Short Description{" "}
                <span className="optional-text">
                  (Max 500 chars, for listings)
                </span>
              </label>
              <textarea
                id="shortDescription"
                className="form-control"
                value={shortDescription}
                onChange={handleInputChange(setShortDescription)}
                rows="3"
                maxLength={500}
                placeholder="Brief, catchy summary of the item."
              ></textarea>
            </div>
            <div className="form-group">
              <label htmlFor="description" className="form-label">
                Full Description{" "}
                <span className="optional-text">(Detailed information)</span>
              </label>
              <textarea
                id="description"
                className="form-control"
                value={description}
                onChange={handleInputChange(setDescription)}
                rows="6"
                maxLength={5000}
                placeholder="Comprehensive details, features, benefits, materials, care instructions, etc."
              ></textarea>
            </div>
          </div>

          {/* Section 2: Pricing */}
          <div className="form-section card-style">
            <h2 className="form-section-title">
              <FaMoneyBillWave /> Pricing (INR)
            </h2>
            <div className="form-row">
              <div className="form-group form-group-third">
                <label htmlFor="mrp" className="form-label">
                  MRP <span className="required-asterisk">*</span>{" "}
                  <span className="optional-text">(Actual Price)</span>
                </label>
                <div className="input-with-icon">
                  <FaRupeeSign className="icon-prefix" />
                  <input
                    type="text"
                    id="mrp"
                    className="form-control"
                    value={mrp}
                    onChange={handleNumberInputChange(setMrp)}
                    required
                    placeholder="e.g., 1299.00"
                    inputMode="decimal"
                  />
                </div>
              </div>
              <div className="form-group form-group-third">
                <label htmlFor="discountType" className="form-label">
                  Discount Type <span className="required-asterisk">*</span>
                </label>
                <select
                  id="discountType"
                  className="form-select"
                  value={discountType}
                  onChange={handleInputChange(setDiscountType)}
                  required
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (₹)</option>
                </select>
              </div>
              <div className="form-group form-group-third">
                <label htmlFor="discountValue" className="form-label">
                  Discount Value <span className="required-asterisk">*</span>
                </label>
                <div className="input-with-icon">
                  {discountType === "percentage" ? (
                    <FaPercentage className="icon-prefix" />
                  ) : (
                    <FaRupeeSign className="icon-prefix" />
                  )}
                  <input
                    type="text"
                    id="discountValue"
                    className="form-control"
                    value={discountValue}
                    onChange={handleNumberInputChange(setDiscountValue)}
                    placeholder={
                      discountType === "percentage" ? "e.g., 10" : "e.g., 100"
                    }
                    inputMode="decimal"
                    required
                  />
                </div>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">
                Selling Price{" "}
                <span className="optional-text">(Calculated)</span>
              </label>
              <input
                type="text"
                className="form-control"
                value={formatCurrencyForDisplay(sellingPrice)}
                readOnly
                disabled
              />
            </div>
          </div>

          {/* Section 3: Images */}
          <div className="form-section card-style image-upload-section">
            <h2 className="form-section-title">
              <FaImage /> Product Images
            </h2>
            <label htmlFor="itemImagesTrigger" className="form-label">
              Upload Images <span className="required-asterisk">*</span>{" "}
              <span className="optional-text">
                (Min {MIN_IMAGES}, Max {MAX_IMAGES}, Max {MAX_IMAGE_SIZE_MB}MB
                each)
              </span>
            </label>
            {imageFiles.length < MAX_IMAGES && (
              <div
                id="itemImagesTrigger"
                className="image-upload-area"
                onClick={() => fileInputRef.current?.click()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleImageFileChange({
                    target: { files: e.dataTransfer.files },
                  });
                }}
                onDragOver={(e) => e.preventDefault()}
              >
                <FaImage className="upload-icon-main" />
                <p className="upload-text">
                  <strong>Click to browse</strong> or Drag & Drop files here
                </p>
                <small className="upload-hint">
                  Recommended: Square images, good lighting, clear background.
                </small>
                <input
                  type="file"
                  id="itemImages"
                  ref={fileInputRef}
                  className="file-input-hidden"
                  onChange={handleImageFileChange}
                  accept="image/png, image/jpeg, image/gif, image/webp"
                  multiple
                />
              </div>
            )}
            {imagePreviews.length > 0 && (
              <div className="image-previews-container">
                {imagePreviews.map((preview, index) => (
                  <div
                    key={index}
                    className={`image-preview-item ${
                      index === primaryImageIndex ? "is-primary" : ""
                    }`}
                  >
                    <img
                      src={preview}
                      alt={`Preview ${
                        imageAltTexts[index]?.substring(0, 30) || index + 1
                      }`}
                      className="preview-image-tag"
                    />
                    <div className="image-details">
                      <input
                        type="text"
                        className="alt-text-input form-control form-control-sm"
                        placeholder="Alt text (SEO & accessibility)"
                        value={imageAltTexts[index] || ""}
                        onChange={(e) =>
                          handleAltTextChange(index, e.target.value)
                        }
                        maxLength={100}
                      />
                      <div className="image-actions">
                        <button
                          type="button"
                          className={`btn-icon-action primary-img-btn ${
                            index === primaryImageIndex ? "active" : ""
                          }`}
                          title={
                            index === primaryImageIndex
                              ? "Primary Image"
                              : "Set as Primary"
                          }
                          onClick={() => handleSetPrimaryImage(index)}
                          disabled={index === primaryImageIndex}
                        >
                          <FaStar /> <span>Primary</span>
                        </button>
                        <button
                          type="button"
                          className="btn-icon-action remove-img-btn"
                          title="Remove Image"
                          onClick={() => handleRemoveImage(index)}
                        >
                          <FaTrashAlt /> <span>Remove</span>
                        </button>
                      </div>
                    </div>
                    {index === primaryImageIndex && (
                      <div className="primary-indicator">
                        <FaStar /> Primary
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {imageFiles.length < MIN_IMAGES &&
              !isLoading && ( // Show if not loading and condition met
                <p className="field-hint error-text">
                  Please upload at least {MIN_IMAGES} image.
                </p>
              )}
            {imageFiles.length >= MAX_IMAGES && (
              <p className="field-hint info-text">
                Maximum {MAX_IMAGES} images uploaded.
              </p>
            )}
          </div>

          {/* Section 4: Inventory (Simplified) */}
          <div className="form-section card-style">
            <h2 className="form-section-title">
              <FaBoxes /> Inventory & Status
            </h2>
            <div className="form-row">
              <div className="form-group form-group-half">
                <div className="form-check form-switch">
                  <input
                    type="checkbox"
                    id="manageStock"
                    className="form-check-input"
                    checked={manageStock}
                    onChange={(e) => setManageStock(e.target.checked)}
                    role="switch"
                  />
                  <label htmlFor="manageStock" className="form-check-label">
                    Manage Stock Levels?
                  </label>
                </div>
              </div>
              {manageStock && (
                <div className="form-group form-group-half">
                  <label htmlFor="itemStock" className="form-label">
                    Stock Quantity <span className="required-asterisk">*</span>
                  </label>
                  <div className="input-with-icon">
                    <FaBoxes className="icon-prefix" />
                    <input
                      type="text"
                      id="itemStock"
                      className="form-control"
                      value={stock}
                      onChange={handleIntegerInputChange(setStock)}
                      required={manageStock}
                      placeholder="e.g., 100"
                      inputMode="numeric"
                    />
                  </div>
                </div>
              )}
            </div>
            {manageStock && (
              <div className="form-group">
                <label htmlFor="lowStockThreshold" className="form-label">
                  Low Stock Threshold{" "}
                  <span className="optional-text">
                    (Notify when stock reaches this level)
                  </span>
                </label>
                <input
                  type="text"
                  id="lowStockThreshold"
                  className="form-control"
                  value={lowStockThreshold}
                  onChange={handleIntegerInputChange(setLowStockThreshold)}
                  placeholder="e.g., 5 or 10"
                  inputMode="numeric"
                />
              </div>
            )}
            <div className="form-group">
              <label htmlFor="itemStatus" className="form-label">
                Product Status <span className="required-asterisk">*</span>
              </label>
              <select
                id="itemStatus"
                className="form-select"
                value={status}
                onChange={handleInputChange(setStatus)}
                required
              >
                <option value="draft">Draft (Hidden, Not Purchasable)</option>
                <option value="active">Active (Visible & Purchasable)</option>
                <option value="inactive">
                  Inactive (Hidden, Not Purchasable)
                </option>
                <option value="out-of-stock">
                  Out of Stock (Visible, Not Purchasable)
                </option>
                <option value="discontinued">
                  Discontinued (Hidden, Not Purchasable)
                </option>
              </select>
            </div>
          </div>

          {/* Section 5: Shipping & Taxes */}
          <div className="form-section card-style">
            <h2 className="form-section-title">
              <FaShippingFast /> Shipping & Taxes
            </h2>
            <div className="form-row">
              <div className="form-group form-group-half">
                <label htmlFor="weight" className="form-label">
                  Weight (kg){" "}
                  <span className="optional-text">
                    (For shipping calculations)
                  </span>
                </label>
                <div className="input-with-icon">
                  <FaWeightHanging className="icon-prefix" />
                  <input
                    type="text"
                    id="weight"
                    className="form-control"
                    value={weight}
                    onChange={handleNumberInputChange(setWeight)}
                    placeholder="e.g., 0.5"
                    inputMode="decimal"
                  />
                </div>
              </div>
              <div className="form-group form-group-half">
                <label htmlFor="shippingClass" className="form-label">
                  Shipping Class{" "}
                  <span className="optional-text">(Optional)</span>
                </label>
                <input
                  type="text"
                  id="shippingClass"
                  className="form-control"
                  value={shippingClass}
                  onChange={handleInputChange(setShippingClass)}
                  placeholder="e.g., Standard, Bulky, Fragile"
                />
              </div>
            </div>
            <label className="form-label">
              Dimensions{" "}
              <span className="optional-text">(L x W x H, for shipping)</span>
            </label>
            <div className="form-row dimensions-row">
              <div className="form-group form-group-quarter">
                <input
                  type="text"
                  className="form-control"
                  value={dimensions.length}
                  onChange={handleDimensionChange("length")}
                  placeholder="Length"
                  inputMode="decimal"
                  aria-label="Length"
                />
              </div>
              <div className="form-group form-group-quarter">
                <input
                  type="text"
                  className="form-control"
                  value={dimensions.width}
                  onChange={handleDimensionChange("width")}
                  placeholder="Width"
                  inputMode="decimal"
                  aria-label="Width"
                />
              </div>
              <div className="form-group form-group-quarter">
                <input
                  type="text"
                  className="form-control"
                  value={dimensions.height}
                  onChange={handleDimensionChange("height")}
                  placeholder="Height"
                  inputMode="decimal"
                  aria-label="Height"
                />
              </div>
              <div className="form-group form-group-quarter">
                <select
                  className="form-select"
                  value={dimensions.unit}
                  onChange={handleDimensionChange("unit")}
                  aria-label="Dimension Unit"
                >
                  <option value="cm">cm</option>
                  <option value="in">in</option>
                  <option value="m">m</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <div className="form-check form-switch">
                <input
                  type="checkbox"
                  id="isTaxable"
                  className="form-check-input"
                  checked={isTaxable}
                  onChange={(e) => setIsTaxable(e.target.checked)}
                  role="switch"
                />
                <label htmlFor="isTaxable" className="form-check-label">
                  Is this item taxable?
                </label>
              </div>
            </div>
            {isTaxable && (
              <div className="form-row tax-rates-row">
                <div className="form-group form-group-half">
                  <label htmlFor="cgstRate" className="form-label">
                    CGST Rate (%){" "}
                    {isTaxable && <span className="required-asterisk">*</span>}
                  </label>
                  <div className="input-with-icon">
                    <FaPercentage className="icon-prefix" />
                    <input
                      type="text"
                      id="cgstRate"
                      className="form-control"
                      value={cgstRate}
                      onChange={handleNumberInputChange(setCgstRate)}
                      placeholder="e.g., 9"
                      inputMode="decimal"
                      required={isTaxable}
                    />
                  </div>
                </div>
                <div className="form-group form-group-half">
                  <label htmlFor="sgstRate" className="form-label">
                    SGST Rate (%){" "}
                    {isTaxable && <span className="required-asterisk">*</span>}
                  </label>
                  <div className="input-with-icon">
                    <FaPercentage className="icon-prefix" />
                    <input
                      type="text"
                      id="sgstRate"
                      className="form-control"
                      value={sgstRate}
                      onChange={handleNumberInputChange(setSgstRate)}
                      placeholder="e.g., 9"
                      inputMode="decimal"
                      required={isTaxable}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 6: Additional Information */}
          <div className="form-section card-style">
            <h2 className="form-section-title">
              <FaInfoCircle /> Additional Information
            </h2>
            <div className="form-row">
              <div className="form-group form-group-half">
                <label htmlFor="gtin" className="form-label">
                  GTIN <span className="optional-text">(UPC, EAN, ISBN)</span>
                </label>
                <input
                  type="text"
                  id="gtin"
                  className="form-control"
                  value={gtin}
                  onChange={handleInputChange(setGtin)}
                  placeholder="e.g., 123456789012"
                />
              </div>
              <div className="form-group form-group-half">
                <label htmlFor="countryOfOrigin" className="form-label">
                  Country of Origin{" "}
                  <span className="optional-text">(Optional)</span>
                </label>
                <input
                  type="text"
                  id="countryOfOrigin"
                  className="form-control"
                  value={countryOfOrigin}
                  onChange={handleInputChange(setCountryOfOrigin)}
                  placeholder="e.g., India"
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="warrantyInfo" className="form-label">
                Warranty Information{" "}
                <span className="optional-text">(Optional)</span>
              </label>
              <textarea
                id="warrantyInfo"
                className="form-control"
                value={warrantyInfo}
                onChange={handleInputChange(setWarrantyInfo)}
                rows="2"
                placeholder="e.g., 1 Year Manufacturer Warranty, No Warranty"
              ></textarea>
            </div>
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
              {isLoading ? "Creating..." : "Create Item"}
            </button>
          </div>
        </fieldset>
      </form>
    </div>
  );
};
export default NewItemPage;
