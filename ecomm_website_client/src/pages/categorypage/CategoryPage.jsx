// ecomm_website_client/src/pages/categorypage/CategoryPage.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import CategorySidebar from "../../components/CategorySidebar/CategorySidebar";
import AllItemsDisplay from "./AllItemsDisplay";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import "./CategoryPage.css";
import api from "../../services/api";
import { useCart } from "../../context/CartContext"; // ⭐ Import useCart hook

// Removed cartItems, addToCart, updateItemQuantity from props
const CategoryPage = () => {
  const { categorySlug: initialCategorySlugFromParam } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // ⭐ Get cart state and actions from the CartContext using the hook
  const { cartItems, addToCart, updateItemQuantity } = useCart();

  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null); // Will hold the category object { _id, name, slug }
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [errorCategories, setErrorCategories] = useState(null);

  const getInitialSlug = () => {
    if (initialCategorySlugFromParam) {
      return initialCategorySlugFromParam;
    }
    if (
      location.pathname === "/categories" ||
      location.pathname === "/categories/"
    ) {
      return "all";
    }
    return "all"; // Default fallback
  };

  // Effect to fetch categories and set initial selected category based on slug
  useEffect(() => {
    const fetchCategoriesData = async () => {
      setLoadingCategories(true);
      setErrorCategories(null);
      try {
        const response = await api.get("/categories"); // Fetches all public categories
        if (
          response.data &&
          response.data.success &&
          Array.isArray(response.data.categories)
        ) {
          const allProductsCategory = {
            _id: "all", // Keep _id as "all" for consistency if needed elsewhere
            name: "All Products",
            slug: "all",
          };
          const fetchedCategories = [
            allProductsCategory,
            ...response.data.categories,
          ];
          setCategories(fetchedCategories);

          const currentSlug = getInitialSlug();
          const foundCategory = fetchedCategories.find(
            (cat) => cat.slug === currentSlug
          );

          if (foundCategory) {
            setSelectedCategory(foundCategory);
            // Ensure URL is consistent, navigate to /category/:slug if not already there
            if (location.pathname !== `/category/${foundCategory.slug}`) {
              navigate(`/category/${foundCategory.slug}`, { replace: true });
            }
          } else {
            // Slug not found, default to "All Products"
            setSelectedCategory(allProductsCategory);
            // Navigate to the 'all' category URL if not already there
            if (location.pathname !== "/category/all") {
              navigate("/category/all", { replace: true });
            }
          }
        } else {
          throw new Error(
            response.data?.message || "Failed to load categories format."
          );
        }
      } catch (err) {
        console.error("Error fetching categories:", err);
        setErrorCategories(err.message);
        // Fallback to 'All Products' category on error
        const fallbackCategory = {
          _id: "all",
          name: "All Products",
          slug: "all",
        };
        setCategories([fallbackCategory]);
        setSelectedCategory(fallbackCategory);
        // If a specific slug was requested and failed, redirect to 'all'
        if (getInitialSlug() !== "all") {
          navigate("/category/all", { replace: true });
        }
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchCategoriesData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCategorySlugFromParam, location.pathname, navigate]); // Added navigate to dependencies as per ESLint

  const handleSelectCategory = (category) => {
    setSelectedCategory(category); // Set the full category object
    navigate(`/category/${category.slug}`); // Navigate using the slug
  };

  // ⭐ Use cartItems obtained from the useCart hook
  const totalCartItems = cartItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  return (
    <>
      <Header cartItemCount={totalCartItems} />
      <main className="category-page-container container">
        <div className="category-page-layout">
          <div className="category-sidebar-column">
            <CategorySidebar
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={handleSelectCategory}
              loading={loadingCategories}
              error={errorCategories}
            />
          </div>
          <div className="category-items-column">
            {selectedCategory ? (
              <AllItemsDisplay
                // Pass categorySlug for filtering, null if 'all'
                categorySlug={
                  selectedCategory.slug === "all" ? null : selectedCategory.slug
                }
                categoryName={selectedCategory.name}
                // ⭐ Pass cart state and actions obtained from useCart hook to AllItemsDisplay
                addToCart={addToCart}
                updateItemQuantity={updateItemQuantity}
                cartItems={cartItems}
              />
            ) : loadingCategories ? (
              <p>Loading category information...</p>
            ) : (
              <p>Please select a category to view items.</p>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default CategoryPage;
