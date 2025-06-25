// ecomm_website_client/src/pages/wishlistpage/WishlistPage.jsx
import React, { useState, useEffect } from "react"; // Keep useEffect for base URL
import toast from "react-hot-toast";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import ItemCardWithQuantity from "../../components/ItemCardWithQuantity/ItemCardWithQuantity";
import { getServerBaseUrl } from "../../services/api";
import "./WishlistPage.css";
import { FaHeartBroken, FaSpinner } from "react-icons/fa";
import { Link } from "react-router-dom";
import { useCart } from "../../context/CartContext"; // ⭐ Import useCart for header count
import { useWishlist } from "../../context/WishlistContext"; // ⭐ Import useWishlist

const WishlistPage = ({
  allItemsData, // Keep receiving this, could be a fallback
  // Removed cartItems, addToCart, updateItemQuantity props. Use hooks instead.
}) => {
  // ⭐ Use useWishlist hook to get wishlist state and actions
  const { wishlistItems, loadingWishlist, wishlistError, toggleWishlist } =
    useWishlist();

  const [backendImageBaseUrl, setBackendImageBaseUrl] = useState("");

  useEffect(() => {
    const serverRootUrl = getServerBaseUrl();
    setBackendImageBaseUrl(serverRootUrl);
  }, []);

  // ⭐ Use useCart hook to get cart items for header count
  const { cartItems } = useCart();

  // Removed local wishlistIds and wishlistItems state and their useEffect logic
  // The wishlistItems from the hook is now the source of truth

  const totalCartItems = cartItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const placeholderImage = "/assets/images/placeholder-item.png";

  // Use loadingWishlist from the hook
  if (loadingWishlist) {
    return (
      <>
        <Header cartItemCount={totalCartItems} />
        <div className="wishlist-page-loading">
          <FaSpinner className="fa-spin" /> Loading Wishlist...
        </div>
        <Footer />
      </>
    );
  }

  // Use wishlistError from the hook
  if (wishlistError) {
    return (
      <>
        <Header cartItemCount={totalCartItems} />
        <div
          className="wishlist-empty"
          style={{ textAlign: "center", padding: "40px 0" }}
        >
          <FaHeartBroken
            className="wishlist-empty-icon"
            style={{ fontSize: "4rem", color: "#ccc" }}
          />
          <h2>Error Loading Wishlist</h2>
          <p>{wishlistError}</p>
          <p>Please try refreshing the page.</p>
          <Link
            to="/categories"
            className="btn btn-primary"
            style={{ marginTop: "20px" }}
          >
            Browse Items
          </Link>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header cartItemCount={totalCartItems} />
      <main className="wishlist-page-container container">
        <h1 className="wishlist-page-title">My Wishlist</h1>
        {/* Use wishlistItems from the hook */}
        {wishlistItems.length > 0 ? (
          <div className="wishlist-items-grid">
            {wishlistItems.map((itemData) => (
              // ItemCardWithQuantity needs cart context too, but it gets it via props from here
              // or it could use hooks internally if it were refactored.
              // Passing cartItems, addToCart, updateItemQuantity back down for now.
              <ItemCardWithQuantity
                key={itemData._id}
                itemData={itemData}
                cartItems={cartItems} // ⭐ Pass cartItems from useCart
                addToCart={useCart().addToCart} // ⭐ Pass addToCart from useCart
                updateItemQuantity={useCart().updateItemQuantity} // ⭐ Pass updateItemQuantity from useCart
                wishlist={wishlistItems} // ⭐ Pass wishlistItems from useWishlist
                toggleWishlist={toggleWishlist} // ⭐ Pass toggleWishlist from useWishlist
                backendImageBaseUrl={backendImageBaseUrl}
                placeholderImage={placeholderImage}
                // Add a class name to the item card container if ItemCardWithQuantity allows,
                // or rely on styling direct children of wishlist-items-grid in CSS
              />
            ))}
          </div>
        ) : (
          <div className="wishlist-empty">
            <FaHeartBroken className="wishlist-empty-icon" />
            <h2>Your Wishlist is Empty</h2>
            <p>Looks like you haven't added anything to your wishlist yet.</p>
            <Link to="/categories" className="btn btn-primary">
              Start Shopping
            </Link>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
};

export default WishlistPage;
