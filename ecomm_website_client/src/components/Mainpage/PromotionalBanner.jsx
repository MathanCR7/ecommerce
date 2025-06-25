import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Slider from "react-slick";
import api, { getServerBaseUrl } from "../../services/api";
import { FaSpinner } from "react-icons/fa";

import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import "./Mainpage.css"; // Ensure this path and file exist

const PromotionalBanner = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const imageBaseUrl = getServerBaseUrl
    ? `${getServerBaseUrl()}/uploads/`
    : "/uploads/";

  const placeholderBannerImage = "/assets/images/placeholder-banner-large.png"; // Ensure this placeholder exists

  useEffect(() => {
    const fetchPromotionalBanners = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get("/banners/active-for-carousel");
        let activeBanners = [];
        if (
          response.data &&
          response.data.success &&
          Array.isArray(response.data.banners)
        ) {
          activeBanners = response.data.banners;
        }

        if (activeBanners.length > 0) {
          setBanners(activeBanners);
        } else {
          console.warn(
            "No active promotional banners found or data format issue from API."
          );
          setBanners([]);
        }
      } catch (err) {
        console.error("Error fetching promotional banners:", err);
        setError(
          err.response?.data?.message ||
            err.message ||
            "Could not load promotional banners."
        );
        setBanners([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPromotionalBanners();
  }, []);

  const handleVisitCollection = (banner) => {
    if (banner) {
      if (banner.itemId) {
        // Prioritize item link
        if (banner.itemId._id) {
          // Item navigation by ID
          navigate(`/item/${banner.itemId._id}`);
        } else if (banner.itemId.slug) {
          // Fallback to item slug
          navigate(`/item/${banner.itemId.slug}`);
        } else {
          console.warn("Banner has itemId but no _id or slug.", banner.itemId);
          navigate("/items"); // Fallback to general items page
        }
      } else if (banner.categoryId) {
        // Then category link
        if (banner.categoryId.slug) {
          // Category navigation by slug
          navigate(`/category/${banner.categoryId.slug}`);
        } else if (banner.categoryId._id) {
          // Fallback to category ID
          navigate(`/category/${banner.categoryId._id}`);
        } else {
          console.warn(
            "Banner has categoryId but no _id or slug.",
            banner.categoryId
          );
          navigate("/items"); // Fallback to general items page
        }
      } else {
        // Default navigation if no specific item/category link
        navigate("/items");
      }
    }
  };

  const sliderSettings = {
    dots: true,
    infinite: banners.length > 1,
    speed: 700,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 5000,
    fade: true,
    cssEase: "cubic-bezier(0.7, 0, 0.3, 1)",
    adaptiveHeight: false, // Important for consistent banner height
    arrows: false,
    dotsClass: "slick-dots custom-slick-dots",
    pauseOnHover: true,
  };

  if (loading) {
    return (
      <section className="promotional-banner-section">
        <div className="banner-loading" role="status" aria-live="polite">
          <FaSpinner className="fa-spin" aria-hidden="true" /> Loading
          Promotions...
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="promotional-banner-section">
        <div className="banner-error" role="alert">
          <p>Could not load promotions.</p>
          <i>Details: {error}</i>
        </div>
      </section>
    );
  }

  if (!banners || banners.length === 0) {
    // You could render a default static banner here if desired
    // For now, showing "No current promotions." or rendering nothing
    return (
      <section className="promotional-banner-section">
        <div
          className="promotional-banner-slide default-promotional-banner"
          style={{
            backgroundImage: `url(${placeholderBannerImage})`,
          }}
        >
          <div className="promo-banner-overlay-content">
            <h1>Special Offers</h1>
            <p>Check back soon for exciting new promotions!</p>
            <button
              onClick={() => navigate("/items")}
              className="btn btn-primary promo-banner-cta"
            >
              Shop All Items
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className="promotional-banner-section"
      aria-label="Promotional Banners"
    >
      <Slider {...sliderSettings}>
        {banners.map((banner) => {
          const imageUrlPath = banner.imageUrl
            ? banner.imageUrl.startsWith("/")
              ? banner.imageUrl.substring(1)
              : banner.imageUrl
            : null;
          const bannerImageUrl = imageUrlPath
            ? `${imageBaseUrl}${imageUrlPath}`
            : placeholderBannerImage;

          return (
            <div key={banner._id}>
              {/* Outer div for slick-slide, inner div for styling */}
              <div
                className="promotional-banner-slide"
                style={{
                  backgroundImage: `url(${bannerImageUrl})`,
                }}
              >
                <div className="promo-banner-overlay-content">
                  <h1>{banner.title || "Special Offer"}</h1>
                  <p>
                    {banner.description ||
                      "Check out our latest collection and find something you'll love."}
                  </p>
                  <button
                    onClick={() => handleVisitCollection(banner)}
                    className="btn btn-primary promo-banner-cta"
                  >
                    {banner.ctaText || "Visit Collection"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </Slider>
    </section>
  );
};

export default PromotionalBanner;
