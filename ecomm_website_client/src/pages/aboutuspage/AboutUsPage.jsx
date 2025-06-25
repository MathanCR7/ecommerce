// src/pages/aboutuspage/AboutUsPage.jsx
import React from "react";
import Header from "../../components/Header/Header"; // Adjust path if necessary
import Footer from "../../components/Footer/Footer"; // Adjust path if necessary
import "./AboutUsPage.css"; // Create this CSS file later

const AboutUsPage = () => {
  return (
    <>
      <Header />
      <div className="about-us-page-container">
        <h1>About Us Page</h1>
        {/* Add your About Us content here */}
        <p>This page tells the story of your company.</p>
        {/* Example static content */}
        <p>
          Welcome to [Your E-commerce Site Name], your number one source for all
          things [type of products]. We're dedicated to giving you the very best
          of [product category], with a focus on [key features, e.g., quality,
          customer service, uniqueness].
        </p>
        <p>
          Founded in [year] by [Founder Name(s)], [Your E-commerce Site Name]
          has come a long way from its beginnings in [starting location]. When
          [Founder Name(s)] first started out, their passion for [e.g.,
          eco-friendly cleaning products, unique fashion items] drove them to
          [action, e.g., do tons of research, quit their day job, etc.] so that
          [Your E-commerce Site Name] can offer you [e.g., the world's most
          advanced toothbrush, distinctively unique socks]. We now serve
          customers all over [geographic area - e.g., the country, the world],
          and are thrilled that we're able to turn our passion into our own
          website.
        </p>
        <p>
          We hope you enjoy our products as much as we enjoy offering them to
          you. If you have any questions or comments, please don't hesitate to
          contact us.
        </p>
        <p>Sincerely,</p>
        <p>The [Your E-commerce Site Name] Team</p>
      </div>
      <Footer />
    </>
  );
};

export default AboutUsPage;
