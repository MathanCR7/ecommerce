// src/pages/trackorderpage/TrackOrderPage.jsx
import React from "react";
import Header from "../../components/Header/Header"; // Adjust path if necessary
import Footer from "../../components/Footer/Footer"; // Adjust path if necessary
import "./TrackOrderPage.css"; // Create this CSS file later

const TrackOrderPage = () => {
  return (
    <>
      <Header />
      <div className="track-order-page-container">
        <h1>Track My Order Page</h1>
        {/* Add your Track Order content here */}
        <p>This page will allow users to track their recent orders.</p>
      </div>
      <Footer />
    </>
  );
};

export default TrackOrderPage;
