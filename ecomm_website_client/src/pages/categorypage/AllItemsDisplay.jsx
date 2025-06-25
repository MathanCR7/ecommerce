// ecomm_website_client/src/pages/categorypage/AllItemsDisplay.jsx
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useContext,
} from "react";
import api, { getServerBaseUrl } from "../../services/api";
import { FaSpinner } from "react-icons/fa";
import toast from "react-hot-toast";
import ItemCardWithQuantity from "../../components/ItemCardWithQuantity/ItemCardWithQuantity";
import "./AllItemsDisplay.css";
// import { WishlistContext } from "../../context/WishlistContext"; // ❌ REMOVED: WishlistContext is not exported
import { AuthContext } from "../../context/AuthContext";
import { useWishlist } from "../../context/WishlistContext"; // ✅ Keep: useWishlist is exported
import { useCart } from "../../context/CartContext"; // ✅ Keep: useCart is exported

const sortOptions = [
  { key: "latest", label: "Sort: Latest" },
  { key: "popular", label: "Sort: Popular" },
  { key: "price_asc", label: "Price: Low to High" },
  { key: "price_desc", label: "Price: High to Low" },
  { key: "name_asc", label: "Sort: Name A-Z" },
  { key: "name_desc", label: "Sort: Name Z-A" },
];

