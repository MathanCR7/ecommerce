// src/pages/all-itemspage/AllItemsPage.jsx
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useContext,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { getServerBaseUrl } from "../../services/api";
import {
  FaHeart,
  FaRegHeart,
  FaShoppingCart,
  FaStar,
  FaSpinner,
  FaCheckCircle,
} from "react-icons/fa";
import toast from "react-hot-toast";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import "./AllItemsPage.css"; // Keep AllItemsPage CSS for layout/grid
import { AuthContext } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext"; // Use useCart hook
import { useWishlist } from "../../context/WishlistContext"; // Use useWishlist hook

// ⭐ Import ItemCardWithQuantity component
import ItemCardWithQuantity from "../../components/ItemCardWithQuantity/ItemCardWithQuantity";

// Renamed from filterOptions to sortOptions
const availableSortOptions = [
  { key: "latest", label: "Sort: Latest" },
  { key: "popular", label: "Sort: Popular" },
  { key: "price_asc", label: "Price: Low to High" },
  { key: "price_desc", label: "Price: High to Low" },
  { key: "name_asc", label: "Sort: Name A-Z" },
  { key: "name_desc", label: "Sort: Name Z-A" },
];

// Removed addToCart, cartItems props. Use hooks directly.
const AllItemsPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Renamed from activeFilter to activeSort and initialized with availableSortOptions
  const [activeSort, setActiveSort] = useState(availableSortOptions[0]);
  // Renamed from isFilterOpen to isSortOpen
  const [isSortOpen, setIsSortOpen] = useState(false);
  // Renamed from filterDropdownRef to sortDropdownRef
  const sortDropdownRef = useRef(null);
  const [backendImageBaseUrl, setBackendImageBaseUrl] = useState("");
  // addingToCart state is now managed locally within ItemCardWithQuantity
  // const [addingToCart, setAddingToCart] = useState(null); // Local state for UI feedback - REMOVED

  const navigate = useNavigate();

  // ⭐ Use useContext(AuthContext) instead of useAuth()
  const { user } = useContext(AuthContext);
  // ⭐ Use useCart hook to get cart state and actions
  const { cartItems, addToCart, updateItemQuantity } = useCart(); // Get updateItemQuantity too
  // ⭐ Use useWishlist hook to get wishlist state and actions
  const { wishlistItems, toggleWishlist } = useWishlist();
  // Wishlist state and toggle logic are now managed by the WishlistContext

  useEffect(() => {
    const serverRootUrl = getServerBaseUrl();
    setBackendImageBaseUrl(serverRootUrl);
  }, []);

  const placeholderImage = "/assets/images/placeholder-item.png";

  // Removed handleItemAddToCart and handleToggleWishlist functions
  // These actions are now called directly within ItemCardWithQuantity
  // which receives the necessary toggleWishlist, addToCart, updateItemQuantity props.

  const fetchItems = useCallback(
    async (sortKey) => {
      // Renamed parameter from filterKey to sortKey
      setLoading(true);
      setError(null);
      try {
        // Increase limit to support potentially more items per row on large screens
        // Use the sortKey parameter in the API call
        const response = await api.get(`/items?sort=${sortKey}&limit=100`); // Increased limit
        console.log("[AllItemsPage] Fetch response:", response.data); // Log the response data

        if (
          response.data &&
          response.data.success &&
          Array.isArray(response.data.items)
        ) {
          // --- MODIFICATION START ---
          // Map fetched items, using data as provided by backend
          const itemsWithProcessedData = response.data.items.map((apiItem) => {
            let imagePath = placeholderImage;
            if (apiItem.images && apiItem.images.length > 0) {
              const primaryImg = apiItem.images.find((img) => img.isPrimary);
              imagePath = primaryImg ? primaryImg.path : apiItem.images[0].path;
            } else if (apiItem.imagePath) {
              // Fallback for older single imagePath - backend should prefer images array
              imagePath = apiItem.imagePath;
            }

            // The backend now calculates effective stock (Infinity or number)
            // and sends manageStock. Use them directly.
            // Pass all necessary fields to ItemCardWithQuantity
            const processedItem = {
              ...apiItem,
              _id: apiItem._id, // Ensure _id exists
              name: apiItem.name || "Unnamed Item",
              price: parseFloat(apiItem.price) || 0, // Use calculated price from backend
              imagePath: imagePath, // Primary image path
              images: apiItem.images || [], // Ensure images array exists
              rating: apiItem.rating || (Math.random() * 1.8 + 3.2).toFixed(1),
              unit:
                apiItem.unit ||
                (apiItem.weight ? `${apiItem.weight} gm` : "1 unit"),
              stock: apiItem.stock, // Use stock directly from backend (Infinity or number)
              manageStock: apiItem.manageStock, // Use manageStock directly from backend
              originalPrice:
                parseFloat(apiItem.originalPrice) ||
                parseFloat(apiItem.mrp) ||
                parseFloat(apiItem.price) ||
                0, // Use originalPrice from backend if available, fallback to mrp/price
              discountType: apiItem.discountType,
              discountValue: apiItem.discountValue,
              discountBadgeText: apiItem.discountBadgeText, // Use if backend provides
            };
            // Quick check if price calculation went wrong - fallback to 0
            if (isNaN(processedItem.price)) processedItem.price = 0;
            if (isNaN(processedItem.originalPrice))
              processedItem.originalPrice = processedItem.price;

            return processedItem;
          });
          // --- MODIFICATION END ---
          setItems(itemsWithProcessedData);
        } else {
          throw new Error(
            response.data?.message || "Invalid data format from server."
          );
        }
      } catch (err) {
        console.error("Error fetching items:", err);
        setError(
          err.response?.data?.message || err.message || "Failed to fetch items."
        );
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [placeholderImage] // Added placeholderImage to dependencies
  );

  useEffect(() => {
    // Use the activeSort.key when fetching
    fetchItems(activeSort.key);
    // Added activeSort to dependencies
  }, [activeSort, fetchItems]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Use sortDropdownRef and isSortOpen
      if (
        sortDropdownRef.current &&
        !sortDropdownRef.current.contains(event.target)
      )
        setIsSortOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Renamed function
  const toggleSortDropdown = () => setIsSortOpen((prev) => !prev);
  // Renamed function and parameter
  const handleSortChange = (sortOption) => {
    if (sortOption.key !== activeSort.key) setActiveSort(sortOption);
    setIsSortOpen(false);
  };

  // formatPriceToINR, getDiscountBadge, getFullImageUrl are no longer needed here
  // as ItemCardWithQuantity handles its own rendering logic.
  // const formatPriceToINR = (price) => ...; // REMOVED
  // const getDiscountBadge = (itemData) => ...; // REMOVED
  // const getFullImageUrl = (itemImagePath) => ...; // REMOVED

  const renderContent = () => {
    if (loading && items.length === 0)
      return (
        <div className="items-loading">
          <FaSpinner className="fa-spin" /> Loading Items...
        </div>
      );
    if (error)
      return (
        <div className="items-error">
          <p>Oops! Could not load items.</p>
          <i>{error}</i>
        </div>
      );
    if (!loading && items.length === 0)
      return (
        <div className="items-empty">
          No items found. Try a different sort option!
        </div>
      );

    return (
      // Apply grid classes here
      <div className="items-grid">
        {items.map((itemData) => {
          // Pass necessary props to ItemCardWithQuantity
          return (
            <ItemCardWithQuantity
              key={itemData._id}
              itemData={itemData} // Item data including backend stock/manageStock
              cartItems={cartItems} // Pass cart state from useCart hook
              addToCart={addToCart} // Pass addToCart action from useCart hook
              updateItemQuantity={updateItemQuantity} // Pass updateItemQuantity action from useCart hook
              wishlist={wishlistItems} // Pass wishlist state from useWishlist hook
              toggleWishlist={toggleWishlist} // Pass toggleWishlist action from useWishlist hook
              backendImageBaseUrl={backendImageBaseUrl} // Pass image base URL
              placeholderImage={placeholderImage} // Pass placeholder image
              // No need to pass `user` as AuthContext can be consumed inside ItemCardWithQuantity
            />
          );
        })}
      </div>
    );
  };
  // Get totalCartItems from useCart state
  const { cartItems: currentCartItems } = useCart();
  const totalCartItems = currentCartItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  return (
    <>
      <Header cartItemCount={totalCartItems} />
      <main className="all-items-page-wrapper">
        <section className="all-items-section container">
          <div className="all-items-header">
            <h2 className="section-heading">Discover Our Items</h2>
            {/* Use sort-dropdown-container and sortDropdownRef */}
            <div className="sort-dropdown-container" ref={sortDropdownRef}>
              {/* Use toggleSortDropdown, isSortOpen, and activeSort */}
              <button
                className="filter-button" // Keeping the class name for styling, or change to sort-button if CSS is updated
                onClick={toggleSortDropdown}
                aria-haspopup="true"
                aria-expanded={isSortOpen}
                aria-controls="sort-menu-list" // Updated aria-controls
              >
                {activeSort.label}{" "}
                <span className={`arrow ${isSortOpen ? "up" : "down"}`}>▼</span>
              </button>
              {/* Use isSortOpen and availableSortOptions */}
              {isSortOpen && (
                <ul className="filter-menu" role="menu" id="sort-menu-list">
                  {" "}
                  {/* Keeping class name filter-menu */}
                  {availableSortOptions.map((option) => (
                    <li
                      key={option.key}
                      role="menuitem"
                      tabIndex={0}
                      className={`filter-menu-item ${
                        // Keeping class name filter-menu-item
                        activeSort.key === option.key ? "active" : ""
                      }`}
                      // Use handleSortChange
                      onClick={() => handleSortChange(option)}
                      onKeyDown={(e) =>
                        (e.key === "Enter" || e.key === " ") &&
                        handleSortChange(option)
                      }
                    >
                      {option.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          {renderContent()}
        </section>
      </main>
      <Footer />
    </>
  );
};

export default AllItemsPage;
