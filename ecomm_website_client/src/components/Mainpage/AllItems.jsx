// src/pages/all-itemspage/AllItems.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { getServerBaseUrl } from "../../services/api"; // Ensure this path is correct
import {
  FaStar,
  FaSpinner,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa"; // Import arrow icons
import toast from "react-hot-toast";
import "./AllItems.css";

const filterOptions = [
  { key: "latest", label: "Latest Items" },
  { key: "popular", label: "Popular Items" },
  { key: "recommend", label: "Recommended" },
  { key: "trending", label: "Trending Now" },
];

const AllItems = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState(filterOptions[0]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterDropdownRef = useRef(null);
  const [backendImageBaseUrl, setBackendImageBaseUrl] = useState("");
  const navigate = useNavigate();

  const [displayMode, setDisplayMode] = useState("row");
  const itemsContainerRef = useRef(null); // Ref for the scrollable container
  const [showLeftArrow, setShowLeftArrow] = useState(false); // State for arrow visibility
  const [showRightArrow, setShowRightArrow] = useState(false);

  useEffect(() => {
    const serverRootUrl = getServerBaseUrl();
    if (serverRootUrl) {
      setBackendImageBaseUrl(`${serverRootUrl}/uploads/`);
    } else {
      // Fallback or development base URL
      setBackendImageBaseUrl("/uploads/");
    }
  }, []);

  const placeholderImage = "/assets/images/placeholder-item.png";

  const fetchItems = useCallback(async (filterKey) => {
    setLoading(true);
    setError(null);
    setDisplayMode("row"); // Reset to row display on new filter fetch
    try {
      // Increase limit slightly to ensure enough items for scrolling
      const response = await api.get(`/items?sort=${filterKey}&limit=40`); // Increased limit

      if (
        response.data &&
        response.data.success &&
        Array.isArray(response.data.items)
      ) {
        const itemsWithProcessedData = response.data.items.map(
          (apiItem, index) => {
            const currentPrice = parseFloat(apiItem.price);
            const safePrice = isNaN(currentPrice) ? 0 : currentPrice;
            let imagePath = apiItem.imagePath || "default-item.png";
            if (
              apiItem.images &&
              Array.isArray(apiItem.images) &&
              apiItem.images.length > 0
            ) {
              const primaryImg = apiItem.images.find((img) => img.isPrimary);
              imagePath = primaryImg
                ? primaryImg.path
                : apiItem.images[0].path || imagePath;
            }

            const discount = apiItem.discount || null;
            const originalPrice = apiItem.originalPrice || safePrice;

            return {
              ...apiItem,
              _id: apiItem._id || `temp_id_${index}`,
              name: apiItem.name || "Unnamed Item",
              price: safePrice,
              imagePath,
              rating: apiItem.rating,
              unit: apiItem.unit,
              stock: apiItem.stock,
              discount,
              originalPrice: isNaN(parseFloat(originalPrice))
                ? safePrice
                : parseFloat(originalPrice),
            };
          }
        );
        setItems(itemsWithProcessedData);
        // Allow a small delay for DOM to render before checking scroll state
        setTimeout(checkScrollArrows, 100);
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
  }, []); // Dependencies are implicitly handled by useCallback

  useEffect(() => {
    fetchItems(activeFilter.key);
  }, [activeFilter, fetchItems]);

  // Effect for clicking outside filter dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(event.target)
      )
        setIsFilterOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Effect for checking scroll arrows on mount and window resize
  useEffect(() => {
    checkScrollArrows(); // Initial check
    const handleResize = () => checkScrollArrows();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [items]); // Re-run if items change or window resizes

  const toggleFilterDropdown = () => setIsFilterOpen((prev) => !prev);

  const handleFilterChange = (filter) => {
    if (filter.key !== activeFilter.key) {
      setActiveFilter(filter);
      // fetchItems will be triggered by the useEffect hook
    }
    setIsFilterOpen(false);
  };

  const handleSeeMoreClick = () => {
    setDisplayMode("grid");
  };

  const formatPrice = (price) =>
    `₹${Number(price) ? Number(price).toFixed(2) : "0.00"}`;

  const getDiscountBadge = (itemData) => {
    if (
      !itemData.discount ||
      !itemData.discount.value ||
      itemData.discount.value <= 0
    )
      return null;

    const { type, value } = itemData.discount;
    let text = "";

    if (type === "Percent") {
      text = `-${Math.round(value)}%`;
    } else if (type === "Amount") {
      // Recalculate percent if original price is available and meaningful
      if (itemData.originalPrice && itemData.originalPrice > itemData.price) {
        const percentOff =
          ((itemData.originalPrice - itemData.price) / itemData.originalPrice) *
          100;
        if (percentOff > 0) text = `-${Math.round(percentOff)}%`;
      } else {
        // Fallback to amount if percent calc isn't meaningful or possible
        text = `-₹${Math.round(value)}`;
      }
    } else return null;

    return text ? <span className="discount-badge">{text}</span> : null;
  };

  const getFullImageUrl = (itemImagePath) => {
    if (!itemImagePath || itemImagePath === "default-item.png")
      return placeholderImage;
    if (itemImagePath.startsWith("http")) return itemImagePath;
    if (backendImageBaseUrl) {
      // Ensure no double slashes if base URL already ends with one
      const base = backendImageBaseUrl.endsWith("/")
        ? backendImageBaseUrl.slice(0, -1)
        : backendImageBaseUrl;
      const itemPath = itemImagePath.startsWith("/")
        ? itemImagePath.substring(1)
        : itemImagePath;
      return `${base}/${itemPath}`;
    }
    return `/uploads/${
      itemImagePath.startsWith("/") ? itemImagePath.substring(1) : itemImagePath
    }`;
  };

  // --- Scrolling Logic ---
  const checkScrollArrows = useCallback(() => {
    const container = itemsContainerRef.current;
    if (container) {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      // Show left arrow if scrolled right at all
      setShowLeftArrow(scrollLeft > 0);
      // Show right arrow if there's still content to the right
      setShowRightArrow(scrollLeft + clientWidth < scrollWidth);
    } else {
      // If no container (e.g., in grid mode or empty), hide arrows
      setShowLeftArrow(false);
      setShowRightArrow(false);
    }
  }, []); // No dependencies needed as it uses ref/state which are stable within render cycle for this purpose

  const handleScroll = (direction) => {
    const container = itemsContainerRef.current;
    if (container) {
      // Find the first item card to get its width + gap
      const firstItem = container.querySelector(".item-card");
      let scrollAmount = 200; // Default scroll amount

      if (firstItem) {
        const itemWidth = firstItem.offsetWidth; // Includes border and padding
        // Get the gap from CSS (needs to match CSS value)
        const gap = 20; // Assuming 20px gap based on CSS
        scrollAmount = itemWidth + gap;
      }

      const { scrollLeft, clientWidth } = container;
      let targetScrollLeft;

      if (direction === "left") {
        targetScrollLeft = Math.max(0, scrollLeft - scrollAmount);
      } else {
        // direction === "right"
        targetScrollLeft = Math.min(
          container.scrollWidth - clientWidth,
          scrollLeft + scrollAmount
        );
      }

      container.scrollBy({
        left: targetScrollLeft - scrollLeft, // Calculate the delta for scrollBy
        behavior: "smooth",
      });

      // Check arrows after scrolling might finish (rough estimate)
      // More accurate: listen to 'scroll' event
      setTimeout(checkScrollArrows, 300); // Re-check after animation might be done
    }
  };

  const handleScrollLeft = () => handleScroll("left");
  const handleScrollRight = () => handleScroll("right");
  // --- End Scrolling Logic ---

  const renderItems = (itemsToRender) => {
    if (!itemsToRender || itemsToRender.length === 0) return null;

    return itemsToRender.map((itemData) => {
      const ratingValue = parseFloat(itemData.rating);
      const shouldShowRating = !isNaN(ratingValue) && ratingValue > 0;

      return (
        <div className="item-card" key={itemData._id}>
          <Link
            to={`/item/${itemData._id}`}
            className="item-link"
            aria-label={`View ${itemData.name}`}
          >
            <div className="item-image-wrapper">
              <img
                src={getFullImageUrl(itemData.imagePath)}
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
              {getDiscountBadge(itemData)}
            </div>
            <div className="item-details">
              {shouldShowRating && (
                <div className="item-rating">
                  <FaStar className="star-icon" />
                  <span>{ratingValue.toFixed(1)}</span>{" "}
                  {/* Display rating, fixed to 1 decimal */}
                </div>
              )}
              <h3 className="item-name" title={itemData.name}>
                {itemData.name}
              </h3>
              {itemData.unit && <p className="item-unit">{itemData.unit}</p>}
              <div className="item-price">
                {itemData.discount &&
                  itemData.originalPrice > itemData.price && (
                    <span className="original-price">
                      {formatPrice(itemData.originalPrice)}
                    </span>
                  )}
                <span className="current-price">
                  {formatPrice(itemData.price)}
                </span>
              </div>
            </div>
          </Link>
        </div>
      );
    });
  };

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
          No items found. Try a different filter!
        </div>
      );

    const itemsToDisplay = displayMode === "row" ? items.slice(0, 20) : items; // Show a bit more in row by default if available

    // Use a wrapper div for the row display to contain arrows
    if (displayMode === "row") {
      return (
        <div className="items-carousel-wrapper">
          {showLeftArrow && ( // Conditionally render left arrow
            <button
              className="carousel-arrow arrow-left"
              onClick={handleScrollLeft}
              aria-label="Scroll left"
            >
              <FaChevronLeft />
            </button>
          )}
          <div
            className="items-row-container"
            ref={itemsContainerRef} // Assign ref here
            onScroll={checkScrollArrows} // Listen for scroll events
          >
            {renderItems(itemsToDisplay)}
          </div>
          {showRightArrow && ( // Conditionally render right arrow
            <button
              className="carousel-arrow arrow-right"
              onClick={handleScrollRight}
              aria-label="Scroll right"
            >
              <FaChevronRight />
            </button>
          )}
          {items.length > itemsToDisplay.length && ( // Show "See More" only if more items exist than shown
            <div className="see-more-container">
              <button className="see-more-button" onClick={handleSeeMoreClick}>
                See All {items.length} Items
              </button>
            </div>
          )}
        </div>
      );
    }

    // Grid display (no arrows)
    return <div className="items-grid">{renderItems(itemsToDisplay)}</div>;
  };

  return (
    <div className="all-items-wrapper">
      <section className="all-items-section container">
        <div className="all-items-header">
          <h2 className="section-heading">{activeFilter.label}</h2>{" "}
          {/* Use active filter label */}
          <div className="filter-dropdown-container" ref={filterDropdownRef}>
            <button
              className="filter-button"
              onClick={toggleFilterDropdown}
              aria-haspopup="true"
              aria-expanded={isFilterOpen}
              aria-controls="filter-menu-list"
            >
              {activeFilter.label}{" "}
              <span className={`arrow ${isFilterOpen ? "up" : "down"}`}>▼</span>
            </button>
            {isFilterOpen && (
              <ul className="filter-menu" role="menu" id="filter-menu-list">
                {filterOptions.map((option) => (
                  <li
                    key={option.key}
                    role="menuitem"
                    tabIndex={0}
                    className={`filter-menu-item ${
                      activeFilter.key === option.key ? "active" : ""
                    }`}
                    onClick={() => handleFilterChange(option)}
                    onKeyDown={(e) =>
                      (e.key === "Enter" || e.key === " ") &&
                      handleFilterChange(option)
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
    </div>
  );
};

export default AllItems;
