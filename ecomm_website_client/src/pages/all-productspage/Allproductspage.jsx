import React from "react";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
// import './Allproductspage.css'; // Create CSS if needed

const Allproductspage = ({ allProductsData = [], addToCart }) => {
  return (
    <>
      <Header />
      <div
        className="container all-products-container"
        style={{ padding: "40px 0", minHeight: "60vh" }}
      >
        <h1 style={{ textAlign: "center", marginBottom: "30px" }}>
          All Products
        </h1>
        {allProductsData.length === 0 ? (
          <p style={{ textAlign: "center" }}>
            No products available at the moment.
          </p>
        ) : (
          <div
            className="product-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
              gap: "20px",
            }}
          >
            {allProductsData.map((product) => (
              <div
                key={product.id}
                className="product-card"
                style={{
                  border: "1px solid #eee",
                  padding: "15px",
                  textAlign: "center",
                }}
              >
                <img
                  src={product.cover || "/assets/placeholder.png"}
                  alt={product.name}
                  style={{
                    height: "200px",
                    objectFit: "contain",
                    marginBottom: "10px",
                  }}
                />
                <h3>{product.name}</h3>
                <p>${product.price.toFixed(2)}</p>
                <button
                  className="btn-primary"
                  onClick={() => addToCart(product)}
                >
                  Add to Cart
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </>
  );
};

export default Allproductspage;