const AllItemsDisplay = ({
  categorySlug,
  categoryName,
  defaultSortKey = "latest",
  // Props like cartItems, addToCart, updateItemQuantity are expected by ItemCardWithQuantity
  // It's better if ItemCardWithQuantity consumes CartContext directly, but for now
  // we'll rely on these being passed down from CategoryPage.
  cartItems = [], // Keep receiving cart props from parent (CategoryPage)
  addToCart, // Keep receiving cart props from parent
  updateItemQuantity, // Keep receiving cart props from parent
}) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSort, setActiveSort] = useState(
    sortOptions.find((opt) => opt.key === defaultSortKey) || sortOptions[0]
  );
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortDropdownRef = useRef(null);
  const [backendImageBaseUrl, setBackendImageBaseUrl] = useState("");

  // Use useContext(AuthContext)
  const { user } = useContext(AuthContext);
  // Use useWishlist hook to get wishlist state and actions
  const { wishlistItems, toggleWishlist } = useWishlist();
  // Use useCart hook to get cart state and actions if needed locally,
  // but for passing to ItemCard, the props received are used.
  // const { cartItems, addToCart, updateItemQuantity } = useCart();

  // Removed local wishlist state and useEffect

  useEffect(() => {
    const serverRootUrl = getServerBaseUrl();
    setBackendImageBaseUrl(serverRootUrl);
  }, []);

  const placeholderImage = "/assets/images/placeholder-item.png";

  const fetchItems = useCallback(
    async (sortKey, currentCategorySlug) => {
      setLoading(true);
      setError(null);
      try {
        let url = `/items?sort=${sortKey}&limit=48`;
        if (currentCategorySlug && currentCategorySlug !== "all") {
          url += `&category=${currentCategorySlug}`;
        }
        console.log("[AllItemsDisplay] Fetching items:", url); // Log the fetch URL
        const response = await api.get(url);
        console.log("[AllItemsDisplay] Fetch response:", response.data); // Log the response data

        if (
          response.data &&
          response.data.success &&
          Array.isArray(response.data.items)
        ) {
          // --- MODIFICATION START ---
          // Remove manual stock processing - use stock and manageStock directly from backend
          const itemsWithProcessedData = response.data.items.map((apiItem) => {
            let displayImagePath = placeholderImage;
            if (apiItem.images && apiItem.images.length > 0) {
              const primaryImg = apiItem.images.find((img) => img.isPrimary);
              displayImagePath = primaryImg
                ? primaryImg.path
                : apiItem.images[0].path;
            } else if (apiItem.imagePath) {
              // Fallback for older imagePath field - backend should prefer images array
              displayImagePath = apiItem.imagePath;
            }

            // The backend now calculates effective stock (Infinity or number)
            // and sends manageStock. Use them directly.
            // No need for complex stock processing here.
            const processedItem = {
              ...apiItem,
              _id: apiItem._id, // Ensure _id exists
              name: apiItem.name || "Unnamed Item",
              price: parseFloat(apiItem.price) || 0,
              imagePath: displayImagePath, // Primary image path
              images: apiItem.images || [], // Ensure images array exists
              rating: apiItem.rating || (Math.random() * 1.5 + 3.5).toFixed(1),
              unit:
                apiItem.unit ||
                (apiItem.weight
                  ? `${apiItem.weight} ${apiItem.dimensions?.unit || "g"}`
                  : null) ||
                "1 unit",
              stock: apiItem.stock, // Use stock directly from backend (Infinity or number)
              manageStock: apiItem.manageStock, // Use manageStock directly from backend
              originalPrice:
                parseFloat(apiItem.originalPrice) ||
                parseFloat(apiItem.mrp) ||
                parseFloat(apiItem.price) ||
                0, // Use originalPrice from backend if available, fallback to mrp/price
              discountType: apiItem.discountType,
              discountValue: apiItem.discountValue,
              // Add discountBadgeText if backend provides it (as per my backend suggestion)
              discountBadgeText: apiItem.discountBadgeText,
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
        console.error(
          `Error fetching items (categorySlug: ${currentCategorySlug}):`,
          err
        );
        setError(
          err.response?.data?.message || err.message || "Failed to fetch items."
        );
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [placeholderImage]
  ); // Added placeholderImage to dependencies

  useEffect(() => {
    fetchItems(activeSort.key, categorySlug);
    // Add backendImageBaseUrl to deps? Probably not needed here.
  }, [activeSort, categorySlug, fetchItems]); // Added fetchItems to dependencies

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        sortDropdownRef.current &&
        !sortDropdownRef.current.contains(event.target)
      )
        setIsSortOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleSortDropdown = () => setIsSortOpen((prev) => !prev);
  const handleSortChange = (sortOption) => {
    if (sortOption.key !== activeSort.key) setActiveSort(sortOption);
    setIsSortOpen(false);
  };

  const renderContent = () => {
    if (loading && items.length === 0)
      return (
        <div className="items-display-loading">
          <FaSpinner className="fa-spin" /> Loading Items for{" "}
          {categoryName || "selected criteria"}...
        </div>
      );
    if (error)
      return (
        <div className="items-display-error">
          <p>
            Oops! Could not load items for {categoryName || "selected criteria"}
            .
          </p>
          <i>Error: {error}</i>
        </div>
      );
    if (!loading && items.length === 0)
      return (
        <div className="items-display-empty">
          No items found in {categoryName || "this selection"}. Try a different
          category or sort option!
        </div>
      );

    return (
      <div className="items-display-grid">
        {items.map((itemData) => (
          <ItemCardWithQuantity
            key={itemData._id}
            itemData={itemData} // itemData now contains backend-processed stock
            cartItems={cartItems} // Passing cart props received from parent
            addToCart={addToCart} // Passing cart props received from parent
            updateItemQuantity={updateItemQuantity} // Passing cart props received from parent
            wishlist={wishlistItems} // Pass wishlistItems from the hook
            toggleWishlist={toggleWishlist} // Pass toggleWishlist from the hook
            backendImageBaseUrl={backendImageBaseUrl}
            placeholderImage={placeholderImage}
            // user prop is not strictly needed here, can be consumed directly in ItemCardWithQuantity
            // user={user} // Optional: pass user status if needed, but hook is better
          />
        ))}
      </div>
    );
  };

  return (
    <div className="all-items-display-container">
      <div className="items-display-header">
        <h1 className="items-display-title">
          {categoryName || "All Products"}
        </h1>
        <div className="sort-dropdown-container" ref={sortDropdownRef}>
          <button
            className="sort-button"
            onClick={toggleSortDropdown}
            aria-haspopup="true"
            aria-expanded={isSortOpen}
            aria-controls="sort-menu-list"
          >
            {activeSort.label}{" "}
            <span className={`arrow ${isSortOpen ? "up" : "down"}`}>▼</span>
          </button>
          {isSortOpen && (
            <ul className="sort-menu" role="menu" id="sort-menu-list">
              {sortOptions.map((option) => (
                <li
                  key={option.key}
                  role="menuitem"
                  tabIndex={0}
                  className={`sort-menu-item ${
                    activeSort.key === option.key ? "active" : ""
                  }`}
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
    </div>
  );
};

export default AllItemsDisplay;
