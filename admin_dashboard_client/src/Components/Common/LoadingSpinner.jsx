// ========================================================================
// FILE: client/src/Components/Common/LoadingSpinner.jsx
// ========================================================================

import React from "react";
import "./LoadingSpinner.css"; // Create this CSS file

const LoadingSpinner = ({
  message = "Loading...",
  isFullScreen = false,
  inline = false,
}) => {
  const wrapperClass = isFullScreen
    ? "loading-overlay fullscreen"
    : inline
    ? "loading-inline"
    : "loading-overlay"; // Default overlay style

  return (
    <div className={wrapperClass}>
      <div className="loading-spinner"></div>
      {message && <div className="loading-message">{message}</div>}
    </div>
  );
};

export default LoadingSpinner;
