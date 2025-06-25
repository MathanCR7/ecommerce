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

// --- Layout & Protection ---
import AdminLayout from "./Components/Layout/AdminLayout";
// Using the paths from your provided App.jsx file
import ProtectedRoute from "./Components/ProtectedRoute/ProtectedRoute";
import PublicRoute from "./Components/PublicRoute/PublicRoute";

// --- Page Components ---

// Public Pages
import LoginPage from "./Pages/Public/LoginPage";
import SignupPage from "./Pages/Public/SignupPage";
import NotFound from "./Pages/Public/NotFound";

// Core Admin Pages
import DashboardPage from "./Pages/Admin/Dashboard/DashboardPage";
import CustomerListPage from "./Pages/Admin/Customers/CustomerListPage";
import CustomerDetailsPage from "./Pages/Admin/Customers/CustomerDetailsPage"; // Added import for CustomerDetailsPage
import TransactionListPage from "./Pages/Admin/Transactions/TransactionListPage";

// Admin Product Pages
import CategoryListPage from "./Pages/Admin/Products/Categories/CategoryListPage";
import NewCategoryPage from "./Pages/Admin/Products/Categories/NewCategoryPage";
import EditCategoryPage from "./Pages/Admin/Products/Categories/EditCategoryPage";
import ItemListPage from "./Pages/Admin/Products/Items/ItemListPage";
import NewItemPage from "./Pages/Admin/Products/Items/NewItemPage";
import EditItemPage from "./Pages/Admin/Products/Items/EditItemPage";

// Admin Promotion Pages
import BannerPage from "./Pages/Admin/Promotions/BannerPage";
import CouponPage from "./Pages/Admin/Promotions/CouponPage";
import DiscountPage from "./Pages/Admin/Promotions/DiscountPage"; // Assuming DiscountPage handles Category/Item Discounts
import FlashSalePage from "./Pages/Admin/Promotions/FlashSalePage";
import NotificationPage from "./Pages/Admin/Promotions/NotificationPage";

// Admin Report Pages
import SalesReportPage from "./Pages/Admin/Reports/SalesReportPage";
import OrderReportPage from "./Pages/Admin/Reports/OrderReportPage"; // This is the general Order Report
import EarningReportPage from "./Pages/Admin/Reports/EarningReportPage";
import ExpenseReportPage from "./Pages/Admin/Reports/ExpenseReportPage";

// Admin Analytics Pages
import AnalyticsOverviewPage from "./Pages/Admin/Analytics/AnalyticsOverviewPage";
import AnalyticsRealtimePage from "./Pages/Admin/Analytics/AnalyticsRealtimePage";

// Admin Support Pages
import MessagePage from "./Pages/Admin/Support/MessagePage";

// Admin POS Pages
import PosPage from "./Pages/Admin/POS/PosPage";
// PosOrdersPage is moved to Order Management below, so we can remove this import IF it's not used elsewhere.
// Assuming it's NOT used elsewhere for now, as per the Sidebar change.
// import PosOrdersPage from "./Pages/Admin/POS/PosOrdersPage";

// --- Admin Order Management Pages ---
// You still need to create the files for these pages if they don't exist
import AllOrdersPage from "./Pages/Admin/Orders/AllOrdersPage";
import CanceledOrdersPage from "./Pages/Admin/Orders/CanceledOrdersPage";
import ConfirmedOrdersPage from "./Pages/Admin/Orders/ConfirmedOrdersPage";
import DeliveredOrdersPage from "./Pages/Admin/Orders/DeliveredOrdersPage";
import FailedOrdersPage from "./Pages/Admin/Orders/FailedOrdersPage";
import OutForDeliveryOrdersPage from "./Pages/Admin/Orders/OutForDeliveryOrdersPage";
import PendingOrdersPage from "./Pages/Admin/Orders/PendingOrdersPage";
import RefundedOrdersPage from "./Pages/Admin/Orders/RefundedOrdersPage";
import VerifyOfflinePaymentPage from "./Pages/Admin/Orders/VerifyOfflinePaymentPage";
// ADDED MISSING IMPORT FOR OrderDetailsPage
import OrderDetailsPage from "./Pages/Admin/Orders/OrderDetailsPage";

