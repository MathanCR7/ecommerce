import React, {
  useState,
  useEffect,
  useContext,
  useRef,
  useCallback,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "/assets/main-logo/logo.png"; // Assuming logo is in public/assets
import { AuthContext } from "../../context/AuthContext";
import { getServerBaseUrl, searchSuggestionsApi } from "../../services/api"; // Assuming api.js is in services
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faUser,
  faShoppingBag,
  faSpinner,
  faUserCircle,
  faBox,
  faSignOutAlt,
} from "@fortawesome/free-solid-svg-icons";
import "./Search.css"; // Ensure this CSS file supports the layout and dropdown styles

// --- Constants ---
const DEFAULT_AVATAR_PATH = "/assets/main-logo/default_avatar.png"; // Assuming default avatar is in public/assets
const DEFAULT_ITEM_PLACEHOLDER = "/assets/images/placeholder-item.png"; // Assuming placeholder is in public/assets/images
const SEARCH_DEBOUNCE_DELAY = 2000; // 2 seconds

// --- Debounce Utility Function ---
// Kept from your original code - this is correct
function debounce(func, delay) {
  let timeoutId;
  const debouncedFunc = function (...args) {
    const context = this;
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(context, args);
    }, delay);
  };
  // Added a cancel method as requested
  debouncedFunc.cancel = () => {
    clearTimeout(timeoutId);
  };
  return debouncedFunc;
}

