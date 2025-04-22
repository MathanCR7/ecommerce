import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { AuthProvider } from "./Context/AuthContext.jsx"; // Import Auth Provider
import "./Styles/index.css"; // Global base styles
import "./Styles/App.css"; // App-specific global styles (forms, alerts, tables etc.)

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* Wrap the entire App with AuthProvider */}
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
