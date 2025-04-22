import React from "react";
import Flashcard from "./Flashcard";

const TopSellingProducts = ({ productItems, addToCart }) => {
  return (
    <>
      <section className="flash background">
        <div className="flashdeal container">
          <div className="heading">
            <i className="fa fa-bolt"></i>
            <h1>Top Selling Products</h1>
          </div>
          <Flashcard productItems={productItems} addToCart={addToCart} />
        </div>
      </section>
    </>
  );
};

export default TopSellingProducts;
