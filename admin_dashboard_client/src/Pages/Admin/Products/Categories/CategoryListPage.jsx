// ========================================================================
// FILE: client/src/Pages/Admin/Products/Categories/CategoryListPage.jsx
// ========================================================================

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import categoryService from "../../../../Services/categoryService";
import { useAuth } from "../../../../Context/AuthContext";
import LoadingSpinner from "../../../../Components/Common/LoadingSpinner";
import ConfirmationModal from "../../../../Components/Common/ConfirmationModal";
import {
  FaPlus,
  FaEdit,
  FaTrashAlt,
  FaImage,
  FaInfoCircle,
  FaExclamationTriangle,
} from "react-icons/fa";
// Make sure the CSS file includes styles for .move-target-selector etc. if needed
import "./CategoryListPage.css"; // Includes category-table styles from previous example

const API_DOMAIN_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(
  "/api",
  ""
);

const CategoryListPage = () => {
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // --- Enhanced Modal State (deleteAction and related logic removed) ---
  const [modalState, setModalState] = useState({
    isOpen: false,
    categoryIdToDelete: null,
    categoryNameToDelete: "",
    isMultiDelete: false,
    // Move-specific state
    showMoveOptions: false, // Still used to trigger target fetching/display for single delete
    availableMoveTargets: [],
    isLoadingMoveTargets: false,
    targetCategoryId: "", // Selected target category ID for move
    moveError: null,
  });
  // --- End Modal State ---

  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

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

  // --- Fetch Categories (for the main list) ---
  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    if (!location.state?.error) setError(null);
    if (!location.state?.success) setSuccess(null);
    try {
      const fetchedCategories = await categoryService.getAllCategories();
      setCategories(Array.isArray(fetchedCategories) ? fetchedCategories : []);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
      setError(err.message || "Failed to load categories.");
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  }, [location.state]);

  // --- Initial Fetch ---
  useEffect(() => {
    if (isAuthenticated) fetchCategories();
    else {
      setIsLoading(false);
      setError("Authentication required.");
      setCategories([]);
    } // Changed setItems to setCategories
  }, [isAuthenticated, fetchCategories]);

  // --- Message Clearing Timer ---
  useEffect(() => {
    let timer;
    if (success || error) {
      timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 7000);
    }
    return () => clearTimeout(timer);
  }, [success, error]);

  // --- Selection Handlers ---
  const handleSelectAll = (event) => {
    setSelectedCategories(
      // Changed setSelectedItems to setSelectedCategories
      event.target.checked ? new Set(categories.map((c) => c._id)) : new Set()
    );
  };
  const handleSelectRow = (event, id) => {
    const isChecked = event.target.checked;
    setSelectedCategories((prev) => {
      // Changed setSelectedItems to setSelectedCategories
      const ns = new Set(prev);
      if (isChecked) ns.add(id);
      else ns.delete(id);
      return ns;
    });
  };
  const isAllSelected = useMemo(
    () =>
      categories.length > 0 && selectedCategories.size === categories.length,
    [categories.length, selectedCategories.size]
  );

  // --- Deletion/Modal Logic ---

  const fetchMoveTargets = async (idToExclude) => {
    setModalState((prev) => ({
      ...prev,
      isLoadingMoveTargets: true,
      moveError: null,
      targetCategoryId: "",
    })); // Reset target ID on fetch
    try {
      const allCats = await categoryService.getAllCategories();
      const targets = Array.isArray(allCats)
        ? allCats.filter((cat) => cat._id !== idToExclude)
        : [];
      setModalState((prev) => ({
        ...prev,
        availableMoveTargets: targets,
        isLoadingMoveTargets: false,
      }));
      if (targets.length === 0) {
        setModalState((prev) => ({
          ...prev,
          moveError:
            "Optional: No other categories available to move items to. Items will be deleted.",
        })); // Informational error
      }
    } catch (err) {
      console.error("Failed to fetch move target categories:", err);
      setModalState((prev) => ({
        ...prev,
        isLoadingMoveTargets: false,
        availableMoveTargets: [],
        moveError:
          "Could not load target categories. Items will be deleted if you proceed.",
      }));
    }
  };

  const openDeleteModal = (id, name) => {
    setModalState({
      isOpen: true,
      categoryIdToDelete: id,
      categoryNameToDelete: name,
      isMultiDelete: false,
      showMoveOptions: true, // Trigger fetching targets and showing the dropdown
      availableMoveTargets: [],
      isLoadingMoveTargets: false,
      targetCategoryId: "", // Reset target
      moveError: null,
    });
    fetchMoveTargets(id); // Fetch targets when opening for single delete
  };

  const openMultiDeleteModal = () => {
    if (selectedCategories.size > 0) {
      setModalState({
        isOpen: true,
        categoryIdToDelete: null,
        categoryNameToDelete: "",
        isMultiDelete: true,
        showMoveOptions: false, // No move options needed
        availableMoveTargets: [],
        isLoadingMoveTargets: false,
        targetCategoryId: "",
        moveError: null,
      });
    }
  };

  const closeDeleteModal = () => {
    setModalState({
      // Reset all modal state
      isOpen: false,
      categoryIdToDelete: null,
      categoryNameToDelete: "",
      isMultiDelete: false,
      showMoveOptions: false,
      availableMoveTargets: [],
      isLoadingMoveTargets: false,
      targetCategoryId: "",
      moveError: null,
    });
  };

  // Handle change in target category dropdown
  const handleTargetCategoryChange = (event) => {
    setModalState((prev) => ({
      ...prev,
      targetCategoryId: event.target.value,
      moveError: null,
    })); // Clear error on change
  };

  // Handle the final confirmation click in the modal
  const handleConfirmAction = async () => {
    if (isProcessing) return;

    // *** REMOVED VALIDATION FOR deleteAction radio button ***

    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    setModalState((prev) => ({ ...prev, moveError: null })); // Clear specific move error

    try {
      let response;
      if (modalState.isMultiDelete) {
        // --- Multi-Delete Logic ---
        const idsToDelete = Array.from(selectedCategories);
        console.log(
          "Confirmed: Deleting multiple categories (cascade items):",
          idsToDelete
        );
        response = await categoryService.deleteMultipleCategories(idsToDelete);
        setSuccess(
          response.message ||
            `${idsToDelete.length} categories scheduled for deletion.`
        );
        setSelectedCategories(new Set());
      } else if (modalState.categoryIdToDelete) {
        // --- Single Delete Logic ---
        // *** Determine action based on whether a target category was selected ***
        if (
          modalState.targetCategoryId &&
          modalState.availableMoveTargets.length > 0
        ) {
          // --- Move and Delete Logic ---
          console.log(
            `Confirmed: Moving items from ${modalState.categoryIdToDelete} to ${modalState.targetCategoryId} and deleting original.`
          );
          response = await categoryService.moveItemsAndDeleteCategory(
            modalState.categoryIdToDelete,
            modalState.targetCategoryId
          );
          setSuccess(
            response.message ||
              `Items moved and category "${modalState.categoryNameToDelete}" deleted.`
          );
        } else {
          // --- Direct Delete Logic (if no target selected or available) ---
          console.log(
            `Confirmed: Deleting category ${modalState.categoryIdToDelete} (cascade items).`
          );
          response = await categoryService.deleteCategory(
            modalState.categoryIdToDelete
          );
          setSuccess(
            response.message ||
              `Category "${modalState.categoryNameToDelete}" scheduled for deletion.`
          );
        }
        // Clear selection if the deleted item was selected
        setSelectedCategories((prev) => {
          const newSet = new Set(prev);
          newSet.delete(modalState.categoryIdToDelete);
          return newSet;
        });
      } else {
        throw new Error("Invalid modal state for confirmation.");
      }

      // Handle potential partial success/errors from backend multi-delete
      if (modalState.isMultiDelete && response?.errors?.length > 0) {
        setError(
          `Partial success: ${
            response.message || ""
          }. Some deletions may have failed.`
        );
        console.error("Multi-delete category errors:", response.errors);
      }

      fetchCategories(); // Re-fetch the updated list
    } catch (err) {
      console.error("Delete/Move category error:", err);
      // If it was a move attempt that failed server-side, show error in modal
      if (modalState.targetCategoryId && err.message) {
        setModalState((prev) => ({ ...prev, moveError: err.message }));
        setIsProcessing(false); // Stop loading
        return; // Keep modal open
      } else {
        setError(err.message || "An error occurred during the operation.");
      }
    } finally {
      // Close modal only if operation wasn't stopped by a move validation error
      if (!modalState.moveError) {
        setIsProcessing(false);
        closeDeleteModal();
      } else if (!isProcessing) {
        // If stopped due to moveError, ensure spinner stops
        setIsProcessing(false);
      }
    }
  };

  // --- Render Helper (Image part updated) ---
  const renderCategoryRow = (category) => {
    const relativeImagePath = category.imagePath?.replace(/\\/g, "/");
    const imageUrl = relativeImagePath
      ? `${API_DOMAIN_BASE}/uploads/${relativeImagePath}`
      : null;
    const handleImageError = (e) => {
      console.warn(`Failed to load category image: ${e.target.src}`);
      e.target.style.display = "none";
      const ph = e.target.nextElementSibling;
      if (ph?.classList.contains("category-image-placeholder")) {
        ph.style.display = "inline-flex";
      }
    };

    return (
      <tr key={category._id}>
        <td className="td-center">
          <input
            type="checkbox"
            className="form-checkbox"
            checked={selectedCategories.has(category._id)}
            onChange={(e) => handleSelectRow(e, category._id)}
            aria-label={`Select category ${category.name}`}
            disabled={isProcessing}
          />
        </td>
        <td className="td-center">
          <div className="category-image-container">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={category.name || "Category image"}
                className="category-thumbnail"
                onError={handleImageError}
                loading="lazy"
              />
            ) : null}
            <div
              className="category-image-placeholder"
              style={{ display: imageUrl ? "none" : "inline-flex" }}
              title="No image available"
            >
              {" "}
              <FaImage />{" "}
            </div>
          </div>
        </td>
        <td className="category-name">{category.name}</td>
        <td className="category-description">{category.description || "-"}</td>
        <td className="category-createdby">
          {category.createdBy?.username || (
            <span className="text-muted">N/A</span>
          )}
        </td>
        <td className="category-date">
          {new Date(category.createdAt).toLocaleDateString()}
        </td>
        <td className="category-actions">
          <button
            className="btn-icon btn-edit"
            title={`Edit ${category.name}`}
            onClick={() =>
              navigate(`/admin/products/categories/edit/${category._id}`)
            }
            disabled={isProcessing}
          >
            {" "}
            <FaEdit />{" "}
          </button>
          <button
            className="btn-icon btn-delete"
            title={`Delete ${category.name}`}
            onClick={() => openDeleteModal(category._id, category.name)}
            disabled={isProcessing}
          >
            {" "}
            <FaTrashAlt />{" "}
          </button>
        </td>
      </tr>
    );
  };

  // --- Main Render ---
  const showLoadingOverlay = isProcessing;
  const disableActions = isLoading || isProcessing;
  const noTargetsAvailable =
    !modalState.isLoadingMoveTargets &&
    modalState.availableMoveTargets.length === 0;

  // Determine confirm button text based on action
  const confirmButtonText = modalState.isMultiDelete
    ? "Delete Selected"
    : modalState.targetCategoryId
    ? "Move & Delete"
    : "Delete Anyway";

  // Determine if confirm button should be styled as destructive
  const isConfirmDestructive =
    modalState.isMultiDelete || !modalState.targetCategoryId;

  // Determine if confirm button should be disabled
  const disableConfirmButton = isProcessing || modalState.isLoadingMoveTargets;

  return (
    <div className="page-container category-list-page">
      {showLoadingOverlay && (
        <LoadingSpinner message="Processing..." isFullScreen={true} />
      )}

      <div className="page-header">
        <h1 className="page-title">Product Categories</h1>
        <div className="header-actions">
          <button
            className="btn btn-danger"
            onClick={openMultiDeleteModal}
            disabled={disableActions || selectedCategories.size === 0}
            title="Delete Selected Categories"
          >
            <FaTrashAlt /> Delete Selected ({selectedCategories.size})
          </button>
          <Link
            to="/admin/products/categories/new"
            className={`btn btn-primary ${
              disableActions ? "disabled-link" : ""
            }`}
            aria-disabled={disableActions}
            onClick={(e) => disableActions && e.preventDefault()}
          >
            <FaPlus /> Add New Category
          </Link>
        </div>
      </div>

      {error && !modalState.isOpen && (
        <div className="alert alert-danger" role="alert">
          {" "}
          <FaInfoCircle /> {error}{" "}
        </div>
      )}
      {success && !modalState.isOpen && (
        <div className="alert alert-success" role="alert">
          {" "}
          <FaInfoCircle /> {success}{" "}
        </div>
      )}

      <div className="table-container stylish-table-container">
        <table className="table stylish-table table-hover category-table">
          <thead>
            <tr>
              <th className="th-center">
                <input
                  type="checkbox"
                  className="form-checkbox"
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                  aria-label="Select all categories"
                  disabled={disableActions || categories.length === 0}
                />
              </th>
              <th className="th-center">Image</th>
              <th>Name</th>
              <th>Description</th>
              <th>Created By</th>
              <th>Created Date</th>
              <th className="th-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="7" className="text-center">
                  <LoadingSpinner inline message="Loading categories..." />
                </td>
              </tr>
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center no-data-message">
                  {error
                    ? "Could not load categories."
                    : "No categories found. Add one!"}
                </td>
              </tr>
            ) : (
              categories.map(renderCategoryRow)
            )}
          </tbody>
        </table>
      </div>

      {/* --- Confirmation Modal --- */}
      <ConfirmationModal
        isOpen={modalState.isOpen}
        onClose={closeDeleteModal}
        onConfirm={handleConfirmAction}
        title={
          modalState.isMultiDelete
            ? "Confirm Bulk Delete"
            : `Delete Category: ${modalState.categoryNameToDelete}`
        }
        confirmText={confirmButtonText}
        cancelText="Cancel"
        isLoading={isProcessing || modalState.isLoadingMoveTargets}
        isDestructive={isConfirmDestructive}
        disableConfirm={disableConfirmButton}
      >
        {/* Custom content area within the modal */}
        {modalState.showMoveOptions && !modalState.isMultiDelete && (
          <div className="delete-options">
            <p>
              <FaExclamationTriangle
                style={{ color: "orange", marginRight: "8px", flexShrink: 0 }}
              />
              <span>
                Deleting category{" "}
                <strong>"{modalState.categoryNameToDelete}"</strong> will also
                permanently delete all associated items.
                <br />
                Optionally, you can move these items to another category first.
              </span>
            </p>

            {/* Dropdown to select target category */}
            <div className="move-target-selector">
              <label htmlFor="targetCategory">Move Items To (Optional):</label>
              <select
                id="targetCategory"
                value={modalState.targetCategoryId}
                onChange={handleTargetCategoryChange}
                disabled={
                  isProcessing ||
                  modalState.isLoadingMoveTargets ||
                  noTargetsAvailable
                }
                className="form-control"
              >
                <option value="">-- Don't Move Items (Delete Them) --</option>
                {/* Add loading state within options */}
                {modalState.isLoadingMoveTargets && (
                  <option value="" disabled>
                    Loading target categories...
                  </option>
                )}
                {noTargetsAvailable && !modalState.isLoadingMoveTargets && (
                  <option value="" disabled>
                    No other categories available
                  </option>
                )}
                {/* Map available targets */}
                {modalState.availableMoveTargets.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Display move-specific errors inside the modal */}
            {modalState.moveError && (
              <p className="auth-error-message modal-error">
                {modalState.moveError}
              </p>
            )}
          </div>
        )}
        {/* Message for multi-delete */}
        {modalState.isMultiDelete && (
          <p>
            Are you sure you want to delete the {selectedCategories.size}{" "}
            selected categories and all their associated items? This action
            cannot be undone.
          </p>
        )}
      </ConfirmationModal>
      {/* --- End Confirmation Modal --- */}
    </div>
  );
};

export default CategoryListPage;
