import React, { useState, useEffect, useContext } from "react";
import AllRoutes from "./allroutes/AllRoutes";
import { Toaster, toast } from "react-hot-toast";
import api from "./services/api";
import { FaSpinner } from "react-icons/fa";
import { AuthContext } from "./context/AuthContext";
import { useCart } from "./context/CartContext";
import { useWishlist } from "./context/WishlistContext";

// Define backend image base URL and placeholder image path (can also come from context if preferred)
// Using import.meta.env for Vite
const BACKEND_IMAGE_BASE_URL = import.meta.env.VITE_BACKEND_URL;
const PLACEHOLDER_IMAGE = "/assets/images/placeholder-item.png";

function App() {
  const [featuredItems, setFeaturedItems] = useState([]);
  const [shopItems, setShopItems] = useState([]); // For homepage display
  const [allItemsData, setAllItemsData] = useState([]); // Global list of all items

  const [appLoading, setAppLoading] = useState(true); // For initial data fetch (items)
  const [appError, setAppError] = useState(null);

  const { user, loading: authLoading } = useContext(AuthContext);
  const { mergeGuestCartToBackend } = useCart();
  const { mergeGuestWishlistToBackend } = useWishlist();

  // Effect for merging guest data on login
  useEffect(() => {
    if (user && !authLoading) {
      // User just logged in (or auth status confirmed user)
      // Only attempt merge if not loading auth state and user exists
      const guestCartData = localStorage.getItem("guestCart");
      if (guestCartData) {
        try {
          const parsedGuestCart = JSON.parse(guestCartData);
          if (Array.isArray(parsedGuestCart) && parsedGuestCart.length > 0) {
            mergeGuestCartToBackend(parsedGuestCart);
          } else {
            localStorage.removeItem("guestCart"); // Clean up empty/invalid
          }
        } catch (e) {
          console.error("Error parsing guest cart for merge:", e);
          localStorage.removeItem("guestCart");
        }
      }

      const guestWishlistData = localStorage.getItem("guestWishlist");
      if (guestWishlistData) {
        try {
          const parsedGuestWishlist = JSON.parse(guestWishlistData);
          // Guest wishlist stores full item objects now, check if array and not empty
          if (
            Array.isArray(parsedGuestWishlist) &&
            parsedGuestWishlist.length > 0
          ) {
            mergeGuestWishlistToBackend(parsedGuestWishlist);
          } else {
            localStorage.removeItem("guestWishlist"); // Clean up empty/invalid
          }
        } catch (e) {
          console.error("Error parsing guest wishlist for merge:", e);
          localStorage.removeItem("guestWishlist");
        }
      }
    }
    // Depend only on user and authLoading status
  }, [user, authLoading, mergeGuestCartToBackend, mergeGuestWishlistToBackend]); // Added merge functions as dependencies

  // Fetch initial item data (featured, shop, all)
  useEffect(() => {
    const fetchInitialItemData = async () => {
      setAppLoading(true);
      setAppError(null);
      try {
        const response = await api.get("/items?sort=latest&limit=50"); // Public endpoint

        if (
          response.data &&
          response.data.success &&
          Array.isArray(response.data.items)
        ) {
          // --- MODIFICATION START ---
          // Remove manual stock calculation and use stock/manageStock directly from backend
          const fetchedItems = response.data.items.map((item) => {
            let imagePath = PLACEHOLDER_IMAGE;
            if (item.images && item.images.length > 0) {
              const primary = item.images.find((img) => img.isPrimary);
              imagePath = primary ? primary.path : item.images[0].path;
            } else if (item.imagePath) {
              // Fallback for older single imagePath - backend should provide images array now
              imagePath = item.imagePath;
            }

            return {
              ...item,
              _id: item._id,
              id: item._id, // for convenience
              images: item.images || [], // ensure images array exists
              imagePath: imagePath, // primary image path for display (derived from images)
              // Use stock and manageStock directly from the backend response
              stock: item.stock,
              manageStock: item.manageStock,
              description: item.description || "No description available.",
              unit: item.unit || (item.weight ? `${item.weight} gm` : "1 unit"), // Example unit logic
              rating: item.rating || (Math.random() * 2 + 3).toFixed(1), // Fallback rating
              originalPrice: item.mrp || item.price, // Use MRP if available for original price
              // Ensure discount fields are included if backend provides them
              discountType: item.discountType,
              discountValue: item.discountValue,
            };
          });
          // --- MODIFICATION END ---

          setAllItemsData(fetchedItems);

          // Example: Filter for featured items (can be improved by a dedicated backend endpoint)
          // Still use the fetchedItems which now have the correct stock
          setFeaturedItems(
            fetchedItems
              .filter((item) => item.isFeatured === true)
              .slice(0, 8) || // Use explicit boolean check
              fetchedItems.slice(0, Math.min(8, fetchedItems.length)) // fallback
          );
          // Example: Filter for shop items (can be improved)
          setShopItems(
            fetchedItems.slice(0, Math.min(12, fetchedItems.length)) // Take first 12 or fewer
          );
        } else {
          setAppError(response.data?.message || "Could not load items.");
          setAllItemsData([]);
        }
      } catch (error) {
        console.error("App.jsx - Error fetching initial item data:", error);
        setAppError(error.message || "Error fetching item data.");
        setAllItemsData([]);
      } finally {
        setAppLoading(false);
      }
    };
    fetchInitialItemData();
    // Removed merge functions from dependencies - they are stable via useCallback in context
  }, []); // Runs once on mount

  // Note: cartItems, wishlistItems, etc are now accessed directly within components via hooks

  if (appLoading || authLoading) {
    // Show loading if either app data or auth state is loading
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontSize: "1.5rem",
          color: "#333",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <FaSpinner
          className="fa-spin"
          style={{ marginRight: "15px", fontSize: "2rem" }}
        />
        Loading Application...
      </div>
    );
  }

  if (appError) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          color: "#D8000C",
          backgroundColor: "#FFD2D2",
          padding: "20px",
          textAlign: "center",
          fontFamily: "Arial, sans-serif",
          border: "1px solid #D8000C",
          borderRadius: "8px",
        }}
      >
        <h2 style={{ margin: "0 0 15px 0" }}>Application Error</h2>
        <p style={{ margin: "5px 0" }}>
          We encountered a problem loading essential data.
        </p>
        <p style={{ margin: "5px 0 15px 0" }}>
          Please try refreshing the page. If the issue persists, contact
          support.
        </p>
        <p style={{ fontSize: "0.9em", color: "#555" }}>
          <i>Details: {appError}</i>
        </p>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
      {/* AuthProvider, CartProvider, WishlistProvider are already wrapping in main.jsx */}
      <AllRoutes
        // Item data for various displays (pass down)
        featuredItems={featuredItems}
        shopItems={shopItems} // for homepage quick shop section
        allItemsData={allItemsData} // for pages like AllItemsPage, SingleItemPage, CategoryPage
        // Cart and Wishlist related props are now generally consumed via hooks in pages/components
        // Config can also be accessed via context or imported directly if needed
        backendImageBaseUrl={BACKEND_IMAGE_BASE_URL}
        placeholderImage={PLACEHOLDER_IMAGE}
      />
    </>
  );
}

export default App;
