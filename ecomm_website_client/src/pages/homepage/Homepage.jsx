// src/pages/homepage/Homepage.jsx
import React from "react";
import Header from "../../components/Header/Header";
import Mainpage from "../../components/Mainpage/Mainpage";
// Renamed: TopSellingProducts -> TopSellingItems
import TopSellingItems from "../../components/TopSellingItems/TopSellingItems";
import Footer from "../../components/Footer/Footer";
// Import other sections as needed (TopCategories, Newarrivals, Discount, Shop, Features, etc.)

// Renamed prop: productItems -> featuredItems
const Homepage = ({ featuredItems, addToCart, shopItems }) => {
  // Homepage structure - Renders various components for the main page
  // Authentication state is available via AuthContext used in Header/other components
  return (
    <>
      <Header />
      <Mainpage />
      {/* Renamed component and updated prop */}
      <TopSellingItems items={featuredItems} addToCart={addToCart} />
      {/*
        <TopCategories />
        <Newarrivals />
        <Discount />
        // If Shop component deals with general items, consider renaming shopItems prop if needed
        <Shop shopItems={shopItems} addToCart={addToCart} />
        <Specialoffer /> // Make sure this component exists
        <Features />     // Make sure this component exists
      */}
      <Footer />
    </>
  );
};

export default Homepage;
