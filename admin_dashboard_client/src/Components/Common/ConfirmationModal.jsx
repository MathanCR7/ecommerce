// ========================================================================
// FILE: client/src/Components/Common/ConfirmationModal.jsx
// ========================================================================
import React from "react";
import Modal from "react-modal"; // Using react-modal for better accessibility and features
import LoadingSpinner from "./LoadingSpinner"; // Assuming you have this for inline loading
import { FaExclamationTriangle, FaTimes } from "react-icons/fa";
import "./ConfirmationModal.css"; // Your specific styles

// Set the app element for screen readers (important for accessibility)
// Do this once in your main App component or index.js
// Modal.setAppElement('#root');

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message, // Optional: Keep for simple text messages
  children, // *** ADDED: Prop to render custom content ***
  confirmText = "Confirm",
  cancelText = "Cancel",
  isLoading = false, // To disable buttons during async action
  isDestructive = false, // Style confirm button red for destructive actions
  disableConfirm = false, // *** ADDED: Prop to disable confirm button based on external logic ***
}) => {
  // Don't render anything if the modal is not open
  if (!isOpen) {
    return null;
  }

  // Custom styles for react-modal (can be moved to CSS)
  const customStyles = {
    content: {
      top: "50%",
      left: "50%",
      right: "auto",
      bottom: "auto",
      marginRight: "-50%",
      transform: "translate(-50%, -50%)",
      border: "none", // Remove default border
      padding: "0", // Remove default padding
      borderRadius: "var(--border-radius)", // Use your variable
      maxWidth: "500px", // Max width
      width: "90%", // Responsive width
      boxShadow: "var(--shadow-lg)", // Use your shadow variable
      maxHeight: "90vh", // Prevent modal becoming too tall
      overflow: "hidden", // We'll handle scroll inside
      display: "flex",
      flexDirection: "column",
    },
    overlay: {
      backgroundColor: "rgba(0, 0, 0, 0.6)", // Darker overlay
      zIndex: 1000, // Ensure it's on top
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={!isLoading ? onClose : undefined} // Prevent closing while loading
      contentLabel={title}
      style={customStyles} // Apply custom styles
      shouldCloseOnOverlayClick={!isLoading} // Prevent closing overlay click while loading
      ariaHideApp={false} // Set true and use setAppElement in prod ideally
    >
      {/* Modal Header */}
      <div className="modal-header">
        {isDestructive &&
          !isLoading && ( // Show icon only if destructive and not loading
            <FaExclamationTriangle
              className="modal-warning-icon"
              aria-hidden="true"
            />
          )}
        <h2 id="modal-title" className="modal-title">
          {title}
        </h2>
        <button
          className="btn-icon modal-close-btn"
          onClick={onClose}
          aria-label="Close dialog"
          disabled={isLoading}
        >
          <FaTimes />
        </button>
      </div>

      {/* Modal Body - Render children or message */}
      <div className="modal-body">
        {/* Render custom children passed in, otherwise render the simple message prop */}
        {children ? children : message && <p>{message}</p>}
      </div>

      {/* Modal Footer */}
      <div className="modal-footer">
        <button
          type="button"
          className="btn btn-secondary modal-btn" // Use consistent button classes
          onClick={onClose}
          disabled={isLoading}
        >
          {cancelText}
        </button>
        <button
          type="button"
          className={`btn modal-btn ${
            isDestructive ? "btn-danger" : "btn-primary"
          }`}
          onClick={onConfirm}
          // Disable if loading OR if externally disabled (e.g., invalid move target)
          disabled={isLoading || disableConfirm}
        >
          {/* Show spinner inline when loading */}
          {isLoading ? (
            <>
              <LoadingSpinner inline size="sm" />
              <span style={{ marginLeft: "8px" }}>Processing...</span>
            </>
          ) : (
            confirmText
          )}
        </button>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;
