import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import toast from "react-hot-toast";
import { AuthContext } from "./AuthContext";
import { getWishlistApi, toggleWishlistApi } from "../services/api"; // Assuming these API functions exist

const WishlistContext = createContext();

export const useWishlist = () => useContext(WishlistContext);

export const WishlistProvider = ({ children }) => {
  const [wishlistItems, setWishlistItems] = useState([]); // Stores full item objects for both guest/user consistency
  const [loadingWishlist, setLoadingWishlist] = useState(false);
  const [wishlistError, setWishlistError] = useState(null);
  const { user, loading: authLoading } = useContext(AuthContext);

  const BACKEND_IMAGE_BASE_URL = import.meta.env.VITE_BACKEND_URL;
  const PLACEHOLDER_IMAGE = "/assets/images/placeholder-item.png";

  // Processes backend wishlist data to a consistent format for the frontend
  const processWishlistData = (backendWishlist) => {
    return backendWishlist.map((item) => ({
      // Ensure item details needed by components are present from the populated backend data
      ...item, // Contains _id (item's actual id), name, price, slug, stock, unit, imagePath etc.
      id: item._id, // Use _id from backend as primary identifier
      mrp: item.mrp || item.price, // Fallback for originalPrice
      // Ensure images array exists and imagePath is correctly set
      images:
        item.images ||
        (item.imagePath ? [{ path: item.imagePath, isPrimary: true }] : []),
      // Ensure stock is handled (Infinity for manageStock: false) - backend should provide this
      stock: item.stock !== undefined ? item.stock : Infinity, // Assuming backend provides processed stock
      // Ensure discount fields are present
      discountType: item.discountType,
      discountValue: item.discountValue,
    }));
  };

  // Fetch wishlist data - from API for user, localStorage for guest
  const fetchWishlist = useCallback(async () => {
    // Only fetch if auth state is not loading
    if (authLoading) {
      setLoadingWishlist(true); // Indicate loading while auth is resolving
      return; // Don't proceed until auth is resolved
    }

    if (!user) {
      // Guest user: Load from localStorage
      const localWishlist = localStorage.getItem("guestWishlist");
      try {
        const parsedWishlist = localWishlist ? JSON.parse(localWishlist) : [];
        // Guest wishlist should ideally store full item objects for consistency
        // (same structure as `processWishlistData` output)
        setWishlistItems(Array.isArray(parsedWishlist) ? parsedWishlist : []);
      } catch (e) {
        console.error("Error parsing guest wishlist from localStorage:", e);
        setWishlistItems([]);
        localStorage.removeItem("guestWishlist"); // Clear corrupted data
      }
      setLoadingWishlist(false); // Loading finished for guest
      return;
    }

    // Authenticated user: Fetch from backend API
    setLoadingWishlist(true);
    setWishlistError(null);
    try {
      const response = await getWishlistApi(); // Assumes this API call is implemented and protected
      if (response.data.success) {
        setWishlistItems(processWishlistData(response.data.wishlist));
      } else {
        throw new Error(response.data.message || "Failed to fetch wishlist");
      }
    } catch (error) {
      console.error(
        "WishlistContext - Error fetching wishlist:",
        error.response?.data || error
      );
      const message =
        error.response?.data?.message ||
        error.message ||
        "Could not load wishlist.";
      setWishlistError(message);
      toast.error(message);
      setWishlistItems([]); // Clear wishlist on fetch error for logged-in user
    } finally {
      setLoadingWishlist(false);
    }
  }, [user, authLoading]); // Depend on user and authLoading

  // Effect to fetch wishlist when user/authLoading state changes
  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]); // Depend on the memoized fetchWishlist function

  // Persist guest wishlist to localStorage whenever cartItems state changes
  useEffect(() => {
    if (!user && !authLoading) {
      // Only persist for guests after auth state is resolved
      localStorage.setItem("guestWishlist", JSON.stringify(wishlistItems));
    }
  }, [wishlistItems, user, authLoading]); // Depend on wishlistItems and user/authLoading

  // Toggle item in wishlist (add or remove)
  const toggleWishlist = async (itemToToggle) => {
    // itemToToggle should be the full item object from where the action originated
    const itemId = itemToToggle._id;

    // Optimistic update for responsiveness
    setWishlistItems((prevItems) => {
      const exists = prevItems.some((item) => item._id === itemId);
      if (exists) {
        // Remove item
        return prevItems.filter((item) => item._id !== itemId);
      } else {
        // Add item (use the item object passed in)
        return [...prevItems, itemToToggle];
      }
    });

    // Show optimistic toast
    const initialExists = wishlistItems.some((item) => item._id === itemId);
    if (initialExists) {
      toast.success(`${itemToToggle.name} removed from wishlist.`);
    } else {
      toast.success(`${itemToToggle.name} added to wishlist.`);
    }

    // If user is logged in, call API
    if (user) {
      try {
        // API call to toggle wishlist item (backend handles add/remove logic)
        const response = await toggleWishlistApi(itemId); // Assumes this API call exists and is protected

        if (response.data.success) {
          // If successful, update state with the fresh data from backend response
          setWishlistItems(processWishlistData(response.data.wishlist));
          // Backend message can be used for toast if different from optimistic
          // toast.success(response.data.message); // Optional: replace optimistic toast
        } else {
          // If API call failed after optimistic update, revert state and show error
          console.error(
            "WishlistContext - API Failed to toggle wishlist:",
            response.data?.message
          );
          // Revert to previous state or re-fetch
          fetchWishlist(); // Re-fetch to sync state with backend
          toast.error(
            response.data?.message || "Failed to update wishlist on server."
          );
        }
      } catch (error) {
        // Handle network/server errors after optimistic update
        console.error(
          "WishlistContext - Error toggling wishlist:",
          error.response?.data || error
        );
        const message =
          error.response?.data?.message ||
          error.message ||
          "Wishlist update failed.";
        // Revert state or re-fetch
        fetchWishlist(); // Re-fetch to sync state with backend
        toast.error(message);
      }
    } else {
      // Guest user: update localStorage
      // localStorage effect handles saving the state changes made optimistically
    }
    // No specific loading state for toggle as optimistic update makes it feel instant
  };

  // Function to merge guest wishlist to backend upon login
  const mergeGuestWishlistToBackend = async (guestWishlistItems) => {
    // Only proceed if user is logged in and there's guest data
    if (!user || !guestWishlistItems || guestWishlistItems.length === 0) return;

    console.log("Attempting to merge guest wishlist to backend...");
    setLoadingWishlist(true); // Indicate loading during merge
    try {
      // Frontend guestWishlistItems contains full item objects.
      // We need to send just the item IDs to the backend toggle endpoint.
      // We should ideally only toggle (add) items that are *not* currently in the backend wishlist.

      // 1. Fetch current backend wishlist IDs
      const backendWishlistRes = await getWishlistApi();
      let currentBackendWishlistIds = [];
      if (backendWishlistRes.data.success) {
        currentBackendWishlistIds = backendWishlistRes.data.wishlist.map(
          (item) => item._id // Assuming backend wishlist items have _id
        );
      }

      // 2. Identify items in guest wishlist that are NOT in backend wishlist
      const itemsToAddToBackend = guestWishlistItems.filter(
        (guestItem) => !currentBackendWishlistIds.includes(guestItem._id)
      );

      // 3. Toggle (add) each new item to the backend wishlist
      // This assumes toggleWishlistApi adds the item if it's not there
      for (const guestItem of itemsToAddToBackend) {
        try {
          // Using the API function directly, not the toggleWishlist frontend action
          await toggleWishlistApi(guestItem._id);
        } catch (toggleErr) {
          console.warn(
            `Failed to merge wishlist item ${guestItem._id}:`,
            toggleErr
          );
          // Continue with other items even if one fails
        }
      }

      // 4. Re-fetch the merged wishlist from the backend
      await fetchWishlist(); // This will update the context state with the final list

      // 5. Clear guest wishlist from local storage only after successful merge attempt
      localStorage.removeItem("guestWishlist");

      // Show success message only if something was merged
      if (itemsToAddToBackend.length > 0) {
        toast.success("Guest wishlist items merged with your account!");
      } else {
        // Maybe a subtle message or no message if nothing was merged
        // toast("No new items to merge from guest wishlist.");
      }
    } catch (error) {
      console.error(
        "Error merging guest wishlist:",
        error.response?.data || error
      );
      toast.error("Could not merge guest wishlist.");
      // If merge fails, just fetch the backend wishlist state
      fetchWishlist();
    } finally {
      setLoadingWishlist(false);
    }
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlistItems,
        loadingWishlist,
        wishlistError,
        toggleWishlist, // Expose toggle action
        fetchWishlist, // Expose fetch if needed elsewhere
        mergeGuestWishlistToBackend, // Expose merge action
        backendImageBaseUrl: BACKEND_IMAGE_BASE_URL, // Expose config if needed
        placeholderImage: PLACEHOLDER_IMAGE, // Expose config if needed
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};
