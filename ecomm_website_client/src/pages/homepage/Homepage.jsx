import React from "react";
import Header from "../../components/Header/Header";
import Mainpage from "../../components/Mainpage/Mainpage"; // Assuming Mainpage exists
import TopSellingProducts from "../../components/TopSellingProducts/TopSellingProducts"; // Assuming this exists
import Footer from "../../components/Footer/Footer"; // Assuming Footer exists
// Import other sections as needed (TopCategories, Newarrivals, Discount, Shop, Features, etc.)

const Homepage = ({ productItems, addToCart, shopItems }) => {
  // Homepage structure - Renders various components for the main page
  // Authentication state is available via AuthContext used in Header/other components
  return (
    <>
      <Header />
      <Mainpage />
      <TopSellingProducts productItems={productItems} addToCart={addToCart} />
      {/*
        <TopCategories />
        <Newarrivals />
        <Discount />
        <Shop shopItems={shopItems} addToCart={addToCart} />
        <Specialoffer /> // Make sure this component exists
        <Features />     // Make sure this component exists
      */}
      <Footer />
    </>
  );
};

export default Homepage;
