import React from "react";
import "./footer.css"; // Assuming your CSS file is correctly named and placed

const Footer = () => {
  return (
    <footer className="footer-container">
      {/* ===== Left Section: Brand Info & App Links ===== */}
      <div className="app-store-play">
        <h1>The FruitBowl Co</h1>
        <p>
          {/* Updated Description */}
          Welcome to The FruitBowl Co – your destination for exceptionally
          fresh, vibrant, and healthy fruit bowls. We carefully craft delicious
          natural snacks designed to nourish your body and delight your senses.
          Elevate your wellness journey, one delicious bowl at a time.
        </p>
        {/* App Store Icons - Kept as is */}
        <div className="icon-footer appstore">
          <div className="img d_flex logo-text">
            <i className="fa-brands fa-google-play"></i>
            <span>Google Play Store</span>
          </div>
          <div className="img d_flex logo-text">
            <i className="fa-brands fa-app-store-ios"></i>
            <span>Apple App Store</span>
          </div>
        </div>
      </div>

      {/* ===== Middle Section 1: About Us ===== */}
      <div className="">
        <h2>About Us</h2>
        <ul>
          <li>Careers</li>
          <li>Our Stories</li>
          <li>Terms & Conditions</li>
          <li>Privacy Policy</li>
        </ul>
      </div>

      {/* ===== Middle Section 2: Customer Care ===== */}
      <div className="">
        <h2>Customer Care</h2>
        <ul>
          <li>Help Center</li>
          <li>How To Buy</li>
          <li>Track Your Order</li>
          <li>Corporate & Bulk Purchasing</li>
          <li>Returns & Refunds</li>
        </ul>
      </div>

      {/* ===== Right Section: Contact Us ===== */}
      <div className="">
        <h2>Contact Us</h2>
        <ul>
          {/* Updated Address */}
          <li>
            2/53, St, B Sector 8th Cross St, U R Nagar Extension, Pandu Ranga
            Puram, Anna Nagar West Extension, Chennai, Tamil Nadu 600101
          </li>
          <li className="contact-info-flex">
            Email :
            <a
              target="_blank"
              rel="noopener noreferrer" // Added for security/best practice
              href="mailto:arshadchowdhury46@gmail.com"
              className="icon-flex phone-icon" // Consider renaming class if needed
            >
              arshadchowdhury46@gmail.com
            </a>
          </li>
          <li className="contact-info-flex">
            Phone :{" "}
            <a
              target="_blank"
              rel="noopener noreferrer" // Added for security/best practice
              href="https://api.whatsapp.com/send?phone=8801317089432" // Kept user's phone number
              className="icon-flex phone-icon" // Consider renaming class if needed
            >
              +8801317089432
            </a>
          </li>
          {/* Optional: Add social media icons here */}
        </ul>
      </div>
    </footer>
  );
};

export default Footer;
