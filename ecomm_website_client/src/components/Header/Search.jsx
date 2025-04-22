import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import logo from "/assets/main-logo/logo.png"; // Import the logo image directly

const Search = ({ cartItems }) => {
  const [isSticky, setSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Adjust the scroll threshold (e.g., 10px) if needed
      setSticky(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll, { passive: true }); // Use passive listener

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const cartItemCount = cartItems?.length || 0; // Safer way to get length

  return (
    <>
      {/* Apply 'active' class for sticky effect */}
      <section className={`search ${isSticky ? "active" : ""}`}>
        <div className="container c_flex">
          {/* Logo */}
          <div className="logo">
            <Link aria-label="Homepage" to="/">
              <img src={logo} alt="Company Logo" />
            </Link>
          </div>

          {/* Search Box */}
          <div className="search-box">
            <i className="fa fa-search"></i>
            <input type="text" placeholder="Search products..." />
            <span>All Categories</span>{" "}
            {/* This will be hidden on mobile via CSS */}
          </div>

          {/* Icons */}
          <div className="icons-wrapper">
            {/* User Icon */}
            <Link
              aria-label="Login or User Profile"
              to="/login"
              className="icon-circle-link"
            >
              <div className="icon-circle">
                <i className="fa fa-user"></i>
              </div>
            </Link>

            {/* Cart Icon */}
            <div className="cart">
              <Link
                to="/cart"
                className="cart-link"
                aria-label={`View Cart, ${cartItemCount} items`}
              >
                <div className="icon-circle">
                  <i className="fa fa-shopping-bag"></i>
                  {/* Conditionally render cart count only if > 0 */}
                  {cartItemCount > 0 && (
                    <span className="cart-count">{cartItemCount}</span>
                  )}
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Search;
