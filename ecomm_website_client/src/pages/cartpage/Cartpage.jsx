// src/pages/cartpage/Cartpage.jsx
import React, { useState } from "react";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FaPlus,
  FaMinus,
  FaTimes,
  FaPercentage,
  FaShippingFast,
  FaShoppingBag,
  FaSpinner,
} from "react-icons/fa";
import "./Cartpage.css";
import { useCart } from "../../context/CartContext";
// Import the API service
import api, { getServerBaseUrl } from "../../services/api";

// Removed props - uses hook now
const Cartpage = () => {
  const navigate = useNavigate();
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState(null);
  // Add state for promo application loading
  const [applyingPromo, setApplyingPromo] = useState(false);

  // Get cart state and actions directly from the CartContext
  const {
    cartItems,
    updateItemQuantity,
    removeFromCart,
    loadingCart,
    clearCart,
  } = useCart(); // Added clearCart

  const formatPriceToINR = (price) => {
    const numPrice = Number(price);
    return `₹${isNaN(numPrice) ? "0.00" : numPrice.toFixed(2)}`;
  };

  // Use cartItems from the hook
  // This is the sum of (item.price * item.quantity) for all items, before cart-level promo discount and before tax
  const itemsPrice = cartItems.reduce(
    (sum, item) =>
      sum + (Number(item.price) || 0) * (Number(item.quantity) || 0),
    0
  );

  // --- Promo Code Discount Calculation ---
  let discountAmount = 0; // Cart-level discount from promo code

  if (appliedPromo) {
    const promoMinPurchase = Number(appliedPromo.minPurchase) || 0;
    if (itemsPrice < promoMinPurchase) {
      discountAmount = 0;
      console.log("Applied promo minimum purchase not met:", appliedPromo.code);
    } else {
      if (appliedPromo.discountType === "Percent") {
        discountAmount =
          (itemsPrice * (Number(appliedPromo.discountAmount) || 0)) / 100;
      } else if (appliedPromo.discountType === "Amount") {
        discountAmount = Number(appliedPromo.discountAmount) || 0;
      }

      if (appliedPromo.maxDiscount > 0) {
        discountAmount = Math.min(
          discountAmount,
          Number(appliedPromo.maxDiscount) || Infinity
        );
      }
      discountAmount = Math.min(discountAmount, itemsPrice); // Ensure discount doesn't exceed items price
    }
  }

  // Price after cart-level promo discount, this is the base for sum of taxable values
  const priceAfterPromoDiscount = itemsPrice - discountAmount;

  // --- GST Calculation ---
  let totalCartCgst = 0;
  let totalCartSgst = 0;

  cartItems.forEach((item) => {
    const itemSubtotal =
      (Number(item.price) || 0) * (Number(item.quantity) || 0);
    // Distribute cart-level promo discount proportionally to each item
    const itemPromoDiscountShare =
      itemsPrice > 0 ? (itemSubtotal / itemsPrice) * discountAmount : 0;

    // Calculate taxable value for the item, ensuring it's not negative
    let itemTaxableValue = itemSubtotal - itemPromoDiscountShare;
    itemTaxableValue = Math.max(0, itemTaxableValue);

    if (item.isTaxable && itemTaxableValue > 0) {
      const cgstRate = Number(item.cgstRate) || 0;
      const sgstRate = Number(item.sgstRate) || 0;

      totalCartCgst += (itemTaxableValue * cgstRate) / 100;
      totalCartSgst += (itemTaxableValue * sgstRate) / 100;
    }
  });

  const totalCartGst = totalCartCgst + totalCartSgst;

  // --- Delivery Fee Calculation ---
  const freeDeliveryThreshold = 1000; // Example threshold for free delivery
  const deliveryFeeFixed = 50; // Example fixed delivery fee

  // Delivery fee is based on price *after* discount and *after* tax.
  const amountForDeliveryCheck = priceAfterPromoDiscount + totalCartGst;

  const deliveryFee =
    amountForDeliveryCheck >= freeDeliveryThreshold ? 0 : deliveryFeeFixed;

  // Total amount calculation
  const totalAmount = priceAfterPromoDiscount + totalCartGst + deliveryFee;

  // Free delivery progress calculation
  const moreForFreeDelivery = Math.max(
    0,
    freeDeliveryThreshold - amountForDeliveryCheck
  );
  const progressPercentage =
    freeDeliveryThreshold > 0
      ? (amountForDeliveryCheck / freeDeliveryThreshold) * 100
      : 100;

  // --- Promo Code Application using API ---
  const handleApplyPromoCode = async (e) => {
    e.preventDefault();
    const code = promoCode.trim();
    if (!code) {
      toast.error("Please enter a promo code.");
      return;
    }

    setApplyingPromo(true);
    setAppliedPromo(null);

    try {
      const response = await api.validateCouponApi(code, itemsPrice);

      if (response.data.success) {
        const validatedCoupon = response.data.coupon;
        if (itemsPrice < (Number(validatedCoupon.minPurchase) || 0)) {
          toast.error(
            `Minimum purchase of ${formatPriceToINR(
              Number(validatedCoupon.minPurchase) || 0
            )} required for this code.`
          );
          setAppliedPromo(null);
        } else {
          setAppliedPromo(validatedCoupon);
          toast.success(
            response.data.message ||
              `Promo code "${validatedCoupon.code}" applied!`
          );
        }
      } else {
        toast.error(
          response.data.message || `Invalid or expired promo code "${code}".`
        );
        setAppliedPromo(null);
      }
    } catch (error) {
      console.error(
        "Error applying promo code:",
        error.response?.data || error
      );
      toast.error(
        error.response?.data?.message ||
          `Failed to apply promo code "${code}". Please try again.`
      );
      setAppliedPromo(null);
    } finally {
      setApplyingPromo(false);
      setPromoCode("");
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    toast("Promo code removed.");
  };

  const handleProceedToCheckout = () => {
    if (cartItems.length === 0) {
      toast.error("Your cart is empty. Add some items first!");
      return;
    }
    navigate("/checkout", { state: { appliedPromoFromCart: appliedPromo } });
  };

  const totalCartItemsCount = cartItems.reduce(
    (acc, item) => acc + (Number(item.quantity) || 0),
    0
  );

  const getFullImageUrl = (imagePathSuffix) => {
    const backendBaseUrl = getServerBaseUrl();
    const placeholderImage = "/assets/images/placeholder-item.png";

    if (
      !imagePathSuffix ||
      typeof imagePathSuffix !== "string" ||
      imagePathSuffix.trim() === ""
    ) {
      return placeholderImage;
    }
    if (
      imagePathSuffix.startsWith("http://") ||
      imagePathSuffix.startsWith("https://")
    ) {
      return imagePathSuffix;
    }
    if (imagePathSuffix.startsWith("/assets/")) {
      return imagePathSuffix;
    }
    const cleanBase = backendBaseUrl.endsWith("/")
      ? backendBaseUrl.slice(0, -1)
      : backendBaseUrl;
    let cleanPath = imagePathSuffix;
    if (cleanPath.startsWith("/uploads/")) {
      cleanPath = cleanPath.substring("/uploads/".length);
    } else if (cleanPath.startsWith("/")) {
      cleanPath = cleanPath.substring(1);
    }
    return `${cleanBase}/uploads/${cleanPath}`;
  };

  return (
    <>
      <Header cartItemCount={totalCartItemsCount} />
      <main className="cart-page-main-wrapper">
        <section className="cart-page-section container">
          {cartItems.length === 0 && !loadingCart ? (
            <div className="empty-cart-container">
              <div className="empty-cart-icon">
                <FaShoppingBag />
              </div>
              <h2>Your Cart is Empty</h2>
              <p>Looks like you haven't added anything to your cart yet.</p>
              <Link to="/all-items" className="btn-shop-now-empty-cart">
                Browse Items
              </Link>
            </div>
          ) : (
            <div className="cart-main-layout">
              <div className="cart-items-column">
                <h2>Shopping Cart ({totalCartItemsCount} items)</h2>
                <div className="cart-items-list">
                  {loadingCart && (
                    <div className="cart-items-loading-indicator">
                      <FaSpinner className="fa-spin" /> Updating Cart...
                    </div>
                  )}
                  {cartItems.map((item) => {
                    const productSubtotal =
                      (Number(item.price) || 0) * (Number(item.quantity) || 0);
                    const displayOriginalPrice =
                      item.mrp && Number(item.mrp) > Number(item.price);
                    const itemImageSrc = getFullImageUrl(item.imagePath);
                    const itemImageAlt = item.name || "Item Image";

                    return (
                      <div className="cart-item-row" key={item._id}>
                        <div className="cart-item-row-image">
                          <img
                            src={itemImageSrc}
                            alt={itemImageAlt}
                            onError={(e) => {
                              e.target.src = getFullImageUrl(null);
                            }}
                          />
                        </div>
                        <div className="cart-item-row-details">
                          <h3>{item.name || "Item Name"}</h3>
                          <p className="unit-price">
                            {displayOriginalPrice && (
                              <span className="original-inline-price">
                                {formatPriceToINR(item.mrp)}
                              </span>
                            )}
                            <strong>{formatPriceToINR(item.price)}</strong>
                          </p>
                          {item.unit && (
                            <p className="item-package-size">{item.unit}</p>
                          )}
                        </div>
                        <div className="cart-item-actions-stacked">
                          <div className="cart-item-row-quantity">
                            <button
                              onClick={() =>
                                updateItemQuantity(item._id, item.quantity - 1)
                              }
                              disabled={
                                loadingCart || (Number(item.quantity) || 0) <= 1
                              }
                              aria-label="Decrease quantity"
                            >
                              <FaMinus />
                            </button>
                            <span>{Number(item.quantity) || 0}</span>
                            <button
                              onClick={() =>
                                updateItemQuantity(item._id, item.quantity + 1)
                              }
                              aria-label="Increase quantity"
                              disabled={
                                loadingCart ||
                                (item.stock !== Infinity && // item.stock should now be available
                                  (Number(item.quantity) || 0) >= item.stock)
                              }
                            >
                              <FaPlus />
                            </button>
                          </div>
                          {item.manageStock && // item.manageStock should now be available
                            item.stock > 0 &&
                            item.stock < 10 &&
                            (Number(item.quantity) || 0) > 0 && (
                              <p className="stock-warning-inline">
                                Only {item.stock} left!
                              </p>
                            )}
                          <div className="cart-item-total-remove-group">
                            <div className="cart-item-row-total-price">
                              {formatPriceToINR(productSubtotal)}
                            </div>
                            <div className="cart-item-row-remove">
                              <button
                                onClick={() => removeFromCart(item._id)}
                                aria-label="Remove item"
                                title="Remove item"
                                disabled={loadingCart}
                              >
                                <FaTimes />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <aside className="cart-summary-column">
                <div className="summary-section promo-code-section">
                  <h3>
                    <FaPercentage className="promo-heading-icon" /> Have a Promo
                    Code?
                  </h3>
                  {appliedPromo && discountAmount > 0 ? (
                    <div className="applied-promo-info">
                      {applyingPromo ? (
                        <div className="promo-loading-indicator">
                          <FaSpinner className="fa-spin" /> Checking Code...
                        </div>
                      ) : (
                        <>
                          <p className="applied-promo-code">
                            "{appliedPromo.code}" Applied
                          </p>
                          <p className="applied-promo-desc">
                            {appliedPromo.description ||
                              appliedPromo.title ||
                              "Discount Applied"}
                          </p>
                          <button
                            onClick={handleRemovePromo}
                            className="remove-promo-btn"
                            disabled={loadingCart || applyingPromo}
                          >
                            Remove
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <form
                      onSubmit={handleApplyPromoCode}
                      className="promo-code-form"
                    >
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        placeholder="Enter Promo Code"
                        aria-label="Enter Promo Code"
                        disabled={loadingCart || applyingPromo}
                      />
                      <button
                        type="submit"
                        className="btn-apply-promo"
                        disabled={
                          loadingCart || applyingPromo || !promoCode.trim()
                        }
                      >
                        {applyingPromo ? (
                          <FaSpinner className="fa-spin" />
                        ) : (
                          "Apply"
                        )}
                      </button>
                    </form>
                  )}
                  {appliedPromo &&
                    discountAmount <= 0 &&
                    itemsPrice < (Number(appliedPromo.minPurchase) || 0) && (
                      <div className="promo-min-purchase-notice">
                        Minimum purchase of{" "}
                        {formatPriceToINR(
                          Number(appliedPromo.minPurchase) || 0
                        )}{" "}
                        required for "{appliedPromo.code}".
                        <button
                          onClick={handleRemovePromo}
                          className="remove-promo-btn small"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                </div>

                <div className="summary-section cost-summary-section">
                  <h3>Cost Summary</h3>
                  <div className="cost-row">
                    <span>Items Subtotal:</span>
                    <span>{formatPriceToINR(itemsPrice)}</span>
                  </div>

                  {discountAmount > 0 && appliedPromo && (
                    <div className="cost-row discount">
                      <span>Discount ({appliedPromo.code}):</span>
                      <span>- {formatPriceToINR(discountAmount)}</span>
                    </div>
                  )}

                  {/* Display this subtotal if there was a discount */}
                  {discountAmount > 0 && (
                    <div className="cost-row">
                      <span>Price After Discount:</span>
                      <span>{formatPriceToINR(priceAfterPromoDiscount)}</span>
                    </div>
                  )}

                  {/* GST Details */}
                  {totalCartCgst > 0.009 && ( // Show if CGST is at least 0.01
                    <div className="cost-row">
                      <span>Total CGST:</span>
                      <span>+ {formatPriceToINR(totalCartCgst)}</span>
                    </div>
                  )}
                  {totalCartSgst > 0.009 && ( // Show if SGST is at least 0.01
                    <div className="cost-row">
                      <span>Total SGST:</span>
                      <span>+ {formatPriceToINR(totalCartSgst)}</span>
                    </div>
                  )}
                  {/* Show a zero tax line if items exist but no tax applies */}
                  {itemsPrice > 0 &&
                    totalCartCgst < 0.009 &&
                    totalCartSgst < 0.009 && (
                      <div className="cost-row">
                        <span>Tax:</span>
                        <span>{formatPriceToINR(0)}</span>
                      </div>
                    )}

                  <div className="cost-row">
                    <span>Delivery Fee:</span>
                    <span>
                      {deliveryFee > 0
                        ? `+ ${formatPriceToINR(deliveryFee)}`
                        : "FREE"}
                    </span>
                  </div>
                  <hr className="cost-divider" />
                  <div className="cost-row total">
                    <strong>Total:</strong>
                    <strong>{formatPriceToINR(totalAmount)}</strong>
                  </div>
                </div>

                {deliveryFee > 0 && moreForFreeDelivery > 0 && (
                  <div className="summary-section free-delivery-notice">
                    <div className="free-delivery-text">
                      <FaShippingFast /> Add items worth{" "}
                      {formatPriceToINR(moreForFreeDelivery)} more for FREE
                      Delivery!
                    </div>
                    <div className="delivery-progress-bar-container">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${Math.min(progressPercentage, 100)}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                )}
                {deliveryFee === 0 && freeDeliveryThreshold > 0 && (
                  <div className="summary-section free-delivery-success">
                    <FaShippingFast /> Your order qualifies for FREE Delivery!
                  </div>
                )}

                <button
                  className="btn-proceed-checkout"
                  onClick={handleProceedToCheckout}
                  disabled={loadingCart || cartItems.length === 0}
                >
                  Proceed to Checkout ({formatPriceToINR(totalAmount)})
                </button>
                {cartItems.length > 0 && !loadingCart && (
                  <button
                    className="btn-clear-cart"
                    onClick={clearCart} // Use destructured clearCart
                    disabled={loadingCart || applyingPromo}
                  >
                    Clear Cart
                  </button>
                )}
              </aside>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
};

export default Cartpage;
