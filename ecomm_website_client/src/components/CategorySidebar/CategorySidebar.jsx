import React from "react";
import "./CategorySidebar.css"; // Assuming you have CSS for this
import { FaSpinner } from "react-icons/fa"; // For loading spinner

const CategorySidebar = ({
  categories,
  selectedCategory,
  onSelectCategory,
  loading,
  error,
}) => {
  // Ensure categories is an array before mapping
  const categoryList = Array.isArray(categories) ? categories : [];

  return (
    <div className="category-sidebar">
      <h2 className="sidebar-title">Browse by</h2>
      {loading && (
        <div className="sidebar-loading">
          <FaSpinner className="fa-spin" /> Loading categories...
        </div>
      )}
      {error && <div className="sidebar-error">Error: {error}</div>}

      {!loading && !error && categoryList.length > 0 && (
        <ul className="category-list">
          {categoryList.map((category) => (
            <li
              key={category._id || category.slug} // Use a unique key (_id or slug)
              className={`category-list-item ${
                selectedCategory &&
                (selectedCategory._id === category._id ||
                  selectedCategory.slug === category.slug)
                  ? "active" // Apply 'active' class if this category is selected
                  : ""
              }`}
              onClick={() => onSelectCategory(category)} // Call handler on click
              tabIndex={0} // Make list item focusable for keyboard navigation
              onKeyPress={(e) =>
                e.key === "Enter" && onSelectCategory(category)
              }
              role="button" // Indicate it's an interactive element
              aria-pressed={
                selectedCategory &&
                (selectedCategory._id === category._id ||
                  selectedCategory.slug === category.slug)
              } // ARIA attribute for state
            >
              {category.name}
            </li>
          ))}
        </ul>
      )}

      {!loading && !error && categoryList.length === 0 && (
        <p>No categories found.</p>
      )}
    </div>
  );
};

export default CategorySidebar;
