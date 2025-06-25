// ecomm_website_client/src/allroutes/AllRoutes.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Cartpage from "../pages/cartpage/Cartpage";
import Homepage from "../pages/homepage/Homepage";
import Loginpage from "../pages/loginpage/Loginpage";
import Registrationpage from "../pages/registrationpage/Registrationpage";
import AllItemsPage from "../pages/all-itemspage/AllItemsPage";
import SingleItemPage from "../pages/item-details/SingleItemPage";
import ProfilePage from "../pages/profilepage/ProfilePage";
import ForgotPassword from "../components/ForgotPassword/ForgotPassword";
import ChangePassword from "../components/ChangePassword/ChangePassword";
import MyOrdersPage from "../pages/myorderspage/MyOrdersPage";
import OrderDetailPage from "../pages/orderdetailpage/OrderDetailPage";
import TrackOrderPage from "../pages/trackorderpage/TrackOrderPage";
import ProfileSettingsPage from "../pages/profilesettingspage/ProfileSettingsPage";
import ProfileAddressPage from "../pages/profileaddresspage/ProfileAddressPage";
import SupportPage from "../pages/supportpage/SupportPage";
import CouponsPage from "../pages/couponspage/CouponsPage";
import ReferEarnPage from "../pages/referearnpage/ReferEarnPage";
import NotificationsPage from "../pages/notificationspage/NotificationsPage";
import WalletPage from "../pages/walletpage/WalletPage";
import LoyaltyPointsPage from "../pages/loyaltypointspage/LoyaltyPointsPage";
import ContactUsPage from "../pages/contactuspage/ContactUsPage";
import PrivacyPolicyPage from "../pages/privacypolicypage/PrivacyPolicyPage";
import TermsAndConditionsPage from "../pages/termsandconditionspage/TermsAndConditionsPage";
import AboutUsPage from "../pages/aboutuspage/AboutUsPage";
import AddEditAddressPage from "../pages/addeditaddresspage/AddEditAddressPage";
import ErrorNotFound from "../components/ErrorNotFoundPage/ErrorNotFound";
import ScrollToTop from "../components/ScrollToTop";
import ProtectedRoute from "./ProtectedRoute";
import CheckoutPage from "../pages/checkoutpage/CheckoutPage";
import CategoryPage from "../pages/categorypage/CategoryPage";
import WishlistPage from "../pages/wishlistpage/WishlistPage";
import TopLikedItemsPage from "../pages/toplikeditemspage/TopLikedItemsPage";

// Removed cartItems, addToCart, deleteFromCart, checkOut, removeFromCart, updateItemQuantity
// allItemsData is still received from App.jsx as the source of global item data
const AllRoutes = ({ featuredItems, shopItems, allItemsData }) => {
  // Receive only item data props
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* --- Public Routes --- */}
        <Route
          path="/"
          // Homepage still needs featuredItems and shopItems
          // addToCart prop can likely be removed from Homepage unless its internal components don't use useCart
          element={
            <Homepage featuredItems={featuredItems} shopItems={shopItems} />
          }
        />
        <Route path="/login" element={<Loginpage />} />
        <Route path="/registration" element={<Registrationpage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route
          path="/all-items"
          // AllItemsPage should now use hooks directly
          element={<AllItemsPage />} // Removed props
        />

        {/* --- CATEGORY ROUTES --- */}
        <Route
          path="/category/:categorySlug"
          // CategoryPage and its children should now use hooks directly
          element={<CategoryPage />} // Removed props
        />
        <Route
          path="/categories"
          // CategoryPage should now use hooks directly
          element={<CategoryPage />} // Removed props
        />

        <Route
          path="/item/:itemId"
          // SingleItemPage should now use hooks directly
          // allItemsData is still needed to potentially find item details if API call fails or for quick lookups
          element={<SingleItemPage allItemsData={allItemsData} />} // Removed cart/wishlist props
        />
        {/* WISHLIST ROUTE (Protected) */}
        <Route
          path="/wishlist"
          element={
            <ProtectedRoute>
              {/* WishlistPage should now use hooks directly */}
              <WishlistPage
                allItemsData={allItemsData} // Still potentially useful as a fallback or source
              />
            </ProtectedRoute>
          }
        />
        {/* TOP LIKED ITEMS ROUTE (Public) */}
        <Route
          path="/top-liked-items"
          // TopLikedItemsPage should now use hooks directly
          element={<TopLikedItemsPage />} // Removed props
        />

        <Route path="/support" element={<SupportPage />} />
        <Route path="/contact-us" element={<ContactUsPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route
          path="/terms-and-conditions"
          element={<TermsAndConditionsPage />}
        />
        <Route path="/about-us" element={<AboutUsPage />} />

        {/* --- Protected Routes (Require Login) --- */}
        <Route
          path="/cart"
          element={
            <ProtectedRoute>
              {/* Cartpage should now use hooks directly */}
              <Cartpage /> {/* Removed props */}
            </ProtectedRoute>
          }
        />
        <Route
          path="/checkout"
          element={
            <ProtectedRoute>
              {/* CheckoutPage should now use hooks directly */}
              <CheckoutPage
                allItemsData={allItemsData} // Still potentially useful
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/change-password"
          element={
            <ProtectedRoute>
              <ChangePassword />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-orders"
          element={
            <ProtectedRoute>
              <MyOrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-orders/:orderId"
          element={
            <ProtectedRoute>
              <OrderDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/track-order"
          element={
            <ProtectedRoute>
              <TrackOrderPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/settings"
          element={
            <ProtectedRoute>
              <ProfileSettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/addresses"
          element={
            <ProtectedRoute>
              <ProfileAddressPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/addresses/new"
          element={
            <ProtectedRoute>
              <AddEditAddressPage isEditing={false} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/addresses/edit/:addressId"
          element={
            <ProtectedRoute>
              <AddEditAddressPage isEditing={true} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/support"
          element={
            <ProtectedRoute>
              <SupportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/contact-us"
          element={
            <ProtectedRoute>
              <ContactUsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/privacy-policy"
          element={
            <ProtectedRoute>
              <PrivacyPolicyPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/terms-and-conditions"
          element={
            <ProtectedRoute>
              <TermsAndConditionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/about-us"
          element={
            <ProtectedRoute>
              <AboutUsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/coupons"
          element={
            <ProtectedRoute>
              <CouponsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/refer-earn"
          element={
            <ProtectedRoute>
              <ReferEarnPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/wallet"
          element={
            <ProtectedRoute>
              <WalletPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/loyalty"
          element={
            <ProtectedRoute>
              <LoyaltyPointsPage />
            </ProtectedRoute>
          }
        />

        {/* --- 404 Catch-all Route --- */}
        <Route path="*" element={<ErrorNotFound />} />
      </Routes>
    </>
  );
};

export default AllRoutes;
