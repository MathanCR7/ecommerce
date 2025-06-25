// src/pages/item-details/SingleItemPage.jsx
import React, { useState, useEffect, useCallback, useContext } from "react"; // ⭐ Import useContext
import { useParams, Link, useNavigate } from "react-router-dom";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import {
  FaStar,
  FaPlus,
  FaMinus,
  FaShoppingCart,
  FaCheckCircle,
  FaRegHeart,
  FaHeart,
  FaSpinner,
} from "react-icons/fa";
import toast from "react-hot-toast";
import api, { getServerBaseUrl } from "../../services/api";
import "./SingleItemPage.css";
import { AuthContext } from "../../context/AuthContext"; // ⭐ Import AuthContext itself
import { useCart } from "../../context/CartContext";
import { useWishlist } from "../../context/WishlistContext";

// Removed cartItems, addToCart, updateItemQuantity props. Use hooks instead.
const SingleItemPage = ({ allItemsData }) => {
  // Keep allItemsData prop from App.jsx
  const { itemId } = useParams();
  const navigate = useNavigate();

  const [itemData, setItemData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [quantity, setQuantity] = useState(1); // Local quantity state for the input field
  const [activeImage, setActiveImage] = useState("");
  const [thumbnails, setThumbnails] = useState([]);
  const [isInteractingWithCart, setIsInteractingWithCart] = useState(false);

  const placeholderImage = "/assets/images/placeholder-item.png";
  const backendImageRootUrl = getServerBaseUrl();

  // ⭐ Use useContext(AuthContext) instead of useAuth()
  const { user } = useContext(AuthContext);
  // ⭐ Use useCart hook to get cart state and actions
  const { cartItems, addToCart, updateItemQuantity } = useCart();
  // ⭐ Use useWishlist hook to get wishlist state and actions
  const { wishlistItems, toggleWishlist } = useWishlist();
  // ⭐ isInWishlist is now derived directly from wishlistItems state
  const isInWishlist = wishlistItems.some(
    (wishlistItem) => String(wishlistItem._id) === String(itemData?._id) // Ensure comparison is consistent
  );

  const getFullImageUrl = useCallback(
    (imagePathSuffix) => {
      if (
        !imagePathSuffix ||
        imagePathSuffix === placeholderImage ||
        imagePathSuffix.startsWith("/assets/")
      ) {
        return imagePathSuffix;
      }
      if (imagePathSuffix.startsWith("http")) {
        return imagePathSuffix;
      }
      return `${backendImageRootUrl}/uploads/${
        imagePathSuffix.startsWith("/")
          ? imagePathSuffix.substring(1)
          : imagePathSuffix
      }`;
    },
    [backendImageRootUrl, placeholderImage]
  );

  useEffect(() => {
    const fetchItem = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/items/${itemId}`); // Public endpoint
        console.log("[SingleItemPage] Fetch response:", response.data); // Log the response data

        if (response.data && response.data.success && response.data.item) {
          const apiItem = response.data.item;
          // --- MODIFICATION START ---
          // Remove manual stock calculation - use stock and manageStock directly from backend
          // The backend now calculates effective stock (Infinity or number) and sends manageStock.
          // No need for complex stock processing here when setting state.
          const processedItem = {
            ...apiItem,
            _id: apiItem._id, // Ensure _id exists
            // Use stock and manageStock directly from the backend response
            stock: apiItem.stock,
            manageStock: apiItem.manageStock,
            originalPrice:
              parseFloat(apiItem.originalPrice) ||
              parseFloat(apiItem.mrp) ||
              parseFloat(apiItem.price) ||
              0, // Use originalPrice from backend if available, fallback to mrp/price
            price: parseFloat(apiItem.price) || 0, // Use calculated price from backend
            // Ensure discount fields are present
            discountType: apiItem.discountType,
            discountValue: apiItem.discountValue,
            rating: apiItem.rating || (Math.random() * 1.8 + 3.2).toFixed(1), // Fallback rating
            unit:
              apiItem.unit ||
              (apiItem.weight
                ? `${apiItem.weight} ${apiItem.dimensions?.unit || "gm"}`
                : null) ||
              "1 unit", // Unit fallback logic
          };
          // Quick check if price calculation went wrong - fallback to 0
          if (isNaN(processedItem.price)) processedItem.price = 0;
          if (isNaN(processedItem.originalPrice))
            processedItem.originalPrice = processedItem.price;

          setItemData(processedItem);
          // --- MODIFICATION END ---
        } else {
          throw new Error(
            response.data?.message || "Item not found or invalid response."
          );
        }
      } catch (err) {
        console.error("Error fetching item:", err);
        setError(
          err.response?.data?.message ||
            err.message ||
            "Failed to fetch item details."
        );
        setItemData(null);
      } finally {
        setLoading(false);
      }
    };
    if (itemId) {
      fetchItem();
    } else {
      setError("No item ID provided.");
      setLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    if (itemData) {
      const imageList = itemData.images || [];
      let primaryImgPath = placeholderImage;

      if (imageList.length > 0) {
        const primaryImageObj =
          imageList.find((img) => img.isPrimary) || imageList[0];
        primaryImgPath = getFullImageUrl(primaryImageObj.path);
        setThumbnails(
          imageList.map((img) => ({
            id: img._id || img.path,
            path: getFullImageUrl(img.path),
            altText: img.altText || itemData.name,
          }))
        );
      } else if (itemData.imagePath) {
        // Fallback for older imagePath field
        primaryImgPath = getFullImageUrl(itemData.imagePath);
        setThumbnails([
          { id: "main", path: primaryImgPath, altText: itemData.name },
        ]);
      } else {
        setThumbnails([
          { id: "placeholder", path: placeholderImage, altText: itemData.name },
        ]);
      }
      setActiveImage(primaryImgPath);

      // Update quantity state based on cartItems from context
      const cartItem = cartItems.find(
        // Get cartItems from context
        (ci) => String(ci._id) === String(itemData._id)
      );
      // Set quantity to existing cart quantity if item is in cart, otherwise 1
      setQuantity(cartItem ? cartItem.quantity : 1);

      // isInWishlist is now derived state, doesn't need useEffect dependency here
    }
    // Add getFullImageUrl, cartItems as dependencies for the second effect
    // because getFullImageUrl is used inside, and quantity depends on cartItems
  }, [itemData, cartItems, getFullImageUrl, placeholderImage]);

  const handleQuantityChange = (amount) => {
    setQuantity((prevQuantity) => {
      const newQuantity = prevQuantity + amount;
      if (newQuantity < 1) return 1;

      // Use the stock value provided by the backend
      const stock = itemData?.stock; // This is Infinity or a number from backend

      if (stock !== Infinity && newQuantity > stock) {
        toast.error(`Only ${stock} units available.`);
        return stock > 0 ? stock : 1; // Cap at stock or 1 if stock is 0
      }
      return newQuantity;
    });
  };

  // Updated handleCartAction to check login and use useCart hook's functions, using itemData.stock
  const handleCartAction = async () => {
    if (!user) {
      toast.error("Please log in to add items to cart.");
      return;
    }
    if (!itemData) {
      toast.error("Item data not loaded.");
      return;
    }

    // Use the stock value provided by the backend
    const stock = itemData.stock; // This is Infinity or a number from backend

    if (stock !== Infinity && stock === 0) {
      // Use processed stock
      toast.error(`${itemData.name} is out of stock.`);
      return;
    }
    // Check quantity against stock before any action
    if (stock !== Infinity && quantity > stock) {
      // Use processed stock
      toast.error(
        `Cannot add/update with ${quantity}. Only ${stock} of ${itemData.name} in stock.`
      );
      // Optionally set quantity to stock and let the user try again
      if (stock > 0) setQuantity(stock);
      else setQuantity(1); // Default to 1 if stock is 0, though button should be disabled
      return; // Prevent action with invalid quantity
    }

    setIsInteractingWithCart(true);
    const existingCartItem = cartItems.find(
      // Get cartItems from context
      (ci) => String(ci._id) === String(itemData._id)
    );
    let navigatedToCart = false;

    try {
      if (existingCartItem) {
        if (existingCartItem.quantity !== quantity) {
          // Update quantity if it changed
          await updateItemQuantity(itemData._id, quantity); // Uses useCart hook
          // Context will update cartItems state and show toast
          // Wait for state update before potentially navigating
          // (Consider adding a state update indicator to useCart context)
        } else {
          // If quantity is the same, just navigate to cart
          navigate("/cart");
          navigatedToCart = true; // Flag that navigation occurred
        }
      } else {
        // Add item to cart if not already there
        await addToCart(itemData, quantity); // Uses useCart hook
        // Context will update cartItems state and show toast
        // Wait for state update before potentially navigating
        // (Consider adding a state update indicator to useCart context)
      }
    } catch (err) {
      console.error("Error interacting with cart:", err);
      // Error toast handled by context/prop
    } finally {
      // Only set interacting state to false if we didn't navigate
      if (!navigatedToCart) {
        // Allow a brief moment for state update before showing the final button state
        setTimeout(() => setIsInteractingWithCart(false), 300);
      }
    }
  };

  // New function to handle toggling wishlist using the hook, with login check
  const handleToggleWishlist = async () => {
    if (!user) {
      toast.error("Please log in to add items to wishlist.");
      return;
    }
    if (!itemData) return;
    // Pass the full item object to the context action
    await toggleWishlist(itemData); // Uses useWishlist hook
    // isInWishlist derived state will automatically update UI
  };

  if (loading) {
    // Get totalCartItemCount from useCart state (even while loading item details)
    const totalCartItemCount = cartItems.reduce(
      (sum, item) => sum + item.quantity,
      0
    );
    return (
      <>
        <Header cartItemCount={totalCartItemCount} />
        <div
          className="single-item-page-container container"
          style={{
            minHeight: "70vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <FaSpinner
            className="fa-spin"
            style={{ fontSize: "3rem", color: "var(--primary-color)" }}
          />
        </div>
        <Footer />
      </>
    );
  }

  // Get totalCartItemCount from useCart state for error/not found states
  const totalCartItemCount = cartItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  if (error) {
    return (
      <>
        <Header cartItemCount={totalCartItemCount} />
        <div
          className="container single-item-container"
          style={{ padding: "40px 0", minHeight: "60vh", textAlign: "center" }}
        >
          <h2>Error Loading Item</h2>
          <p>{error}</p>
          <Link
            to="/all-items"
            className="btn-primary"
            style={{ marginTop: "20px", display: "inline-block" }}
          >
            Browse Other Items
          </Link>
        </div>
        <Footer />
      </>
    );
  }

  if (!itemData) {
    return (
      <>
        <Header cartItemCount={totalCartItemCount} />
        <div
          className="container single-item-container"
          style={{ padding: "40px 0", minHeight: "60vh", textAlign: "center" }}
        >
          <h2>Item Not Found</h2>
          <p>
            The item you are looking for might have been removed or is
            temporarily unavailable.
          </p>
          <Link
            to="/all-items"
            className="btn-primary"
            style={{ marginTop: "20px", display: "inline-block" }}
          >
            Browse Other Items
          </Link>
        </div>
        <Footer />
      </>
    );
  }

  // Use the stock value provided by the backend
  const stock = itemData.stock; // This is Infinity or a number from backend
  const isInStock = stock === Infinity || stock > 0; // Item is in stock if managed stock > 0 or unmanaged (Infinity)

  const displayPrice = parseFloat(itemData.price || 0).toFixed(2);
  const originalPrice =
    itemData.originalPrice &&
    parseFloat(itemData.originalPrice) > parseFloat(itemData.price || 0)
      ? parseFloat(itemData.originalPrice).toFixed(2)
      : null;
  const totalAmount = isInStock
    ? (parseFloat(itemData.price || 0) * quantity).toFixed(2)
    : "0.00";
  const itemUnit =
    itemData.unit ||
    (itemData.weight
      ? `${itemData.weight} ${itemData.dimensions?.unit || "gm"}`
      : null);

  // Re-evaluate currentCartItem inside render based on potentially updated cartItems prop
  const currentCartItem = cartItems.find(
    // Get cartItems from context
    (ci) => String(ci._id) === String(itemData._id)
  );
  const isItemInCartWithCurrentQuantity =
    currentCartItem && currentCartItem.quantity === quantity;

  let buttonText;
  let buttonAction = handleCartAction; // Default action
  // Disable button if interacting, out of stock (based on backend value), or quantity is invalid (>= 1 is minimum for adding/updating)
  let buttonDisabled =
    isInteractingWithCart ||
    !isInStock ||
    quantity < 1 ||
    (stock !== Infinity && quantity > stock);

  if (!isInStock) {
    buttonText = "Out of Stock";
  } else if (currentCartItem) {
    // If item is in cart, text depends on whether the displayed quantity matches the cart quantity
    buttonText = isItemInCartWithCurrentQuantity
      ? "View in Cart"
      : "Update Cart";
  } else {
    buttonText = "Add to Cart";
  }

  // If the button is 'View in Cart' and not interacting, clicking navigates
  if (isItemInCartWithCurrentQuantity && !isInteractingWithCart && isInStock) {
    buttonAction = () => navigate("/cart");
    buttonDisabled = false; // Enable if it's just navigation
  } else {
    buttonAction = handleCartAction; // Otherwise, use the standard action
    // Recalculate disabled state based on stock and quantity validity for add/update action
    buttonDisabled =
      isInteractingWithCart ||
      !isInStock ||
      quantity < 1 ||
      (stock !== Infinity && quantity > stock);
  }

  return (
    <>
      <Header cartItemCount={totalCartItemCount} />
      <div className="single-item-page-container container">
        <div className="item-detail-breadcrumb">
          <Link to="/">Home</Link> /{" "}
          <Link
            to={
              itemData.category?.slug
                ? `/category/${itemData.category.slug}`
                : "/categories"
            }
          >
            {itemData.category?.name || "Items"}
          </Link>{" "}
          / <span>{itemData.name}</span>
        </div>

        <div className="item-detail-layout">
          <div className="item-gallery-column">
            <div className="main-image-container">
              <img
                src={activeImage}
                alt={itemData.name}
                className="main-item-image-display"
                onError={(e) => {
                  e.target.src = placeholderImage;
                }}
              />
              {/* Use handleToggleWishlist function */}
              <button
                className={`wishlist-icon-main-image ${
                  isInWishlist ? "active" : ""
                }`}
                aria-label={
                  isInWishlist ? "Remove from wishlist" : "Add to wishlist"
                }
                onClick={handleToggleWishlist}
              >
                {isInWishlist ? <FaHeart /> : <FaRegHeart />}
              </button>
            </div>
            {thumbnails && thumbnails.length > 1 && (
              <div className="thumbnail-gallery-single">
                {thumbnails.map((thumb, index) => (
                  <button
                    key={thumb.id || index}
                    className={`thumbnail-button-single ${
                      thumb.path === activeImage ? "active" : ""
                    }`}
                    onClick={() => setActiveImage(thumb.path)}
                    aria-label={`View image ${index + 1} of ${itemData.name}`}
                  >
                    <img
                      src={thumb.path}
                      alt={
                        thumb.altText ||
                        `${itemData.name} thumbnail ${index + 1}`
                      }
                      onError={(e) => {
                        e.target.src = placeholderImage;
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="item-info-column-single">
            <h1 className="item-title-single">{itemData.name}</h1>
            <div className="item-meta-info-single">
              {itemData.rating && parseFloat(itemData.rating) > 0 && (
                <span className="rating-display-single">
                  <FaStar /> {parseFloat(itemData.rating).toFixed(1)}
                </span>
              )}
              {/* Use backend stock value for display */}
              <span
                className={`stock-status-single ${
                  isInStock ? "in-stock" : "out-of-stock"
                }`}
              >
                {isInStock
                  ? `In Stock (${stock === Infinity ? "Available" : stock})`
                  : "Out of Stock"}
              </span>
            </div>
            {itemUnit && <p className="item-unit-info-single">{itemUnit}</p>}
            <div className="pricing-section-single">
              {originalPrice && (
                <span className="original-price-display-single">
                  ₹{originalPrice}
                </span>
              )}
              <span className="current-price-display-single">
                ₹{displayPrice}
              </span>
            </div>
            {itemData.shortDescription && (
              <p className="item-short-desc-single">
                {itemData.shortDescription}
              </p>
            )}
            {isInStock && (
              <div className="total-amount-section-single">
                <p className="total-amount-label-single">Total Amount:</p>
                <p className="total-amount-value-single">₹{totalAmount}</p>
              </div>
            )}
            {isInStock && (
              <div className="quantity-control-single">
                <button
                  onClick={() => handleQuantityChange(-1)}
                  disabled={quantity <= 1 || isInteractingWithCart} // Disable if quantity is 1 or less or interacting with cart
                  aria-label="Decrease quantity"
                >
                  <FaMinus />
                </button>
                <span className="quantity-value-single">{quantity}</span>
                <button
                  onClick={() => handleQuantityChange(1)}
                  disabled={
                    // Disable if stock is managed and quantity is >= stock, or interacting with cart
                    (stock !== Infinity && quantity >= stock) ||
                    isInteractingWithCart
                  }
                  aria-label="Increase quantity"
                >
                  <FaPlus />
                </button>
              </div>
            )}
            <button
              className={`add-to-cart-btn-single ${
                !isInStock || buttonDisabled ? "disabled-cart" : ""
              } ${
                isItemInCartWithCurrentQuantity && !isInteractingWithCart
                  ? "already-added"
                  : ""
              }`}
              onClick={buttonAction}
              disabled={buttonDisabled} // Use the calculated buttonDisabled state
            >
              {isInteractingWithCart ? (
                <FaSpinner className="fa-spin-fast" />
              ) : isItemInCartWithCurrentQuantity && !isInteractingWithCart ? (
                // If already in cart and quantity matches, show View in Cart
                <>
                  {" "}
                  <FaCheckCircle /> {buttonText}{" "}
                </>
              ) : (
                // Otherwise, show Add or Update Cart
                <>
                  {" "}
                  <FaShoppingCart /> {buttonText}{" "}
                </>
              )}
            </button>
          </div>
        </div>
        {itemData.description && (
          <div className="item-full-description-single">
            <h3>Description</h3>
            <p>{itemData.description}</p>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
};

export default SingleItemPage;
