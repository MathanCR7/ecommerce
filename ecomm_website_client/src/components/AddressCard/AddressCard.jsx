// frontend/src/components/AddressCard/AddressCard.jsx
import React from "react";
import "./AddressCard.css";
import {
  FaEdit,
  FaTrashAlt, // Changed for a slightly different trash icon
  FaMapMarkerAlt,
  FaHome,
  FaBriefcase,
  FaTag,
  FaCheckCircle, // For default badge
  FaRegCircle, // For set as default button
} from "react-icons/fa";

const AddressCard = ({
  address,
  onEdit,
  onDelete,
  onSetDefault,
  isDefault,
}) => {
  const getLabelIcon = (label) => {
    const lowerLabel = label?.toLowerCase();
    if (lowerLabel === "home") return <FaHome className="label-icon home" />;
    if (lowerLabel === "workplace")
      return <FaBriefcase className="label-icon work" />;
    return <FaTag className="label-icon other" />;
  };

  return (
    <div className={`address-card ${isDefault ? "default-address-card" : ""}`}>
      {isDefault && (
        <div className="default-banner">
          <FaCheckCircle /> Default Address
        </div>
      )}
      <div className="address-card-content">
        <div className="address-card-header">
          <h4 className="address-label">
            {getLabelIcon(address.label)}
            <span>{address.label || "Address"}</span>
          </h4>
          <div className="address-card-actions">
            <button
              onClick={() => onEdit(address)}
              className="action-button edit-button"
              aria-label="Edit Address"
              title="Edit Address"
            >
              <FaEdit /> <span>Edit</span>
            </button>
            <button
              onClick={() => onDelete(address._id)}
              className="action-button delete-button"
              aria-label="Delete Address"
              title="Delete Address"
            >
              <FaTrashAlt /> <span>Delete</span>
            </button>
          </div>
        </div>
        <div className="address-card-body">
          <p className="contact-name">{address.contactName}</p>
          <p className="contact-number">{address.contactNumber}</p>
          <div className="address-details">
            <FaMapMarkerAlt className="address-pin-icon" />
            <p>
              {address.houseNumber ? `${address.houseNumber}, ` : ""}
              {address.addressLine}
              {address.streetNumber ? `, ${address.streetNumber}` : ""}
              {address.floorNumber ? `, Floor: ${address.floorNumber}` : ""}
            </p>
          </div>
          <p className="city-postal">
            {address.city}, {address.state} - {address.postalCode}
          </p>
          <p className="country-name">{address.country}</p>
        </div>
        {!isDefault && onSetDefault && (
          <button
            onClick={() => onSetDefault(address._id)}
            className="set-default-button stylish-button secondary"
            aria-label="Set as Default Address"
          >
            <FaRegCircle /> Set as Default
          </button>
        )}
      </div>
    </div>
  );
};

export default AddressCard;
