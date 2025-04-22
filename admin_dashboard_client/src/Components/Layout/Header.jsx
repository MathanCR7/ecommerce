// ========================================================================
// FILE: client/src/Components/Layout/Header.jsx
// ========================================================================

import React, { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FaSearch, FaBars } from "react-icons/fa";
import "./Header.css";

// Define searchable pages
const adminPages = [
  { name: "Dashboard", path: "/admin/dashboard" },
  { name: "Categories List", path: "/admin/products/categories/list" },
  { name: "New Category", path: "/admin/products/categories/new" },
  {
    name: "Edit Category",
    path: "/admin/products/categories/edit",
    type: "dynamic",
  }, // Example dynamic route
  { name: "Items List", path: "/admin/products/items/list" },
  { name: "Add Item", path: "/admin/products/items/new" }, // Changed path
  { name: "Edit Item", path: "/admin/products/items/edit", type: "dynamic" }, // Example dynamic route
  { name: "Customers", path: "/admin/customers" },
  { name: "Transactions", path: "/admin/transactions" },
];

const Header = ({ toggleSidebar, isSidebarCollapsed }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const navigate = useNavigate();
  const searchContainerRef = useRef(null);

  // Handle search input changes and filter suggestions
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (value.length > 1) {
      const filtered = adminPages.filter(
        (page) =>
          page.name.toLowerCase().includes(value.toLowerCase()) &&
          page.type !== "dynamic" // Exclude dynamic routes from direct search results initially
      );
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (path) => {
    navigate(path);
    setSearchTerm("");
    setSuggestions([]);
    setIsSearchFocused(false); // Close suggestions
  };

  // Handle search form submission (e.g., pressing Enter)
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (suggestions.length === 1) {
      // If only one suggestion, navigate directly
      handleSuggestionClick(suggestions[0].path);
    } else if (suggestions.length > 1) {
      // Optional: navigate to a search results page or the first suggestion
      handleSuggestionClick(suggestions[0].path);
    }
    // If no suggestions, do nothing or show a "not found" message?
    console.log("Search submitted for:", searchTerm);
    setSuggestions([]);
    setIsSearchFocused(false);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target)
      ) {
        setIsSearchFocused(false);
        setSuggestions([]); // Hide suggestions
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="admin-header">
      {/* Hamburger menu toggle - visible on smaller screens or always */}
      <button
        onClick={toggleSidebar}
        className="sidebar-toggle-btn header-toggle-btn" // Reuse or create specific class
        aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <FaBars />
      </button>

      {/* Search Bar */}
      <div className="header-search-container" ref={searchContainerRef}>
        <form className="search-bar" onSubmit={handleSearchSubmit}>
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search pages (e.g., New Category)..."
            value={searchTerm}
            onChange={handleSearchChange}
            onFocus={() => setIsSearchFocused(true)}
            aria-label="Search admin pages"
          />
        </form>
        {isSearchFocused && suggestions.length > 0 && (
          <ul className="search-suggestions">
            {suggestions.map((page) => (
              <li
                key={page.path}
                onClick={() => handleSuggestionClick(page.path)}
              >
                {page.name}
              </li>
            ))}
          </ul>
        )}
        {isSearchFocused &&
          searchTerm.length > 1 &&
          suggestions.length === 0 && (
            <div className="search-no-results">No matching pages found.</div>
          )}
      </div>

      {/* Other Header Actions (Notifications, User Menu - now removed) */}
      {/* Removed profile icon as requested */}
      <div className="header-actions">
        {/* Add notification icon or other actions here if needed */}
        {/* <FaBell /> */}
      </div>
    </header>
  );
};

export default Header;
