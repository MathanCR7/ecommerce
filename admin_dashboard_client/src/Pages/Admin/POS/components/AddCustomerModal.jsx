// src/Pages/Admin/POS/components/AddCustomerModal.jsx
import React, { useState } from "react";
import "./AddCustomerModal.css";
import { FaTimes, FaSpinner } from "react-icons/fa";
import customerService from "../../../../Services/customerService"; // NEW

const AddCustomerModal = ({ onClose, onSave }) => {
  const initialFormState = {
    name: "", // Changed from firstName, lastName to single name
    email: "",
    phone: "",
    password: "", // Optional, backend can auto-generate
  };
  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false); // NEW
  const [apiError, setApiError] = useState(null); // NEW

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
    setApiError(null); // Clear API error on change
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Name is required.";
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required.";
    } else if (!/^\d{7,15}$/.test(formData.phone.trim())) {
      newErrors.phone = "Phone number is invalid (7-15 digits).";
    }
    if (formData.email.trim() && !/\S+@\S+\.\S+/.test(formData.email.trim())) {
      newErrors.email = "Email is invalid.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    // Made async
    e.preventDefault();
    setApiError(null);
    if (validateForm()) {
      setIsLoading(true);
      try {
        const newCustomerData = { ...formData };
        if (!newCustomerData.password) {
          // If password field is empty, let backend handle default
          delete newCustomerData.password;
        }
        const savedCustomer = await customerService.createCustomer(
          newCustomerData
        );
        onSave(savedCustomer); // Pass the saved customer (with _id from backend)
        handleReset();
      } catch (err) {
        setApiError(err.message || "Failed to save customer.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleReset = () => {
    setFormData(initialFormState);
    setErrors({});
    setApiError(null);
  };

  return (
    <div className="modal-overlay-pos">
      <div className="modal-content-pos">
        <div className="modal-header-pos">
          <h3>Add New Customer</h3>
          <button onClick={onClose} className="close-btn-pos">
            <FaTimes />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form-pos">
          {apiError && <p className="api-error-message">{apiError}</p>}
          <div className="form-group-pos">
            <label htmlFor="name">
              Full Name <span className="required-asterisk">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
            />
            {errors.name && <p className="error-text-pos">{errors.name}</p>}
          </div>
          <div className="form-group-pos">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
            />
            {errors.email && <p className="error-text-pos">{errors.email}</p>}
          </div>
          <div className="form-group-pos">
            <label htmlFor="phone">
              Phone Number <span className="required-asterisk">*</span>
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
            />
            {errors.phone && <p className="error-text-pos">{errors.phone}</p>}
          </div>
          <div className="form-group-pos">
            <label htmlFor="password">Password (Optional)</label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Leave blank to auto-generate"
              value={formData.password}
              onChange={handleChange}
            />
          </div>
          <div className="modal-actions-pos">
            <button
              type="button"
              onClick={handleReset}
              className="reset-btn-pos"
              disabled={isLoading}
            >
              Reset
            </button>
            <button
              type="submit"
              className="submit-btn-pos"
              disabled={isLoading}
            >
              {isLoading ? <FaSpinner className="fa-spin" /> : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCustomerModal;
