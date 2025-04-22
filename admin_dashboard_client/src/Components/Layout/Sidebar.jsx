// ========================================================================
// FILE: client/src/Components/Layout/Sidebar.jsx
// ========================================================================

import React, { useState, useEffect } from "react";
import { NavLink, useLocation, Link } from "react-router-dom";
import {
  FaTachometerAlt,
  FaUsers,
  FaReceipt,
  FaSignOutAlt,
  FaBars,
  FaListAlt,
  FaPlusSquare,
  FaBoxes,
  FaChevronDown,
  FaChevronUp,
  FaStoreAlt,
  FaTag,
} from "react-icons/fa";
import { useAuth } from "../../Context/AuthContext";
import ConfirmationModal from "../Common/ConfirmationModal"; // Import Confirmation Modal
import "./Sidebar.css";
import logoImage from "../../Assets/favicon.png"; // Main logo
import logoIcon from "../../Assets/favicon.png"; // Icon for collapsed state

const Sidebar = ({ isCollapsed, toggleSidebar }) => {
  const { user, logout } = useAuth();
  const location = useLocation(); // Get current location

  // State for controlling menu open/closed status
  const [openMenus, setOpenMenus] = useState({
    products: false,
    categories: false,
    items: false,
  });
  // State for confirmation modal
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isProcessingLogout, setIsProcessingLogout] = useState(false);

  // --- Auto Open/Close Menus based on Route ---
  useEffect(() => {
    const currentPath = location.pathname;
    const isProductsPath = currentPath.startsWith("/admin/products");
    const isCategoryPath = currentPath.startsWith("/admin/products/categories");
    const isItemPath = currentPath.startsWith("/admin/products/items");

    setOpenMenus((prev) => ({
      products: isProductsPath,
      // Keep submenus open only if the parent (products) is also open
      categories: isProductsPath && isCategoryPath,
      items: isProductsPath && isItemPath,
    }));
  }, [location.pathname]); // Re-run when path changes

  // --- Class Name Helpers ---
  const getNavLinkClass = ({ isActive }) =>
    `sidebar-link ${isActive ? "active-link" : ""}`;
  const getSubNavLinkClass = ({ isActive }) =>
    `sidebar-sublink ${isActive ? "active-sublink" : ""}`;
  const getDeepSubNavLinkClass = ({ isActive }) =>
    `sidebar-sublink deep-sublink ${isActive ? "active-deep-sublink" : ""}`;

  // --- Menu Toggle Handlers ---
  const toggleMenu = (menuKey, e) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenMenus((prev) => {
      const newState = { ...prev };
      const isOpening = !prev[menuKey];
      newState[menuKey] = isOpening;

      // Close children if parent closes
      if (menuKey === "products" && !isOpening) {
        newState.categories = false;
        newState.items = false;
      }
      // Close siblings when opening a child
      if (menuKey === "categories" && isOpening) newState.items = false;
      if (menuKey === "items" && isOpening) newState.categories = false;

      return newState;
    });
  };

  // --- Logout Handling ---
  const handleLogoutClick = () => {
    setIsLogoutModalOpen(true); // Open confirmation modal
  };

  const confirmLogout = async () => {
    setIsProcessingLogout(true);
    try {
      await logout(); // Call logout from AuthContext
      // Navigation is handled by ProtectedRoute/PublicRoute after state change
      console.log("Logout successful from Sidebar");
    } catch (error) {
      console.error("Sidebar logout failed:", error);
      // Optionally show an error message to the user (e.g., using a toast notification library)
    } finally {
      setIsProcessingLogout(false);
      setIsLogoutModalOpen(false); // Close modal regardless of outcome
    }
  };

  const cancelLogout = () => {
    setIsLogoutModalOpen(false);
  };

  // Prevent event propagation for submenu clicks
  const stopPropagation = (e) => e.stopPropagation();

  return (
    <>
      <aside className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
        {/* Header */}
        <div className="sidebar-header">
          <Link
            to="/admin/dashboard"
            className="sidebar-logo-link"
            title="Admin Dashboard"
          >
            {isCollapsed ? (
              <img
                src={logoIcon}
                alt="Icon"
                className="sidebar-logo-img icon-only"
              />
            ) : (
              <img src={logoImage} alt="Logo" className="sidebar-logo-img" />
            )}
            {!isCollapsed && (
              <span className="sidebar-logo-text">Fruit Bowl</span>
            )}
          </Link>
          {/* Toggle button inside sidebar - maybe remove if header has one? Or keep for consistency */}
          <button
            onClick={toggleSidebar}
            className="sidebar-toggle-btn sidebar-internal-toggle" // Different class if needed
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <FaBars />
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {/* --- Dashboard Section --- */}
          <div className="sidebar-section">
            {!isCollapsed && <h5 className="section-title">MAIN</h5>}
            <ul>
              <li>
                <NavLink
                  to="/admin/dashboard"
                  className={getNavLinkClass}
                  title="Dashboard"
                  end
                >
                  <FaTachometerAlt className="sidebar-icon" />
                  {!isCollapsed && <span>Dashboard</span>}
                </NavLink>
              </li>
            </ul>
          </div>

          {/* --- Management Section --- */}
          <div className="sidebar-section">
            {!isCollapsed && <h5 className="section-title">MANAGEMENT</h5>}
            <ul>
              {/* --- Products Parent --- */}
              <li
                className={`sidebar-parent-item ${
                  openMenus.products ? "open" : ""
                }`}
              >
                <div
                  className={`sidebar-link parent-link ${
                    location.pathname.startsWith("/admin/products")
                      ? "maybe-active"
                      : ""
                  }`} // Highlight if path startsWith
                  onClick={(e) => toggleMenu("products", e)}
                  title="Products"
                  role="button"
                  aria-expanded={openMenus.products}
                >
                  <FaStoreAlt className="sidebar-icon" />
                  {!isCollapsed && <span>Products</span>}
                  {!isCollapsed && (
                    <span className="chevron-icon">
                      {openMenus.products ? <FaChevronUp /> : <FaChevronDown />}
                    </span>
                  )}
                </div>
                <ul
                  className={`sidebar-submenu ${
                    openMenus.products ? "open" : ""
                  }`}
                  onClick={stopPropagation}
                >
                  {/* --- Categories Sub-section --- */}
                  <li
                    className={`submenu-section sidebar-parent-item ${
                      openMenus.categories ? "open" : ""
                    }`}
                  >
                    <div
                      className={`sidebar-sublink parent-link sub-parent-link ${
                        location.pathname.startsWith(
                          "/admin/products/categories"
                        )
                          ? "maybe-active"
                          : ""
                      }`}
                      onClick={(e) => toggleMenu("categories", e)}
                      title="Categories"
                      role="button"
                      aria-expanded={openMenus.categories}
                    >
                      <FaTag className="sidebar-icon sub-icon" />
                      {!isCollapsed && <span>Categories</span>}
                      {!isCollapsed && (
                        <span className="chevron-icon sub-chevron">
                          {openMenus.categories ? (
                            <FaChevronUp />
                          ) : (
                            <FaChevronDown />
                          )}
                        </span>
                      )}
                    </div>
                    <ul
                      className={`sidebar-submenu-deep ${
                        openMenus.categories ? "open" : ""
                      }`}
                    >
                      <li>
                        <NavLink
                          to="/admin/products/categories/list"
                          className={getDeepSubNavLinkClass}
                          title="Categories List"
                        >
                          <FaListAlt className="sidebar-icon sub-icon deep-icon" />
                          {!isCollapsed && <span>List Categories</span>}
                        </NavLink>
                      </li>
                      <li>
                        <NavLink
                          to="/admin/products/categories/new"
                          className={getDeepSubNavLinkClass}
                          title="New Category"
                        >
                          <FaPlusSquare className="sidebar-icon sub-icon deep-icon" />
                          {!isCollapsed && <span>New Category</span>}
                        </NavLink>
                      </li>
                    </ul>
                  </li>
                  {/* --- Items Sub-section --- */}
                  <li
                    className={`submenu-section sidebar-parent-item ${
                      openMenus.items ? "open" : ""
                    }`}
                  >
                    <div
                      className={`sidebar-sublink parent-link sub-parent-link ${
                        location.pathname.startsWith("/admin/products/items")
                          ? "maybe-active"
                          : ""
                      }`}
                      onClick={(e) => toggleMenu("items", e)}
                      title="Items"
                      role="button"
                      aria-expanded={openMenus.items}
                    >
                      <FaBoxes className="sidebar-icon sub-icon" />
                      {!isCollapsed && <span>Items</span>}
                      {!isCollapsed && (
                        <span className="chevron-icon sub-chevron">
                          {openMenus.items ? (
                            <FaChevronUp />
                          ) : (
                            <FaChevronDown />
                          )}
                        </span>
                      )}
                    </div>
                    <ul
                      className={`sidebar-submenu-deep ${
                        openMenus.items ? "open" : ""
                      }`}
                    >
                      <li>
                        <NavLink
                          to="/admin/products/items/list"
                          className={getDeepSubNavLinkClass}
                          title="Item List"
                        >
                          <FaListAlt className="sidebar-icon sub-icon deep-icon" />
                          {!isCollapsed && <span>List Items</span>}
                        </NavLink>
                      </li>
                      <li>
                        <NavLink
                          to="/admin/products/items/new"
                          className={getDeepSubNavLinkClass}
                          title="Add Item"
                        >
                          <FaPlusSquare className="sidebar-icon sub-icon deep-icon" />
                          {!isCollapsed && <span>Add Item</span>}
                        </NavLink>
                      </li>
                    </ul>
                  </li>
                </ul>
              </li>
              {/* --- End Products --- */}

              {/* Other Top Level Items */}
              <li>
                <NavLink
                  to="/admin/customers"
                  className={getNavLinkClass}
                  title="Customers"
                >
                  <FaUsers className="sidebar-icon" />
                  {!isCollapsed && <span>Customers</span>}
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin/transactions"
                  className={getNavLinkClass}
                  title="Transactions"
                >
                  <FaReceipt className="sidebar-icon" />
                  {!isCollapsed && <span>Transactions</span>}
                </NavLink>
              </li>
            </ul>
          </div>
        </nav>

        {/* Footer Section */}
        <div className="sidebar-footer">
          {user && (
            <div
              className="sidebar-user-info"
              title={user.email || user.username}
            >
              <div className={`user-avatar ${isCollapsed ? "collapsed" : ""}`}>
                {user.username ? user.username.charAt(0).toUpperCase() : "?"}
              </div>
              {!isCollapsed && (
                <div className="user-details">
                  <span className="user-greeting">Welcome,</span>
                  <span className="user-name">{user.username || "Admin"}</span>
                </div>
              )}
            </div>
          )}
          <button
            onClick={handleLogoutClick}
            className="logout-button"
            title="Logout"
          >
            <FaSignOutAlt className="sidebar-icon logout-icon" />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
      <ConfirmationModal
        isOpen={isLogoutModalOpen}
        onClose={cancelLogout}
        onConfirm={confirmLogout}
        title="Confirm Logout"
        message="Are you sure you want to log out of the Admin Panel?"
        confirmText="Logout"
        cancelText="Cancel"
        isLoading={isProcessingLogout}
        isDestructive={true}
      />
    </>
  );
};

export default Sidebar;
