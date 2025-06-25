import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
// Assuming these imports are correct based on your project structure
import api, { getServerBaseUrl } from "../../services/api";
import { FaSpinner } from "react-icons/fa"; // Make sure react-icons is installed (npm install react-icons)

// Import the CSS file
import "./Mainpage.css";

const ShopbyCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Construct the base URL for images dynamically
  // Make sure getServerBaseUrl() returns the correct base URL (e.g., "http://localhost:5000")
  const imageBaseUrl = getServerBaseUrl
    ? `${getServerBaseUrl()}/uploads/`
    : "/uploads/";

  // Path to a placeholder image in case a category image fails to load
  const placeholderImage = "/assets/images/placeholder-category.png"; // *** IMPORTANT: Create this image ***

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      setError(null); // Clear previous errors

      try {
        // Fetch categories, limiting to 8 as seen in the image
        const response = await api.get("/categories?limit=8");

        if (
          response.data &&
          response.data.success &&
          Array.isArray(response.data.categories)
        ) {
          setCategories(response.data.categories);
        } else {
          // Handle cases where API returns success: false or unexpected data
          throw new Error(
            response.data?.message ||
              "Invalid data format received for categories."
          );
        }
      } catch (err) {
        console.error("Error fetching shop categories:", err);
        // Display a user-friendly error message
        setError(
          err.response?.data?.message ||
            err.message ||
            "An error occurred while fetching categories."
        );
        setCategories([]); // Ensure categories array is empty on error
      } finally {
        setLoading(false); // Always set loading to false when done
      }
    };

    fetchCategories();
  }, []); // Empty dependency array means this runs only once on component mount

  // --- Conditional Rendering based on state ---

  if (loading) {
    return (
      <section className="popular-categories-section container">
        <h2 className="section-heading">Popular Categories</h2>
        <div
          className="categories-loading"
          style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}
        >
          <FaSpinner className="fa-spin" style={{ marginRight: "10px" }} />
          Loading Categories...
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="popular-categories-section container">
        <h2 className="section-heading">Popular Categories</h2>
        <div
          className="categories-error"
          style={{ textAlign: "center", color: "red", padding: "20px" }}
        >
          <p>Could not load popular categories.</p>
          <p>
            {/* Display specific error message if available */}
            <i>Error: {error}</i>
          </p>
        </div>
      </section>
    );
  }

  if (categories.length === 0 && !loading && !error) {
    return (
      <section className="popular-categories-section container">
        <h2 className="section-heading">Popular Categories</h2>
        <p
          className="categories-empty"
          style={{ textAlign: "center", padding: "20px", color: "#6b7280" }}
        >
          No popular categories available at the moment.
        </p>
      </section>
    );
  }

  // --- Render Categories if loaded successfully ---

  return (
    // Use a semantic <section> tag
    <section className="popular-categories-section container">
      {/* Use a descriptive heading */}
      <h2 className="section-heading">Popular Categories</h2>

      {/* Container for the grid/flex layout of categories */}
      <div className="categories-grid">
        {/* Map over the categories array to render each category item */}
        {categories.map((category) => (
          // Use Link for navigation, build the URL
          <Link
            to={`/category/${category.slug || category._id}`} // Prefer slug if available, fallback to _id
            className="category-item" // Apply styling class
            key={category._id} // Unique key for list rendering
            aria-label={`Shop ${category.name}`} // Accessibility label
            title={category.name} // Tooltip on hover
          >
            {/* Wrapper for the circular image */}
            <div className="category-image-wrapper">
              <img
                // Construct the full image URL
                src={`${imageBaseUrl}${category.imagePath}`}
                alt={category.name} // Image alt text for accessibility
                // Handle image loading errors
                onError={(e) => {
                  // Only set placeholder if it's not already the placeholder
                  if (e.target.src !== placeholderImage) {
                    console.warn(
                      `Failed to load category image: ${e.target.src}. Using placeholder.`
                    );
                    e.target.src = placeholderImage;
                    e.target.alt = `${category.name} (Image unavailable)`;
                  }
                }}
              />
            </div>
            {/* Display the category name */}
            <span className="category-name">{category.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default ShopbyCategories;
