// ========================================================================
// FILE: client/src/Components/Layout/Sidebar.jsx
// ========================================================================

import React, { useState, useEffect } from "react";
import { NavLink, useLocation, Link } from "react-router-dom";
import {
  // Original Icons
  FaTachometerAlt, // Dashboard
  FaUsers, // Customers
  FaReceipt, // Transactions
  FaSignOutAlt, // Logout
  FaBars, // Toggle
  FaListAlt, // List (Category/Item)
  FaPlusSquare, // New (Category/Item)
  FaBoxes, // Items
  FaChevronDown, // Dropdown Arrow
  FaChevronUp, // (Not used, rotation handled by CSS)
  FaStoreAlt, // Products (Top Level)
  FaTag, // Categories

  // Icons for new sections (based on image/logic)
  FaSearch, // Search Bar
  FaImage, // Banner (Promotions)
  FaGift, // Coupons (Promotions)
  FaPercentage, // Category Discount (Promotions)
  FaClock, // Flash Sale (Promotions)
  FaBell, // Send Notifications (Promotions)
  FaEnvelope, // Messages (Support)
  FaChartBar, // Sales Report (Reports)
  FaClipboardList, // Order Report (Reports) - Icon also used for POS Orders before move
  FaDollarSign, // Earning Report (Reports)
  FaFileAlt, // Expense Report (Reports)
  FaChartPie, // Analytics (Parent)

  // Icons for POS & Order Management
  FaCashRegister, // New Sale (POS)
  FaShoppingCart, // Orders (Parent in Order Management)
  FaOpencart, // Verify Offline Payment (Order Management - icon from image)

  // Note: Icons for status sub-items not typically shown, using text labels.
} from "react-icons/fa";
import { useAuth } from "../../Context/AuthContext";
import ConfirmationModal from "../Common/ConfirmationModal"; // Assuming path is correct
import "./Sidebar.css"; // Using the dark theme CSS provided
import logoImage from "../../Assets/favicon.png"; // Main logo
import logoIcon from "../../Assets/favicon.png"; // Icon for collapsed state

