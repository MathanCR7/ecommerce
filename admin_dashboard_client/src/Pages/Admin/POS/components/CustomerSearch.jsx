// src/Pages/Admin/POS/components/CustomerSearch.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { FaPlus, FaSearch, FaSpinner } from "react-icons/fa";
import customerService from "../../../../Services/customerService"; // NEW
import "./CustomerSearch.css";
import { debounce } from "lodash"; // npm install lodash

const CustomerSearch = ({ selectedCustomer, onSelectCustomer, onAddNew }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const searchWrapperRef = useRef(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = useCallback(
    debounce(async (currentSearchTerm) => {
      if (
        currentSearchTerm.trim().length < 2 &&
        !currentSearchTerm.startsWith("Walk-in")
      ) {
        // Minimum 2 chars to search, unless it's Walk-in
        setSearchResults([]);
        setShowDropdown(false);
        setIsLoading(false);
        return;
      }
      setError(null);
      setIsLoading(true);
      try {
        let fetchedCustomers = [];
        if (currentSearchTerm.toLowerCase().startsWith("walk-in")) {
          fetchedCustomers = [
            { _id: "walkin", name: "Walk-in Customer", phone: "", email: "" },
          ];
        } else {
          fetchedCustomers = await customerService.searchCustomers(
            currentSearchTerm
          );
        }
        setSearchResults(
          Array.isArray(fetchedCustomers) ? fetchedCustomers : []
        );
      } catch (err) {
        setError(err.message || "Failed to search customers.");
        setSearchResults([]);
      } finally {
        setIsLoading(false);
        setShowDropdown(true);
      }
    }, 500), // 500ms debounce
    []
  );

  useEffect(() => {
    if (searchTerm) {
      debouncedSearch(searchTerm);
    } else {
      setSearchResults([]);
      setShowDropdown(false);
      setIsLoading(false); // Stop loading if search term is cleared
    }
  }, [searchTerm, debouncedSearch]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        searchWrapperRef.current &&
        !searchWrapperRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = (customer) => {
    onSelectCustomer(customer);
    setSearchTerm("");
    setShowDropdown(false);
  };

  const getDisplayValue = () => {
    if (showDropdown && searchTerm) return searchTerm; // Show current input when actively searching
    if (selectedCustomer)
      return `${selectedCustomer.name}${
        selectedCustomer.phone ? ` (${selectedCustomer.phone})` : ""
      }`;
    return "";
  };

  return (
    <div className="customer-search-wrapper" ref={searchWrapperRef}>
      <label htmlFor="customerSearchInput">Customer</label>
      <div className="customer-search-input-group">
        <FaSearch className="search-icon-customer" />
        <input
          id="customerSearchInput"
          type="text"
          placeholder="Search Name/Phone or type 'Walk-in'"
          value={getDisplayValue()}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => {
            if (searchTerm) setShowDropdown(true); // Only show dropdown if there's already a term or results
          }}
          className="customer-search-input"
          autoComplete="off"
        />
        {isLoading && <FaSpinner className="spinner-icon-customer" />}
        <button
          onClick={onAddNew}
          className="add-new-customer-btn"
          title="Add New Customer"
        >
          <FaPlus /> Add
        </button>
      </div>
      {showDropdown && (
        <ul className="customer-search-results">
          {error && <li className="result-error-item">{error}</li>}
          {!isLoading && !error && searchResults.length === 0 && searchTerm && (
            <li className="no-results-item">
              No customers found for "{searchTerm}".
            </li>
          )}
          {searchResults.map((customer) => (
            <li
              key={customer._id || "walkin"}
              onClick={() => handleSelect(customer)}
            >
              {customer.name} {customer.phone ? `(${customer.phone})` : ""}
            </li>
          ))}
        </ul>
      )}
      {/* Display selected customer info more subtly if not actively searching */}
      {!showDropdown &&
        selectedCustomer &&
        selectedCustomer._id !== "walkin" && (
          <div className="selected-customer-chip">
            {selectedCustomer.name}{" "}
            {selectedCustomer.phone ? `(${selectedCustomer.phone})` : ""}
          </div>
        )}
    </div>
  );
};

export default CustomerSearch;
