// src/pages/termsandconditionspage/TermsAndConditionsPage.jsx
import React from "react";
import Header from "../../components/Header/Header"; // Adjust path if necessary
import Footer from "../../components/Footer/Footer"; // Adjust path if necessary
import "./TermsAndConditionsPage.css"; // Create this CSS file later

const TermsAndConditionsPage = () => {
  return (
    <>
      <Header />
      <div className="terms-and-conditions-page-container">
        <h1>Terms & Conditions Page</h1>
        {/* Add your Terms & Conditions content here */}
        <p>This page contains the website's terms and conditions.</p>
        {/* Example static content */}
        <h2>Agreement to Terms</h2>
        <p>
          By accessing or using our Service you agree to be bound by these Terms
          ("Terms")...
        </p>
        <h2>Changes to Terms</h2>
        <p>
          We reserve the right, at our sole discretion, to modify or replace
          these Terms at any time...
        </p>
        {/* Add more sections as needed */}
      </div>
      <Footer />
    </>
  );
};

export default TermsAndConditionsPage;
