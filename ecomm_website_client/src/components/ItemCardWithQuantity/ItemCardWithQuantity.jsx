// src/components/ItemCardWithQuantity/ItemCardWithQuantity.jsx
import React, { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom"; // ⭐ Import useNavigate
import {
  FaHeart,
  FaRegHeart,
  FaStar,
  FaSpinner,
  FaPlus,
  FaMinus,
  FaShoppingCart,
} from "react-icons/fa";
import toast from "react-hot-toast";
import "./ItemCardWithQuantity.css"; // Keep the component-specific CSS
import { AuthContext } from "../../context/AuthContext";
// No need to import CartContext/WishlistContext here if props are passed,
// but useContext(AuthContext) is still used internally.

const ItemCardWithQuantity = ({
  itemData, // itemData contains backend-processed stock
  cartItems, // Cart state from parent (e.g., AllItemsPage or CategoryPage)
  addToCart, // addToCart action from parent
  updateItemQuantity, // updateItemQuantity action from parent
  wishlist, // Wishlist state from parent
  toggleWishlist, // toggleWishlist action from parent
  backendImageBaseUrl,
  placeholderImage,
}) => {
  const [isAdding, setIsAdding] = useState(false); // Local loading state for add/update cart action
  const navigate = useNavigate(); // ⭐ Use useNavigate hook

  const { user } = useContext(AuthContext);

  // Find the item in the cart using the passed cartItems prop
  const cartItem = cartItems.find(
    (ci) => String(ci._id) === String(itemData._id)
  );
  const quantityInCart = cartItem ? cartItem.quantity : 0;

  // Check if the item is in the wishlist using the passed wishlist prop (array of items)
  const isInWishlist =
    wishlist && Array.isArray(wishlist)
      ? wishlist.some(
          (wishlistItem) => String(wishlistItem._id) === String(itemData._id)
        )
      : false;

  // Use the stock value provided by the backend
  const stock = itemData.stock; // This is Infinity or a number from backend
  const isInStock = stock === Infinity || stock > 0; // Item is in stock if managed stock > 0 or unmanaged (Infinity)

  // handleAddToCart uses the passed addToCart prop and itemData.stock
  const handleAddToCart = async () => {
    if (!user) {
      toast.error("Please log in to add items to cart.");
      return;
    }

    if (!isInStock) {
      // Use the derived isInStock state
      toast.error(`Item out of stock!`);
      return;
    }
    // Check if adding 1 exceeds stock (only relevant if not already in cart or quantity is 0)
    // If already in cart, the + button handles the stock check via handleQuantityChange
    if (quantityInCart === 0 && stock !== Infinity && 1 > stock) {
      toast.error(`Only ${stock} of ${itemData.name} available.`);
      // Optionally set quantity to max available? No, keep simple for card view.
      return;
    }

    setIsAdding(true);
    try {
      await addToCart(itemData, 1); // Calls the addToCart prop (which comes from useCart)
    } catch (error) {
      console.error("Error adding to cart:", error);
      // Error toast handled by context/prop
    } finally {
      setIsAdding(false);
    }
  };

  // handleQuantityChange uses the passed updateItemQuantity prop and itemData.stock
  const handleQuantityChange = async (newQuantity) => {
    if (!user) {
      toast.error("Please log in to update cart items.");
      return;
    }

    if (newQuantity < 0) return;

    // Use the stock value provided by the backend
    // stock is already defined above

    if (stock !== Infinity && newQuantity > stock) {
      toast.error(
        `Only ${stock} of ${itemData.name} in stock. Quantity capped at max.`
      );
      newQuantity = stock; // Cap at stock
      // If capping results in 0, the logic below will handle removal
      if (newQuantity === 0) {
        await updateItemQuantity(itemData._id, 0);
      } else if (newQuantity > 0) {
        await updateItemQuantity(itemData._id, newQuantity); // Update with capped quantity
      }
      return; // Exit after handling capped quantity
    }

    // If new quantity is 0, update to 0 (context should handle removing)
    await updateItemQuantity(itemData._id, newQuantity);
  };

  // handleToggleWishlist uses the passed toggleWishlist prop
  const handleToggleWishlist = async () => {
    if (!user) {
      toast.error("Please log in to add items to wishlist.");
      return;
    }
    if (!itemData) return;
    await toggleWishlist(itemData); // Calls the toggleWishlist prop
  };

  const formatPriceToINR = (price) =>
    `₹${Number(price) ? Number(price).toFixed(2) : "0.00"}`;

  // getDiscountBadge uses discountBadgeText if provided by backend, falls back to calculation
  const getDiscountBadge = () => {
    // Prioritize backend provided discountBadgeText if available
    if (itemData.discountBadgeText) {
      return (
        <span className="discount-badge">{itemData.discountBadgeText}</span>
      );
    }
    // Fallback logic if not provided by backend
    // Check based on processed itemData including discount fields
    if (!itemData || itemData.price >= itemData.originalPrice) return null;

    let text = "";
    if (itemData.discountType === "percentage") {
      text = `-${Math.round(itemData.discountValue || 0)}%`;
    } else if (itemData.discountType === "fixed") {
      if (itemData.originalPrice > 0) {
        const percentOff =
          ((itemData.originalPrice - itemData.price) / itemData.originalPrice) *
          100;
        text = `-${Math.round(percentOff)}%`;
      } else {
        return null;
      }
    } else return null;

    return text ? <span className="discount-badge">{text}</span> : null;
  };

  const getFullImageUrl = (itemImagePath) => {
    if (!itemImagePath || itemImagePath === placeholderImage) {
      return placeholderImage;
    }

    if (
      itemImagePath.startsWith("http://") ||
      itemImagePath.startsWith("https://")
    ) {
      return itemImagePath;
    }

    if (itemImagePath.startsWith("/assets/")) {
      return itemImagePath;
    }

    return `${backendImageBaseUrl}/uploads/${
      itemImagePath.startsWith("/") ? itemImagePath.substring(1) : itemImagePath
    }`;
  };

  const finalPlaceholderImage =
    placeholderImage || "/assets/placeholder-image.png";

  // Button state derived from cart quantity, stock, and loading state
  const isCurrentlyAdding = isAdding; // Use local state
  const displayQuantityControl = quantityInCart > 0;

  // Determine button text and disabled state
  let buttonText;
  let buttonDisabled = isCurrentlyAdding || !isInStock; // Always disabled if adding or out of stock

  if (!isInStock) {
    buttonText = "Out of Stock";
  } else if (displayQuantityControl) {
    buttonText = "View in Cart"; // If item is already in cart, show view cart button
    // If in stock and in cart, button is enabled unless adding
    buttonDisabled = isCurrentlyAdding;
  } else {
    buttonText = "Add to Cart";
  }

  return (
    <div
      className={`item-card-qty ${
        stock !== Infinity && stock === 0 ? "out-of-stock" : ""
      }`}
    >
      <div className="item-image-wrapper-qty">
        <Link
          to={`/item/${itemData._id}`}
          className="item-image-link-qty"
          aria-label={`View ${itemData.name}`}
        >
          <img
            src={getFullImageUrl(itemData.imagePath)}
            alt={itemData.name}
            className="item-image-qty"
            loading="lazy"
            onError={(e) => {
              if (e.target.src !== finalPlaceholderImage) {
                e.target.src = finalPlaceholderImage;
              }
            }}
          />
        </Link>
        {getDiscountBadge()}
        {stock !== Infinity && stock === 0 && (
          <div className="out-of-stock-overlay">Out of Stock</div>
        )}

        {toggleWishlist && (
          <button
            className={`action-btn-qty wishlist-btn-qty ${
              isInWishlist ? "active" : ""
            }`}
            title={isInWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
            onClick={(e) => {
              e.stopPropagation();
              handleToggleWishlist();
            }}
          >
            {isInWishlist ? <FaHeart /> : <FaRegHeart />}
          </button>
        )}
      </div>
      <div className="item-details-qty">
        {itemData.rating && parseFloat(itemData.rating) > 0 && (
          <div className="item-rating-qty">
            <FaStar className="star-icon-qty" />
            <span>{parseFloat(itemData.rating).toFixed(1)}</span>
          </div>
        )}
        <Link to={`/item/${itemData._id}`} className="item-name-link-qty">
          <h3 className="item-name-qty" title={itemData.name}>
            {itemData.name}
          </h3>
        </Link>
        {itemData.unit && <p className="item-unit-qty">{itemData.unit}</p>}
        <div className="item-price-qty">
          {itemData.originalPrice &&
            itemData.price < itemData.originalPrice && (
              <span className="original-price-qty">
                {formatPriceToINR(itemData.originalPrice)}
              </span>
            )}
          <span className="current-price-qty">
            {formatPriceToINR(itemData.price)}
          </span>
        </div>
        {/* Removed Out of Stock label here as it's now handled by overlay */}
      </div>
      <div className="item-cart-action-qty">
        {/* Use displayQuantityControl */}
        {displayQuantityControl ? (
          <div className="quantity-control-qty">
            <button
              className="quantity-btn-qty minus"
              onClick={() => handleQuantityChange(quantityInCart - 1)}
              disabled={isCurrentlyAdding || !isInStock || quantityInCart <= 0} // Disable if adding, out of stock, or quantity is already 0
              aria-label="Decrease quantity"
            >
              <FaMinus />
            </button>
            <span className="quantity-text-qty">{quantityInCart}</span>
            <button
              className="quantity-btn-qty plus"
              onClick={() => handleQuantityChange(quantityInCart + 1)}
              aria-label="Increase quantity"
              disabled={
                (stock !== Infinity && quantityInCart >= stock) ||
                isCurrentlyAdding ||
                !isInStock // Disable if stock is managed and quantity is >= stock, or adding, or out of stock
              }
            >
              <FaPlus />
            </button>
          </div>
        ) : (
          // Button for adding to cart or showing out of stock
          <button
            className="add-to-cart-btn-qty"
            onClick={handleAddToCart} // Calls the add to cart function
            // Disable if stock is managed and is 0, or if adding
            disabled={!isInStock || isCurrentlyAdding}
          >
            {isCurrentlyAdding ? (
              <FaSpinner className="fa-spin-fast" />
            ) : (
              <>
                <FaShoppingCart /> {/* Use backend stock for button text */}
                {!isInStock ? "Out of Stock" : "Add to Cart"}
              </>
            )}
          </button>
        )}
        {/* Show stock warning using backend stock and manageStock flag */}
        {stock > 0 && // Stock must be positive
          stock < 10 && // and less than 10
          quantityInCart === 0 && // and item is not already in cart
          itemData.manageStock === true && ( // and stock is managed (use flag from backend)
            <p className="stock-warning-qty">Only {stock} left!</p>
          )}
      </div>
    </div>
  );
};

export default ItemCardWithQuantity;
