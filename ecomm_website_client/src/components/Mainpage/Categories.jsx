// src/components/Mainpage/Categories.jsx
import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { getTopSellingItemsApi, getServerBaseUrl } from "../../services/api"; // Assuming this path is correct
import { FaSpinner } from "react-icons/fa"; // For loading state
import toast from "react-hot-toast"; // Optional: for error notifications

// Styles for this component might need adjustment, especially for image sizes
// If you have a separate CSS file for Categories, ensure it's imported.
// e.g., import "./Categories.css";

const Categories = () => {
  const [topSellingItems, setTopSellingItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [backendImageBaseUrl, setBackendImageBaseUrl] = useState("");

  const placeholderImage = "/assets/images/placeholder-item.png"; // Consistent placeholder

  // Fetch backend image base URL on mount
  useEffect(() => {
    const serverRootUrl = getServerBaseUrl();
    if (serverRootUrl) {
      setBackendImageBaseUrl(`${serverRootUrl}/uploads/`);
    } else {
      // Fallback or development base URL
      setBackendImageBaseUrl("/uploads/"); // Adjust if your dev setup is different
    }
  }, []);

  // Fetch top selling items
  useEffect(() => {
    const fetchTopItems = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getTopSellingItemsApi(); // Fetches /api/items/top-selling

        if (response.data && Array.isArray(response.data)) {
          // You might want to limit the number of items shown in the sidebar
          // For example, to show only the top 5:
          // setTopSellingItems(response.data.slice(0, 5));
          setTopSellingItems(response.data);
        } else {
          console.error(
            "Unexpected API response format for top selling items:",
            response.data
          );
          throw new Error(
            "Failed to load top selling products due to data format."
          );
        }
      } catch (err) {
        console.error("Error fetching top selling items for categories:", err);
        const errorMessage =
          err.response?.data?.message ||
          err.message ||
          "Failed to fetch top selling products.";
        setError(errorMessage);
        toast.error(errorMessage); // Optional: Show toast notification
        setTopSellingItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTopItems();
  }, []); // Empty dependency array: run once on component mount

  // Get the full image URL (adapted from TopSellingItems.jsx)
  const getFullImageUrl = useCallback(
    (itemImagePath) => {
      if (!itemImagePath || itemImagePath === "default-item.png")
        return placeholderImage;
      if (itemImagePath.startsWith("http")) return itemImagePath; // Already a full URL

      // Ensure backendImageBaseUrl is set and correctly formatted
      if (backendImageBaseUrl) {
        const base = backendImageBaseUrl.endsWith("/")
          ? backendImageBaseUrl
          : `${backendImageBaseUrl}/`;
        const itemPath = itemImagePath.startsWith("/")
          ? itemImagePath.substring(1)
          : itemImagePath;
        return `${base}${itemPath}`;
      }
      // Fallback if backendImageBaseUrl isn't ready (should be rare with useEffect)
      return `/uploads/${
        // Adjust if your uploads path is different
        itemImagePath.startsWith("/")
          ? itemImagePath.substring(1)
          : itemImagePath
      }`;
    },
    [backendImageBaseUrl, placeholderImage]
  );

  if (loading) {
    return (
      <div className="category">
        <div
          className="box-category box f_flex"
          style={{
            justifyContent: "center",
            alignItems: "center",
            padding: "20px",
          }}
        >
          <FaSpinner className="fa-spin" />
          <span style={{ marginLeft: "10px" }}>Loading Products...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="category">
        <div
          className="box-category box f_flex"
          style={{ color: "red", padding: "10px" }}
        >
          <span>Error: Could not load products.</span>
          {/* More detailed error could be shown if desired: <small>{error}</small> */}
        </div>
      </div>
    );
  }

  if (!topSellingItems.length) {
    return (
      <div className="category">
        <div className="box-category box f_flex" style={{ padding: "10px" }}>
          <span>No top selling products found.</span>
        </div>
      </div>
    );
  }

  return (
    // This div uses the ORIGINAL 'category' class
    <div className="category">
      {/* You might want a heading here, e.g., <h4>Top Selling</h4> */}
      {topSellingItems.map((item) => {
        // This div uses the ORIGINAL 'box-category' class
        return (
          <Link
            to={`/item/${item._id}`} // Link to item detail page
            className="box-category box f_flex" // Retain existing classes for styling
            key={item._id}
            style={{ textDecoration: "none", color: "inherit" }} // Basic link styling reset
          >
            <img
              src={getFullImageUrl(item.imagePath)}
              alt={item.name}
              // Add inline style or a CSS class for image size if needed
              style={{
                width: "30px",
                height: "30px",
                marginRight: "10px",
                objectFit: "contain",
              }}
            />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </div>
  );
};

export default Categories;