const Sidebar = ({ isCollapsed, toggleSidebar }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  // State for controlling menu open/closed status
  const [openMenus, setOpenMenus] = useState({
    products: false,
    categories: false,
    items: false,
    analytics: false,
    orders: false, // <-- Added state for Orders (Order Management)
  });

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isProcessingLogout, setIsProcessingLogout] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const currentPath = location.pathname;
    const checkPath = (prefixes) =>
      prefixes.some((prefix) => currentPath.startsWith(prefix));

    const isProductsPath = checkPath(["/admin/products"]);
    const isAnalyticsPath = checkPath(["/admin/analytics"]);
    const isCategoryPath =
      isProductsPath && checkPath(["/admin/products/categories"]);
    const isItemPath = isProductsPath && checkPath(["/admin/products/items"]);
    const isOrdersPath = checkPath(["/admin/orders"]); // <-- Added check for Orders section

    setOpenMenus((prev) => ({
      ...prev,
      products: isProductsPath,
      categories: isCategoryPath,
      items: isItemPath,
      analytics: isAnalyticsPath,
      orders: isOrdersPath, // <-- Set state based on path
    }));
  }, [location.pathname]);

  const getNavLinkClass = ({ isActive }) =>
    `sidebar-link ${isActive ? "active-link" : ""}`;
  const getSubNavLinkClass = ({ isActive }) =>
    `sidebar-sublink ${isActive ? "active-sublink" : ""}`;
  const getDeepSubNavLinkClass = ({ isActive }) =>
    `sidebar-sublink deep-sublink ${isActive ? "active-deep-sublink" : ""}`;
  const getParentMaybeActiveClass = (pathPrefixes) => {
    const isActive = pathPrefixes.some((prefix) =>
      location.pathname.startsWith(prefix)
    );
    return isActive ? "maybe-active" : "";
  };

  const toggleMenu = (menuKey, e) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenMenus((prev) => {
      const newState = { ...prev };
      const isOpening = !prev[menuKey];
      newState[menuKey] = isOpening;

      // Optional: Close child menus if parent is being closed
      if (menuKey === "products" && !isOpening) {
        newState.categories = false;
        newState.items = false;
      }
      // No child menus under orders yet needing closing logic

      return newState;
    });
  };

  const handleLogoutClick = () => {
    setIsLogoutModalOpen(true);
  };

  const confirmLogout = async () => {
    setIsProcessingLogout(true);
    try {
      await logout();
    } catch (error) {
      console.error("Sidebar logout failed:", error);
    } finally {
      setIsProcessingLogout(false);
      setIsLogoutModalOpen(false);
    }
  };

  const cancelLogout = () => {
    setIsLogoutModalOpen(false);
  };

  const stopPropagation = (e) => e.stopPropagation();

  const shouldShow = (text) => {
    if (!searchTerm) return true;
    return text.toLowerCase().includes(searchTerm.toLowerCase());
  };

  return (
    <>
      <aside className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
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
          <button
            onClick={toggleSidebar}
            className="sidebar-toggle-btn sidebar-internal-toggle"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <FaBars />
          </button>
        </div>
        <div className="sidebar-search">
          <span className="search-icon-wrapper">
            <FaSearch />
          </span>
          {!isCollapsed && (
            <input
              type="text"
              placeholder="Search Menu..."
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search sidebar menu"
            />
          )}
        </div>
        <nav className="sidebar-nav">
          {/* --- MAIN Section --- */}
          {shouldShow("main dashboard") && (
            <div className="sidebar-section">
              {!isCollapsed && <h5 className="section-title">MAIN</h5>}
              <ul>
                {shouldShow("dashboard") && (
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
                )}
              </ul>
            </div>
          )}

          {/* --- POS Section --- */}
          {shouldShow("pos new sale") && (
            <div className="sidebar-section">
              {!isCollapsed && <h5 className="section-title">POS</h5>}
              <ul>
                {shouldShow("new sale") && (
                  <li>
                    <NavLink
                      to="/admin/pos/new"
                      className={getNavLinkClass}
                      title="New Sale"
                    >
                      <FaCashRegister className="sidebar-icon" />
                      {!isCollapsed && <span>New Sale</span>}
                    </NavLink>
                  </li>
                )}
                {/* The 'Orders' link previously here has been moved to 'Order Management' */}
              </ul>
            </div>
          )}

          {/* --- ORDER MANAGEMENT Section --- */}
          {shouldShow(
            "order management verify offline payment orders all pending confirmed out for delivery delivered refunded failed canceled"
          ) && (
            <div className="sidebar-section">
              {!isCollapsed && (
                <h5 className="section-title">ORDER MANAGEMENT</h5>
              )}
              <ul>
                {/* Verify Offline Payment */}
                {shouldShow("verify offline payment") && (
                  <li>
                    <NavLink
                      to="/admin/orders/verify-offline-payment"
                      className={getNavLinkClass}
                      title="Verify Offline Payment"
                    >
                      <FaOpencart className="sidebar-icon" />{" "}
                      {/* Using the basket icon from the image */}
                      {!isCollapsed && <span>Verify Offline Payment</span>}
                    </NavLink>
                  </li>
                )}
                {/* Orders Parent (Collapsible) */}
                {shouldShow(
                  "orders all pending confirmed out for delivery delivered refunded failed canceled"
                ) && (
                  <li
                    className={`sidebar-parent-item ${
                      openMenus.orders ? "open" : ""
                    }`}
                  >
                    <div
                      className={`sidebar-link parent-link ${getParentMaybeActiveClass(
                        ["/admin/orders"] // Match any path starting with /admin/orders
                      )}`}
                      onClick={(e) => toggleMenu("orders", e)}
                      title="Orders"
                      role="button"
                      aria-expanded={openMenus.orders}
                    >
                      <FaShoppingCart className="sidebar-icon" />{" "}
                      {/* Using the shopping cart icon */}
                      {!isCollapsed && <span>Orders</span>}
                      {!isCollapsed && (
                        <span
                          className={`chevron-icon ${
                            openMenus.orders ? "rotated" : ""
                          }`}
                        >
                          <FaChevronDown />
                        </span>
                      )}
                    </div>
                    <ul
                      className={`sidebar-submenu ${
                        openMenus.orders ? "open" : ""
                      }`}
                      onClick={stopPropagation}
                    >
                      {/* Orders Status Sub-links */}
                      {shouldShow("all") && (
                        <li>
                          <NavLink
                            to="/admin/orders" // Path for All Orders
                            className={getSubNavLinkClass}
                            title="All Orders"
                            end // Use end to match exactly /admin/orders
                          >
                            {/* No icon shown in image */}
                            {!isCollapsed && <span>All</span>}
                            {/* You would add a count bubble here if needed, e.g., <span className="count-bubble">92</span> */}
                          </NavLink>
                        </li>
                      )}
                      {shouldShow("pending") && (
                        <li>
                          <NavLink
                            to="/admin/orders/pending"
                            className={getSubNavLinkClass}
                            title="Pending Orders"
                          >
                            {/* No icon shown in image */}
                            {!isCollapsed && <span>Pending</span>}
                            {/* You would add a count bubble here if needed, e.g., <span className="count-bubble">20</span> */}
                          </NavLink>
                        </li>
                      )}
                      {shouldShow("confirmed") && (
                        <li>
                          <NavLink
                            to="/admin/orders/confirmed"
                            className={getSubNavLinkClass}
                            title="Confirmed Orders"
                          >
                            {/* No icon shown in image */}
                            {!isCollapsed && <span>Confirmed</span>}
                            {/* You would add a count bubble here if needed, e.g., <span className="count-bubble">4</span> */}
                          </NavLink>
                        </li>
                      )}
                      {/* --- 'Packaging' link is intentionally omitted as requested --- */}
                      {shouldShow("out for delivery") && (
                        <li>
                          <NavLink
                            to="/admin/orders/out-for-delivery"
                            className={getSubNavLinkClass}
                            title="Out For Delivery Orders"
                          >
                            {/* No icon shown in image */}
                            {!isCollapsed && <span>Out For Delivery</span>}
                            {/* You would add a count bubble here if needed, e.g., <span className="count-bubble">2</span> */}
                          </NavLink>
                        </li>
                      )}
                      {shouldShow("delivered") && (
                        <li>
                          <NavLink
                            to="/admin/orders/delivered"
                            className={getSubNavLinkClass}
                            title="Delivered Orders"
                          >
                            {/* No icon shown in image */}
                            {!isCollapsed && <span>Delivered</span>}
                            {/* You would add a count bubble here if needed, e.g., <span className="count-bubble">25</span> */}
                          </NavLink>
                        </li>
                      )}
                      {shouldShow("refunded") && (
                        <li>
                          <NavLink
                            to="/admin/orders/refunded"
                            className={getSubNavLinkClass}
                            title="Refunded Orders"
                          >
                            {/* No icon shown in image */}
                            {!isCollapsed && <span>Refunded</span>}
                            {/* You would add a count bubble here if needed, e.g., <span className="count-bubble">1</span> */}
                          </NavLink>
                        </li>
                      )}
                      {shouldShow("failed") && (
                        <li>
                          <NavLink
                            to="/admin/orders/failed"
                            className={getSubNavLinkClass}
                            title="Failed Orders"
                          >
                            {/* No icon shown in image */}
                            {!isCollapsed && <span>Failed</span>}
                            {/* You would add a count bubble here if needed, e.g., <span className="count-bubble">2</span> */}
                          </NavLink>
                        </li>
                      )}
                      {shouldShow("canceled") && (
                        <li>
                          <NavLink
                            to="/admin/orders/canceled"
                            className={getSubNavLinkClass}
                            title="Canceled Orders"
                          >
                            {/* No icon shown in image */}
                            {!isCollapsed && <span>Canceled</span>}
                            {/* You would add a count bubble here if needed, e.g., <span className="count-bubble">10</span> */}
                          </NavLink>
                        </li>
                      )}
                    </ul>
                  </li>
                )}
                {/* --- End Orders Parent --- */}
              </ul>
            </div>
          )}

          {/* --- PRODUCT MANAGEMENT Section (Renamed from MANAGEMENT for clarity) --- */}
          {shouldShow("product management products categories items") && (
            <div className="sidebar-section">
              {!isCollapsed && (
                <h5 className="section-title">PRODUCT MANAGEMENT</h5>
              )}
              <ul>
                {/* --- Products Parent --- */}
                {shouldShow("products categories items") && (
                  <li
                    className={`sidebar-parent-item ${
                      openMenus.products ? "open" : ""
                    }`}
                  >
                    <div
                      className={`sidebar-link parent-link ${getParentMaybeActiveClass(
                        ["/admin/products"]
                      )}`}
                      onClick={(e) => toggleMenu("products", e)}
                      title="Products"
                      role="button"
                      aria-expanded={openMenus.products}
                    >
                      <FaStoreAlt className="sidebar-icon" />
                      {!isCollapsed && <span>Products</span>}
                      {!isCollapsed && (
                        <span
                          className={`chevron-icon ${
                            openMenus.products ? "rotated" : ""
                          }`}
                        >
                          <FaChevronDown />
                        </span>
                      )}
                    </div>
                    <ul
                      className={`sidebar-submenu ${
                        openMenus.products ? "open" : ""
                      }`}
                      onClick={stopPropagation}
                    >
                      {/* Categories Sub-section */}
                      {shouldShow("categories list new category") && (
                        <li
                          className={`submenu-parent-item ${
                            openMenus.categories ? "open" : ""
                          }`}
                        >
                          <div
                            className={`sidebar-sublink parent-link sub-parent-link ${getParentMaybeActiveClass(
                              ["/admin/products/categories"]
                            )}`}
                            onClick={(e) => toggleMenu("categories", e)}
                            title="Categories"
                            role="button"
                            aria-expanded={openMenus.categories}
                          >
                            <FaTag className="sidebar-icon sub-icon" />
                            {!isCollapsed && <span>Categories</span>}
                            {!isCollapsed && (
                              <span
                                className={`chevron-icon sub-chevron ${
                                  openMenus.categories ? "rotated" : ""
                                }`}
                              >
                                <FaChevronDown />
                              </span>
                            )}
                          </div>
                          <ul
                            className={`sidebar-submenu-deep ${
                              openMenus.categories ? "open" : ""
                            }`}
                          >
                            {shouldShow("list categories") && (
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
                            )}
                            {shouldShow("new category") && (
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
                            )}
                          </ul>
                        </li>
                      )}
                      {/* Items Sub-section */}
                      {shouldShow("items list add item") && (
                        <li
                          className={`submenu-parent-item ${
                            openMenus.items ? "open" : ""
                          }`}
                        >
                          <div
                            className={`sidebar-sublink parent-link sub-parent-link ${getParentMaybeActiveClass(
                              ["/admin/products/items"]
                            )}`}
                            onClick={(e) => toggleMenu("items", e)}
                            title="Items"
                            role="button"
                            aria-expanded={openMenus.items}
                          >
                            <FaBoxes className="sidebar-icon sub-icon" />
                            {!isCollapsed && <span>Items</span>}
                            {!isCollapsed && (
                              <span
                                className={`chevron-icon sub-chevron ${
                                  openMenus.items ? "rotated" : ""
                                }`}
                              >
                                <FaChevronDown />
                              </span>
                            )}
                          </div>
                          <ul
                            className={`sidebar-submenu-deep ${
                              openMenus.items ? "open" : ""
                            }`}
                          >
                            {shouldShow("list items") && (
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
                            )}
                            {shouldShow("add item") && (
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
                            )}
                          </ul>
                        </li>
                      )}
                    </ul>
                  </li>
                )}
                {/* --- End Products --- */}
              </ul>
            </div>
          )}

          {/* --- OTHER MANAGEMENT (Customers, Transactions) --- */}
          {shouldShow("management customers transactions") && (
            <div className="sidebar-section">
              {!isCollapsed && <h5 className="section-title">MANAGEMENT</h5>}
              <ul>
                {shouldShow("customers") && (
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
                )}
                {shouldShow("transactions") && (
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
                )}
              </ul>
            </div>
          )}

          {/* --- Promotion Management Section --- */}
          {shouldShow(
            "promotion management banner coupons discount flash sale notifications"
          ) && (
            <div className="sidebar-section">
              {!isCollapsed && (
                <h5 className="section-title">PROMOTION MANAGEMENT</h5>
              )}
              <ul>
                {shouldShow("banner") && (
                  <li>
                    <NavLink
                      to="/admin/promotions/banners"
                      className={getNavLinkClass}
                      title="Banners"
                    >
                      <FaImage className="sidebar-icon" />
                      {!isCollapsed && <span>Banner</span>}
                    </NavLink>
                  </li>
                )}
                {shouldShow("coupons") && (
                  <li>
                    <NavLink
                      to="/admin/promotions/coupons"
                      className={getNavLinkClass}
                      title="Coupons"
                    >
                      <FaGift className="sidebar-icon" />
                      {!isCollapsed && <span>Coupons</span>}
                    </NavLink>
                  </li>
                )}
                {shouldShow("category discount") && (
                  <li>
                    <NavLink
                      to="/admin/promotions/category-discount"
                      className={getNavLinkClass}
                      title="Category Discount"
                    >
                      <FaPercentage className="sidebar-icon" />
                      {!isCollapsed && <span>Category Discount</span>}
                    </NavLink>
                  </li>
                )}
                {shouldShow("flash sale") && (
                  <li>
                    <NavLink
                      to="/admin/promotions/flash-sale"
                      className={getNavLinkClass}
                      title="Flash Sale"
                    >
                      <FaClock className="sidebar-icon" />
                      {!isCollapsed && <span>Flash Sale</span>}
                    </NavLink>
                  </li>
                )}
                {shouldShow("send notifications") && (
                  <li>
                    <NavLink
                      to="/admin/promotions/notifications"
                      className={getNavLinkClass}
                      title="Send Notifications"
                    >
                      <FaBell className="sidebar-icon" />
                      {!isCollapsed && <span>Send Notifications</span>}
                    </NavLink>
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* --- Help & Support Section --- */}
          {shouldShow("help support messages") && (
            <div className="sidebar-section">
              {!isCollapsed && (
                <h5 className="section-title">HELP & SUPPORT</h5>
              )}
              <ul>
                {shouldShow("messages") && (
                  <li>
                    <NavLink
                      to="/admin/support/messages"
                      className={getNavLinkClass}
                      title="Messages"
                    >
                      <FaEnvelope className="sidebar-icon" />
                      {!isCollapsed && <span>Messages</span>}
                    </NavLink>
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* --- Report and Analytics Section --- */}
          {shouldShow(
            "report analytics sales order earning expense overview realtime"
          ) && (
            <div className="sidebar-section">
              {!isCollapsed && (
                <h5 className="section-title">REPORT AND ANALYTICS</h5>
              )}
              <ul>
                {shouldShow("sales report") && (
                  <li>
                    <NavLink
                      to="/admin/reports/sales"
                      className={getNavLinkClass}
                      title="Sales Report"
                    >
                      <FaChartBar className="sidebar-icon" />
                      {!isCollapsed && <span>Sales Report</span>}
                    </NavLink>
                  </li>
                )}
                {shouldShow("order report") && ( // This is the existing Order Report, distinct from the Order Management list
                  <li>
                    <NavLink
                      to="/admin/reports/orders"
                      className={getNavLinkClass}
                      title="Order Report"
                    >
                      <FaClipboardList className="sidebar-icon" />
                      {!isCollapsed && <span>Order Report</span>}
                    </NavLink>
                  </li>
                )}
                {shouldShow("earning report") && (
                  <li>
                    <NavLink
                      to="/admin/reports/earnings"
                      className={getNavLinkClass}
                      title="Earning Report"
                    >
                      <FaDollarSign className="sidebar-icon" />
                      {!isCollapsed && <span>Earning Report</span>}
                    </NavLink>
                  </li>
                )}
                {shouldShow("expense report") && (
                  <li>
                    <NavLink
                      to="/admin/reports/expenses"
                      className={getNavLinkClass}
                      title="Expense Report"
                    >
                      <FaFileAlt className="sidebar-icon" />
                      {!isCollapsed && <span>Expense Report</span>}
                    </NavLink>
                  </li>
                )}
                {/* --- Analytics Parent --- */}
                {shouldShow("analytics overview realtime") && (
                  <li
                    className={`sidebar-parent-item ${
                      openMenus.analytics ? "open" : ""
                    }`}
                  >
                    <div
                      className={`sidebar-link parent-link ${getParentMaybeActiveClass(
                        ["/admin/analytics"]
                      )}`}
                      onClick={(e) => toggleMenu("analytics", e)}
                      title="Analytics"
                      role="button"
                      aria-expanded={openMenus.analytics}
                    >
                      <FaChartPie className="sidebar-icon" />
                      {!isCollapsed && <span>Analytics</span>}
                      {!isCollapsed && (
                        <span
                          className={`chevron-icon ${
                            openMenus.analytics ? "rotated" : ""
                          }`}
                        >
                          <FaChevronDown />
                        </span>
                      )}
                    </div>
                    <ul
                      className={`sidebar-submenu ${
                        openMenus.analytics ? "open" : ""
                      }`}
                      onClick={stopPropagation}
                    >
                      {shouldShow("overview") && (
                        <li>
                          <NavLink
                            to="/admin/analytics/overview"
                            className={getSubNavLinkClass}
                            title="Overview"
                          >
                            {/* No icon for these sub-items based on original styling */}
                            {!isCollapsed && <span>Overview</span>}
                          </NavLink>
                        </li>
                      )}
                      {shouldShow("realtime") && (
                        <li>
                          <NavLink
                            to="/admin/analytics/realtime"
                            className={getSubNavLinkClass}
                            title="Realtime"
                          >
                            {!isCollapsed && <span>Realtime</span>}
                          </NavLink>
                        </li>
                      )}
                    </ul>
                  </li>
                )}
              </ul>
            </div>
          )}
        </nav>{" "}
        {/* End sidebar-nav */}
        {/* Footer Section */}
        <div className="sidebar-footer">
          {user && (
            <div
              className="sidebar-user-info"
              title={user?.email || user?.username || "Admin User"}
            >
              <div className={`user-avatar ${isCollapsed ? "collapsed" : ""}`}>
                {user?.username ? user.username.charAt(0).toUpperCase() : "A"}
              </div>
              {!isCollapsed && (
                <div className="user-details">
                  <span className="user-greeting">Welcome,</span>
                  <span className="user-name">{user?.username || "Admin"}</span>
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