// --- Global Styles --- (Assuming imported in main.jsx or index.css)
function App() {
  return (
    <Router>
      <Routes>
        {/* --- Public Routes --- */}
        <Route element={<PublicRoute />}>
          {" "}
          {/* This wrapper handles logic for already authenticated users */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="signup" element={<SignupPage />} />
          {/* Catch-all Public 404 */}
          {/* Place this here if you want 404 pages ONLY for public paths */}
          {/* <Route path="*" element={<NotFound />} /> */}
        </Route>
        {/* --- Protected Admin Routes --- */}
        <Route element={<ProtectedRoute />}>
          {" "}
          {/* This wrapper handles logic for unauthenticated users trying to access admin */}
          {/* The ProtectedRoute should handle isAdmin check internally or receive isAdmin={true} prop */}
          <Route path="/admin" element={<AdminLayout />}>
            {" "}
            {/* AdminLayout provides the Sidebar and common structure */}
            {/* Default Admin Route */}
            <Route index element={<Navigate to="dashboard" replace />} />
            {/* --- Core Admin Pages --- */}
            <Route path="dashboard" element={<DashboardPage />} />
            {/* --- POS (Point of Sale) --- */}
            {/* Removed the 'orders' sub-route from here as it's consolidated */}
            <Route path="pos">
              <Route index element={<Navigate to="new" replace />} />{" "}
              {/* Default to new sale */}
              <Route path="new" element={<PosPage />} />
            </Route>
            {/* --- Order Management --- */}
            {/* Parent path is "orders" */}
            <Route path="orders">
              {/* Default for /admin/orders */}
              <Route index element={<Navigate to="all" replace />} />

              {/* Verify Offline Payment - path is relative to parent "orders" */}
              <Route
                path="verify-offline-payment"
                element={<VerifyOfflinePaymentPage />}
              />

              {/* Individual Status Pages - paths are relative to parent "orders" */}
              <Route path="all" element={<AllOrdersPage />} />
              {/* Corrected path: Removed "orders/" prefix */}
              <Route path="pending" element={<PendingOrdersPage />} />
              {/* Corrected path: Removed "orders/" prefix */}
              <Route path="confirmed" element={<ConfirmedOrdersPage />} />
              {/* Packaging link omitted as requested */}
              {/* Corrected path: Removed "orders/" prefix */}
              <Route
                path="out-for-delivery"
                element={<OutForDeliveryOrdersPage />}
              />
              {/* Corrected path: Removed "orders/" prefix */}
              <Route path="delivered" element={<DeliveredOrdersPage />} />
              {/* Corrected path: Removed "orders/" prefix */}
              <Route path="refunded" element={<RefundedOrdersPage />} />
              {/* Corrected path: Removed "orders/" prefix */}
              <Route path="failed" element={<FailedOrdersPage />} />
              {/* Corrected path: Removed "orders/" prefix */}
              <Route path="canceled" element={<CanceledOrdersPage />} />

              {/* Order Details Page - Parameterized route, path is relative to parent "orders" */}
              {/* Corrected path: Removed "orders/" prefix */}
              {/* PLACE THIS LAST within the nested <Route path="orders"> block */}
              <Route path=":id" element={<OrderDetailsPage />} />

              {/* Optional: Catch-all for invalid paths within /admin/orders */}
              {/* <Route path="*" element={<Navigate to="/admin/orders/all" replace />} /> */}
            </Route>
            {/* --- Product Management --- */}
            <Route path="products">
              <Route
                index
                element={<Navigate to="categories/list" replace />} // Default for /products
              />
              <Route path="categories">
                <Route index element={<Navigate to="list" replace />} />
                <Route path="list" element={<CategoryListPage />} />
                <Route path="new" element={<NewCategoryPage />} />
                <Route path="edit/:categoryId" element={<EditCategoryPage />} />
              </Route>
              <Route path="items">
                <Route index element={<Navigate to="list" replace />} />
                <Route path="list" element={<ItemListPage />} />
                <Route path="new" element={<NewItemPage />} />
                <Route path="edit/:itemId" element={<EditItemPage />} />
              </Route>
            </Route>
            {/* --- Other Management (Customers, Transactions are top-level in sidebar logic) --- */}
            {/* MODIFIED: Customer routes to include list and details */}
            <Route path="customers">
              <Route index element={<CustomerListPage />} />{" "}
              {/* /admin/customers shows the list */}
              <Route
                path=":customerId"
                element={<CustomerDetailsPage />}
              />{" "}
              {/* /admin/customers/:id shows details */}
            </Route>
            <Route path="transactions" element={<TransactionListPage />} />
            {/* --- Promotion Management --- */}
            <Route path="promotions">
              <Route index element={<Navigate to="banners" replace />} />
              <Route path="banners" element={<BannerPage />} />
              <Route path="coupons" element={<CouponPage />} />
              <Route path="category-discount" element={<DiscountPage />} />
              <Route path="flash-sale" element={<FlashSalePage />} />
              <Route path="notifications" element={<NotificationPage />} />
            </Route>
            {/* --- Report Management --- */}
            <Route path="reports">
              <Route index element={<Navigate to="sales" replace />} />
              <Route path="sales" element={<SalesReportPage />} />
              <Route path="orders" element={<OrderReportPage />} />{" "}
              {/* This is the general Order Report */}
              <Route path="earnings" element={<EarningReportPage />} />
              <Route path="expenses" element={<ExpenseReportPage />} />
            </Route>
            {/* --- Analytics Management --- */}
            <Route path="analytics">
              <Route index element={<Navigate to="overview" replace />} />
              <Route path="overview" element={<AnalyticsOverviewPage />} />
              <Route path="realtime" element={<AnalyticsRealtimePage />} />
            </Route>
            {/* --- Support Management --- */}
            <Route path="support">
              <Route index element={<Navigate to="messages" replace />} />
              <Route path="messages" element={<MessagePage />} />
            </Route>
            {/* Catch-all for invalid paths under /admin, redirects to admin dashboard */}
            {/* This must be AFTER all specific /admin/* routes */}
            <Route
              path="*"
              element={<Navigate to="/admin/dashboard" replace />}
            />
          </Route>{" "}
          {/* End AdminLayout */}
        </Route>{" "}
        {/* End ProtectedRoute wrapper for /admin */}
        {/* --- General Catch-all 404 Route for paths not matching / or /admin/* --- */}
        {/* This must be the absolute last route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
