import React, { useState, useEffect } from "react";
import { Link, NavLink } from "react-router-dom"; // Use NavLink for active styling

const Navbar = () => {
  const [mobileMenu, setMobileMenu] = useState(false);

  // Effect to handle body scroll lock
  useEffect(() => {
    if (mobileMenu) {
      document.body.classList.add("no-scroll");
    } else {
      document.body.classList.remove("no-scroll");
    }
    // Cleanup
    return () => {
      document.body.classList.remove("no-scroll");
    };
  }, [mobileMenu]);

  // Function to close menu, can be passed to links
  const closeMobileMenu = () => setMobileMenu(false);

  return (
    <>
      {/* Wrapper for Navbar styling */}
      <nav className="navbar-wrapper">
        <div className="container">
          {/* menu-items pushes content to the right */}
          <div className="menu-items">
            {/* Desktop Navigation Links - Hidden on mobile via CSS */}
            <ul className="nav-links-desktop">
              <li>
                <NavLink
                  aria-label="Home"
                  to="/"
                  end
                  className={({ isActive }) => (isActive ? "active-link" : "")}
                >
                  Home
                </NavLink>
              </li>
              <li>
                {/* Assuming '/categories' is the route for the category page */}
                <NavLink
                  aria-label="Categories"
                  to="/categories"
                  className={({ isActive }) => (isActive ? "active-link" : "")}
                >
                  Categories
                </NavLink>
              </li>
              <li>
                <NavLink
                  aria-label="All Products"
                  to="/all-products"
                  className={({ isActive }) => (isActive ? "active-link" : "")}
                >
                  All Products
                </NavLink>
              </li>
              <li>
                <NavLink
                  aria-label="Wishlist"
                  to="/wishlist"
                  className={({ isActive }) => (isActive ? "active-link" : "")}
                >
                  Wishlist
                </NavLink>
              </li>
              <li>
                
                <NavLink
                  aria-label="Top Liked Products"
                  to="/top-liked"
                  className={({ isActive }) => (isActive ? "active-link" : "")}
                >
                  Top Liked
                </NavLink>
              </li>
            </ul>

            {/* Mobile Menu Toggle Button - Hidden on desktop via CSS */}
            <button
              aria-label="Toggle Menu"
              aria-expanded={mobileMenu}
              className="mobile-toggle"
              onClick={() => setMobileMenu(!mobileMenu)}
            >
              {/* Icon changes based on state */}
              <i className={mobileMenu ? "fas fa-times" : "fa fa-bars"}></i>
            </button>
          </div>{" "}
          {/* End menu-items */}
        </div>{" "}
        {/* End container */}
      </nav>

      {/* Mobile Menu Links Panel (Controlled by state and CSS transform) */}
      <ul
        className={`nav-links-MobileMenu ${mobileMenu ? "active-menu" : ""}`}
        aria-hidden={!mobileMenu} // Accessibility: hide when not visible
      >
        {/* Close Button INSIDE Mobile Menu */}
        <button
          aria-label="Close Menu"
          className="mobile-menu-close"
          onClick={closeMobileMenu}
        >
          <i className="fas fa-times"></i>
        </button>

        {/* Links inside mobile menu - Order matches desktop */}
        <li>
          <NavLink
            aria-label="Home"
            to="/"
            end
            onClick={closeMobileMenu}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            Home
          </NavLink>
        </li>
        <li>
          <NavLink
            aria-label="Categories"
            to="/categories"
            onClick={closeMobileMenu}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            Categories
          </NavLink>
        </li>
        <li>
          <NavLink
            aria-label="All Products"
            to="/all-products"
            onClick={closeMobileMenu}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            All Products
          </NavLink>
        </li>
        <li>
          <NavLink
            aria-label="Wishlist"
            to="/wishlist"
            onClick={closeMobileMenu}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            Wishlist
          </NavLink>
        </li>
        <li>
          <NavLink
            aria-label="Top Liked Products"
            to="/top-liked"
            onClick={closeMobileMenu}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            Top Liked
          </NavLink>
        </li>
      </ul>
    </>
  );
};

export default Navbar;
