// ========================================================================
// FILE: client/src/Pages/Admin/Products/Items/ItemListPage.jsx
// VERSION: Fully Updated for Advanced Item Listing & Search
// ========================================================================
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import itemService from "../../../../Services/itemService";
import LoadingSpinner from "../../../../Components/Common/LoadingSpinner";
import ConfirmationModal from "../../../../Components/Common/ConfirmationModal";
import {
  FaPlus,
  FaEdit,
  FaTrashAlt,
  FaImage,
  FaInfoCircle,
  FaSearch,
} from "react-icons/fa";
import "./ItemListPage.css"; // Ensure this CSS is updated for new columns

const IMAGE_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(
  "/api",
  ""
);

const formatCurrency = (value) => {
  const number = Number(value);
  if (isNaN(number)) return "N/A";
  return `₹${number.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

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
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  const navigate = useNavigate();
  const location = useLocation();

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

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms delay
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    // Clear previous messages only if not navigating with state (e.g., after create/edit)
    if (!location.state?.error && !location.state?.success) {
      setError(null);
      setSuccess(null);
    }
    try {
      const fetchedItemsData = await itemService.getAllAdminItems(
        null, // categoryId - pass null if not filtering by category
        debouncedSearchTerm.trim() || null // searchTerm
      );
      setItems(Array.isArray(fetchedItemsData) ? fetchedItemsData : []);
    } catch (err) {
      console.error("Failed to fetch items:", err);
      setError(
        err.response?.data?.message || err.message || "Failed to load items."
      );
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearchTerm, location.state]); // location.state in dependency to re-evaluate message clearing logic

  useEffect(() => {
    fetchItems();
  }, [fetchItems]); // fetchItems itself depends on debouncedSearchTerm

  useEffect(() => {
    let timer;
    if (success || error) {
      timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 7000); // Keep messages for 7 seconds
    }
    return () => clearTimeout(timer);
  }, [success, error]);

  const handleSelectAll = (e) =>
    setSelectedItems(
      e.target.checked ? new Set(items.map((i) => i._id)) : new Set()
    );

  const handleSelectRow = (e, id) => {
    const isChecked = e.target.checked;
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (isChecked) newSet.add(id);
      else newSet.delete(id);
      return newSet;
    });
  };

  const isAllSelected = useMemo(
    () => items.length > 0 && selectedItems.size === items.length,
    [items, selectedItems]
  );

  const openDeleteModal = (id, name) =>
    setModalState({
      isOpen: true,
      itemId: id,
      itemName: name,
      isMultiDelete: false,
    });

  const openMultiDeleteModal = () => {
    if (selectedItems.size > 0)
      setModalState({
        isOpen: true,
        itemId: null,
        itemName: "",
        isMultiDelete: true,
      });
  };
  const closeDeleteModal = () =>
    setModalState({
      isOpen: false,
      itemId: null,
      itemName: "",
      isMultiDelete: false,
    });

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
          }. Some deletions may have failed. See console for details.`
        );
        console.error("Multi-delete item errors:", response.errors);
      }
      fetchItems(); // Refetch items after deletion
    } catch (err) {
      console.error("Delete item error:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to delete item(s)."
      );
    } finally {
      setIsProcessing(false);
      closeDeleteModal();
    }
  };

  const handleImageError = (e) => {
    e.target.style.display = "none"; // Hide broken image
    const placeholder = e.target
      .closest(".item-image-container")
      ?.querySelector(".item-image-placeholder");
    if (placeholder) placeholder.style.display = "inline-flex"; // Show placeholder
  };

  const renderItemRow = (item) => {
    const primaryImage =
      item.images?.find((img) => img.isPrimary) || item.images?.[0];
    const imageUrl = primaryImage?.path
      ? `${IMAGE_API_BASE_URL}/uploads/${primaryImage.path.replace(/\\/g, "/")}`
      : null;

    return (
      <tr
        key={item._id}
        className={`status-row-${item.status || "unknown"} ${
          selectedItems.has(item._id) ? "row-selected" : ""
        }`}
      >
        <td className="td-checkbox td-center">
          <input
            type="checkbox"
            className="form-checkbox"
            checked={selectedItems.has(item._id)}
            onChange={(e) => handleSelectRow(e, item._id)}
            aria-label={`Select ${item.name}`}
            disabled={isProcessing}
          />
        </td>
        <td className="td-image td-center">
          <div className="item-image-container">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={primaryImage?.altText || item.name}
                className="item-thumbnail"
                onError={handleImageError}
                loading="lazy"
              />
            ) : (
              <div
                className="item-image-placeholder"
                title="No image available"
              >
                <FaImage />
              </div>
            )}
          </div>
        </td>
        <td className="td-name">
          <Link
            to={`/admin/products/items/edit/${item._id}`}
            className="item-name-link"
            title={`Edit ${item.name}`}
          >
            {item.name}
          </Link>
          {item.brand && (
            <small className="item-brand-list text-muted">
              Brand: {item.brand}
            </small>
          )}
        </td>
        <td className="td-sku">
          {item.sku || <span className="text-muted">-</span>}
        </td>
        <td className="td-category">
          {item.category?.name || <span className="text-muted">N/A</span>}
        </td>
        <td className="td-mrp td-right">{formatCurrency(item.mrp)}</td>
        <td className="td-price td-right">{formatCurrency(item.price)}</td>
        <td className="td-stock td-center">
          {item.manageStock ? (
            <span
              className={
                (item.stock ?? 0) <= (item.lowStockThreshold ?? 0) &&
                (item.stock ?? 0) > 0
                  ? "stock-low"
                  : (item.stock ?? 0) === 0
                  ? "stock-out"
                  : ""
              }
            >
              {item.stock ?? 0}
            </span>
          ) : (
            <span className="text-muted" title="Stock not managed">
              N/M
            </span>
          )}
        </td>
        <td className="td-status td-center">
          <span
            className={`status-badge status-${item.status || "unknown"}`}
            title={`Status: ${item.status || "Unknown"}`}
          >
            {(item.status || "unknown").replace("-", " ")}
          </span>
        </td>
        <td className="td-actions">
          <button
            className="btn-icon btn-edit"
            title={`Edit ${item.name}`}
            onClick={() => navigate(`/admin/products/items/edit/${item._id}`)}
            disabled={isProcessing}
            aria-label={`Edit item ${item.name}`}
          >
            <FaEdit />
          </button>
          <button
            className="btn-icon btn-delete"
            title={`Delete ${item.name}`}
            onClick={() => openDeleteModal(item._id, item.name)}
            disabled={isProcessing}
            aria-label={`Delete item ${item.name}`}
          >
            <FaTrashAlt />
          </button>
        </td>
      </tr>
    );
  };

  const handleSearchChange = (e) => setSearchTerm(e.target.value);
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setDebouncedSearchTerm(searchTerm); // Trigger fetch immediately if user presses Enter
  };

  const disablePageActions = isLoading || isProcessing;

  return (
    <div className="page-container item-list-page">
      {isLoading && items.length === 0 && (
        <LoadingSpinner message="Loading Items..." isFullScreen={true} />
      )}
      {isProcessing && (
        <LoadingSpinner message="Processing Actions..." isFullScreen={true} />
      )}

      <div className="page-header item-list-header">
        <h1 className="page-title">Product Items</h1>
        <div className="header-actions">
          <button
            className="btn btn-outline-danger btn-with-icon" /* Changed to outline */
            onClick={openMultiDeleteModal}
            disabled={disablePageActions || selectedItems.size === 0}
            title="Delete Selected Items"
          >
            <FaTrashAlt /> Delete Selected ({selectedItems.size})
          </button>
          <Link
            to="/admin/products/items/new"
            className={`btn btn-primary btn-with-icon ${
              disablePageActions ? "disabled-link" : ""
            }`}
            aria-disabled={disablePageActions}
            onClick={(e) => disablePageActions && e.preventDefault()}
          >
            <FaPlus /> Add New Item
          </Link>
        </div>
      </div>

      <div className="controls-and-feedback-bar">
        <form
          onSubmit={handleSearchSubmit}
          className="search-bar-form item-search-bar"
          role="search"
        >
          <div className="input-with-icon search-input-wrapper">
            <FaSearch className="icon-prefix search-icon" aria-hidden="true" />
            <input
              type="search" /* Use type="search" for better semantics */
              placeholder="Search by Name, SKU, Brand..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="form-control search-input"
              disabled={disablePageActions}
              aria-label="Search items"
            />
          </div>
          {/* Explicit search button can be useful for accessibility and users who prefer it */}
          {/* <button type="submit" className="btn btn-secondary search-btn" disabled={disablePageActions}>Search</button> */}
        </form>

        <div className="feedback-messages">
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
        </div>
      </div>

      <div className="table-container stylish-table-container card-style">
        {" "}
        {/* Added card-style */}
        <div className="table-responsive-wrapper">
          {" "}
          {/* Wrapper for horizontal scroll on small screens */}
          <table className="table stylish-table table-hover item-table">
            <thead>
              <tr>
                <th className="th-checkbox th-center">
                  <input
                    type="checkbox"
                    className="form-checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    aria-label="Select all items"
                    disabled={disablePageActions || items.length === 0}
                    title={isAllSelected ? "Deselect all" : "Select all"}
                  />
                </th>
                <th className="th-image th-center">Image</th>
                <th className="th-name">Name & Brand</th>
                <th className="th-sku">SKU</th>
                <th className="th-category">Category</th>
                <th className="th-mrp th-right">MRP</th>
                <th className="th-price th-right">Selling Price</th>
                <th className="th-stock th-center">Stock</th>
                <th className="th-status th-center">Status</th>
                <th className="th-actions th-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && items.length === 0 && !error ? (
                <tr>
                  <td colSpan="10" className="text-center loading-row">
                    <LoadingSpinner
                      inline={true}
                      message="Fetching items, please wait..."
                    />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan="10" className="text-center no-data-message">
                    <FaInfoCircle
                      style={{ marginRight: "8px", verticalAlign: "middle" }}
                    />
                    {error
                      ? "Could not load items due to an error."
                      : debouncedSearchTerm
                      ? `No items found matching "${debouncedSearchTerm}". Try a different search.`
                      : "No items available. Start by adding a new item!"}
                  </td>
                </tr>
              ) : (
                items.map(renderItemRow)
              )}
            </tbody>
          </table>
        </div>
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
            ? `Are you sure you want to delete ${selectedItems.size} selected item(s)? This action cannot be undone.`
            : `Are you sure you want to delete the item "${modalState.itemName}"? This action cannot be undone.`
        }
        confirmText={isProcessing ? "Deleting..." : "Delete"}
        cancelText="Cancel"
        isLoading={isProcessing}
        isDestructive={true}
      />
    </div>
  );
};

export default ItemListPage;
