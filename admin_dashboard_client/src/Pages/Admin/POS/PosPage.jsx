// src/Pages/Admin/POS/PosPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import "./PosPage.css"; // We will update this file
import ProductGridItem from "./components/ProductGridItem";
import CustomerSearch from "./components/CustomerSearch";
import AddCustomerModal from "./components/AddCustomerModal";
import {
  FaPlus,
  FaTrash,
  FaRedo,
  FaSearch,
  FaFilter,
  FaTimes,
  FaSpinner,
  FaExclamationTriangle,
} from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { debounce } from "lodash";
import itemService from "../../../Services/itemService";
import categoryService from "../../../Services/categoryService";
import posOrderService from "../../../Services/posOrderService";
import { useAuth } from "../../../Context/AuthContext";

const PosPage = () => {
  const { admin } = useAuth();
  const [displayedItems, setDisplayedItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [searchTermItems, setSearchTermItems] = useState("");
  const [cart, setCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState({
    _id: "walkin",
    name: "Walk-in Customer",
    phone: "",
  });
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [branch, setBranch] = useState("Main");
  const [orderType, setOrderType] = useState("Take Away");
  const [extraDiscount, setExtraDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(0.05);
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [pageError, setPageError] = useState(null);

  const fetchCategoriesData = useCallback(async () => {
    setIsLoadingCategories(true);
    try {
      const categoriesData = await categoryService.getAllCategories();
      if (categoriesData && Array.isArray(categoriesData)) {
        setCategories(categoriesData);
      } else if (
        categoriesData &&
        categoriesData.success &&
        Array.isArray(categoriesData.categories)
      ) {
        setCategories(categoriesData.categories);
      } else {
        setCategories([]);
        console.warn("Unexpected categories data format:", categoriesData);
      }
    } catch (err) {
      console.error("Failed to load POS categories:", err);
      toast.error(err.message || "Could not load categories.");
      setCategories([]);
    } finally {
      setIsLoadingCategories(false);
    }
  }, []);

  useEffect(() => {
    fetchCategoriesData();
  }, [fetchCategoriesData]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchItemsData = useCallback(
    debounce(async (catId, term) => {
      setIsLoadingItems(true);
      setPageError(null);
      try {
        const itemsData = await itemService.getAllAdminItems(catId, term);
        setDisplayedItems(Array.isArray(itemsData) ? itemsData : []);
      } catch (err) {
        console.error("Failed to load POS items:", err);
        setPageError(err.message || "Could not load items. Please try again.");
        toast.error(err.message || "Could not load items.");
        setDisplayedItems([]);
      } finally {
        setIsLoadingItems(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    fetchItemsData(selectedCategoryId, searchTermItems);
  }, [selectedCategoryId, searchTermItems, fetchItemsData]);

  const addToCart = (item) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find(
        (cartItem) => cartItem._id === item._id
      );
      if (existingItem) {
        return prevCart.map((cartItem) =>
          cartItem._id === item._id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }
      return [
        ...prevCart,
        { ...item, quantity: 1, itemId: item._id, priceAtPurchase: item.price },
      ];
    });
    toast.success(`${item.name} added to cart!`, { autoClose: 1500 });
  };

  const updateQuantity = (itemId, amount) => {
    setCart((prevCart) =>
      prevCart
        .map((item) =>
          item._id === itemId
            ? { ...item, quantity: Math.max(1, item.quantity + amount) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (itemId) => {
    const itemToRemove = cart.find((item) => item._id === itemId);
    setCart((prevCart) => prevCart.filter((item) => item._id !== itemId));
    if (itemToRemove)
      toast.info(`${itemToRemove.name} removed from cart.`, {
        autoClose: 1500,
      });
  };

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    toast.info(`Customer set to: ${customer.name}`, { autoClose: 2000 });
  };

  const handleAddNewCustomer = (newlySavedCustomer) => {
    setSelectedCustomer(newlySavedCustomer);
    setIsAddCustomerModalOpen(false);
    toast.success(
      `New customer "${newlySavedCustomer.name}" added and selected.`
    );
  };

  const subTotal = cart.reduce(
    (sum, item) => sum + item.priceAtPurchase * item.quantity,
    0
  );
  const productDiscountTotal = 0; // Placeholder if you add per-product discounts later
  const totalDiscount = productDiscountTotal + parseFloat(extraDiscount || 0);
  const taxableAmount = subTotal - totalDiscount;
  const taxAmount = taxableAmount * taxRate;
  const currentDeliveryCharge =
    orderType === "Home Delivery" ? parseFloat(deliveryCharge || 0) : 0;
  const total = taxableAmount + taxAmount + currentDeliveryCharge;

  const resetOrderState = () => {
    setCart([]);
    setExtraDiscount(0);
    setDeliveryCharge(0);
    setSelectedCustomer({ _id: "walkin", name: "Walk-in Customer", phone: "" });
    setOrderType("Take Away");
    setBranch("Main"); // Or your default branch
  };

  const handlePlaceOrder = async () => {
    if (!cart.length) {
      toast.error("Cart is empty!");
      return;
    }
    if (!admin || !admin._id) {
      toast.error("Admin user not identified. Cannot place order.");
      return;
    }
    setIsPlacingOrder(true);

    const orderDetailsPayload = {
      customer: selectedCustomer._id !== "walkin" ? selectedCustomer._id : null,
      customerName: selectedCustomer.name,
      customerPhone: selectedCustomer.phone,
      branch,
      orderType,
      items: cart.map((ci) => ({
        itemId: ci.itemId, // Ensure this matches your backend model (often just 'item' or 'product')
        quantity: ci.quantity,
        priceAtPurchase: ci.priceAtPurchase,
        // Add name/image if needed for display on backend/receipts, but keep payload minimal
        // name: ci.name,
        // imagePath: ci.imagePath
      })),
      subTotal,
      productDiscount: productDiscountTotal, // Sum of discounts on individual products if applicable
      extraDiscount: parseFloat(extraDiscount || 0),
      taxRate,
      taxAmount,
      deliveryCharge: currentDeliveryCharge,
      totalAmount: total,
      paymentMethod: "Cash", // Or add payment method selection
      status: "Pending", // Initial status
      createdBy: admin._id, // Link to the admin user who created the order
    };

    try {
      const createdOrder = await posOrderService.createOrder(
        orderDetailsPayload
      );
      toast.success(`Order #${createdOrder.orderNumber} placed successfully!`);
      resetOrderState();
    } catch (err) {
      console.error("Failed to place order:", err);
      toast.error(err.message || "Failed to place order. Please try again.");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleCancelOrder = () => {
    resetOrderState();
    toast.warn("Order cancelled.");
  };

  // Error display for item loading failure specifically
  const renderItemLoadingError = () => (
    <div className="pos-page-error-container item-load-error">
      <FaExclamationTriangle size={40} className="error-icon" />
      <h4>Oops! Couldn't Load Items</h4>
      <p>{pageError}</p>
      <button
        onClick={() => fetchItemsData(selectedCategoryId, searchTermItems)}
        className="btn-pos-action btn-retry"
      >
        <FaRedo /> Retry Loading
      </button>
    </div>
  );

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
      <div className="pos-page">
        <div className="product-section-pos">
          {/* Item Search and Filter Controls */}
          <div className="pos-item-controls">
            <div className="item-search-control">
              <FaSearch className="control-icon" />
              <input
                type="text"
                placeholder="Search items by name..."
                value={searchTermItems}
                onChange={(e) => setSearchTermItems(e.target.value)}
              />
            </div>
            <div className="category-filter-control">
              <FaFilter className="control-icon" />
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                disabled={isLoadingCategories}
              >
                <option value="">All Categories</option>
                {isLoadingCategories ? (
                  <option disabled>Loading...</option>
                ) : (
                  categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Product Grid Area */}
          {isLoadingItems ? (
            <div className="pos-loading-spinner">
              <FaSpinner className="fa-spin" size={50} />
              <p>Loading Items...</p>
            </div>
          ) : pageError ? (
            renderItemLoadingError()
          ) : (
            <div className="product-grid-pos">
              {displayedItems.length > 0 ? (
                displayedItems.map((item) => (
                  <ProductGridItem
                    key={item._id}
                    item={item}
                    onAddToCart={addToCart}
                    // Assuming ProductGridItem has internal styling via its own class
                    // or pass specific classes if needed
                  />
                ))
              ) : (
                <p className="no-items-message">
                  😕 No items found matching your criteria. Try adjusting the
                  search or filter.
                </p>
              )}
            </div>
          )}
        </div>
        {/* Billing Section */}
        <div className="billing-section-pos">
          <div className="billing-header">
            <h3>Current Order</h3>
          </div>

          <CustomerSearch
            selectedCustomer={selectedCustomer}
            onSelectCustomer={handleSelectCustomer}
            onAddNew={() => setIsAddCustomerModalOpen(true)}
            // Pass class names if CustomerSearch needs specific styling within this context
          />

          {/* Order Options */}
          <div className="billing-options">
            <div className="form-group-pos">
              <label htmlFor="branchSelect">Branch</label>
              <select
                id="branchSelect"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
              >
                <option value="Main">Main</option>
                <option value="Branch B">Branch B</option>
                {/* Add other branches as needed */}
              </select>
            </div>
            <div className="form-group-pos order-type-group">
              <label>Order Type</label>
              <div className="button-group">
                <button
                  className={`btn-toggle ${
                    orderType === "Take Away" ? "active" : ""
                  }`}
                  onClick={() => setOrderType("Take Away")}
                >
                  Take Away
                </button>
                <button
                  className={`btn-toggle ${
                    orderType === "Home Delivery" ? "active" : ""
                  }`}
                  onClick={() => setOrderType("Home Delivery")}
                >
                  Home Delivery
                </button>
              </div>
            </div>
          </div>

          {/* Cart Items */}
          <div className="cart-items-pos">
            <h4 className="cart-title">Cart Items ({cart.length})</h4>
            {cart.length === 0 ? (
              <p className="empty-cart-message">
                <img
                  src="/path-to-empty-cart-icon.svg"
                  alt=""
                  width="50"
                  style={{ marginBottom: "10px", opacity: 0.6 }}
                />{" "}
                <br />
                Your cart is waiting for items!
              </p>
            ) : (
              <ul className="cart-list">
                {cart.map((item) => (
                  <li key={item._id} className="cart-list-item">
                    <img
                      src={
                        item.imagePath
                          ? `${(
                              import.meta.env.VITE_API_BASE_URL || ""
                            ).replace(
                              "/api",
                              ""
                            )}/uploads/${item.imagePath.replace(/\\/g, "/")}`
                          : "https://via.placeholder.com/50?text=N/A" // Slightly larger placeholder
                      }
                      alt={item.name}
                      className="cart-item-image_pos"
                    />
                    <div className="cart-item-info_pos">
                      <span className="cart-item-name_pos">{item.name}</span>
                      <span className="cart-item-price_pos">
                        ${item.priceAtPurchase.toFixed(2)}
                      </span>
                    </div>
                    <div className="cart-item-qty_pos">
                      <button
                        className="qty-btn minus"
                        onClick={() => updateQuantity(item._id, -1)}
                        aria-label="Decrease quantity"
                      >
                        -
                      </button>
                      <span className="qty-value">{item.quantity}</span>
                      <button
                        className="qty-btn plus"
                        onClick={() => updateQuantity(item._id, 1)}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                    <span className="cart-item-total_pos">
                      ${(item.priceAtPurchase * item.quantity).toFixed(2)}
                    </span>
                    <button
                      onClick={() => removeFromCart(item._id)}
                      className="remove-item-btn_pos"
                      aria-label="Remove item"
                    >
                      <FaTimes />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Billing Summary */}
          <div className="billing-summary-pos">
            <div className="summary-row">
              <span>Subtotal</span> <span>${subTotal.toFixed(2)}</span>
            </div>
            {/* Optional: Add product discount display here if needed */}
            {/* <div className="summary-row">
<span>Product Discount</span> <span className="discount-value">-${productDiscountTotal.toFixed(2)}</span>
</div> */}
            <div className="summary-row input-row">
              <label htmlFor="extraDiscount">Extra Discount ($)</label>
              <span>
                <input
                  id="extraDiscount"
                  type="number"
                  min="0"
                  step="0.01" // Allow cents
                  value={extraDiscount}
                  onChange={(e) =>
                    setExtraDiscount(
                      Math.max(0, parseFloat(e.target.value) || 0)
                    )
                  }
                  placeholder="0.00"
                  className="summary-input"
                />
              </span>
            </div>
            <div className="summary-row">
              <span>Tax ({(taxRate * 100).toFixed(0)}%)</span>{" "}
              <span>+ ${taxAmount.toFixed(2)}</span>
            </div>
            {orderType === "Home Delivery" && (
              <div className="summary-row input-row">
                <label htmlFor="deliveryCharge">Delivery Charge ($)</label>
                <span>
                  <input
                    id="deliveryCharge"
                    type="number"
                    min="0"
                    step="0.01"
                    value={deliveryCharge}
                    onChange={(e) =>
                      setDeliveryCharge(
                        Math.max(0, parseFloat(e.target.value) || 0)
                      )
                    }
                    placeholder="0.00"
                    className="summary-input"
                  />
                </span>
              </div>
            )}
            <div className="summary-divider"></div>
            <div className="summary-row total">
              <span>TOTAL</span> <span>${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="billing-actions-pos">
            <button
              className="btn-pos-action btn-cancel"
              onClick={handleCancelOrder}
              disabled={isPlacingOrder || cart.length === 0} // Also disable cancel if cart is empty? Optional.
            >
              <FaRedo /> Cancel Order
            </button>
            <button
              className="btn-pos-action btn-place-order"
              onClick={handlePlaceOrder}
              disabled={isPlacingOrder || cart.length === 0}
            >
              {isPlacingOrder ? <FaSpinner className="fa-spin" /> : <FaPlus />}{" "}
              {isPlacingOrder ? "Placing..." : "Place Order"}
            </button>
          </div>
        </div>{" "}
        {/* End Billing Section */}
        {/* Add Customer Modal */}
        {isAddCustomerModalOpen && (
          <AddCustomerModal
            onClose={() => setIsAddCustomerModalOpen(false)}
            onSave={handleAddNewCustomer}
          />
        )}
      </div>{" "}
      {/* End PosPage */}
    </>
  );
};

export default PosPage;
