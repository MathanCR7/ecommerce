// ========================================================================
// FILE: client/src/App.jsx
// ========================================================================

import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useAuth } from "./Context/AuthContext"; // Import useAuth (not typically needed here, but good practice)

// --- Layout & Protection ---
import AdminLayout from "./Components/Layout/AdminLayout"; // Main Admin Layout component
import ProtectedRoute from "./Components/ProtectedRoute/ProtectedRoute"; // Protects admin routes
import PublicRoute from "./Components/PublicRoute/PublicRoute"; // Protects public routes (redirects if logged in)
// LoadingSpinner is now handled within AuthContext/ProtectedRoute/PublicRoute

// --- Page Components ---

// Public Pages
import LoginPage from "./Pages/Public/LoginPage";
import SignupPage from "./Pages/Public/SignupPage";
import NotFound from "./Pages/Public/NotFound"; // 404 Page

// Core Admin Pages (Rendered within AdminLayout)
import DashboardPage from "./Pages/Admin/Dashboard/DashboardPage";
import CustomerListPage from "./Pages/Admin/Customers/CustomerListPage"; // Placeholder page
import TransactionListPage from "./Pages/Admin/Transactions/TransactionListPage"; // Placeholder page

// Admin Product Pages (Rendered within AdminLayout)
import CategoryListPage from "./Pages/Admin/Products/Categories/CategoryListPage";
import NewCategoryPage from "./Pages/Admin/Products/Categories/NewCategoryPage";
import EditCategoryPage from "./Pages/Admin/Products/Categories/EditCategoryPage";
import ItemListPage from "./Pages/Admin/Products/Items/ItemListPage";
import NewItemPage from "./Pages/Admin/Products/Items/NewItemPage"; // Renamed from AddItemPage
import EditItemPage from "./Pages/Admin/Products/Items/EditItemPage";

// --- Global Styles ---
// Imported in main.jsx

function App() {
  // Authentication state (user, isAuthenticated, isLoading) is managed globally
  // by AuthProvider and accessed via the useAuth() hook within components
  // that need it (e.g., Sidebar, Header, specific pages, Protected/PublicRoute).

  return (
    <Router>
      <Routes>
        {/* --- Public Routes (Login/Signup) --- */}
        {/* PublicRoute redirects authenticated users away from these pages */}
        <Route path="/" element={<PublicRoute />}>
          {/* Redirect root path "/" to the login page by default */}
          <Route index element={<Navigate to="/login" replace />} />
          {/* Login Page Route */}
          <Route path="login" element={<LoginPage />} />
          {/* Signup Page Route */}
          <Route path="signup" element={<SignupPage />} />
        </Route>
        {/* --- Protected Admin Routes --- */}
        {/* ProtectedRoute ensures only authenticated users can access /admin/* */}
        {/* It also handles the loading state during initial auth check */}
        <Route path="/admin" element={<ProtectedRoute />}>
          {/* AdminLayout provides the common structure (Sidebar, Header) */}
          {/* Child routes defined within AdminLayout will be rendered in its <Outlet> */}
          <Route element={<AdminLayout />}>
            {/* Redirect base /admin path to the dashboard */}
            <Route index element={<Navigate to="dashboard" replace />} />
            {/* --- Core Admin Pages --- */}
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="customers" element={<CustomerListPage />} />
            <Route path="transactions" element={<TransactionListPage />} />
            {/* --- Product Management Routes (Nested Structure) --- */}
            <Route path="products">
              {" "}
              {/* Base path for products */}
              {/* Redirect /admin/products to categories list by default */}
              <Route
                index
                element={<Navigate to="categories/list" replace />}
              />
              {/* Category Routes */}
              <Route path="categories">
                {/* Redirect /admin/products/categories to list */}
                <Route index element={<Navigate to="list" replace />} />
                <Route path="list" element={<CategoryListPage />} />
                <Route path="new" element={<NewCategoryPage />} />
                {/* Route parameter :categoryId for editing */}
                <Route path="edit/:categoryId" element={<EditCategoryPage />} />
              </Route>
              {/* Item Routes */}
              <Route path="items">
                {/* Redirect /admin/products/items to list */}
                <Route index element={<Navigate to="list" replace />} />
                <Route path="list" element={<ItemListPage />} />
                <Route path="new" element={<NewItemPage />} />
                {/* Route parameter :itemId for editing */}
                <Route path="edit/:itemId" element={<EditItemPage />} />
              </Route>
            </Route>{" "}
            {/* End /admin/products */}
            {/* --- Add other admin sections/routes here --- */}
            {/* Example: <Route path="users" element={<UserListPage />} /> */}
            {/* Example: <Route path="settings" element={<SettingsPage />} /> */}
            {/* Catch-all for any invalid paths under /admin */}
            {/* Redirects to the admin dashboard */}
            <Route
              path="*"
              element={<Navigate to="/admin/dashboard" replace />}
            />
          </Route>{" "}
          {/* End AdminLayout Wrapping */}
        </Route>{" "}
        {/* End ProtectedRoute Wrapping /admin */}
        {/* --- General Catch-all 404 Route --- */}
        {/* This should always be the LAST defined route */}
        {/* It catches any path that wasn't matched by the routes above */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
