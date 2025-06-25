import React, { useState, useEffect, useCallback } from "react";
import {
  FaEye,
  FaEdit,
  FaTrash,
  FaSyncAlt, // Using Sync for Generate Code
  FaSearch,
  FaTimes, // Using Times icon for modal close
} from "react-icons/fa";
import Modal from "react-modal";
import couponService from "../../../Services/couponService"; // Ensure this path is correct
import "./CouponPage.css"; // Import styles

// --- Modal Styling (Overlay + High Z-Index for Content) ---
const customModalStyles = {
  content: {
    border: "none",
    background: "transparent",
    padding: "0",
    borderRadius: "12px",
    overflow: "visible",
    inset: "auto",
    position: "relative",
    zIndex: 1100,
    width: "90%",
    maxWidth: "700px",
    margin: "auto",
  },
  overlay: {
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    zIndex: 1050,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1rem",
  },
};

// Ensure this matches your root element ID, or remove if not strictly needed and causing issues in some environments.
// If #root doesn't exist at the time of this call, it can cause problems.
// Consider moving it inside the component or ensuring #root is always available.
if (typeof window !== "undefined" && document.getElementById("root")) {
  Modal.setAppElement("#root");
}

const initialFormData = {
  couponType: "Default",
  title: "",
  code: "",
  limitForSameUser: "",
  discountType: "Percent",
  discountAmount: "",
  minPurchase: "",
  maxDiscount: "",
  startDate: "",
  expireDate: "",
};

