import React from "react";
import AllRoutes from "./allroutes/AllRoutes";
import { Toaster } from "react-hot-toast";
// Assuming cart/product data might come from context or specific pages later
// import TopSellingProductsData from "./components/TopSellingProducts/TopSellingProductsData";
// import ShopData from "./components/Shop/shopData";
// import AllProductsData from "./components/Allproducts/allProductsData"; // If you had this

function App() {
  // Placeholder data/functions - replace with actual logic or context
  const productItems = []; // Replace with actual data source or remove
  const shopItems = []; // Replace with actual data source or remove
  const allProductsData = []; // Replace with actual data source or remove
  const cartItems = []; // Replace with actual data source or remove

  // Placeholder cart functions - Implement using context or state management
  const addToCart = (product) => {
    console.warn("addToCart needs implementation/context");
    toast.success("Item added (placeholder)");
  };
  const deleteFromCart = (product) => {
    console.warn("deleteFromCart needs implementation/context");
    toast.success("Item quantity decreased (placeholder)");
  };
  const checkOut = () => {
    console.warn("checkOut needs implementation/context");
    toast.success("Checkout initiated (placeholder)");
  };
  const removeFromCart = (product) => {
    console.warn("removeFromCart needs implementation/context");
    toast.success("Item removed (placeholder)");
  };

  return (
    <>
      {/* Centralized Toaster for notifications */}
      <Toaster position="top-center" reverseOrder={false} />

      {/* Component handling all application routes */}
      <AllRoutes
        // Pass necessary props to routes/pages
        // Authentication state is managed by AuthContext
        productItems={productItems}
        cartItems={cartItems}
        addToCart={addToCart}
        shopItems={shopItems}
        deleteFromCart={deleteFromCart}
        checkOut={checkOut}
        removeFromCart={removeFromCart}
        allProductsData={allProductsData}
      />
    </>
  );
}

export default App;
