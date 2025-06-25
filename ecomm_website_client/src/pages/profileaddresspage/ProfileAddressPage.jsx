// frontend/src/pages/profileaddresspage/ProfileAddressPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import AddressCard from "../../components/AddressCard/AddressCard";
import {
  getUserAddressesApi,
  deleteAddressApi,
  setDefaultAddressApi, // Assuming you have/will create this API service function
} from "../../services/api";
import "./ProfileAddressPage.css";
import { FaPlusCircle, FaMapMarkerAlt, FaSpinner } from "react-icons/fa";

const ProfileAddressPage = () => {
  const [addresses, setAddresses] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // Start with loading true
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchAddresses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getUserAddressesApi();
      // FIX: Access the actual addresses array inside response.data.data
      setAddresses(response.data.data || []);
    } catch (err) {
      console.error("Failed to fetch addresses:", err);
      setError(
        err.response?.data?.message ||
          "Failed to load addresses. Please try again."
      );
      setAddresses([]); // Ensure state is an empty array on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const handleAddNewAddress = () => {
    navigate("/profile/addresses/new");
  };

  const handleEditAddress = (address) => {
    navigate(`/profile/addresses/edit/${address._id}`);
  };

  const handleDeleteAddress = async (addressId) => {
    if (
      window.confirm(
        "Are you sure you want to delete this address? This action cannot be undone."
      )
    ) {
      setError(null); // Clear previous errors
      try {
        await deleteAddressApi(addressId);
        // Optimistic UI update or refetch
        setAddresses((prevAddresses) =>
          prevAddresses.filter((addr) => addr._id !== addressId)
        );
        // Or uncomment below to refetch for certainty, especially if default changes
        // await fetchAddresses();
      } catch (err) {
        console.error("Failed to delete address:", err);
        setError(
          err.response?.data?.message ||
            "Failed to delete address. Please try again."
        );
      }
    }
  };

  const handleSetDefaultAddress = async (addressId) => {
    setError(null); // Clear previous errors
    try {
      await setDefaultAddressApi(addressId); // You'll need to implement this API call in services/api.js
      await fetchAddresses(); // Refetch to update default status correctly
    } catch (err) {
      console.error("Failed to set default address:", err);
      setError(
        err.response?.data?.message ||
          "Could not set default address. Please try again."
      );
    }
  };

  return (
    <>
      <Header />
      <div className="profile-address-page-container">
        <div className="page-header">
          <h1>Manage Delivery Addresses</h1>
          <button
            onClick={handleAddNewAddress}
            className="add-address-button stylish-button"
          >
            <FaPlusCircle /> Add New Address
          </button>
        </div>

        {error && <p className="error-message page-error">{error}</p>}

        {isLoading ? (
          <div className="loading-state-container">
            <FaSpinner className="spinner-icon" />
            <p>Loading your addresses...</p>
          </div>
        ) : addresses.length === 0 && !error ? (
          <div className="no-addresses-found">
            <FaMapMarkerAlt className="no-address-icon" />
            <h2>No Addresses Found</h2>
            <p>You haven't saved any delivery addresses yet.</p>
            <p>
              Click the button above to add your first address and speed up your
              checkout process!
            </p>
            <button
              onClick={handleAddNewAddress}
              className="stylish-button primary"
            >
              <FaPlusCircle /> Add Your First Address
            </button>
          </div>
        ) : (
          <div className="addresses-list">
            {/* The .map() call that was causing the error */}
            {addresses.map((addr) => (
              <AddressCard
                key={addr._id}
                address={addr}
                onEdit={handleEditAddress}
                onDelete={handleDeleteAddress}
                onSetDefault={handleSetDefaultAddress}
                isDefault={addr.isDefault}
              />
            ))}
          </div>
        )}
      </div>
      <Footer />
    </>
  );
};

export default ProfileAddressPage;
