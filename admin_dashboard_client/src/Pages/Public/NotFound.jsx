// ========================================================================
// FILE: client/src/Pages/Public/NotFound.jsx
// ========================================================================

import React from "react";
import { Link } from "react-router-dom";
import "./NotFound.css"; // Create this CSS file

const NotFound = () => {
  return (
    <div className="not-found-container">
      <div className="not-found-content">
        <h1>404</h1>
        <h2>Oops! Page Not Found</h2>
        <p>
          Sorry, the page you are looking for does not exist or has been moved.
        </p>
        <Link to="/" className="btn btn-primary">
          Go Back Home
        </Link>
        {/* Or link to login/dashboard depending on context */}
        {/* <Link to="/login" className="btn btn-primary">Go to Login</Link> */}
      </div>
    </div>
  );
};

export default NotFound;