const CouponPage = () => {
  const [coupons, setCoupons] = useState([]);
  const [filteredCoupons, setFilteredCoupons] = useState([]);
  const [formData, setFormData] = useState(initialFormData);
  const [isEditing, setIsEditing] = useState(false);
  const [editCouponId, setEditCouponId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const generateCodeClientSide = () => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    const length = 8;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(
        Math.floor(Math.random() * characters.length)
      );
    }
    return result;
  };

  const filterCouponsLocally = useCallback((couponsList, currentSearchTerm) => {
    if (!currentSearchTerm) {
      return couponsList.filter((c) => c); // Ensure no null/undefined coupons
    }
    const lowerCaseTerm = currentSearchTerm.toLowerCase();
    return couponsList.filter((c) => {
      if (!c) return false;
      const titleMatch =
        c.title &&
        typeof c.title === "string" &&
        c.title.toLowerCase().includes(lowerCaseTerm);
      const codeMatch =
        c.code &&
        typeof c.code === "string" &&
        c.code.toLowerCase().includes(lowerCaseTerm);
      return titleMatch || codeMatch;
    });
  }, []);

  const loadCoupons = useCallback(async (currentSearchTerm = "") => {
    setIsLoading(true);
    setError(null);
    try {
      // Backend handles search, so fetched data is already filtered if searchTerm is provided
      const responseData = await couponService.fetchCoupons(currentSearchTerm);
      const couponsArray =
        responseData?.coupons && Array.isArray(responseData.coupons)
          ? responseData.coupons
          : [];

      setCoupons(couponsArray);
      setFilteredCoupons(couponsArray); // Backend search means this is already the filtered list
    } catch (err) {
      console.error("CouponPage: Failed to fetch coupons:", err);
      setError(err.message || "Could not load coupons. Please try again.");
      setCoupons([]);
      setFilteredCoupons([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCoupons(searchTerm);
  }, [loadCoupons, searchTerm]);

  const handleSearchChange = (e) => {
    const newSearchTerm = e.target.value;
    setSearchTerm(newSearchTerm);
    // Option 1: Live filtering on client-side from the master `coupons` list
    // setFilteredCoupons(filterCouponsLocally(coupons, newSearchTerm));
    // Option 2: Debounced backend search (useEffect with searchTerm already handles this)
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadCoupons(searchTerm); // Explicitly trigger backend search
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleGenerateCode = () => {
    const newCode = generateCodeClientSide();
    setFormData((prevData) => ({ ...prevData, code: newCode }));
  };

  const handleResetForm = () => {
    setFormData(initialFormData);
    setIsEditing(false);
    setEditCouponId(null);
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    const requiredFields = [
      "couponType",
      "title",
      "limitForSameUser",
      "discountType",
      "discountAmount",
      "startDate",
      "expireDate",
    ];
    if (!isEditing) requiredFields.push("code");

    for (const field of requiredFields) {
      const value = formData[field];
      if (
        value === null ||
        value === undefined ||
        String(value).trim() === ""
      ) {
        let labelText = field
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (str) => str.toUpperCase());
        if (field === "limitForSameUser") labelText = "Limit For Same User";
        if (field === "discountAmount") labelText = "Discount Amount";
        if (field === "code" && !isEditing) labelText = "Coupon Code";
        setError(`Please fill in the '${labelText}' field.`);
        setIsSubmitting(false);
        return;
      }
    }

    const numericFields = {
      limitForSameUser: "Limit For Same User",
      discountAmount: "Discount Amount",
      minPurchase: "Minimum Purchase",
      maxDiscount: "Maximum Discount",
    };
    for (const [field, label] of Object.entries(numericFields)) {
      const value = formData[field];
      if (value !== "" && (isNaN(Number(value)) || Number(value) < 0)) {
        setError(`${label} must be a valid non-negative number.`);
        setIsSubmitting(false);
        return;
      }
    }

    const startDateVal = new Date(formData.startDate);
    const expireDateVal = new Date(formData.expireDate);
    if (isNaN(startDateVal.getTime()) || isNaN(expireDateVal.getTime())) {
      setError("Please select valid start and expire dates.");
      setIsSubmitting(false);
      return;
    }
    const normStartDate = new Date(
      startDateVal.getFullYear(),
      startDateVal.getMonth(),
      startDateVal.getDate()
    );
    const normExpireDate = new Date(
      expireDateVal.getFullYear(),
      expireDateVal.getMonth(),
      expireDateVal.getDate()
    );
    if (normExpireDate < normStartDate) {
      setError("Expire date must be on or after the start date.");
      setIsSubmitting(false);
      return;
    }

    let maxDiscountValue = Number(formData.maxDiscount) || 0;
    if (formData.discountType === "Amount") maxDiscountValue = 0;

    const couponDataPayload = {
      couponType: formData.couponType,
      title: formData.title.trim(),
      limitForSameUser: Number(formData.limitForSameUser),
      discountType: formData.discountType,
      discountAmount: Number(formData.discountAmount),
      minPurchase: Number(formData.minPurchase) || 0,
      maxDiscount: maxDiscountValue,
      startDate: formData.startDate,
      expireDate: formData.expireDate,
      // isActive is managed by the backend on creation (defaults to true) or by toggleStatus
    };
    if (!isEditing) {
      couponDataPayload.code = formData.code.trim().toUpperCase();
    }

    try {
      if (isEditing && editCouponId) {
        await couponService.updateCoupon(editCouponId, couponDataPayload);
        setSuccessMessage("Coupon updated successfully!");
      } else {
        await couponService.createCoupon(couponDataPayload);
        setSuccessMessage("Coupon created successfully!");
      }
      handleResetForm();
      await loadCoupons(searchTerm); // Refresh list
    } catch (err) {
      console.error(
        `CouponPage: Failed to ${isEditing ? "update" : "create"} coupon:`,
        err
      );
      const errorMessage =
        err.response?.data?.message || // Axios error structure
        err.message || // General error
        `Could not ${isEditing ? "update" : "create"} coupon.`;
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (coupon) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setIsEditing(true);
    setEditCouponId(coupon._id);
    setFormData({
      couponType: coupon.couponType || "Default",
      title: coupon.title || "",
      code: coupon.code || "", // Code is read-only in form but shown
      limitForSameUser: String(coupon.limitForSameUser ?? ""),
      discountType: coupon.discountType || "Percent",
      discountAmount: String(coupon.discountAmount ?? ""),
      minPurchase: String(coupon.minPurchase ?? ""),
      maxDiscount: String(coupon.maxDiscount ?? ""),
      startDate: coupon.startDate
        ? new Date(coupon.startDate).toISOString().split("T")[0]
        : "",
      expireDate: coupon.expireDate
        ? new Date(coupon.expireDate).toISOString().split("T")[0]
        : "",
    });
    setError(null);
    setSuccessMessage(null);
  };

  const handleDelete = async (id) => {
    if (
      window.confirm("Are you sure you want to permanently delete this coupon?")
    ) {
      setError(null);
      setSuccessMessage(null);
      try {
        await couponService.deleteCoupon(id);
        setSuccessMessage("Coupon deleted successfully!");
        await loadCoupons(searchTerm); // Refresh list
      } catch (err) {
        console.error("CouponPage: Failed to delete coupon:", err);
        const errorMessage =
          err.response?.data?.message ||
          err.message ||
          "Could not delete coupon.";
        setError(errorMessage);
      }
    }
  };

  const handleToggleStatus = async (id) => {
    const couponToToggle = coupons.find((c) => c._id === id);
    if (!couponToToggle) {
      setError("Coupon not found to toggle.");
      return;
    }

    const originalCoupons = [...coupons];
    const newIsActiveStatus = !couponToToggle.isActive;

    // Optimistic UI update
    const optimisticallyUpdatedCoupons = coupons.map((c) =>
      c._id === id ? { ...c, isActive: newIsActiveStatus } : c
    );
    setCoupons(optimisticallyUpdatedCoupons);
    // Apply search term filtering to the optimistically updated list
    setFilteredCoupons(
      filterCouponsLocally(optimisticallyUpdatedCoupons, searchTerm)
    );

    try {
      const updatedCouponFromServer = await couponService.toggleCouponStatus(
        id
      );

      // Verify server response (service should ideally guarantee this structure on success)
      if (
        !updatedCouponFromServer ||
        !updatedCouponFromServer._id ||
        typeof updatedCouponFromServer.isActive === "undefined"
      ) {
        throw new Error(
          "Server response for status toggle was invalid (checked in component)."
        );
      }

      // Update master list with confirmed server data (important for consistency)
      const serverConfirmedCouponsList = originalCoupons.map((c) =>
        c._id === id ? updatedCouponFromServer : c
      );
      setCoupons(serverConfirmedCouponsList);
      setFilteredCoupons(
        filterCouponsLocally(serverConfirmedCouponsList, searchTerm)
      );
      setSuccessMessage(
        `Coupon status updated to ${
          updatedCouponFromServer.isActive ? "Active" : "Inactive"
        }.`
      );
      setError(null);
    } catch (err) {
      console.error("CouponPage: Failed to toggle coupon status:", err);
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Could not update coupon status.";
      setError(errorMessage);
      setSuccessMessage(null);

      // Rollback optimistic UI update
      setCoupons(originalCoupons);
      setFilteredCoupons(filterCouponsLocally(originalCoupons, searchTerm));
    }
  };

  const handleView = (coupon) => {
    setSelectedCoupon(coupon);
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedCoupon(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid Date";
      return date.toLocaleDateString("en-GB", {
        // Example: 01 Jan 2023
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch (e) {
      console.error("Error formatting date:", dateString, e);
      return "Invalid Date";
    }
  };

  const getDiscountDisplay = (coupon) => {
    if (!coupon) return "N/A";
    if (coupon.couponType === "Free Delivery") return "Free Delivery";

    const discountAmount = Number(coupon.discountAmount);
    if (isNaN(discountAmount)) return "N/A";

    if (coupon.discountType === "Percent") {
      let display = `${discountAmount}%`;
      const maxDiscount = Number(coupon.maxDiscount);
      if (maxDiscount > 0) {
        display += ` (Max ${maxDiscount.toLocaleString("en-US", {
          style: "currency",
          currency: "USD", // Consider making currency dynamic if needed
        })})`;
      }
      return display;
    }
    if (coupon.discountType === "Amount") {
      return discountAmount.toLocaleString("en-US", {
        style: "currency",
        currency: "USD", // Consider making currency dynamic
      });
    }
    return "N/A";
  };

  return (
    <div className="page-container coupon-page-container">
      {/* Coupon Form Card */}
      <div className="card coupon-form-card mb-4 shadow-sm">
        <div className="card-header">
          <h5 className="mb-0 card-title-text">
            {isEditing ? "Edit Coupon" : "Coupon Setup"}
          </h5>
        </div>
        <div className="card-body">
          {error && (
            <div
              className="alert alert-danger alert-dismissible fade show form-alert"
              role="alert"
            >
              {error}
              <button
                type="button"
                className="btn-close"
                onClick={() => setError(null)}
                aria-label="Close"
              ></button>
            </div>
          )}
          {successMessage && (
            <div
              className="alert alert-success alert-dismissible fade show form-alert"
              role="alert"
            >
              {successMessage}
              <button
                type="button"
                className="btn-close"
                onClick={() => setSuccessMessage(null)}
                aria-label="Close"
              ></button>
            </div>
          )}
          <form onSubmit={handleSubmit} noValidate>
            <div className="row g-3">
              {/* Coupon Type */}
              <div className="col-md-4">
                <label htmlFor="couponType" className="form-label">
                  Coupon Type <span className="text-danger">*</span>
                </label>
                <select
                  id="couponType"
                  name="couponType"
                  className="form-select form-select-sm"
                  value={formData.couponType}
                  onChange={handleInputChange}
                  required
                >
                  <option value="Default">Default</option>
                  <option value="First Order">First Order</option>
                  <option value="Free Delivery">Free Delivery</option>
                  <option value="Customer Wise">Customer Wise</option>
                </select>
              </div>
              {/* Coupon Title */}
              <div className="col-md-4">
                <label htmlFor="title" className="form-label">
                  Coupon Title <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  className="form-control form-control-sm"
                  placeholder="New coupon"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                />
              </div>
              {/* Coupon Code */}
              <div className="col-md-4">
                <label
                  htmlFor="code"
                  className="form-label d-flex justify-content-between align-items-center w-100"
                >
                  <span>
                    Coupon Code
                    {!isEditing && <span className="text-danger">*</span>}
                  </span>
                  {!isEditing && (
                    <button
                      type="button"
                      className="btn btn-link generate-code-btn p-0"
                      onClick={handleGenerateCode}
                      title="Generate Code"
                    >
                      Generate code
                      <FaSyncAlt
                        style={{ verticalAlign: "middle", marginLeft: "3px" }}
                      />
                    </button>
                  )}
                </label>
                <input
                  type="text"
                  id="code"
                  name="code"
                  className="form-control form-control-sm"
                  placeholder={isEditing ? "" : "Generate code"}
                  value={formData.code}
                  onChange={handleInputChange}
                  readOnly={isEditing}
                  required={!isEditing}
                  style={{ textTransform: "uppercase" }}
                  maxLength={20}
                />
                {isEditing && (
                  <small className="text-muted d-block mt-1">
                    Code cannot be changed after creation.
                  </small>
                )}
              </div>
              {/* Limit For Same User */}
              <div className="col-md-4">
                <label htmlFor="limitForSameUser" className="form-label">
                  Limit For Same User <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  id="limitForSameUser"
                  name="limitForSameUser"
                  className="form-control form-control-sm"
                  placeholder="EX: 10"
                  value={formData.limitForSameUser}
                  onChange={handleInputChange}
                  min="0"
                  required
                />
              </div>
              {/* Discount Type */}
              <div className="col-md-4">
                <label htmlFor="discountType" className="form-label">
                  Discount Type <span className="text-danger">*</span>
                </label>
                <select
                  id="discountType"
                  name="discountType"
                  className="form-select form-select-sm"
                  value={formData.discountType}
                  onChange={handleInputChange}
                  required
                >
                  <option value="Percent">Percent</option>
                  <option value="Amount">Amount</option>
                </select>
              </div>
              {/* Discount Amount */}
              <div className="col-md-4">
                <label htmlFor="discountAmount" className="form-label">
                  Discount Amount <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  id="discountAmount"
                  name="discountAmount"
                  className="form-control form-control-sm"
                  placeholder="0"
                  value={formData.discountAmount}
                  onChange={handleInputChange}
                  min="0"
                  step={formData.discountType === "Percent" ? "1" : "0.01"}
                  required
                />
              </div>
              {/* Minimum Purchase */}
              <div className="col-md-4">
                <label htmlFor="minPurchase" className="form-label">
                  Minimum Purchase
                </label>
                <input
                  type="number"
                  id="minPurchase"
                  name="minPurchase"
                  className="form-control form-control-sm"
                  placeholder="0"
                  value={formData.minPurchase}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                />
              </div>
              {/* Maximum Discount */}
              <div className="col-md-4">
                <label htmlFor="maxDiscount" className="form-label">
                  Maximum Discount
                </label>
                <input
                  type="number"
                  id="maxDiscount"
                  name="maxDiscount"
                  className="form-control form-control-sm"
                  placeholder="0"
                  value={formData.maxDiscount}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  disabled={formData.discountType === "Amount"}
                  title={
                    formData.discountType === "Amount"
                      ? "Max discount only applies to 'Percent' type"
                      : "Maximum discount amount for percentage type (0 = no limit)"
                  }
                />
                {formData.discountType === "Amount" && (
                  <small className="text-muted d-block mt-1">
                    Not applicable for 'Amount' type.
                  </small>
                )}
              </div>
              {/* Start Date */}
              <div className="col-md-4">
                <label htmlFor="startDate" className="form-label">
                  Start Date <span className="text-danger">*</span>
                </label>
                <input
                  type="date"
                  id="startDate"
                  name="startDate"
                  className="form-control form-control-sm date-input"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  required
                />
              </div>
              {/* Expire Date */}
              <div className="col-md-4">
                <label htmlFor="expireDate" className="form-label">
                  Expire Date <span className="text-danger">*</span>
                </label>
                <input
                  type="date"
                  id="expireDate"
                  name="expireDate"
                  className="form-control form-control-sm date-input"
                  value={formData.expireDate}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
            <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top form-footer-actions">
              <button
                type="button"
                className="btn btn-sm reset-btn"
                onClick={handleResetForm}
              >
                {isEditing ? "Cancel" : "Reset"}
              </button>
              <button
                type="submit"
                className="btn btn-sm submit-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    ></span>
                    {isEditing ? "Updating..." : "Submitting..."}
                  </>
                ) : isEditing ? (
                  "Update Coupon"
                ) : (
                  "Submit"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Coupon Table Card */}
      <div className="card coupon-table-card shadow-sm">
        <div className="card-header coupon-table-header">
          <h5 className="mb-0 card-title-text">
            Coupon Table
            <span className="badge rounded-pill coupon-count-badge ms-2">
              {filteredCoupons.length}
            </span>
          </h5>
          <form
            onSubmit={handleSearchSubmit}
            className="d-flex gap-2 coupon-search-form"
          >
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Search by title or coupon code"
              value={searchTerm}
              onChange={handleSearchChange}
              aria-label="Search Coupons"
            />
            <button
              type="submit"
              className="btn btn-sm search-btn d-flex align-items-center gap-1"
            >
              <FaSearch /> Search
            </button>
          </form>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-hover coupon-table align-middle">
              <thead className="table-light">
                <tr>
                  <th scope="col" className="sl-col">
                    SL
                  </th>
                  <th scope="col" className="coupon-col">
                    Coupon
                  </th>
                  <th scope="col" className="type-col">
                    Coupon Type
                  </th>
                  <th scope="col" className="discount-col">
                    Discount
                  </th>
                  <th scope="col" className="duration-col">
                    Duration
                  </th>
                  <th scope="col" className="limit-col">
                    User Limit
                  </th>
                  <th scope="col" className="status-col text-center">
                    Status
                  </th>
                  <th scope="col" className="action-col text-center">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan="8" className="text-center p-5">
                      <div
                        className="spinner-border text-primary"
                        role="status"
                      >
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </td>
                  </tr>
                )}
                {!isLoading && filteredCoupons.length === 0 && (
                  <tr>
                    <td colSpan="8" className="text-center text-muted p-4">
                      {searchTerm
                        ? "No coupons found matching your search."
                        : "No coupons have been created yet."}
                    </td>
                  </tr>
                )}
                {!isLoading &&
                  filteredCoupons.map((coupon, index) => (
                    <tr key={coupon._id}>
                      <td>{index + 1}</td>
                      <td>
                        <div className="coupon-code-display">{coupon.code}</div>
                        <small className="coupon-title-display">
                          {coupon.title}
                        </small>
                      </td>
                      <td>{coupon.couponType}</td>
                      <td>{getDiscountDisplay(coupon)}</td>
                      <td>{`${formatDate(coupon.startDate)} - ${formatDate(
                        coupon.expireDate
                      )}`}</td>
                      <td>
                        <div>
                          Limit: {coupon.limitForSameUser} , Used:{" "}
                          {coupon.totalUsed !== undefined
                            ? coupon.totalUsed
                            : 0}
                        </div>
                      </td>
                      <td className="text-center">
                        <div
                          className="form-check form-switch d-inline-block status-toggle"
                          title={
                            coupon.isActive
                              ? "Click to Deactivate"
                              : "Click to Activate"
                          }
                        >
                          <input
                            className="form-check-input"
                            type="checkbox"
                            role="switch"
                            id={`statusSwitch-${coupon._id}`}
                            checked={!!coupon.isActive} // Ensure boolean
                            onChange={() => handleToggleStatus(coupon._id)}
                            aria-label={
                              coupon.isActive
                                ? "Coupon status is active, click to deactivate"
                                : "Coupon status is inactive, click to activate"
                            }
                          />
                        </div>
                      </td>
                      <td className="text-center">
                        <div className="d-flex gap-1 justify-content-center action-btn-group">
                          <button
                            className="btn btn-sm btn-icon btn-action-view"
                            onClick={() => handleView(coupon)}
                            title="View Details"
                          >
                            <FaEye />
                          </button>
                          <button
                            className="btn btn-sm btn-icon btn-action-edit"
                            onClick={() => handleEdit(coupon)}
                            title="Edit Coupon"
                          >
                            <FaEdit />
                          </button>
                          <button
                            className="btn btn-sm btn-icon btn-action-delete"
                            onClick={() => handleDelete(coupon._id)}
                            title="Delete Coupon"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Coupon Details Modal */}
      <Modal
        isOpen={isModalOpen}
        onRequestClose={closeModal}
        style={customModalStyles}
        contentLabel="Coupon Details"
        overlayClassName="coupon-view-modal-overlay" // Ensure these classes are defined in CouponPage.css
        className="coupon-view-modal-content" // Ensure these classes are defined in CouponPage.css
        shouldCloseOnOverlayClick={true}
        ariaHideApp={
          typeof window !== "undefined" && document.getElementById("root")
            ? true
            : false
        }
      >
        {selectedCoupon && (
          <div className="modal-split-container">
            <div className="modal-left-panel">
              <h4 className="modal-coupon-title">{selectedCoupon.title}</h4>
              <p className="modal-coupon-code">
                Code: <span>{selectedCoupon.code}</span>
              </p>
              <p className="modal-coupon-type">
                Type: {selectedCoupon.couponType}
              </p>
              <div className="modal-details-section">
                <p>
                  <span>Discount:</span>
                  <strong>{getDiscountDisplay(selectedCoupon)}</strong>
                </p>
                <p>
                  <span>Min Purchase:</span>
                  <strong>
                    ${Number(selectedCoupon.minPurchase ?? 0).toFixed(2)}
                  </strong>
                </p>
                <p>
                  <span>Valid From:</span>
                  <strong>{formatDate(selectedCoupon.startDate)}</strong>
                </p>
                <p>
                  <span>Valid Until:</span>
                  <strong>{formatDate(selectedCoupon.expireDate)}</strong>
                </p>
                <p>
                  <span>User Limit:</span>
                  <strong>{selectedCoupon.limitForSameUser}</strong>
                </p>
                <p>
                  <span>Total Used:</span>
                  <strong>
                    {selectedCoupon.totalUsed !== undefined
                      ? selectedCoupon.totalUsed
                      : 0}
                  </strong>
                </p>
                <p>
                  <span>Status:</span>
                  <strong
                    className={
                      selectedCoupon.isActive
                        ? "status-active"
                        : "status-inactive"
                    }
                  >
                    {selectedCoupon.isActive ? "Active" : "Inactive"}
                  </strong>
                </p>
              </div>
            </div>
            <div className="modal-right-panel">
              <button
                onClick={closeModal}
                className="modal-close-btn"
                aria-label="Close"
              >
                <FaTimes />
              </button>
            </div>
            <div className="modal-discount-badge">
              {selectedCoupon.couponType === "Free Delivery" ? (
                <span className="badge-main-text badge-text-small">
                  Free Delivery
                </span>
              ) : selectedCoupon.discountType === "Percent" ? (
                <>
                  <span className="badge-main-text">
                    {selectedCoupon.discountAmount}%
                  </span>
                  <span className="badge-sub-text">OFF</span>
                </>
              ) : (
                <>
                  <span className="badge-main-text">
                    {Number(selectedCoupon.discountAmount).toLocaleString(
                      "en-US",
                      {
                        style: "currency",
                        currency: "USD",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                      }
                    )}
                  </span>
                  <span className="badge-sub-text">OFF</span>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CouponPage;
