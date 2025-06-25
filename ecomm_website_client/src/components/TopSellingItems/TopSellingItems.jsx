// src/components/TopSellingItems/TopSellingItems.jsx
import React, { useState, useEffect, useRef, useCallback } from "react"; // Added useRef, useCallback
import { Link } from "react-router-dom";
import { getTopSellingItemsApi, getServerBaseUrl } from "../../services/api"; // Import API call and base URL helper
import {
  FaStar,
  FaSpinner,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa"; // Import icons
import toast from "react-hot-toast";
import "./TopSellingItems.css"; // Import the CSS file

// This component fetches and displays the top selling items using manual horizontal scrolling
const TopSellingItems = ({ addToCart }) => {
  // Renamed component
  const [topSellingItems, setTopSellingItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [backendImageBaseUrl, setBackendImageBaseUrl] = useState(""); // Added state for image base URL

  // Refs and state for manual scrolling (similar to AllItems)
  const itemsContainerRef = useRef(null); // Ref for the scrollable container
  const [showLeftArrow, setShowLeftArrow] = useState(false); // State for arrow visibility
  const [showRightArrow, setShowRightArrow] = useState(false);

  // Fetch backend image base URL on mount
  useEffect(() => {
    const serverRootUrl = getServerBaseUrl();
    if (serverRootUrl) {
      setBackendImageBaseUrl(`${serverRootUrl}/uploads/`);
    } else {
      // Fallback or development base URL
      setBackendImageBaseUrl("/uploads/");
    }
  }, []);

  const placeholderImage = "/assets/images/placeholder-item.png"; // Consistent placeholder

  // Fetch top selling items
  useEffect(() => {
    const fetchTopItems = async () => {
      setLoading(true);
      setError(null);
      try {
        // Call the new API endpoint for top-selling items
        const response = await getTopSellingItemsApi(); // This calls /api/items/top-selling

        // Assuming the backend now returns the array directly based on the new controller
        if (response.data && Array.isArray(response.data)) {
          setTopSellingItems(response.data);
          // Allow a small delay for DOM to render before checking scroll state
          setTimeout(checkScrollArrows, 100);
        } else {
          console.error("Unexpected API response format:", response.data);
          throw new Error(
            "Failed to load top selling products due to data format."
          );
        }
      } catch (err) {
        console.error("Error fetching top selling items:", err);
        setError(
          err.response?.data?.message ||
            err.message ||
            "Failed to fetch top selling products."
        );
        // Show toast error for a better user experience
        toast.error(
          err.response?.data?.message ||
            err.message ||
            "Failed to load top selling products."
        );
        setTopSellingItems([]); // Clear items on error
      } finally {
        setLoading(false);
      }
    };

    fetchTopItems();
  }, []); // Empty dependency array: run once on component mount

  // Effect for checking scroll arrows on mount, items change, and window resize (similar to AllItems)
  useEffect(() => {
    checkScrollArrows(); // Initial check
    const handleResize = () => checkScrollArrows();
    window.addEventListener("resize", handleResize);

    // Clean up the event listener
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [topSellingItems]); // Re-run if items change or window resizes

  // Get the full image URL (similar to AllItems)
  const getFullImageUrl = useCallback(
    (itemImagePath) => {
      if (!itemImagePath || itemImagePath === "default-item.png")
        return placeholderImage;
      if (itemImagePath.startsWith("http")) return itemImagePath;
      if (backendImageBaseUrl) {
        const base = backendImageBaseUrl.endsWith("/")
          ? backendImageBaseUrl.slice(0, -1)
          : backendImageBaseUrl;
        const itemPath = itemImagePath.startsWith("/")
          ? itemImagePath.substring(1)
          : itemImagePath;
        return `${base}/${itemPath}`;
      }
      // Fallback if backendImageBaseUrl is not set (shouldn't happen with useEffect)
      return `/uploads/${
        itemImagePath.startsWith("/")
          ? itemImagePath.substring(1)
          : itemImagePath
      }`;
    },
    [backendImageBaseUrl, placeholderImage]
  ); // Dependencies for useCallback

  // Format price (similar to AllItems)
  const formatPrice = useCallback(
    (price) => `₹${Number(price) ? Number(price).toFixed(2) : "0.00"}`,
    []
  );

  // Get discount badge text (similar to AllItems, using backend calculated text if available)
  const getDiscountBadge = useCallback((itemData) => {
    // If backend provides the text, use it directly (preferred)
    if (itemData.discountBadgeText) {
      return (
        <span className="discount-badge">{itemData.discountBadgeText}</span>
      );
    }

    // Fallback or recalculate if backend doesn't provide the text field
    // Ensure itemData.discount is an object with a value property
    if (
      !itemData.discount ||
      typeof itemData.discount !== "object" ||
      !itemData.discount.value ||
      itemData.discount.value <= 0
    )
      return null; // No valid discount object or value

    const { type, value } = itemData.discount;
    let text = "";

    if (type === "Percent") {
      text = `-${Math.round(value)}%`;
    } else if (type === "Amount") {
      // Recalculate percent if original price is available and meaningful
      const originalPrice = parseFloat(itemData.originalPrice) || 0;
      const currentPrice = parseFloat(itemData.price) || 0;

      if (originalPrice > currentPrice && originalPrice > 0) {
        const percentOff =
          ((originalPrice - currentPrice) / originalPrice) * 100;
        if (percentOff > 0) text = `-${Math.round(percentOff)}%`;
      } else {
        // If percent calculation isn't meaningful, show amount off
        text = `-₹${Math.round(value)}`;
      }
    } else return null; // Unknown discount type

    return text ? <span className="discount-badge">{text}</span> : null;
  }, []); // No specific deps needed as itemData is passed

  // --- Scrolling Logic (Copied from AllItems) ---
  const checkScrollArrows = useCallback(() => {
    const container = itemsContainerRef.current;
    if (container) {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      // Show left arrow if scrolled right at all (add a small tolerance)
      setShowLeftArrow(scrollLeft > 1); // Use > 1 instead of > 0 for better handling of start
      // Show right arrow if there's still content to the right (add a small tolerance)
      setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 1); // Add -1 tolerance
    } else {
      // If no container (e.g., empty state), hide arrows
      setShowLeftArrow(false);
      setShowRightArrow(false);
    }
  }, []);

  const handleScroll = useCallback(
    (direction) => {
      const container = itemsContainerRef.current;
      if (container) {
        // Find the first visible item or scroll amount
        // A simple approach is to scroll by a fixed amount or percentage
        // Scrolling by container width is common for carousels
        const scrollAmount = container.clientWidth * 0.8; // Scroll by 80% of visible width

        const { scrollLeft } = container;
        let targetScrollLeft;

        if (direction === "left") {
          targetScrollLeft = Math.max(0, scrollLeft - scrollAmount);
        } else {
          // direction === "right"
          targetScrollLeft = scrollLeft + scrollAmount;
        }

        container.scrollTo({
          left: targetScrollLeft,
          behavior: "smooth",
        });

        // Check arrows after scrolling might finish (rough estimate)
        setTimeout(checkScrollArrows, 400); // Re-check after animation might be done
      }
    },
    [checkScrollArrows]
  ); // checkScrollArrows is a dependency

  const handleScrollLeft = () => handleScroll("left");
  const handleScrollRight = () => handleScroll("right");
  // --- End Scrolling Logic ---

  // Render the item cards (adapted from AllItems renderItems - REMOVED ADD TO CART BUTTON)
  const renderItems = (itemsToRender) => {
    if (!itemsToRender || itemsToRender.length === 0) return null;

    return itemsToRender.map((itemData) => {
      const ratingValue = parseFloat(itemData.rating);
      const shouldShowRating = !isNaN(ratingValue) && ratingValue > 0;

      return (
        // Use the .item-card class consistently
        <div className="item-card" key={itemData._id}>
          <Link
            to={`/item/${itemData._id}`}
            className="item-link" // Use .item-link class
            aria-label={`View ${itemData.name}`}
          >
            <div className="item-image-wrapper">
              <img
                src={getFullImageUrl(itemData.imagePath)} // Use backend data and helper
                alt={itemData.name}
                className="item-image"
                loading="lazy"
                onError={(e) => {
                  if (
                    e.target.src !== placeholderImage &&
                    e.target.src !== window.location.origin + placeholderImage
                  ) {
                    e.target.src = placeholderImage;
                    e.target.alt = `${itemData.name} (Image not available)`;
                  }
                }}
              />
              {/* Discount badge */}
              {getDiscountBadge(itemData)}
            </div>
            <div className="item-details">
              {shouldShowRating && (
                <div className="item-rating">
                  <FaStar className="star-icon" />
                  <span>{ratingValue.toFixed(1)}</span>
                </div>
              )}
              {/* Item name */}
              <h3 className="item-name" title={itemData.name}>
                {itemData.name}
              </h3>
              {/* Item unit */}
              {itemData.unit && <p className="item-unit">{itemData.unit}</p>}
              {/* Price */}
              <div className="item-price">
                {/* Show original price only if there's a discount and it's higher */}
                {itemData.originalPrice > itemData.price &&
                  getDiscountBadge(itemData) && (
                    <span className="original-price">
                      {formatPrice(itemData.originalPrice)}
                    </span>
                  )}
                <span className="current-price">
                  {formatPrice(itemData.price)}
                </span>
              </div>
            </div>
            {/* REMOVED: Add to Cart button JSX */}
          </Link>
        </div>
      );
    });
  };

  // Render state messages or the carousel
  const renderContent = () => {
    if (loading && topSellingItems.length === 0)
      return (
        <div className="loading-state">
          <FaSpinner className="fa-spin" /> Loading Top Items...{" "}
          {/* Updated text */}
        </div>
      );
    if (error)
      return (
        <div className="error-state">
          <p>Oops! Could not load top selling items.</p> {/* Updated text */}
          <i>{error}</i>
        </div>
      );
    if (!loading && topSellingItems.length === 0)
      return (
        <div className="empty-state">
          No top selling items available yet. {/* Updated text */}
        </div>
      );

    // Always display in a row with manual scrolling for this section
    return (
      <div className="top-items-carousel-wrapper">
        {/* Conditionally render left arrow */}
        {showLeftArrow && (
          <button
            className="carousel-arrow arrow-left"
            onClick={handleScrollLeft}
            aria-label="Scroll left"
          >
            <FaChevronLeft />
          </button>
        )}
        {/* Scrollable container for items */}
        <div
          className="top-items-row-container"
          ref={itemsContainerRef} // Assign ref here
          onScroll={checkScrollArrows} // Listen for scroll events to update arrows
        >
          {renderItems(topSellingItems)} {/* Render the items */}
        </div>
        {/* Conditionally render right arrow */}
        {showRightArrow && (
          <button
            className="carousel-arrow arrow-right"
            onClick={handleScrollRight}
            aria-label="Scroll right"
          >
            <FaChevronRight />
          </button>
        )}
        {/* No "See More" button */}
      </div>
    );
  };

  // Main component render
  return (
    <section className="top-selling-section background">
      {/* Use specific section class */}
      <div className="top-selling-container container">
        {/* Use specific container class */}
        <div className="section-heading-container">
          {/* Container for icon and title */}
          <i className="fa fa-bolt"></i>
          <h1>Top Selling Items</h1> {/* Updated heading text */}
        </div>
        {/* Render the appropriate content (loading, error, empty, or carousel) */}
        {renderContent()}
      </div>
    </section>
  );
};

export default TopSellingItems; // Export with the new name
