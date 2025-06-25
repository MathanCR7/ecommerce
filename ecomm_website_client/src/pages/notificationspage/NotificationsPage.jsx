// src/pages/notificationspage/NotificationsPage.jsx
import React from "react";
import Header from "../../components/Header/Header"; // Adjust path if necessary
import Footer from "../../components/Footer/Footer"; // Adjust path if necessary
import "./NotificationsPage.css"; // Create this CSS file later

const NotificationsPage = () => {
  return (
    <>
      <Header />
      <div className="notifications-page-container">
        <h1>Notifications Page</h1>
        {/* Add your Notifications content here */}
        <p>This page will display the user's notifications.</p>
      </div>
      <Footer />
    </>
  );
};

export default NotificationsPage;
