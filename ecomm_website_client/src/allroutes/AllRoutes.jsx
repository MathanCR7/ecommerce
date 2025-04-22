import React from "react";
import { Routes, Route } from "react-router-dom";
import Cartpage from "../pages/cartpage/Cartpage";
import Homepage from "../pages/homepage/Homepage";
import Loginpage from "../pages/loginpage/Loginpage";
import Registrationpage from "../pages/registrationpage/Registrationpage";
import Allproductspage from "../pages/all-productspage/Allproductspage";
import Singleproductpage from "../pages/product-details/Singleproductpage";
import ProfilePage from "../pages/profilepage/ProfilePage"; // Import ProfilePage
import ErrorNotFound from "../components/ErrorNotFoundPage/ErrorNotFound";
import ScrollToTop from "../components/ScrollToTop";
import ProtectedRoute from "./ProtectedRoute"; // Import ProtectedRoute

const AllRoutes = ({
  // Destructure props passed from App.jsx
  productItems,
  cartItems,
  addToCart,
  shopItems,
  deleteFromCart,
  checkOut,
  removeFromCart,
  allProductsData,
}) => {
  return (
    <>
      <ScrollToTop /> {/* Ensures navigation scrolls to top */}
      <Routes>
        {/* --- Public Routes --- */}
        <Route
          path="/"
          element={
            <Homepage
              // Pass necessary props
              productItems={productItems}
              addToCart={addToCart}
              shopItems={shopItems}
            />
          }
        />
        <Route path="/login" element={<Loginpage />} />
        <Route path="/registration" element={<Registrationpage />} />
        <Route
          path="/all-products"
          element={
            <Allproductspage
              allProductsData={allProductsData}
              addToCart={addToCart}
            />
          }
        />
        <Route
          path="/all-products/:id" // Route for single product details
          element={
            <Singleproductpage
              allProductsData={allProductsData} // May need adjustment based on data fetching
              addToCart={addToCart}
            />
          }
        />

        {/* --- Protected Routes (Require Login) --- */}
        <Route
          path="/cart"
          element={
            <ProtectedRoute>
              {" "}
              {/* Wrap component with ProtectedRoute */}
              <Cartpage
                cartItems={cartItems}
                addToCart={addToCart}
                deleteFromCart={deleteFromCart}
                checkOut={checkOut}
                removeFromCart={removeFromCart}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              {" "}
              {/* Wrap component with ProtectedRoute */}
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        {/* Add other protected routes here (e.g., /orders, /wishlist) */}
        {/*
        <Route
            path="/orders"
            element={
                <ProtectedRoute>
                    <OrdersPage />
                </ProtectedRoute>
            }
        />
        */}

        {/* --- Catch-all 404 Route --- */}
        {/* This should be the last route */}
        <Route path="*" element={<ErrorNotFound />} />
      </Routes>
    </>
  );
};

export default AllRoutes;
