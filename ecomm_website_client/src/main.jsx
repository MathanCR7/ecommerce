import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext"; // Import AuthProvider
import "./index.css";
import "./App.css"; // Ensure App.css is imported
import { CartProvider } from "./context/CartContext.jsx"; // NEW
import { WishlistProvider } from "./context/WishlistContext.jsx"; // NEW

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          {" "}
          {/* NEW */}
          <WishlistProvider>
            {" "}
            {/* NEW */}
            <App />
          </WishlistProvider>{" "}
          {/* NEW */}
        </CartProvider>{" "}
        {/* NEW */}
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
