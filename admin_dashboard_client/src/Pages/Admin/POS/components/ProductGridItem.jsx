// src/Pages/Admin/POS/components/ProductGridItem.jsx
import React from "react";
import "./ProductGridItem.css";

const API_DOMAIN_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(
  "/api",
  ""
);

const ProductGridItem = ({ item, onAddToCart }) => {
  // Changed product to item
  const imageUrl = item.imagePath
    ? `${API_DOMAIN_BASE}/uploads/${item.imagePath.replace(/\\/g, "/")}`
    : "https://via.placeholder.com/100?text=No+Image";

  return (
    <div className="product-grid-item" onClick={() => onAddToCart(item)}>
      <img
        src={imageUrl}
        alt={item.name}
        className="product-item-image"
        onError={(e) => {
          e.target.src = "https://via.placeholder.com/100?text=Error";
        }}
      />
      <div className="product-item-details">
        <p className="product-item-name">{item.name}</p>
        <p className="product-item-price">${item.price.toFixed(2)}</p>
      </div>
    </div>
  );
};

export default ProductGridItem;
