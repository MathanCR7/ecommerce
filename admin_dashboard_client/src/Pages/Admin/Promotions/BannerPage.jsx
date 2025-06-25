import React, { useState, useEffect, useCallback } from "react";
import { FaEdit, FaTrashAlt, FaImage } from "react-icons/fa";
import bannerService from "../../../Services/bannerService";
import LoadingSpinner from "../../../Components/Common/LoadingSpinner";
import ConfirmationModal from "../../../Components/Common/ConfirmationModal";
import PaginationControls from "../../../Components/Common/PaginationControls";
import { toast } from "react-toastify";
import "./BannerPage.css";

// This is your API base URL, e.g., http://localhost:5000/api
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

// Derive a base URL for static assets
let STATIC_ASSETS_BASE_URL;
try {
  const apiUrl = new URL(API_BASE_URL);
  // If VITE_API_BASE_URL is like "http://localhost:5000/api", we want "http://localhost:5000" for assets
  // If VITE_API_BASE_URL is like "http://localhost:5000", it's fine as is for assets
  if (apiUrl.pathname.toLowerCase().startsWith("/api")) {
    STATIC_ASSETS_BASE_URL = `${apiUrl.origin}`; // e.g., http://localhost:5000
  } else {
    STATIC_ASSETS_BASE_URL = API_BASE_URL;
  }
} catch (e) {
  // Fallback for relative paths or invalid URLs in VITE_API_BASE_URL
  // Assuming the backend serves static files from its root if VITE_API_BASE_URL is just "/api"
  if (
    API_BASE_URL.toLowerCase().startsWith("/api") &&
    typeof window !== "undefined"
  ) {
    STATIC_ASSETS_BASE_URL = window.location.origin; // Use current frontend origin
  } else if (!API_BASE_URL.startsWith("http")) {
    // If it's a relative path not starting with /api
    STATIC_ASSETS_BASE_URL = ""; // For completely relative paths from frontend
  } else {
    STATIC_ASSETS_BASE_URL = "http://localhost:5000"; // Default fallback
  }
  console.warn(
    `[BannerPage] VITE_API_BASE_URL ("${API_BASE_URL}") requires adjustment for static assets. Using: "${STATIC_ASSETS_BASE_URL}"`
  );
}

console.log(`[BannerPage] Using API_BASE_URL for API calls: ${API_BASE_URL}`);
console.log(
  `[BannerPage] Using STATIC_ASSETS_BASE_URL for images: ${STATIC_ASSETS_BASE_URL}`
);

const MAX_FILE_SIZE_MB = 5;
const RECOMMENDED_RATIO_TEXT = "3:1";

