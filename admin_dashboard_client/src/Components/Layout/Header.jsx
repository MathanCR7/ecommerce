// ========================================================================
// FILE: client/src/Components/Layout/Header.jsx
// VERSION: Search Bar Removed
// ========================================================================

import React from "react"; // Removed useState, useRef, useEffect
// import { useNavigate, Link } from "react-router-dom"; // useNavigate and Link no longer needed if search is removed
import { FaBars } from "react-icons/fa";
import "./Header.css";

// Searchable pages definition is no longer needed if search is removed
// const adminPages = [
//   { name: "Dashboard", path: "/admin/dashboard" },
//   { name: "Categories List", path: "/admin/products/categories/list" },
//   { name: "New Category", path: "/admin/products/categories/new" },
//   {
//     name: "Edit Category",
//     path: "/admin/products/categories/edit",
//     type: "dynamic",
//   },
//   { name: "Items List", path: "/admin/products/items/list" },
//   { name: "Add Item", path: "/admin/products/items/new" },
//   { name: "Edit Item", path: "/admin/products/items/edit", type: "dynamic" },
//   { name: "Customers", path: "/admin/customers" },
//   { name: "Transactions", path: "/admin/transactions" },
// ];

const Header = ({ toggleSidebar, isSidebarCollapsed }) => {
  // Removed all search-related state and refs:
  // const [searchTerm, setSearchTerm] = useState("");
  // const [suggestions, setSuggestions] = useState([]);
  // const [isSearchFocused, setIsSearchFocused] = useState(false);
  // const navigate = useNavigate();
  // const searchContainerRef = useRef(null);

  // Removed all search-related handlers:
  // handleSearchChange
  // handleSuggestionClick
  // handleSearchSubmit
  // useEffect for handleClickOutside (related to search suggestions)

  return (
    <header className="admin-header">
      {/* Hamburger menu toggle */}
      <button
        onClick={toggleSidebar}
        className="sidebar-toggle-btn header-toggle-btn"
        aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <FaBars />
      </button>

      {/* Placeholder or empty div to maintain layout if needed, or remove entirely */}
      {/* If you had specific styling that relied on the search container,
          you might need a placeholder or adjust CSS. For now, it's removed. */}
      <div className="header-center-content-placeholder">
        {/* This div can be styled to take up space or removed if not needed for layout */}
      </div>

      {/* Other Header Actions (Notifications, User Menu - now removed) */}
      <div className="header-actions">
        {/* Add notification icon or other actions here if needed */}
        {/* <FaBell /> */}
        {/* Example: A simple title or branding if desired */}
        {/* <span className="header-title-placeholder">Admin Panel</span> */}
      </div>
    </header>
  );
};

export default Header;
