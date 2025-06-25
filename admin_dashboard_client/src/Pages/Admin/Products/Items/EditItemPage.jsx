// ========================================================================
// FILE: client/src/Pages/Admin/Products/Items/EditItemPage.jsx
// VERSION: Simplified - Corrected Image Handling for Update
// ========================================================================
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import itemService from "../../../../Services/itemService";
import categoryService from "../../../../Services/categoryService"; // Using general category service
import LoadingSpinner from "../../../../Components/Common/LoadingSpinner";
import {
  FaInfoCircle,
  FaImage,
  FaBoxes,
  FaWeightHanging,
  FaTrashAlt,
  FaStar,
  FaPercentage,
  FaRupeeSign,
  FaEdit, // For page and section titles
  FaShippingFast, // For Shipping section
  FaPlus, // For add new image
  FaMoneyBillWave, // For pricing
} from "react-icons/fa";
import "./NewItemPage.css"; // Use the shared advanced CSS

const MAX_IMAGES = 5;
const MIN_IMAGES = 1;
const MAX_IMAGE_SIZE_MB = 5;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
const IMAGE_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(
  "/api",
  ""
);

// Helper to format currency (Indian Rupees)
const formatCurrencyForDisplay = (value) => {
  const number = Number(value);
  if (isNaN(number)) return "₹ 0.00";
  return `₹${number.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const EditItemPage = () => {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  // --- Core Product Info ---
  const [itemName, setItemName] = useState("");
  const [sku, setSku] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [brand, setBrand] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState("active");

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
  const [existingImages, setExistingImages] = useState([]);
  const [newImageFiles, setNewImageFiles] = useState([]);
  const [newImagePreviews, setNewImagePreviews] = useState([]);
  const [newImageAltTexts, setNewImageAltTexts] = useState([]);
  const [primaryImageIdentifier, setPrimaryImageIdentifier] = useState(null);

  // --- Other (Removed SEO & Organization) ---
  const [gtin, setGtin] = useState("");
  const [countryOfOrigin, setCountryOfOrigin] = useState("");
  const [warrantyInfo, setWarrantyInfo] = useState("");

  // --- UI State ---
  const [categories, setCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState("");

  const allDisplayImages = useMemo(() => {
    const displayedExisting = existingImages.map((img) => ({
      ...img,
      type: "existing",
      identifier: img.path,
      previewUrl: `${IMAGE_API_BASE_URL}/uploads/${img.path.replace(
        /\\/g,
        "/"
      )}`,
    }));
    const displayedNew = newImagePreviews.map((preview, index) => ({
      path: `new-${index}`, // Temporary identifier for new images not yet saved
      altText: newImageAltTexts[index] || "",
      isPrimary: false, // This is determined by primaryImageIdentifier
      type: "new",
      identifier: `new-${index}`,
      previewUrl: preview,
    }));
    return [...displayedExisting, ...displayedNew];
  }, [existingImages, newImagePreviews, newImageAltTexts]);

  const fetchCategoriesCallback = useCallback(async () => {
    setIsLoadingCategories(true);
    try {
      const fetched = await categoryService.getAllCategories(); // Using general category service as per provided snippet
      setCategories(Array.isArray(fetched) ? fetched : []);
      if (!Array.isArray(fetched) || fetched.length === 0) {
        console.warn(
          "No categories found for selection during fetch in EditItemPage."
        );
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
      const categoryLoadError =
        err.message || "Could not load categories. Please try again.";
      setError((prevError) => prevError || categoryLoadError);
      setCategories([]);
    } finally {
      setIsLoadingCategories(false);
    }
  }, []);

  const fetchItemDataCallback = useCallback(async () => {
    if (!itemId) {
      setError("Item ID is missing. Cannot fetch item data.");
      setIsLoadingData(false);
      navigate("/admin/products/items/list", {
        state: { error: "Invalid Item ID provided." },
      });
      return;
    }
    setIsLoadingData(true);
    setError(null);
    try {
      const data = await itemService.getAdminItemById(itemId);
      setItemName(data.name || "");
      setSku(data.sku || "");
      setShortDescription(data.shortDescription || "");
      setDescription(data.description || "");
      setBrand(data.brand || "");
      setCategoryId(data.category?._id || data.category || "");
      setStatus(data.status || "active");
      setMrp(data.mrp?.toString() || "");
      setDiscountType(data.discountType || "percentage");
      setDiscountValue(data.discountValue?.toString() || "");

      setStock(data.stock?.toString() || "");
      setManageStock(data.manageStock !== undefined ? data.manageStock : true);
      setLowStockThreshold(data.lowStockThreshold?.toString() || "");
      setWeight(data.weight?.toString() || "");
      setDimensions(
        data.dimensions || { length: "", width: "", height: "", unit: "cm" }
      );
      setShippingClass(data.shippingClass || "");
      setIsTaxable(data.isTaxable || false);
      setCgstRate(data.cgstRate?.toString() || "");
      setSgstRate(data.sgstRate?.toString() || "");
      setGtin(data.gtin || "");
      setCountryOfOrigin(data.countryOfOrigin || "");
      setWarrantyInfo(data.warrantyInfo || "");

      setExistingImages(data.images || []);
      const primaryImg =
        (data.images || []).find((img) => img.isPrimary) || data.images?.[0];
      if (primaryImg) {
        setPrimaryImageIdentifier(primaryImg.path);
      } else if (data.images?.length > 0) {
        setPrimaryImageIdentifier(data.images[0].path);
      } else {
        setPrimaryImageIdentifier(null);
      }
      setInitialDataLoaded(true);
    } catch (err) {
      console.error("Failed to fetch item data:", err);
      const errMsg =
        err.response?.data?.message ||
        err.message ||
        "Failed to load item data.";
      setError(errMsg);
      if (err.response?.status === 404) {
        setTimeout(
          () =>
            navigate("/admin/products/items/list", {
              replace: true,
              state: { error: "Item not found." },
            }),
          2500
        );
      }
    } finally {
      setIsLoadingData(false);
    }
  }, [itemId, navigate]);

  useEffect(() => {
    fetchCategoriesCallback();
    fetchItemDataCallback();
  }, [fetchCategoriesCallback, fetchItemDataCallback]);

  useEffect(() => {
    const numMrp = parseFloat(mrp);
    const numDiscountValue = parseFloat(discountValue);

    if (isNaN(numMrp) || numMrp < 0) {
      setSellingPrice("0.00");
      return;
    }
    let calculatedPrice = numMrp;
    if (!isNaN(numDiscountValue) && numDiscountValue >= 0) {
      if (discountType === "percentage") {
        calculatedPrice = numMrp - (numMrp * numDiscountValue) / 100;
      } else if (discountType === "fixed") {
        calculatedPrice = numMrp - numDiscountValue;
      }
    }
    setSellingPrice(Math.max(0, calculatedPrice).toFixed(2));
  }, [mrp, discountType, discountValue]);

  const handleImageFileChange = (event) => {
    setError(null);
    const files = Array.from(event.target.files);
    if (!files.length) return;

    const currentTotalImages = existingImages.length + newImageFiles.length;
    let addedCount = 0;

    const tempNewImageFiles = [];
    const tempNewImageAltTexts = [];
    let fileError = null;

    files.forEach((file) => {
      if (currentTotalImages + addedCount >= MAX_IMAGES) {
        fileError = `Cannot upload more than ${MAX_IMAGES} images in total.`;
        return; // Stop processing further files in this batch
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

      tempNewImageFiles.push(file);
      tempNewImageAltTexts.push(
        itemName.trim() ||
          file.name.split(".")[0] ||
          `New Image ${newImageFiles.length + tempNewImageFiles.length + 1}`
      );

      const reader = new FileReader();
      reader.onloadend = () => {
        setNewImagePreviews((prev) => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
      addedCount++;
    });

    if (fileError) setError(fileError); // Show only the first error encountered

    setNewImageFiles((prev) => [...prev, ...tempNewImageFiles]);
    setNewImageAltTexts((prev) => [...prev, ...tempNewImageAltTexts]);

    if (
      !primaryImageIdentifier &&
      existingImages.length === 0 &&
      newImageFiles.length === 0 &&
      tempNewImageFiles.length > 0
    ) {
      setPrimaryImageIdentifier(`new-0`);
    }

    if (fileInputRef.current) fileInputRef.current.value = null;
  };

  const handleRemoveExistingImage = (pathToRemove) => {
    setExistingImages((prev) =>
      prev.filter((img) => img.path !== pathToRemove)
    );
    if (primaryImageIdentifier === pathToRemove) {
      const remainingExisting = existingImages.filter(
        (img) => img.path !== pathToRemove
      );
      if (remainingExisting.length > 0) {
        setPrimaryImageIdentifier(remainingExisting[0].path);
      } else if (newImageFiles.length > 0) {
        setPrimaryImageIdentifier(`new-0`);
      } else {
        setPrimaryImageIdentifier(null);
      }
    }
  };

  const handleRemoveNewImage = (indexToRemove) => {
    const removedIdentifier = `new-${indexToRemove}`;

    // Create new arrays by filtering out the element at indexToRemove
    const updatedNewImageFiles = newImageFiles.filter(
      (_, i) => i !== indexToRemove
    );
    const updatedNewImagePreviews = newImagePreviews.filter(
      (_, i) => i !== indexToRemove
    );
    const updatedNewImageAltTexts = newImageAltTexts.filter(
      (_, i) => i !== indexToRemove
    );

    setNewImageFiles(updatedNewImageFiles);
    setNewImagePreviews(updatedNewImagePreviews);
    setNewImageAltTexts(updatedNewImageAltTexts);

    if (primaryImageIdentifier === removedIdentifier) {
      if (existingImages.length > 0) {
        setPrimaryImageIdentifier(existingImages[0].path);
      } else if (updatedNewImageFiles.length > 0) {
        setPrimaryImageIdentifier(`new-0`); // Default to the first of remaining new images
      } else {
        setPrimaryImageIdentifier(null);
      }
    } else if (primaryImageIdentifier?.startsWith("new-")) {
      const oldPrimaryIndex = parseInt(
        primaryImageIdentifier.split("-")[1],
        10
      );
      if (indexToRemove < oldPrimaryIndex) {
        setPrimaryImageIdentifier(`new-${oldPrimaryIndex - 1}`);
      } else if (indexToRemove === oldPrimaryIndex) {
        // Primary new image was removed
        if (updatedNewImageFiles.length > 0) {
          setPrimaryImageIdentifier(`new-0`); // If others remain, set new-0
        } else if (existingImages.length > 0) {
          setPrimaryImageIdentifier(existingImages[0].path); // Else fallback to existing
        } else {
          setPrimaryImageIdentifier(null); // Or null if nothing left
        }
      }
    }
  };

  const handleAltTextChange = (identifier, value, type) => {
    if (type === "existing") {
      setExistingImages((prev) =>
        prev.map((img) =>
          img.path === identifier ? { ...img, altText: value } : img
        )
      );
    } else {
      // type === 'new'
      const index = parseInt(identifier.split("-")[1], 10);
      setNewImageAltTexts((prev) =>
        prev.map((alt, i) => (i === index ? value : alt))
      );
    }
  };

  const handleSetPrimaryImage = (identifier) => {
    setPrimaryImageIdentifier(identifier);
  };

  const handleInputChange = (setter) => (e) => setter(e.target.value);
  const handleNumberInputChange = (setter) => (e) => {
    const { value } = e.target;
    if (value === "" || /^\d*\.?\d*$/.test(value)) setter(value);
  };
  const handleIntegerInputChange = (setter) => (e) => {
    const { value } = e.target;
    if (value === "" || /^(0|[1-9]\d*)$/.test(value)) setter(value);
  };
  const handleDimensionChange = (field) => (e) => {
    const { value } = e.target;
    if (field === "unit") {
      setDimensions((prev) => ({ ...prev, unit: value }));
    } else if (value === "" || /^\d*\.?\d*$/.test(value)) {
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
    if (allDisplayImages.length < MIN_IMAGES) {
      setError(`At least ${MIN_IMAGES} image is required.`);
      return;
    }
    if (allDisplayImages.length > MAX_IMAGES) {
      setError(`Maximum ${MAX_IMAGES} images allowed.`);
      return;
    }
    if (!primaryImageIdentifier && allDisplayImages.length > 0) {
      setError("A primary image must be selected.");
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

    setIsUpdating(true);
    const formData = new FormData();

    formData.append("name", itemName.trim());
    formData.append("sku", sku.trim());
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
      manageStock ? (stock.trim() === "" ? "0" : stock) : "0"
    );
    formData.append("manageStock", manageStock.toString());
    formData.append("lowStockThreshold", lowStockThreshold.trim());
    formData.append("weight", weight.trim());
    formData.append("dimensions", JSON.stringify(dimensions));
    formData.append("shippingClass", shippingClass.trim());
    formData.append("isTaxable", isTaxable.toString());
    if (isTaxable) {
      formData.append("cgstRate", parseFloat(cgstRate || 0).toString());
      formData.append("sgstRate", parseFloat(sgstRate || 0).toString());
    }
    formData.append("gtin", gtin.trim());
    formData.append("countryOfOrigin", countryOfOrigin.trim());
    formData.append("warrantyInfo", warrantyInfo.trim());

    const keptExistingImagesData = existingImages.map((img) => ({
      path: img.path,
      altText: img.altText || "", // Ensure altText is always a string
    }));
    formData.append(
      "keptExistingImages",
      JSON.stringify(keptExistingImagesData)
    );

    // Ensure newImageAltTexts has a value for each newImageFile
    const finalNewImageAltTexts = newImageFiles.map(
      (_, index) =>
        newImageAltTexts[index] || itemName.trim() || `New Image ${index + 1}`
    );

    newImageFiles.forEach((file) => formData.append("newImages", file));
    formData.append("newImageAltTexts", JSON.stringify(finalNewImageAltTexts));

    if (primaryImageIdentifier) {
      formData.append("primaryImageIdentifier", primaryImageIdentifier);
    }

    try {
      const updatedItem = await itemService.updateItem(itemId, formData);
      setSuccess(
        `Item "${updatedItem.name || itemName}" updated successfully!`
      );
      setError(null);

      // Reset image states based on backend response
      setExistingImages(updatedItem.images || []);
      setNewImageFiles([]);
      setNewImagePreviews([]);
      setNewImageAltTexts([]);

      const newPrimaryImg = (updatedItem.images || []).find(
        (img) => img.isPrimary
      );
      setPrimaryImageIdentifier(
        newPrimaryImg
          ? newPrimaryImg.path
          : updatedItem.images?.[0]?.path || null
      );

      setTimeout(
        () =>
          navigate("/admin/products/items/list", {
            replace: true, // Prevent going back to the edit form with old state
            state: { success: `Item "${updatedItem.name}" updated.` },
          }),
        2000
      );
    } catch (err) {
      console.error("Failed to update item:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "An unexpected error occurred during item update."
      );
      setSuccess("");
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoadingData && !initialDataLoaded) {
    return (
      <LoadingSpinner message="Loading Item Data..." isFullScreen={true} />
    );
  }

  // This condition handles critical errors like item not found AFTER initial load attempt
  if (!initialDataLoaded && error && !isLoadingData) {
    return (
      <div className="page-container form-page item-form-container">
        <div className="form-header">
          <h1 className="form-title page-title">
            <FaEdit /> Edit Item
          </h1>
        </div>
        <div className="alert alert-danger" role="alert">
          <FaInfoCircle className="alert-icon" /> {error}
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => navigate("/admin/products/items/list")}
        >
          Back to Item List
        </button>
      </div>
    );
  }

  const disableFormActions =
    isUpdating || isLoadingCategories || (!initialDataLoaded && isLoadingData);

  return (
    <div className="page-container form-page item-form-container">
      {isUpdating && ( // Show spinner during update submission
        <LoadingSpinner message="Updating Item..." isFullScreen={true} />
      )}

      <div className="form-header">
        <h1 className="form-title page-title">
          <FaEdit /> Edit Item
        </h1>
        <p className="form-subtitle page-subtitle">
          Modify product details for:{" "}
          {initialDataLoaded ? (
            <strong>"{itemName}"</strong>
          ) : (
            "Loading item..."
          )}
        </p>
      </div>

      {/* Display general errors or success messages */}
      {error && (
        <div className="alert alert-danger" role="alert">
          <FaInfoCircle className="alert-icon" /> {error}
          {/* Developer Note: The error "MulterError: Unexpected field" for 'newImages'
              indicates a backend misconfiguration. The Multer middleware for the item
              update route needs to be configured to accept files under the 'newImages' field.
              Example: upload.fields([{ name: 'newImages', maxCount: 5 }]) or upload.array('newImages', 5).
          */}
        </div>
      )}
      {success && (
        <div className="alert alert-success" role="alert">
          <FaInfoCircle className="alert-icon" /> {success}
        </div>
      )}
      {!isLoadingCategories && categories.length === 0 && !error && (
        <div className="alert alert-warning" role="alert">
          <FaInfoCircle className="alert-icon" /> Warning: No categories found.
          Category selection might be limited or unavailable.
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="stylish-form item-form"
        noValidate
      >
        <fieldset disabled={disableFormActions} className="form-fieldset">
          {/* Section 1: Basic Information */}
          <div className="form-section card-style">
            <h2 className="form-section-title">
              <FaInfoCircle /> Basic Information
            </h2>
            <div className="form-group">
              <label htmlFor="itemNameEdit" className="form-label">
                Item Name <span className="required-asterisk">*</span>
              </label>
              <input
                type="text"
                id="itemNameEdit"
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
                <label htmlFor="skuEdit" className="form-label">
                  SKU{" "}
                  <span className="optional-text">
                    (Leave blank to keep current)
                  </span>
                </label>
                <input
                  type="text"
                  id="skuEdit"
                  className="form-control"
                  value={sku}
                  onChange={handleInputChange(setSku)}
                  maxLength={50}
                  placeholder="e.g., TSHIRT-BLK-LG"
                />
              </div>
              <div className="form-group form-group-half">
                <label htmlFor="brandEdit" className="form-label">
                  Brand <span className="optional-text">(Optional)</span>
                </label>
                <input
                  type="text"
                  id="brandEdit"
                  className="form-control"
                  value={brand}
                  onChange={handleInputChange(setBrand)}
                  maxLength={100}
                  placeholder="e.g., YourBrand"
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="itemCategoryEdit" className="form-label">
                Category <span className="required-asterisk">*</span>
              </label>
              <select
                id="itemCategoryEdit"
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
                  No categories available. Please create one first to assign.
                </small>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="shortDescriptionEdit" className="form-label">
                Short Description{" "}
                <span className="optional-text">(Max 500 chars)</span>
              </label>
              <textarea
                id="shortDescriptionEdit"
                className="form-control"
                value={shortDescription}
                onChange={handleInputChange(setShortDescription)}
                rows="3"
                maxLength={500}
                placeholder="Brief, catchy summary of the item."
              />
            </div>
            <div className="form-group">
              <label htmlFor="descriptionEdit" className="form-label">
                Full Description{" "}
                <span className="optional-text">(Detailed info)</span>
              </label>
              <textarea
                id="descriptionEdit"
                className="form-control"
                value={description}
                onChange={handleInputChange(setDescription)}
                rows="6"
                maxLength={5000}
                placeholder="Comprehensive details, features, benefits, etc."
              />
            </div>
          </div>

          {/* Section 2: Pricing */}
          <div className="form-section card-style">
            <h2 className="form-section-title">
              <FaMoneyBillWave /> Pricing (INR)
            </h2>
            <div className="form-row">
              <div className="form-group form-group-third">
                <label htmlFor="mrpEdit" className="form-label">
                  MRP <span className="required-asterisk">*</span>
                </label>
                <div className="input-with-icon">
                  <FaRupeeSign className="icon-prefix" />
                  <input
                    type="text"
                    id="mrpEdit"
                    className="form-control"
                    value={mrp}
                    onChange={handleNumberInputChange(setMrp)}
                    required
                    inputMode="decimal"
                    placeholder="e.g., 1299.00"
                  />
                </div>
              </div>
              <div className="form-group form-group-third">
                <label htmlFor="discountTypeEdit" className="form-label">
                  Discount Type
                </label>
                <select
                  id="discountTypeEdit"
                  className="form-select"
                  value={discountType}
                  onChange={handleInputChange(setDiscountType)}
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (₹)</option>
                </select>
              </div>
              <div className="form-group form-group-third">
                <label htmlFor="discountValueEdit" className="form-label">
                  Discount Value
                </label>
                <div className="input-with-icon">
                  {discountType === "percentage" ? (
                    <FaPercentage className="icon-prefix" />
                  ) : (
                    <FaRupeeSign className="icon-prefix" />
                  )}
                  <input
                    type="text"
                    id="discountValueEdit"
                    className="form-control"
                    value={discountValue}
                    onChange={handleNumberInputChange(setDiscountValue)}
                    inputMode="decimal"
                    placeholder={
                      discountType === "percentage" ? "e.g., 10" : "e.g., 100"
                    }
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
            <label htmlFor="itemImagesUpdate" className="form-label">
              Update/Add Images
              <span className="optional-text">
                {" "}
                (Min {MIN_IMAGES}, Max {MAX_IMAGES} total, Max{" "}
                {MAX_IMAGE_SIZE_MB}MB each)
              </span>
            </label>
            {allDisplayImages.length < MAX_IMAGES && (
              <div
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
                <FaPlus className="upload-icon-main" />
                <p className="upload-text">
                  <strong>Click to browse</strong> or Drag & Drop new images
                </p>
                <small className="upload-hint">
                  Add more images to enhance your product listing.
                </small>
                <input
                  type="file"
                  id="itemImagesUpdate"
                  ref={fileInputRef}
                  className="file-input-hidden"
                  onChange={handleImageFileChange}
                  accept="image/png, image/jpeg, image/gif, image/webp"
                  multiple
                />
              </div>
            )}
            {allDisplayImages.length === 0 && !isLoadingData && (
              <p className="field-hint error-text">
                No images found for this product. Please upload at least{" "}
                {MIN_IMAGES} image.
              </p>
            )}

            {allDisplayImages.length > 0 && (
              <div className="image-previews-container">
                {allDisplayImages.map((img) => (
                  <div
                    key={img.identifier}
                    className={`image-preview-item ${
                      img.identifier === primaryImageIdentifier
                        ? "is-primary"
                        : ""
                    }`}
                  >
                    <img
                      src={img.previewUrl}
                      alt={img.altText || `Preview of ${itemName || "product"}`}
                      className="preview-image-tag"
                      onError={(e) => (e.target.src = "/placeholder-image.png")}
                    />
                    <div className="image-details">
                      <input
                        type="text"
                        className="alt-text-input form-control form-control-sm"
                        placeholder="Alt text (SEO & accessibility)"
                        value={img.altText || ""}
                        onChange={(e) =>
                          handleAltTextChange(
                            img.identifier,
                            e.target.value,
                            img.type
                          )
                        }
                        maxLength={100}
                      />
                      <div className="image-actions">
                        <button
                          type="button"
                          className={`btn-icon-action primary-img-btn ${
                            img.identifier === primaryImageIdentifier
                              ? "active"
                              : ""
                          }`}
                          title={
                            img.identifier === primaryImageIdentifier
                              ? "Primary Image"
                              : "Set as Primary"
                          }
                          onClick={() => handleSetPrimaryImage(img.identifier)}
                          disabled={img.identifier === primaryImageIdentifier}
                        >
                          <FaStar /> <span>Primary</span>
                        </button>
                        <button
                          type="button"
                          className="btn-icon-action remove-img-btn"
                          title="Remove Image"
                          onClick={() => {
                            const isNewImg = img.type === "new";
                            const index = isNewImg
                              ? parseInt(img.identifier.split("-")[1], 10)
                              : -1;
                            if (isNewImg) {
                              handleRemoveNewImage(index);
                            } else {
                              handleRemoveExistingImage(img.path);
                            }
                          }}
                        >
                          <FaTrashAlt /> <span>Remove</span>
                        </button>
                      </div>
                    </div>
                    {img.identifier === primaryImageIdentifier && (
                      <div className="primary-indicator">
                        <FaStar /> Primary
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {allDisplayImages.length < MIN_IMAGES &&
              !isLoadingData &&
              initialDataLoaded && (
                <p className="field-hint error-text">
                  Please ensure at least {MIN_IMAGES} image is present.
                </p>
              )}
            {allDisplayImages.length > 0 &&
              !primaryImageIdentifier &&
              !isLoadingData &&
              initialDataLoaded && (
                <p className="field-hint error-text">
                  Please select a primary image by clicking the star icon.
                </p>
              )}
          </div>

          {/* Section 4: Inventory */}
          <div className="form-section card-style">
            <h2 className="form-section-title">
              <FaBoxes /> Inventory & Status
            </h2>
            <div className="form-row">
              <div className="form-group form-group-half">
                <div className="form-check form-switch">
                  <input
                    type="checkbox"
                    id="manageStockEdit"
                    className="form-check-input"
                    checked={manageStock}
                    onChange={(e) => setManageStock(e.target.checked)}
                    role="switch"
                  />
                  <label htmlFor="manageStockEdit" className="form-check-label">
                    Manage Stock Levels?
                  </label>
                </div>
              </div>
              {manageStock && (
                <div className="form-group form-group-half">
                  <label htmlFor="itemStockEdit" className="form-label">
                    Stock Quantity <span className="required-asterisk">*</span>
                  </label>
                  <div className="input-with-icon">
                    <FaBoxes className="icon-prefix" />
                    <input
                      type="text"
                      id="itemStockEdit"
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
              <>
                <div className="form-group">
                  <label htmlFor="lowStockThresholdEdit" className="form-label">
                    Low Stock Threshold{" "}
                    <span className="optional-text">
                      (Notify when stock reaches this)
                    </span>
                  </label>
                  <input
                    type="text"
                    id="lowStockThresholdEdit"
                    className="form-control"
                    value={lowStockThreshold}
                    onChange={handleIntegerInputChange(setLowStockThreshold)}
                    placeholder="e.g., 5 or 10"
                    inputMode="numeric"
                  />
                </div>
              </>
            )}
            <div className="form-group">
              <label htmlFor="itemStatusEdit" className="form-label">
                Product Status <span className="required-asterisk">*</span>
              </label>
              <select
                id="itemStatusEdit"
                className="form-select"
                value={status}
                onChange={handleInputChange(setStatus)}
                required
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                {manageStock &&
                  parseInt(stock, 10) === 0 &&
                  status !== "out-of-stock" && ( // Conditionally show Out of Stock
                    <option value="out-of-stock">Out of Stock</option>
                  )}
                {status === "out-of-stock" && ( // Ensure Out of Stock is selectable if it's the current status
                  <option value="out-of-stock">Out of Stock</option>
                )}
                <option value="discontinued">Discontinued</option>
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
                <label htmlFor="weightEdit" className="form-label">
                  Weight (kg){" "}
                  <span className="optional-text">(For shipping)</span>
                </label>
                <div className="input-with-icon">
                  <FaWeightHanging className="icon-prefix" />
                  <input
                    type="text"
                    id="weightEdit"
                    className="form-control"
                    value={weight}
                    onChange={handleNumberInputChange(setWeight)}
                    placeholder="e.g., 0.5"
                    inputMode="decimal"
                  />
                </div>
              </div>
              <div className="form-group form-group-half">
                <label htmlFor="shippingClassEdit" className="form-label">
                  Shipping Class{" "}
                  <span className="optional-text">(Optional)</span>
                </label>
                <input
                  type="text"
                  id="shippingClassEdit"
                  className="form-control"
                  value={shippingClass}
                  onChange={handleInputChange(setShippingClass)}
                  placeholder="e.g., Standard, Bulky"
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
                  id="isTaxableEdit"
                  className="form-check-input"
                  checked={isTaxable}
                  onChange={(e) => setIsTaxable(e.target.checked)}
                  role="switch"
                />
                <label htmlFor="isTaxableEdit" className="form-check-label">
                  Is this item taxable?
                </label>
              </div>
            </div>
            {isTaxable && (
              <div className="form-row tax-rates-row">
                <div className="form-group form-group-half">
                  <label htmlFor="cgstRateEdit" className="form-label">
                    CGST Rate (%){" "}
                    {isTaxable && <span className="required-asterisk">*</span>}
                  </label>
                  <div className="input-with-icon">
                    <FaPercentage className="icon-prefix" />
                    <input
                      type="text"
                      id="cgstRateEdit"
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
                  <label htmlFor="sgstRateEdit" className="form-label">
                    SGST Rate (%){" "}
                    {isTaxable && <span className="required-asterisk">*</span>}
                  </label>
                  <div className="input-with-icon">
                    <FaPercentage className="icon-prefix" />
                    <input
                      type="text"
                      id="sgstRateEdit"
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
                <label htmlFor="gtinEdit" className="form-label">
                  GTIN <span className="optional-text">(e.g., UPC, EAN)</span>
                </label>
                <input
                  type="text"
                  id="gtinEdit"
                  className="form-control"
                  value={gtin}
                  onChange={handleInputChange(setGtin)}
                  placeholder="Global Trade Item Number"
                />
              </div>
              <div className="form-group form-group-half">
                <label htmlFor="countryOfOriginEdit" className="form-label">
                  Country of Origin{" "}
                  <span className="optional-text">(Optional)</span>
                </label>
                <input
                  type="text"
                  id="countryOfOriginEdit"
                  className="form-control"
                  value={countryOfOrigin}
                  onChange={handleInputChange(setCountryOfOrigin)}
                  placeholder="e.g., India"
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="warrantyInfoEdit" className="form-label">
                Warranty Information{" "}
                <span className="optional-text">(Optional)</span>
              </label>
              <textarea
                id="warrantyInfoEdit"
                className="form-control"
                value={warrantyInfo}
                onChange={handleInputChange(setWarrantyInfo)}
                rows="2"
                placeholder="e.g., 1 Year Manufacturer Warranty"
              />
            </div>
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
            <button
              type="submit"
              className="btn btn-primary"
              disabled={disableFormActions}
            >
              {isUpdating ? "Updating..." : "Update Item"}
            </button>
          </div>
        </fieldset>
      </form>
    </div>
  );
};

export default EditItemPage;