const BannerPage = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [isActive, setIsActive] = useState(true);
  const [banners, setBanners] = useState([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [formError, setFormError] = useState(null);
  const [editingBannerId, setEditingBannerId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [bannerToDelete, setBannerToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBanners, setTotalBanners] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      if (currentPage !== 1 && !isInitialLoading) {
        setCurrentPage(1);
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm, currentPage, isInitialLoading]);

  const fetchBannersData = useCallback(async (page = 1, keyword = "") => {
    setIsFetching(true);
    try {
      const data = await bannerService.fetchBanners(page, keyword);
      setBanners(data.banners || []);
      setTotalPages(data.pages || 1);
      setTotalBanners(data.count || 0);
      setCurrentPage(data.page || page);
    } catch (err) {
      console.error("[FETCH] Error fetching banners:", err);
      toast.error(err.message || "Could not load banners.");
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    const loadInitialSupportData = async () => {
      setIsLoadingCategories(true);
      try {
        const fetchedCategories =
          await bannerService.fetchActiveCategoriesForSelect();
        setCategories(fetchedCategories || []);
      } catch (err) {
        console.error("Error loading categories:", err);
        toast.error(err.message || "Could not load categories for selection.");
      } finally {
        setIsLoadingCategories(false);
      }
    };

    const loadAllInitialData = async () => {
      setIsInitialLoading(true);
      await loadInitialSupportData();
      await fetchBannersData(1, "");
      setIsInitialLoading(false);
    };
    loadAllInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isInitialLoading) {
      fetchBannersData(currentPage, debouncedSearchTerm);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, debouncedSearchTerm, isInitialLoading]);

  useEffect(() => {
    const loadItems = async () => {
      if (selectedCategoryId) {
        setIsLoadingItems(true);
        setItems([]);
        try {
          const fetchedItems = await bannerService.fetchActiveItemsForSelect(
            selectedCategoryId
          );
          setItems(fetchedItems || []);
          if (
            selectedItemId &&
            !fetchedItems.find((item) => item._id === selectedItemId)
          ) {
            setSelectedItemId("");
          }
        } catch (err) {
          console.error(
            "Error loading items for category:",
            selectedCategoryId,
            err
          );
          toast.error(err.message || "Could not load items for selection.");
          setItems([]);
          setSelectedItemId("");
        } finally {
          setIsLoadingItems(false);
        }
      } else {
        setItems([]);
        setSelectedItemId("");
      }
    };
    if (!isInitialLoading || (editingBannerId && selectedCategoryId)) {
      loadItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategoryId, isInitialLoading, editingBannerId]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    const fileInput = e.target;
    if (!file) {
      setImageFile(null);
      if (!editingBannerId) setImagePreview("");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error(
        "Invalid file type. Please select an image (JPG, PNG, GIF, WEBP)."
      );
      fileInput.value = "";
      return;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`Image size exceeds ${MAX_FILE_SIZE_MB}MB limit.`);
      fileInput.value = "";
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.onerror = () => {
      toast.error("Failed to read the selected file.");
      fileInput.value = "";
      setImageFile(null);
      setImagePreview("");
    };
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setImageFile(null);
    setImagePreview("");
    setSelectedCategoryId("");
    setSelectedItemId("");
    setIsActive(true);
    setEditingBannerId(null);
    setFormError(null);
    const fileInput = document.getElementById("bannerImageInput");
    if (fileInput) fileInput.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error("Banner title is required.");
      return;
    }
    if (!editingBannerId && !imageFile) {
      toast.error("Banner image is required for new banners.");
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    const formData = new FormData();
    formData.append("title", trimmedTitle);
    formData.append("description", description.trim());
    formData.append("isActive", isActive);
    if (selectedCategoryId) formData.append("categoryId", selectedCategoryId);
    if (selectedItemId) formData.append("itemId", selectedItemId);
    if (imageFile) formData.append("bannerImage", imageFile);
    try {
      let response;
      if (editingBannerId) {
        response = await bannerService.updateBanner(editingBannerId, formData);
        toast.success(response?.message || "Banner updated.");
      } else {
        response = await bannerService.createBanner(formData);
        toast.success(response?.message || "Banner created.");
      }
      resetForm();
      await fetchBannersData(
        editingBannerId ? currentPage : 1,
        debouncedSearchTerm
      );
    } catch (err) {
      console.error("Error submitting banner:", err);
      toast.error(
        err.response?.data?.message || err.message || "Failed to save banner."
      );
      setFormError(
        err.response?.data?.message || err.message || "Failed to save banner."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (banner) => {
    setEditingBannerId(banner._id);
    setTitle(banner.title);
    setDescription(banner.description || "");
    setSelectedCategoryId(banner.categoryId?._id || "");
    setSelectedItemId(banner.itemId?._id || "");
    setIsActive(banner.isActive);

    const imageUrlOnEdit = banner.imageUrl
      ? `${STATIC_ASSETS_BASE_URL}/uploads/${
          banner.imageUrl.startsWith("/")
            ? banner.imageUrl.substring(1)
            : banner.imageUrl
        }`
      : "";
    setImagePreview(imageUrlOnEdit);
    setImageFile(null);
    setFormError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
    const fileInput = document.getElementById("bannerImageInput");
    if (fileInput) fileInput.value = "";
  };

  const handleDeleteClick = (banner) => {
    setBannerToDelete(banner);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!bannerToDelete) return;
    setIsDeleting(true);
    try {
      const response = await bannerService.deleteBanner(bannerToDelete._id);
      toast.success(response?.message || "Banner deleted!");
      setShowDeleteModal(false);
      setBannerToDelete(null);
      const pageToFetch =
        banners.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
      await fetchBannersData(pageToFetch, debouncedSearchTerm);
    } catch (err) {
      toast.error(err.message || "Failed to delete.");
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async (banner) => {
    try {
      const response = await bannerService.toggleStatus(banner._id);
      toast.success(response?.message || "Status toggled!");
      await fetchBannersData(currentPage, debouncedSearchTerm);
    } catch (err) {
      toast.error(err.message || "Failed to toggle status.");
    }
  };

  const canSubmit = title.trim() && (editingBannerId || imageFile);

  const renderLoadingState = () => {
    if (isInitialLoading) {
      return (
        <LoadingSpinner
          isFullScreen={false}
          message="Loading banners and support data..."
        />
      );
    }
    return null;
  };

  const renderContent = () => {
    if (!isInitialLoading && !isFetching && banners.length === 0) {
      return (
        <p className="no-data-message">
          {debouncedSearchTerm
            ? `No banners found matching "${debouncedSearchTerm}".`
            : "No banners created yet."}
        </p>
      );
    }
    if (banners.length > 0) {
      return (
        <>
          {isFetching && !isInitialLoading && (
            <div
              style={{
                position: "absolute",
                top: "50px",
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 10,
                background: "rgba(255,255,255,0.7)",
                padding: "5px",
                borderRadius: "5px",
              }}
            >
              <LoadingSpinner size={25} />
            </div>
          )}
          <div
            className={`table-responsive ${
              isFetching && !isInitialLoading ? "loading-overlay" : ""
            }`}
          >
            <table className="data-table banner-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Image</th>
                  <th>Title</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Item</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {banners.map((banner, index) => {
                  const imageUrlInList = banner.imageUrl
                    ? `${STATIC_ASSETS_BASE_URL}/uploads/${
                        banner.imageUrl.startsWith("/")
                          ? banner.imageUrl.substring(1)
                          : banner.imageUrl
                      }`
                    : "";
                  return (
                    <tr key={banner._id}>
                      <td>{(currentPage - 1) * 10 + index + 1}</td>
                      <td>
                        <div className="image-cell-container">
                          {imageUrlInList ? (
                            <img
                              src={imageUrlInList}
                              alt={banner.title || "Banner"}
                              className="banner-list-image"
                              loading="lazy"
                              onError={(e) => {
                                e.target.src = "/placeholder-image.png";
                                e.target.style.border = "1px solid #eee";
                                e.target.alt = "Image not found";
                              }}
                            />
                          ) : (
                            <span className="text-muted">No Image</span>
                          )}
                        </div>
                      </td>
                      <td className="banner-title-cell">{banner.title}</td>
                      <td className="banner-description-cell">
                        {banner.description || (
                          <span className="text-muted italic">N/A</span>
                        )}
                      </td>
                      <td>
                        {banner.categoryId ? (
                          banner.categoryId.name
                        ) : (
                          <span className="text-muted italic">N/A</span>
                        )}
                      </td>
                      <td>
                        {banner.itemId ? (
                          `${banner.itemId.name} ${
                            banner.itemId.sku ? `(${banner.itemId.sku})` : ""
                          }`
                        ) : (
                          <span className="text-muted italic">N/A</span>
                        )}
                      </td>
                      <td>
                        <label
                          className="switch"
                          title={banner.isActive ? "Deactivate" : "Activate"}
                          htmlFor={`statusToggle_${banner._id}`}
                        >
                          <input
                            type="checkbox"
                            id={`statusToggle_${banner._id}`}
                            checked={banner.isActive}
                            onChange={() => handleToggleStatus(banner)}
                            aria-label={`Toggle status for ${banner.title}`}
                          />
                          <span className="slider round"></span>
                        </label>
                      </td>
                      <td>
                        <button
                          className="btn-icon btn-edit"
                          onClick={() => handleEdit(banner)}
                          title="Edit Banner"
                          aria-label={`Edit ${banner.title}`}
                        >
                          <FaEdit />
                        </button>
                        <button
                          className="btn-icon btn-delete"
                          onClick={() => handleDeleteClick(banner)}
                          title="Delete Banner"
                          aria-label={`Delete ${banner.title}`}
                        >
                          <FaTrashAlt />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      );
    }
    return null;
  };

  return (
    <div className="banner-page-container">
      <h2 className="page-title">
        <FaImage style={{ marginRight: "10px" }} /> Banner Management
      </h2>
      <div className="form-card">
        <h3 className="form-card-title">
          {editingBannerId ? "Edit Banner" : "Add New Banner"}
        </h3>
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-grid">
            <div className="form-section">
              <div className="form-group">
                <label htmlFor="title">
                  Title <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Summer Sale Offer"
                  maxLength={100}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="description">
                  Description <small>(Optional)</small>
                </label>
                <textarea
                  id="description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Briefly describe the banner's purpose or offer..."
                  className="form-textarea"
                  maxLength={500}
                />
              </div>
              <div className="form-group">
                <label htmlFor="category">
                  Category <small>(Optional)</small>
                </label>
                <select
                  id="category"
                  value={selectedCategoryId}
                  onChange={(e) => {
                    setSelectedCategoryId(e.target.value);
                    setSelectedItemId("");
                  }}
                  className="form-control"
                  disabled={isLoadingCategories}
                >
                  <option value="">-- Select Category --</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                {isLoadingCategories && (
                  <small className="text-muted">Loading categories...</small>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="item">
                  Item <small>(Optional, select category first)</small>
                </label>
                <select
                  id="item"
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="form-control"
                  disabled={
                    isLoadingItems || !selectedCategoryId || items.length === 0
                  }
                >
                  <option value="">-- Select Item --</option>
                  {items.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.name} {item.sku ? `(${item.sku})` : ""}
                    </option>
                  ))}
                </select>
                {isLoadingItems && (
                  <small className="text-muted">Loading items...</small>
                )}
                {!selectedCategoryId &&
                  items.length === 0 &&
                  !isLoadingItems && (
                    <small className="text-muted">
                      Select a category to see items.
                    </small>
                  )}
                {selectedCategoryId &&
                  !isLoadingItems &&
                  items.length === 0 &&
                  !isLoadingCategories && (
                    <small className="text-muted">
                      No items found for this category.
                    </small>
                  )}
              </div>
              <div className="form-group form-check-group">
                <input
                  type="checkbox"
                  id="isActiveNew"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="form-check-input"
                />
                <label htmlFor="isActiveNew" className="form-check-label">
                  Set as Active Banner
                </label>
              </div>
            </div>
            <div className="form-section">
              <div className="form-group">
                <label htmlFor="bannerImageInput">
                  Banner Image{" "}
                  {!editingBannerId && <span className="required">*</span>}{" "}
                  <small>
                    (Max {MAX_FILE_SIZE_MB}MB, JPG/PNG/GIF/WEBP. Recommended
                    Ratio: {RECOMMENDED_RATIO_TEXT})
                  </small>
                </label>
                <div
                  className="image-upload-box image-preview-container"
                  onClick={() =>
                    document.getElementById("bannerImageInput")?.click()
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ")
                      document.getElementById("bannerImageInput")?.click();
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label="Upload banner image"
                >
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Banner Preview"
                      className="image-preview"
                    />
                  ) : (
                    <div className="image-placeholder">
                      <FaImage size={40} />
                      <span>Click or Drag to Upload Image</span>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  id="bannerImageInput"
                  accept="image/jpeg, image/png, image/gif, image/webp"
                  onChange={handleFileChange}
                  className="visually-hidden-input"
                  tabIndex={-1}
                />
                {imageFile && (
                  <small className="text-muted file-name-display">
                    Selected: {imageFile.name}
                  </small>
                )}
                {!imagePreview && !editingBannerId && (
                  <small className="text-muted">
                    Image required for new banners.
                  </small>
                )}
                {!imagePreview && editingBannerId && (
                  <small className="text-muted">
                    Upload new image to replace current one.
                  </small>
                )}
              </div>
            </div>
          </div>
          <div className="form-actions">
            {formError && (
              <p className="error-message form-error">{formError}</p>
            )}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={resetForm}
              disabled={isSubmitting}
            >
              {editingBannerId ? "Cancel Edit" : "Reset Form"}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || !canSubmit}
            >
              {isSubmitting ? (
                <LoadingSpinner size={20} color="#fff" />
              ) : editingBannerId ? (
                "Update Banner"
              ) : (
                "Create Banner"
              )}
            </button>
          </div>
        </form>
      </div>
      <div className="list-card" style={{ position: "relative" }}>
        <div className="list-header">
          <h3 className="list-card-title">Current Banners ({totalBanners})</h3>
          <div className="search-container">
            <input
              type="text"
              placeholder="Search by title/desc..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              aria-label="Search banners"
            />
          </div>
        </div>
        {renderLoadingState()}
        {renderContent()}
      </div>
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Confirm Deletion"
        message={`Are you sure you want to permanently delete the banner "${bannerToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete Banner"
        cancelText="Cancel"
        isLoading={isDeleting}
        isDestructive={true}
      />
    </div>
  );
};

export default BannerPage;
