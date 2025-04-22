import React from "react";
import { useParams, Link } from "react-router-dom";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
// import './Singleproductpage.css'; // Create CSS if needed

const Singleproductpage = ({ allProductsData = [], addToCart }) => {
  const { id } = useParams(); // Get product ID from URL
  const product = allProductsData.find((p) => p.id === parseInt(id)); // Find product by ID (ensure ID types match)

  return (
    <>
      <Header />
      <div
        className="container single-product-container"
        style={{ padding: "40px 0", minHeight: "60vh" }}
      >
        {product ? (
          <div
            className="product-details"
            style={{ display: "flex", gap: "30px", flexWrap: "wrap" }}
          >
            <div className="product-image" style={{ flex: "1 1 300px" }}>
              <img
                src={product.cover || "/assets/placeholder.png"}
                alt={product.name}
                style={{ border: "1px solid #eee" }}
              />
            </div>
            <div className="product-info" style={{ flex: "2 1 400px" }}>
              <h1>{product.name}</h1>
              <h2 style={{ color: "#e94560", margin: "15px 0" }}>
                ${product.price.toFixed(2)}
              </h2>
              <p style={{ marginBottom: "20px", lineHeight: "1.6" }}>
                {product.description || "No description available."}
              </p>
              <button
                className="btn-primary"
                onClick={() => addToCart(product)}
              >
                Add to Cart
              </button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center" }}>
            <h2>Product not found.</h2>
            <Link to="/all-products">Back to products</Link>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
};

export default Singleproductpage;
