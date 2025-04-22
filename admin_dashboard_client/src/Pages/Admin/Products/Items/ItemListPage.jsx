// ========================================================================
// FILE: client/src/Pages/Admin/Products/Items/ItemListPage.jsx
// ========================================================================

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import itemService from "../../../../Services/itemService";
import { useAuth } from "../../../../Context/AuthContext";
import LoadingSpinner from "../../../../Components/Common/LoadingSpinner";
import ConfirmationModal from "../../../../Components/Common/ConfirmationModal";
import {
  FaPlus,
  FaEdit,
  FaTrashAlt,
  FaImage,
  FaInfoCircle,
  FaDollarSign,
  FaBoxes,
} from "react-icons/fa";
// Import the updated CSS file
import "./ItemListPage.css";

// Construct base URL for images (relative to server)
const IMAGE_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(
  "/api",
  ""
);

const ItemListPage = () => {
  const [items, setItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [modalState, setModalState] = useState({
    isOpen: false,
    itemId: null,
    itemName: "",
    isMultiDelete: false,
  });

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

  // --- Fetch Items ---
  const fetchItems = useCallback(async () => {
    console.log("Fetching admin items...");
    setIsLoading(true);
    if (!location.state?.error) setError(null);
    if (!location.state?.success) setSuccess(null);
    try {
      const fetchedItems = await itemService.getAllAdminItems();
      setItems(Array.isArray(fetchedItems) ? fetchedItems : []);
    } catch (err) {
      console.error("Failed to fetch items:", err);
      setError(err.message || "Failed to load items.");
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [location.state]); // Dependency on location.state helps trigger refetch after programmatic nav with state

  // --- Initial Fetch ---
  useEffect(() => {
    if (isAuthenticated) {
      fetchItems();
    } else {
      setIsLoading(false);
      setError("Authentication required to view items.");
      setItems([]);
    }
    // Only depends on auth status and the fetch function itself
  }, [isAuthenticated, fetchItems]);

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
    setSelectedItems(
      event.target.checked ? new Set(items.map((i) => i._id)) : new Set()
    );
  };
  const handleSelectRow = (event, id) => {
    const isChecked = event.target.checked;
    setSelectedItems((prev) => {
      const newSelected = new Set(prev);
      if (isChecked) newSelected.add(id);
      else newSelected.delete(id);
      return newSelected;
    });
  };
  const isAllSelected = useMemo(
    () => items.length > 0 && selectedItems.size === items.length,
    [items.length, selectedItems.size]
  );

  // --- Deletion Logic ---
  const openDeleteModal = (id, name) => {
    setModalState({
      isOpen: true,
      itemId: id,
      itemName: name,
      isMultiDelete: false,
    });
  };
  const openMultiDeleteModal = () => {
    if (selectedItems.size > 0) {
      setModalState({
        isOpen: true,
        itemId: null,
        itemName: "",
        isMultiDelete: true,
      });
    }
  };
  const closeDeleteModal = () => {
    setModalState({
      isOpen: false,
      itemId: null,
      itemName: "",
      isMultiDelete: false,
    });
  };

  const handleConfirmDelete = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    try {
      let response;
      if (modalState.isMultiDelete) {
        const idsToDelete = Array.from(selectedItems);
        response = await itemService.deleteMultipleItems(idsToDelete);
        setSuccess(
          response.message ||
            `${idsToDelete.length} items scheduled for deletion.`
        );
        setSelectedItems(new Set());
      } else if (modalState.itemId) {
        response = await itemService.deleteItem(modalState.itemId);
        setSuccess(
          response.message ||
            `Item "${modalState.itemName}" scheduled for deletion.`
        );
        setSelectedItems((prev) => {
          const newSet = new Set(prev);
          newSet.delete(modalState.itemId);
          return newSet;
        });
      } else {
        throw new Error("Invalid delete operation state.");
      }

      if (modalState.isMultiDelete && response?.errors?.length > 0) {
        setError(
          `Partial success: ${
            response.message || ""
          }. Some deletions may have failed.`
        );
        console.error("Multi-delete item errors:", response.errors);
      }
      fetchItems(); // Re-fetch list
    } catch (err) {
      console.error("Delete item error:", err);
      setError(err.message || "Failed to delete item(s).");
    } finally {
      setIsProcessing(false);
      closeDeleteModal();
    }
  };

  // --- Format Currency ---
  const formatCurrency = (value) => {
    const number = Number(value);
    if (isNaN(number)) return "N/A";
    return `₹${number.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // --- Image Error Handler ---
  const handleImageError = (e) => {
    console.warn(`Failed to load item image: ${e.target.src}`);
    e.target.style.display = "none";
    const placeholder = e.target.nextElementSibling;
    if (
      placeholder &&
      placeholder.classList.contains("item-image-placeholder")
    ) {
      placeholder.style.display = "inline-flex";
    }
  };

  // --- Render Helper ---
  const renderItemRow = (item) => {
    const relativeImagePath = item.imagePath?.replace(/\\/g, "/");
    const imageUrl = relativeImagePath
      ? `${IMAGE_API_BASE_URL}/uploads/${relativeImagePath}`
      : null;

    return (
      <tr key={item._id} className={`status-${item.status}`}>
        <td className="td-center">
          {" "}
          {/* Centered checkbox */}
          <input
            type="checkbox"
            className="form-checkbox"
            checked={selectedItems.has(item._id)}
            onChange={(e) => handleSelectRow(e, item._id)}
            aria-label={`Select item ${item.name}`}
            disabled={isProcessing}
          />
        </td>
        <td className="td-center">
          {" "}
          {/* Centered image */}
          <div className="item-image-container">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={item.name || "Item image"}
                className="item-thumbnail"
                onError={handleImageError}
                loading="lazy"
              />
            ) : null}
            <div
              className="item-image-placeholder"
              style={{ display: imageUrl ? "none" : "inline-flex" }}
              title="No image available"
            >
              {" "}
              <FaImage />{" "}
            </div>
          </div>
        </td>
        <td className="item-name">{item.name}</td>
        <td className="item-sku">{item.sku || "-"}</td>
        <td className="item-category">
          {item.category?.name || <span className="text-muted">N/A</span>}
        </td>
        <td className="item-price td-right">{formatCurrency(item.price)}</td>{" "}
        {/* Right aligned price */}
        <td className="item-stock td-center">
          {item.stock ?? <span className="text-muted">0</span>}
        </td>{" "}
        {/* Centered stock, default 0 */}
        <td className="item-status td-center">
          {" "}
          {/* Centered status */}
          <span
            className={`status-badge status-${item.status || "unknown"}`}
            title={item.status}
          >
            {item.status?.replace("-", " ") || "Unknown"}
          </span>
        </td>
        <td className="item-actions">
          {" "}
          {/* Actions align right by default */}
          <button
            className="btn-icon btn-edit"
            title={`Edit ${item.name}`}
            onClick={() => navigate(`/admin/products/items/edit/${item._id}`)}
            disabled={isProcessing}
          >
            {" "}
            <FaEdit />{" "}
          </button>
          <button
            className="btn-icon btn-delete"
            title={`Delete ${item.name}`}
            onClick={() => openDeleteModal(item._id, item.name)}
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
  const disablePageActions = isLoading || isProcessing;

  return (
    <div className="page-container item-list-page">
      {showLoadingOverlay && (
        <LoadingSpinner message="Processing..." isFullScreen={true} />
      )}

      <div className="page-header">
        <h1 className="page-title">Products / Items</h1>
        <div className="header-actions">
          <button
            className="btn btn-danger"
            onClick={openMultiDeleteModal}
            disabled={disablePageActions || selectedItems.size === 0}
            title="Delete Selected Items"
          >
            <FaTrashAlt /> Delete Selected ({selectedItems.size})
          </button>
          <Link
            to="/admin/products/items/new"
            className={`btn btn-primary ${
              disablePageActions ? "disabled-link" : ""
            }`}
            aria-disabled={disablePageActions}
            onClick={(e) => disablePageActions && e.preventDefault()}
          >
            <FaPlus /> Add New Item
          </Link>
        </div>
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

      <div className="table-container stylish-table-container">
        {/* Add class for specific item table styling */}
        <table className="table stylish-table table-hover item-table">
          <thead>
            <tr>
              <th className="th-center">
                <input
                  type="checkbox"
                  className="form-checkbox"
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                  aria-label="Select all items"
                  disabled={disablePageActions || items.length === 0}
                />
              </th>
              <th className="th-center">Image</th>
              <th>Name</th>
              <th>SKU</th>
              <th>Category</th>
              <th className="th-right">Price</th>
              <th className="th-center">Stock</th>
              <th className="th-center">Status</th>
              <th className="th-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="9" className="text-center">
                  <LoadingSpinner inline message="Loading items..." />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center no-data-message">
                  {error ? "Could not load items." : "No items found. Add one!"}
                </td>
              </tr>
            ) : (
              items.map(renderItemRow)
            )}
          </tbody>
        </table>
      </div>

      <ConfirmationModal
        isOpen={modalState.isOpen}
        onClose={closeDeleteModal}
        onConfirm={handleConfirmDelete}
        title={
          modalState.isMultiDelete ? "Confirm Bulk Delete" : "Confirm Deletion"
        }
        message={
          modalState.isMultiDelete
            ? `Are you sure you want to delete the ${selectedItems.size} selected items? This action cannot be undone.`
            : `Are you sure you want to delete the item "${modalState.itemName}"? This action cannot be undone.`
        }
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isProcessing}
        isDestructive={true}
      />
    </div>
  );
};

export default ItemListPage;
