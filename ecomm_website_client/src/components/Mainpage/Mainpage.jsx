// src/components/Mainpage/Mainpage.jsx
import React from "react";
import Categories from "./Categories"; // Original static categories component
import PromotionalBanner from "./PromotionalBanner";
import ShopbyCategories from "./ShopbyCategories"; // Dynamic categories component
import "./Mainpage.css"; // Styles for this page
import AllItems from "./AllItems";

const Mainpage = () => {
  return (
    <>
      {/* Section containing original Categories and Slider */}
      <section className="main-page">
        {" "}
        {/* Might need adjustments based on overall page layout */}
        {/* Container for the original Categories and Slider */}
        <div className="container slider-container">
          <Categories /> {/* Renders static categories */}
          <PromotionalBanner />
        </div>
        {/* Render the ShopbyCategories component *outside* the above div */}
        {/* This component will fetch and display dynamic categories */}
        <ShopbyCategories />
        <AllItems />
      </section>
    </>
  );
};

export default Mainpage;
