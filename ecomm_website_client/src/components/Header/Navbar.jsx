// ecomm_website_client/src/components/Header/Navbar.jsx
import React, { useState, useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

const Navbar = () => {
  const [mobileMenu, setMobileMenu] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (mobileMenu) {
      document.body.classList.add("no-scroll");
    } else {
      document.body.classList.remove("no-scroll");
    }
    return () => {
      document.body.classList.remove("no-scroll");
    };
  }, [mobileMenu]);

  const closeMobileMenu = () => setMobileMenu(false);

  const isCategoriesLinkActive = (isActiveDefault) => {
    return isActiveDefault || location.pathname.startsWith("/category");
  };

  return (
    <>
      <nav className="navbar-wrapper">
        <div className="container">
          <div className="menu-items">
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
                <NavLink
                  aria-label="Categories"
                  to="/categories"
                  className={({ isActive }) =>
                    isCategoriesLinkActive(isActive) ? "active-link" : ""
                  }
                >
                  Categories
                </NavLink>
              </li>
              <li>
                <NavLink
                  aria-label="All Items"
                  to="/all-items"
                  className={({ isActive }) => (isActive ? "active-link" : "")}
                >
                  All Items
                </NavLink>
              </li>
              <li>
                <NavLink
                  aria-label="Wishlist"
                  to="/wishlist" // ⭐ NEW LINK
                  className={({ isActive }) => (isActive ? "active-link" : "")}
                >
                  Wishlist
                </NavLink>
              </li>
              <li>
                <NavLink
                  aria-label="Top Liked Items"
                  to="/top-liked-items" // ⭐ NEW LINK
                  className={({ isActive }) => (isActive ? "active-link" : "")}
                >
                  Top Liked Items
                </NavLink>
              </li>
            </ul>

            <button
              aria-label="Toggle Menu"
              aria-expanded={mobileMenu}
              className="mobile-toggle"
              onClick={() => setMobileMenu(!mobileMenu)}
            >
              <i className={mobileMenu ? "fas fa-times" : "fa fa-bars"}></i>
            </button>
          </div>
        </div>
      </nav>

      <ul
        className={`nav-links-MobileMenu ${mobileMenu ? "active-menu" : ""}`}
        aria-hidden={!mobileMenu}
      >
        <button
          aria-label="Close Menu"
          className="mobile-menu-close"
          onClick={closeMobileMenu}
        >
          <i className="fas fa-times"></i>
        </button>

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
            className={({ isActive }) =>
              isCategoriesLinkActive(isActive) ? "active" : ""
            }
          >
            Categories
          </NavLink>
        </li>
        <li>
          <NavLink
            aria-label="All Items"
            to="/all-items"
            onClick={closeMobileMenu}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            All Items
          </NavLink>
        </li>
        <li>
          <NavLink
            aria-label="Wishlist"
            to="/wishlist" // ⭐ NEW LINK
            onClick={closeMobileMenu}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            Wishlist
          </NavLink>
        </li>
        <li>
          <NavLink
            aria-label="Top Liked Items"
            to="/top-liked-items" // ⭐ NEW LINK
            onClick={closeMobileMenu}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            Top Liked Items
          </NavLink>
        </li>
      </ul>
    </>
  );
};

export default Navbar;
