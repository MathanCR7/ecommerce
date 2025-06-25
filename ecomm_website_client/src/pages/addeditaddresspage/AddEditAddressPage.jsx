// frontend/src/pages/addeditaddresspage/AddEditAddressPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../../components/Header/Header"; // Adjust path if necessary
import Footer from "../../components/Footer/Footer"; // Adjust path if necessary
import AddAddressForm from "../../components/AddAddressForm/AddAddressForm";
import {
  addAddressApi,
  updateAddressApi,
  getUserAddressesApi,
} from "../../services/api";
import "./AddEditAddressPage.css";

const AddEditAddressPage = () => {
  const { addressId } = useParams();
  const navigate = useNavigate();
  const [initialData, setInitialData] = useState(null);
  const [isLoading, setIsLoading] = useState(!!addressId);
  const [error, setError] = useState(null);
  const isEditing = Boolean(addressId);

  const fetchAddressForEditing = useCallback(async () => {
    if (isEditing) {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getUserAddressesApi(); // Fetches all addresses
        // FIX: Access the actual addresses array inside response.data.data
        const addressToEdit = response.data.data.find(
          (addr) => addr._id === addressId
        );
        if (addressToEdit) {
          setInitialData(addressToEdit);
        } else {
          setError("Address not found or you're not authorized to edit it.");
        }
      } catch (err) {
        console.error("Failed to fetch address for editing:", err);
        setError(err.response?.data?.message || "Failed to load address data.");
      } finally {
        setIsLoading(false);
      }
    } else {
      // For new address, ensure form is cleared and not loading
      setInitialData(null);
      setIsLoading(false);
    }
  }, [addressId, isEditing]);

  useEffect(() => {
    fetchAddressForEditing();
  }, [fetchAddressForEditing]);

  const handleFormSubmit = async (formData) => {
    setIsLoading(true);
    setError(null);
    try {
      if (isEditing) {
        await updateAddressApi(addressId, formData);
      } else {
        await addAddressApi(formData);
      }
      navigate("/profile/addresses");
    } catch (err) {
      console.error("Failed to save address:", err);
      const apiError =
        err.response?.data?.message ||
        "Failed to save address. Please check your input and try again.";
      setError(apiError);
      setIsLoading(false); // Important to stop loading on error
    }
    // No setIsLoading(false) in finally if navigating away on success
  };

  const handleCancel = () => {
    navigate("/profile/addresses");
  };

  if (isLoading && isEditing) {
    // Only show loading spinner explicitly while *editing* is loading
    // For new addresses, isLoading will be false after initial effect run
    return (
      <>
        <Header />
        <div className="add-edit-address-page-container loading-container">
          <div className="spinner"></div>
          <p>Loading address details...</p>
        </div>
        <Footer />
      </>
    );
  }

  // Added a check if address was not found in edit mode after loading
  if (isEditing && !isLoading && !initialData && error) {
    return (
      <>
        <Header />
        <div className="add-edit-address-page-container loading-container">
          <p className="error-message page-error">{error}</p>
          <button onClick={handleCancel} className="button-secondary">
            Go Back to Addresses
          </button>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="add-edit-address-page-container">
        {error && <p className="error-message form-error-message">{error}</p>}
        <AddAddressForm
          onSubmit={handleFormSubmit}
          onCancel={handleCancel}
          initialData={initialData} // initialData will be null for new addresses
          isEditing={isEditing}
          isSubmitting={isLoading} // Pass submitting state to disable form button
        />
      </div>
      <Footer />
    </>
  );
};

export default AddEditAddressPage;
