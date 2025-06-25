// src/pages/contactuspage/ContactUsPage.jsx
import React from "react";
import Header from "../../components/Header/Header"; // Adjust path if necessary
import Footer from "../../components/Footer/Footer"; // Adjust path if necessary
import "./ContactUsPage.css"; // Create this CSS file later

const ContactUsPage = () => {
  return (
    <>
      <Header />
      <div className="contact-us-page-container">
        <h1>Contact Us Page</h1>
        {/* Add your Contact Us content here */}
        <p>This page will provide contact information and a form.</p>
      </div>
      <Footer />
    </>
  );
};

export default ContactUsPage;