const Search = ({ cartItems }) => {
  // --- State ---
  const [isSticky, setSticky] = useState(false);
  const { user, logout, loading: authLoading } = useContext(AuthContext);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [searchResults, setSearchResults] = useState([]);
  const [isSearchDropdownVisible, setIsSearchDropdownVisible] = useState(false);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [hasSearched, setHasSearched] = useState(false); // To track if a search has been attempted

  const navigate = useNavigate();
  const serverBaseURL = getServerBaseUrl();

  // --- Refs ---
  const searchInputRef = useRef(null);
  const searchDropdownRef = useRef(null);

  // --- Effects ---

  // Sticky Header Effect
  useEffect(() => {
    const handleScroll = () => {
      setSticky(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Click Outside to Close Dropdowns Effect
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close search dropdown
      if (
        searchDropdownRef.current &&
        !searchDropdownRef.current.contains(event.target) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target)
      ) {
        setIsSearchDropdownVisible(false);
      }
      // Close user dropdown (optional, can keep hover logic)
      // if user dropdown had a ref, you'd add similar logic here
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []); // Empty dependency array means this runs once on mount

  // --- Debounced Search Logic ---

  // Memoized debounce function for fetching suggestions
  const debouncedFetchSuggestions = useCallback(
    debounce(async (term) => {
      // This function runs ONLY after the debounce delay if the term is not empty.
      // isLoadingSearch is already set to true by the useEffect below.
      // isSearchDropdownVisible is already set to true by the useEffect below.

      try {
        const response = await searchSuggestionsApi(term);
        const results = response.data.results || [];
        setSearchResults(results);
        setHasSearched(true); // Mark that a search attempt finished
      } catch (error) {
        console.error("Search error:", error);
        setSearchResults([]); // Clear results on error
        setHasSearched(true); // Mark that a search attempt finished
      } finally {
        setIsLoadingSearch(false); // Always turn off loading after the API call finishes
      }
    }, SEARCH_DEBOUNCE_DELAY),
    [] // Dependencies: The debounce function itself doesn't depend on anything that changes.
    // searchSuggestionsApi is assumed to be a stable import.
  );

  // Effect to trigger search based on searchTerm
  useEffect(() => {
    const trimmedSearchTerm = searchTerm.trim();

    if (trimmedSearchTerm) {
      // When user starts typing or term becomes non-empty:
      setIsSearchDropdownVisible(true); // Show dropdown
      setIsLoadingSearch(true); // Show loading spinner immediately
      setHasSearched(false); // Reset hasSearched flag
      setSearchResults([]); // Clear previous results immediately
      // Trigger the debounced API call
      debouncedFetchSuggestions(trimmedSearchTerm);
    } else {
      // If search term becomes empty:
      debouncedFetchSuggestions.cancel?.(); // Cancel any pending debounce
      setIsLoadingSearch(false); // Turn off loading
      setSearchResults([]); // Clear results
      setIsSearchDropdownVisible(false); // Hide dropdown
      setHasSearched(false); // Reset hasSearched flag
    }

    // Cleanup: Cancel debounce on unmount or when effect re-runs (e.g., searchTerm changes)
    return () => {
      debouncedFetchSuggestions.cancel?.();
    };
  }, [searchTerm, debouncedFetchSuggestions]); // Depend on searchTerm and the memoized debounce function

  // --- Handlers ---

  const handleSearchInputChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleResultClick = () => {
    // When a search result is clicked, navigate and then clear the search state
    setIsSearchDropdownVisible(false);
    setSearchTerm(""); // Clear the input field
    setSearchResults([]); // Clear results
    setIsLoadingSearch(false); // Ensure loading is off
    setHasSearched(false); // Reset flag
  };

  const handleLogout = async () => {
    await logout();
    setIsUserDropdownOpen(false);
    // Optionally navigate to homepage or login page after logout
    // navigate("/");
  };

  // --- Helper Functions ---

  const cartItemCount = Array.isArray(cartItems)
    ? cartItems.reduce((sum, item) => sum + (item.qty || 0), 0)
    : 0;

  const getDisplayProfilePicSrc = () => {
    let resolvedPicSrc = DEFAULT_AVATAR_PATH;
    if (user && user.profilePicture) {
      const picPath = user.profilePicture;
      // Check if it's a full URL or a path
      if (picPath.startsWith("http")) {
        resolvedPicSrc = picPath;
      } else {
        // Assume it's a relative path under /uploads
        const relativePath = picPath.startsWith("/")
          ? picPath.substring(1)
          : picPath;
        if (serverBaseURL) {
          // Ensure base URL doesn't end with '/' and relative path doesn't start with '/'
          const base = serverBaseURL.endsWith("/")
            ? serverBaseURL.slice(0, -1)
            : serverBaseURL;
          resolvedPicSrc = `${base}/uploads/${relativePath}`;
        } else {
          // Fallback if serverBaseURL isn't available yet
          resolvedPicSrc = `/uploads/${relativePath}`;
        }
      }
    }
    return resolvedPicSrc;
  };

  const getResultImageUrl = (result) => {
    const placeholder = DEFAULT_ITEM_PLACEHOLDER;
    // Use placeholder if imagePath is missing, includes 'default-item', or 'default-category'
    if (
      !result.imagePath ||
      result.imagePath.includes("default-item") ||
      result.imagePath.includes("default-category")
    ) {
      return placeholder;
    }

    // If it's already a full URL, use it directly
    if (result.imagePath.startsWith("http")) {
      return result.imagePath;
    }

    // Otherwise, assume it's a relative path under /uploads
    const relativePath = result.imagePath.startsWith("/")
      ? result.imagePath.substring(1)
      : result.imagePath;

    if (serverBaseURL) {
      const base = serverBaseURL.endsWith("/")
        ? serverBaseURL.slice(0, -1)
        : serverBaseURL;
      return `${base}/uploads/${relativePath}`;
    } else {
      // Fallback if serverBaseURL isn't available
      return `/uploads/${relativePath}`;
    }
  };

  const currentProfilePicSrc = user
    ? getDisplayProfilePicSrc()
    : DEFAULT_AVATAR_PATH;

  // --- Render ---
  return (
    <>
      <section className={`search ${isSticky ? "active" : ""}`}>
        <div className="container">
          <div className="logo-brand-wrapper">
            <Link aria-label="Homepage" to="/" className="logo-link">
              <img
                src={logo} // Uses the imported logo variable
                alt="ShopSwiftly Logo"
                className="main-logo-img"
              />
            </Link>
            <Link to="/" className="brand-name-link">
              <h1 className="brand-name-text">Fruit Bowl & Co</h1>
            </Link>
          </div>

          <div className="search-box-container">
            <div className="search-box">
              <FontAwesomeIcon icon={faSearch} className="search-box-icon" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search for products, brands..."
                value={searchTerm}
                onChange={handleSearchInputChange}
                onFocus={() => {
                  // Show dropdown on focus if there's a term or previous results/loading
                  if (
                    searchTerm.trim() ||
                    searchResults.length > 0 ||
                    isLoadingSearch ||
                    hasSearched // Also show if a search was attempted and resulted in 0 results
                  ) {
                    setIsSearchDropdownVisible(true);
                  }
                }}
                aria-label="Search products"
                autoComplete="off"
              />
            </div>
            {/* Search Results Dropdown */}
            {isSearchDropdownVisible && (
              <div className="search-results-dropdown" ref={searchDropdownRef}>
                {isLoadingSearch ? (
                  // Show loading state immediately after typing starts
                  <div className="search-dropdown-message">
                    <FontAwesomeIcon icon={faSpinner} spin /> Loading...
                  </div>
                ) : (
                  // Not loading state
                  <>
                    {searchResults.length === 0 &&
                    searchTerm.trim().length > 0 &&
                    hasSearched ? (
                      // Show "No results" only if not loading, results are empty, term is not empty, AND a search finished.
                      <div className="search-dropdown-message">
                        No results found for "{searchTerm}".
                      </div>
                    ) : (
                      // Show results if available and not loading
                      searchResults.map((result) => {
                        let linkTo = "";
                        // Determine the link based on the result type
                        if (result.type === "item") {
                          // Navigate to item detail page using item ID
                          linkTo = `/item/${result._id}`;
                        } else if (result.type === "category") {
                          // Navigate to category page using slug or ID
                          linkTo = `/category/${result.slug || result._id}`;
                        }

                        return (
                          <Link
                            to={linkTo}
                            className="search-result-item"
                            key={`${result.type}-${result._id || result.name}`} // Use type and ID/name for unique key
                            onClick={handleResultClick} // Hide dropdown and clear search on click
                          >
                            <img
                              src={getResultImageUrl(result)}
                              alt={result.name}
                              className="search-result-image"
                              onError={(e) => {
                                // Fallback to default placeholder if image fails to load
                                if (e.target.src !== DEFAULT_ITEM_PLACEHOLDER) {
                                  e.target.src = DEFAULT_ITEM_PLACEHOLDER;
                                }
                              }}
                            />
                            <div className="search-result-details">
                              <span className="search-result-name">
                                {result.name}
                              </span>
                              {/* CHANGE: Display "Item" instead of "Product" for item results */}
                              <span className="search-result-type">
                                {result.type === "item" ? "Item" : "Category"}
                              </span>
                            </div>
                          </Link>
                        );
                      })
                    )}
                    {/* Optional: Show a message like "Type to search" when dropdown is visible but term is empty/loading */}
                    {/* {!isLoadingSearch && searchResults.length === 0 && searchTerm.trim().length === 0 && (
                        <div className="search-dropdown-message">
                          Type to search
                        </div>
                     )} */}
                  </>
                )}
              </div>
            )}
          </div>

          {/* User and Cart Icons */}
          <div className="icons-wrapper">
            {authLoading ? (
              <div
                className="icon-circle-link"
                aria-label="Loading user status"
              >
                <div className="icon-circle">
                  <FontAwesomeIcon icon={faSpinner} spin />
                </div>
              </div>
            ) : user ? (
              // Authenticated User Menu
              <div
                className="user-menu-container"
                onMouseEnter={() => setIsUserDropdownOpen(true)}
                onMouseLeave={() => setIsUserDropdownOpen(false)}
                // Role for accessibility if it contains interactive elements
                role="navigation"
                aria-label="User Account Menu"
              >
                <Link
                  to="/profile"
                  aria-label="User Profile and Menu"
                  className="icon-circle-link"
                  onClick={(e) => {
                    // On small screens, prevent navigation and just toggle dropdown
                    if (window.innerWidth <= 768) {
                      e.preventDefault();
                      setIsUserDropdownOpen((prev) => !prev);
                    }
                    // On larger screens, the hover handles the dropdown, the click navigates
                  }}
                >
                  <div className="icon-circle user-avatar-icon">
                    {/* Use key prop to force re-render if src changes, preventing stale image */}
                    <img
                      key={currentProfilePicSrc}
                      src={currentProfilePicSrc}
                      alt={user.displayName || user.username || "User"}
                      className="user-profile-picture"
                      // referrerpolicy is sometimes needed for cross-origin images like Gravatar
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        // Prevent infinite loop if default image fails
                        e.target.onerror = null;
                        const isDefaultFailing =
                          e.target.src.endsWith(DEFAULT_AVATAR_PATH) ||
                          e.target.src ===
                            new URL(DEFAULT_AVATAR_PATH, window.location.origin)
                              .href;
                        if (!isDefaultFailing) {
                          e.target.src = DEFAULT_AVATAR_PATH;
                        }
                      }}
                    />
                  </div>
                </Link>
                {isUserDropdownOpen && (
                  <div
                    className="user-dropdown"
                    aria-expanded="true"
                    // Optionally add ref={userDropdownRef} here if you add click outside for it
                    // and update the handleClickOutside effect
                  >
                    <div className="dropdown-greeting-header">
                      <p className="dropdown-greeting-username">
                        Hello, {user.displayName || user.username}
                      </p>
                    </div>
                    <hr className="dropdown-divider" />
                    <Link
                      to="/profile"
                      className="dropdown-item"
                      onClick={() => setIsUserDropdownOpen(false)}
                    >
                      <FontAwesomeIcon
                        icon={faUserCircle}
                        className="dropdown-icon"
                      />{" "}
                      My Profile
                    </Link>
                    <Link
                      to="/my-orders"
                      className="dropdown-item"
                      onClick={() => setIsUserDropdownOpen(false)}
                    >
                      <FontAwesomeIcon icon={faBox} className="dropdown-icon" />{" "}
                      My Orders
                    </Link>
                    <hr className="dropdown-divider" />
                    <button
                      onClick={handleLogout}
                      className="dropdown-item dropdown-logout-button"
                      type="button" // Specify type for buttons in forms/components
                    >
                      <FontAwesomeIcon
                        icon={faSignOutAlt}
                        className="dropdown-icon"
                      />{" "}
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // Not Authenticated - Login Link
              <Link
                aria-label="Login or Sign up"
                to="/login"
                className="icon-circle-link"
              >
                <div className="icon-circle">
                  <FontAwesomeIcon icon={faUser} />
                </div>
              </Link>
            )}

            {/* Cart Icon */}
            <div className="cart">
              <Link
                to="/cart"
                className="cart-link"
                aria-label={`View Cart, ${cartItemCount} items`}
              >
                <div className="icon-circle">
                  <FontAwesomeIcon icon={faShoppingBag} />
                  {/* Display cart count badge if items > 0 */}
                  {cartItemCount > 0 && (
                    <span className="cart-count">
                      {cartItemCount > 9 ? "9+" : cartItemCount}
                    </span>
                  )}
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Search;
