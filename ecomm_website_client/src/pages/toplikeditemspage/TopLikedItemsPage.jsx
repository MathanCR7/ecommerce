// ecomm_website_client/src/pages/toplikeditemspage/TopLikedItemsPage.jsx
import React from "react";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import AllItemsDisplay from "../categorypage/AllItemsDisplay"; // Reusing the component
import "./TopLikedItemsPage.css"; // Create this CSS file
import { useCart } from "../../context/CartContext"; // ⭐ Import useCart hook

// ⭐ Removed cartItems, addToCart, updateItemQuantity from props
const TopLikedItemsPage = () => {
  // ⭐ Get cart state and actions directly from the CartContext
  const { cartItems, addToCart, updateItemQuantity, loadingCart } = useCart();

  // ⭐ Use cartItems from the hook
  const totalCartItems = cartItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  // Optional: Show a loading state if the cart itself is loading, although AllItemsDisplay has its own loading
  // if (loadingCart) {
  //   return (
  //      <div className="loading-full-page">
  //         <FaSpinner className="fa-spin" /> Loading...
  //      </div>
  //   );
  // }

  return (
    <>
      {/* ⭐ Use totalCartItems calculated from the hook's cartItems */}
      <Header cartItemCount={totalCartItems} />
      <main className="top-liked-items-page-container container">
        {/*
          AllItemsDisplay will show "Top Liked Items" as its title.
          It will fetch items sorted by "popular" (or relevant backend sort key).
          categorySlug is null, so it fetches all items but sorted by popularity.
        */}
        <AllItemsDisplay
          categorySlug={null} // No specific category, show all popular items
          categoryName="Top Liked Items" // Title for the page
          defaultSortKey="popular" // Tell AllItemsDisplay to sort by popularity
          // ⭐ Pass cart state and actions obtained from useCart hook to AllItemsDisplay
          // AllItemsDisplay passes these down to ItemCardWithQuantity
          cartItems={cartItems}
          addToCart={addToCart}
          updateItemQuantity={updateItemQuantity}
        />
      </main>
      <Footer />
    </>
  );
};

export default TopLikedItemsPage;
