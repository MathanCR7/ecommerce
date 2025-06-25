// frontend/src/components/AddAddressForm/AddAddressForm.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import {
  GoogleMap,
  LoadScript,
  Marker,
  StandaloneSearchBox,
} from "@react-google-maps/api";
import "./AddAddressForm.css";
import { FaMapMarkerAlt, FaCrosshairs } from "react-icons/fa"; // Added FaCrosshairs

const libraries = ["places"];
const MAP_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
  "YOUR_GOOGLE_MAPS_API_KEY_FALLBACK";

const mapContainerStyle = {
  height: "380px", // Slightly taller map
  width: "100%",
  borderRadius: "10px", // Softer radius for map
  marginBottom: "20px",
  border: "1px solid #e0e0e0",
};

const defaultCenter = { lat: 20.5937, lng: 78.9629 };

const AddAddressForm = ({
  onSubmit,
  onCancel,
  initialData,
  isEditing,
  isSubmitting,
}) => {
  const [formData, setFormData] = useState({
    contactName: "",
    contactNumber: "",
    label: "Home",
    addressLine: "",
    streetNumber: "",
    houseNumber: "",
    floorNumber: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India", // Default country
    latitude: null,
    longitude: null,
  });

  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [markerPosition, setMarkerPosition] = useState(null);
  const searchBoxRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (initialData) {
      setFormData((prev) => ({ ...prev, ...initialData })); // Spread initial data over defaults
      if (initialData.latitude && initialData.longitude) {
        const pos = { lat: initialData.latitude, lng: initialData.longitude };
        setMarkerPosition(pos);
        setMapCenter(pos);
      }
    } else {
      // Reset form for new entries, keeping default country
      setFormData({
        contactName: "",
        contactNumber: "",
        label: "Home",
        addressLine: "",
        streetNumber: "",
        houseNumber: "",
        floorNumber: "",
        city: "",
        state: "",
        postalCode: "",
        country: "India",
        latitude: null,
        longitude: null,
      });
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const pos = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
            setMapCenter(pos);
            setMarkerPosition(pos);
            geocodeLatLng(pos);
          },
          () => {
            console.warn("Geolocation failed or permission denied.");
            setMapCenter(defaultCenter);
          }
        );
      } else {
        setMapCenter(defaultCenter);
      }
    }
  }, [initialData]); // Rerun when initialData changes (e.g. navigating between edit and new)

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhoneChange = (value) => {
    setFormData((prev) => ({ ...prev, contactNumber: value || "" }));
  };

  const handleLabelChange = (label) => {
    setFormData((prev) => ({ ...prev, label }));
  };

  const geocodeLatLng = useCallback((latLng) => {
    if (!window.google || !window.google.maps || !window.google.maps.Geocoder) {
      console.error("Google Maps Geocoder not loaded.");
      return;
    }
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: latLng }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        const address = results[0];
        const components = address.address_components;
        const getComponent = (type) =>
          components.find((c) => c.types.includes(type))?.long_name || "";

        setFormData((prev) => ({
          ...prev,
          addressLine:
            address.formatted_address
              .split(",")
              .slice(
                0,
                Math.min(2, address.formatted_address.split(",").length - 2)
              )
              .join(", ")
              .trim() || prev.addressLine,
          streetNumber: getComponent("route") || prev.streetNumber,
          city:
            getComponent("locality") ||
            getComponent("administrative_area_level_3") ||
            getComponent("administrative_area_level_2") ||
            "",
          state: getComponent("administrative_area_level_1") || "",
          postalCode: getComponent("postal_code") || "",
          country: getComponent("country") || "India",
          latitude: latLng.lat,
          longitude: latLng.lng,
        }));
      } else {
        console.warn("Geocoder failed or no results: " + status);
      }
    });
  }, []); // Added geocodeLatLng to useCallback dependencies if it uses state/props from outside

  const onMapClick = useCallback(
    (e) => {
      const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      setMarkerPosition(newPos);
      geocodeLatLng(newPos);
    },
    [geocodeLatLng]
  );

  const onSearchBoxLoad = useCallback((ref) => {
    searchBoxRef.current = ref;
  }, []);

  const onPlacesChanged = useCallback(() => {
    if (searchBoxRef.current) {
      const places = searchBoxRef.current.getPlaces();
      const place = places && places[0];
      if (place && place.geometry && place.geometry.location) {
        const location = place.geometry.location;
        const newPos = { lat: location.lat(), lng: location.lng() };
        setMapCenter(newPos);
        setMarkerPosition(newPos);
        mapRef.current?.panTo(newPos);

        setFormData((prev) => ({
          ...prev,
          addressLine:
            place.name || place.formatted_address.split(",")[0] || "", // Use place name or first part of address
          // Let geocodeLatLng fill other details based on newPos
        }));
        geocodeLatLng(newPos);
      }
    }
  }, [geocodeLatLng]);

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setMapCenter(pos);
          setMarkerPosition(pos);
          mapRef.current?.panTo(pos);
          geocodeLatLng(pos);
        },
        () =>
          alert(
            "Could not get current location. Please enable location services and grant permission."
          )
      );
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (
      !formData.contactName ||
      !formData.contactNumber ||
      !formData.addressLine ||
      !formData.city ||
      !formData.state ||
      !formData.postalCode
    ) {
      alert("Please fill in all required fields marked with *");
      return;
    }
    onSubmit(formData);
  };
  // Add required sup to labels
  const Req = () => <sup aria-hidden="true">*</sup>;

  return (
    <div className="add-address-form-page-content">
      <div className="form-header-flex">
        <h2>
          {isEditing ? "Edit Delivery Address" : "Add New Delivery Address"}
        </h2>
        {/* Cancel button moved to form actions for better UX on pages */}
      </div>

      <LoadScript
        googleMapsApiKey={MAP_API_KEY}
        libraries={libraries}
        loadingElement={
          <div className="map-loading-placeholder">Loading Map...</div>
        }
      >
        <div className="map-section">
          <div className="map-controls">
            <StandaloneSearchBox
              onLoad={onSearchBoxLoad}
              onPlacesChanged={onPlacesChanged}
            >
              <input
                type="text"
                placeholder="Search for area, street name..."
                className="map-search-input"
              />
            </StandaloneSearchBox>
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              className="current-location-btn"
            >
              <FaCrosshairs /> Use Current Location
            </button>
          </div>
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={mapCenter}
            zoom={markerPosition ? 16 : 10} // Zoom in more if marker exists
            onClick={onMapClick}
            onLoad={(map) => (mapRef.current = map)}
            options={{
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: true, // Allow fullscreen
              zoomControlOptions: {
                position: window.google?.maps?.ControlPosition?.RIGHT_TOP,
              },
            }}
          >
            {markerPosition && <Marker position={markerPosition} />}
          </GoogleMap>
        </div>
      </LoadScript>

      <form onSubmit={handleSubmit} className="address-form-fields">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="contactName">
              Contact Person Name
              <Req />
            </label>
            <input
              type="text"
              id="contactName"
              name="contactName"
              value={formData.contactName}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="contactNumber">
              Contact Person Number
              <Req />
            </label>
            <PhoneInput
              id="contactNumber"
              name="contactNumber"
              international
              defaultCountry="IN"
              value={formData.contactNumber}
              onChange={handlePhoneChange}
              className="phone-input-custom-wrapper" // For custom border/focus on whole component
              inputClassName="phone-input-field" // Actual input field styling
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label>Label As</label>
          <div className="label-options">
            {["Home", "Workplace", "Other"].map((label) => (
              <button
                type="button"
                key={label}
                className={`label-button ${
                  formData.label === label ? "active" : ""
                }`}
                onClick={() => handleLabelChange(label)}
              >
                {" "}
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="addressLine">
            Address Line (Area, Street, Landmark)
            <Req />
          </label>
          <input
            type="text"
            id="addressLine"
            name="addressLine"
            value={formData.addressLine}
            onChange={handleInputChange}
            placeholder="e.g., 123 MG Road, Near City Mall"
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="houseNumber">House / Flat / Block No.</label>
            <input
              type="text"
              id="houseNumber"
              name="houseNumber"
              value={formData.houseNumber}
              onChange={handleInputChange}
              placeholder="e.g., A-101, First Floor"
            />
          </div>
          <div className="form-group">
            <label htmlFor="streetNumber">Street Details (Optional)</label>
            <input
              type="text"
              id="streetNumber"
              name="streetNumber"
              value={formData.streetNumber}
              onChange={handleInputChange}
              placeholder="e.g., 5th Cross, Sector B"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="city">
              City
              <Req />
            </label>
            <input
              type="text"
              id="city"
              name="city"
              value={formData.city}
              onChange={handleInputChange}
              placeholder="e.g., Chennai"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="postalCode">
              Postal Code
              <Req />
            </label>
            <input
              type="text"
              id="postalCode"
              name="postalCode"
              value={formData.postalCode}
              onChange={handleInputChange}
              placeholder="e.g., 600053"
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="state">
              State
              <Req />
            </label>
            <input
              type="text"
              id="state"
              name="state"
              value={formData.state}
              onChange={handleInputChange}
              placeholder="e.g., Tamil Nadu"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="country">
              Country
              <Req />
            </label>
            <input
              type="text"
              id="country"
              name="country"
              value={formData.country}
              onChange={handleInputChange}
              placeholder="e.g., India"
              required
            />
          </div>
        </div>

        {/* Floor number could be part of House Number or a separate small field if needed */}
        {/* <div className="form-group">
            <label htmlFor="floorNumber">Floor (Optional)</label>
            <input type="text" id="floorNumber" name="floorNumber" value={formData.floorNumber} onChange={handleInputChange} placeholder="e.g., 2B" />
        </div> */}

        <div className="form-actions">
          <button
            type="button"
            onClick={onCancel}
            className="button-secondary"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="button-primary"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? isEditing
                ? "Updating..."
                : "Saving..."
              : isEditing
              ? "Update Address"
              : "Save Address"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddAddressForm;
