import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext"; // Import AuthProvider
import "./index.css";
import "./App.css"; // Ensure App.css is imported

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        {" "}
        {/* Wrap App with AuthProvider */}
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
