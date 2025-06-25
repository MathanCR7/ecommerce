import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import toast from "react-hot-toast";
import { AuthContext } from "./AuthContext";
import {
  getCartApi,
  addToCartApi,
  removeFromCartApi,
  clearCartApi,
} from "../services/api"; // We'll add these to api.js

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [loadingCart, setLoadingCart] = useState(false);
  const [cartError, setCartError] = useState(null);
  const { user, loading: authLoading } = useContext(AuthContext);

  const BACKEND_IMAGE_BASE_URL = import.meta.env.VITE_BACKEND_URL;
  const PLACEHOLDER_IMAGE = "/assets/images/placeholder-item.png";

  const processCartData = (backendCart) => {
    return backendCart.map((item) => ({
      ...item, // Contains _id (item's actual id), name, price, quantity, stock, unit, slug
      // imagePath is already relative from backend, like 'items/image.jpg'
      // Ensure item details needed by components are present
      id: item._id, // Rename _id to id for consistency if needed, or use _id directly
      mrp: item.mrp || item.price, // Fallback for originalPrice
      images:
        item.images ||
        (item.imagePath ? [{ path: item.imagePath, isPrimary: true }] : []),
    }));
  };

  const fetchCart = useCallback(async () => {
    if (!user) {
      // Load from localStorage for guest user
      const localCart = localStorage.getItem("guestCart");
      setCartItems(localCart ? processCartData(JSON.parse(localCart)) : []);
      return;
    }
    setLoadingCart(true);
    setCartError(null);
    try {
      const response = await getCartApi();
      if (response.data.success) {
        setCartItems(processCartData(response.data.cart));
      } else {
        throw new Error(response.data.message || "Failed to fetch cart");
      }
    } catch (error) {
      console.error("CartContext - Error fetching cart:", error);
      setCartError(error.message);
      toast.error(`Could not load cart: ${error.message}`);
      // Fallback to local storage or empty if API fails for logged-in user?
      // For now, let's keep it empty on error for logged-in users to avoid data mismatch.
      setCartItems([]);
    } finally {
      setLoadingCart(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      // Ensure auth state is resolved
      fetchCart();
    }
  }, [user, authLoading, fetchCart]);

  // Persist guest cart to localStorage
  useEffect(() => {
    if (!user) {
      localStorage.setItem("guestCart", JSON.stringify(cartItems));
    }
  }, [cartItems, user]);

  const addToCart = async (itemToAdd, quantityToAdd = 1) => {
    setLoadingCart(true);
    const fullItemData = {
      // Simulate item data structure passed from components
      _id: itemToAdd._id,
      name: itemToAdd.name,
      price: itemToAdd.price,
      mrp: itemToAdd.mrp || itemToAdd.price,
      images:
        itemToAdd.images ||
        (itemToAdd.imagePath
          ? [{ path: itemToAdd.imagePath, isPrimary: true }]
          : []),
      stock: itemToAdd.stock,
      unit: itemToAdd.unit,
      slug: itemToAdd.slug,
    };

    if (user) {
      // Authenticated user
      try {
        // Find existing item to determine new total quantity
        const existingItem = cartItems.find((ci) => ci._id === itemToAdd._id);
        const newQuantity = existingItem
          ? existingItem.quantity + quantityToAdd
          : quantityToAdd;

        if (
          newQuantity >
          (fullItemData.stock !== undefined ? fullItemData.stock : Infinity)
        ) {
          toast.error(
            `Cannot add more. Only ${fullItemData.stock} of ${fullItemData.name} in stock.`
          );
          setLoadingCart(false);
          return;
        }

        const response = await addToCartApi(itemToAdd._id, newQuantity);
        if (response.data.success) {
          setCartItems(processCartData(response.data.cart));
          toast.success(
            `${quantityToAdd} x ${itemToAdd.name} added/updated in cart!`
          );
        } else {
          throw new Error(response.data.message || "Failed to add to cart");
        }
      } catch (error) {
        console.error("CartContext - Error adding to cart:", error);
        toast.error(`Add to cart failed: ${error.message}`);
      } finally {
        setLoadingCart(false);
      }
    } else {
      // Guest user
      setCartItems((prevCartItems) => {
        const existingItem = prevCartItems.find(
          (ci) => ci._id === fullItemData._id
        );
        const stock =
          fullItemData.stock !== undefined ? fullItemData.stock : Infinity;

        if (existingItem) {
          const newQuantity = existingItem.quantity + quantityToAdd;
          if (newQuantity > stock) {
            toast.error(
              `Cannot add more. Only ${stock} of ${fullItemData.name} in stock.`
            );
            return prevCartItems;
          }
          toast.success(`${fullItemData.name} quantity updated in cart!`);
          return prevCartItems.map((ci) =>
            ci._id === fullItemData._id ? { ...ci, quantity: newQuantity } : ci
          );
        } else {
          if (quantityToAdd > stock) {
            toast.error(
              `Cannot add. Only ${stock} of ${fullItemData.name} in stock.`
            );
            return prevCartItems;
          }
          toast.success(
            `${quantityToAdd} x ${fullItemData.name} added to cart!`
          );
          return [
            ...prevCartItems,
            { ...fullItemData, quantity: quantityToAdd },
          ];
        }
      });
      setLoadingCart(false);
    }
  };

  const updateItemQuantity = async (itemId, newQuantity) => {
    setLoadingCart(true);
    const itemInCart = cartItems.find((ci) => ci._id === itemId);
    if (!itemInCart) {
      toast.error("Item not found in cart for update.");
      setLoadingCart(false);
      return;
    }
    const stock = itemInCart.stock !== undefined ? itemInCart.stock : Infinity;

    if (newQuantity <= 0) {
      await removeFromCart(itemId); // Use removeFromCart for 0 quantity
      setLoadingCart(false);
      return;
    }
    if (newQuantity > stock) {
      toast.error(
        `Only ${stock} of ${itemInCart.name} in stock. Quantity set to max.`
      );
      newQuantity = stock; // Cap at stock
    }

    if (user) {
      // Authenticated user
      try {
        const response = await addToCartApi(itemId, newQuantity); // Backend API updates quantity
        if (response.data.success) {
          setCartItems(processCartData(response.data.cart));
          // toast.success(`${itemInCart.name} quantity updated.`); // Optional
        } else {
          throw new Error(response.data.message || "Failed to update quantity");
        }
      } catch (error) {
        console.error("CartContext - Error updating quantity:", error);
        toast.error(`Update quantity failed: ${error.message}`);
      } finally {
        setLoadingCart(false);
      }
    } else {
      // Guest user
      setCartItems((prevCartItems) =>
        prevCartItems.map((ci) =>
          ci._id === itemId ? { ...ci, quantity: newQuantity } : ci
        )
      );
      // toast.success(`${itemInCart.name} quantity updated.`); // Optional
      setLoadingCart(false);
    }
  };

  const removeFromCart = async (itemId) => {
    setLoadingCart(true);
    const itemToRemove = cartItems.find((ci) => ci._id === itemId);
    if (!itemToRemove) {
      setLoadingCart(false);
      return;
    }

    if (user) {
      // Authenticated user
      try {
        const response = await removeFromCartApi(itemId);
        if (response.data.success) {
          setCartItems(processCartData(response.data.cart));
          toast.success(`${itemToRemove.name} removed from cart.`);
        } else {
          throw new Error(response.data.message || "Failed to remove item");
        }
      } catch (error) {
        console.error("CartContext - Error removing from cart:", error);
        toast.error(`Remove from cart failed: ${error.message}`);
      } finally {
        setLoadingCart(false);
      }
    } else {
      // Guest user
      setCartItems((prevCartItems) =>
        prevCartItems.filter((ci) => ci._id !== itemId)
      );
      toast.success(`${itemToRemove.name} removed from cart.`);
      setLoadingCart(false);
    }
  };

  const clearCart = async () => {
    setLoadingCart(true);
    if (user) {
      // Authenticated user
      try {
        const response = await clearCartApi();
        if (response.data.success) {
          setCartItems([]);
          toast.success("Cart cleared successfully!");
        } else {
          throw new Error(response.data.message || "Failed to clear cart");
        }
      } catch (error) {
        console.error("CartContext - Error clearing cart:", error);
        toast.error(`Clear cart failed: ${error.message}`);
      } finally {
        setLoadingCart(false);
      }
    } else {
      // Guest user
      setCartItems([]);
      toast.success("Cart cleared successfully!");
      setLoadingCart(false);
    }
  };

  // Function to merge guest cart to backend upon login
  const mergeGuestCartToBackend = async (guestCart) => {
    if (!user || !guestCart || guestCart.length === 0) return;
    console.log("Attempting to merge guest cart to backend...");
    setLoadingCart(true);
    try {
      // Fetch current backend cart first to avoid overwriting or duplicating
      const backendCartRes = await getCartApi();
      let currentBackendCart = [];
      if (backendCartRes.data.success) {
        currentBackendCart = backendCartRes.data.cart;
      }

      const itemsToMerge = [];
      for (const guestItem of guestCart) {
        const backendItem = currentBackendCart.find(
          (bi) => bi._id === guestItem._id
        );
        if (backendItem) {
          // Item exists in backend cart, update quantity if guest's is higher
          // (or sum them, or take latest - depends on desired logic)
          // For simplicity, let's say we update if guest quantity is different and valid
          if (
            guestItem.quantity !== backendItem.quantity &&
            guestItem.quantity <=
              (guestItem.stock !== undefined ? guestItem.stock : Infinity)
          ) {
            itemsToMerge.push({
              itemId: guestItem._id,
              quantity: guestItem.quantity,
            });
          }
        } else {
          // Item not in backend cart, add it
          if (
            guestItem.quantity <=
            (guestItem.stock !== undefined ? guestItem.stock : Infinity)
          ) {
            itemsToMerge.push({
              itemId: guestItem._id,
              quantity: guestItem.quantity,
            });
          }
        }
      }

      // Batch update/add items (ideally backend supports batch, otherwise loop addToCartApi)
      // For simplicity, let's assume addToCartApi handles update if item exists.
      for (const itemToSync of itemsToMerge) {
        await addToCartApi(itemToSync.itemId, itemToSync.quantity);
      }

      await fetchCart(); // Re-fetch the merged cart from backend
      localStorage.removeItem("guestCart"); // Clear guest cart from local storage
      toast.success("Guest cart items merged with your account!");
    } catch (error) {
      console.error("Error merging guest cart:", error);
      toast.error("Could not merge guest cart. Please check your cart.");
      // Fallback: keep local cart items if merge fails? Or just fetch backend cart?
      await fetchCart(); // Fetch whatever is on backend
    } finally {
      setLoadingCart(false);
    }
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        loadingCart,
        cartError,
        addToCart,
        updateItemQuantity,
        removeFromCart,
        clearCart,
        fetchCart, // Expose fetchCart if needed by other parts of app
        mergeGuestCartToBackend,
        backendImageBaseUrl: BACKEND_IMAGE_BASE_URL,
        placeholderImage: PLACEHOLDER_IMAGE,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
