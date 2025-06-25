// ========================================================================
// FILE: client/src/Pages/Admin/Promotions/NotificationPage.jsx
// ========================================================================

import React, { useState } from "react";
import LoadingSpinner from "../../../Components/Common/LoadingSpinner"; // Adjust path if needed
// import promotionService from '../../../Services/promotionService'; // Adjust path if needed

const NotificationPage = () => {
  const [targetAudience, setTargetAudience] = useState("all"); // 'all', 'specific', 'segment'
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationBody, setNotificationBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [sendSuccess, setSendSuccess] = useState(null);
  // Add state for specific user selection or segment selection if needed

  const handleSendNotification = async (e) => {
    e.preventDefault(); // Prevent default form submission
    setIsSending(true);
    setSendError(null);
    setSendSuccess(null);

    try {
      // --- Replace with your actual API call ---
      const payload = {
        title: notificationTitle,
        body: notificationBody,
        target: targetAudience,
        // Include specific user IDs or segment ID if targetAudience requires it
      };
      // await promotionService.sendNotification(payload);
      // ----------------------------------------

      // Mock Success (Remove when using real API)
      await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate sending
      console.log("Sending Notification:", payload);
      setSendSuccess("Notification sent successfully!");
      // Optionally clear the form
      // setNotificationTitle('');
      // setNotificationBody('');
      // setTargetAudience('all');
      // --------------------------------------
    } catch (err) {
      console.error("Failed to send notification:", err);
      setSendError("Failed to send notification. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="page-container notification-page">
      <header className="page-header">
        <h1>Send Push Notifications</h1>
      </header>

      <div className="page-content">
        <form
          onSubmit={handleSendNotification}
          className="p-4 border rounded shadow-sm bg-light"
        >
          <h4 className="mb-3">Compose Notification</h4>

          {sendSuccess && (
            <div className="alert alert-success">{sendSuccess}</div>
          )}
          {sendError && <div className="alert alert-danger">{sendError}</div>}

          <div className="mb-3">
            <label htmlFor="notificationTitle" className="form-label">
              Title:
            </label>
            <input
              type="text"
              id="notificationTitle"
              className="form-control"
              value={notificationTitle}
              onChange={(e) => setNotificationTitle(e.target.value)}
              required
              maxLength={100} // Example limit
            />
          </div>

          <div className="mb-3">
            <label htmlFor="notificationBody" className="form-label">
              Message Body:
            </label>
            <textarea
              id="notificationBody"
              className="form-control"
              rows="4"
              value={notificationBody}
              onChange={(e) => setNotificationBody(e.target.value)}
              required
              maxLength={250} // Example limit
            ></textarea>
          </div>

          <div className="mb-3">
            <label htmlFor="targetAudience" className="form-label">
              Target Audience:
            </label>
            <select
              id="targetAudience"
              className="form-select"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
            >
              <option value="all">All Users</option>
              {/* Add options for specific users or segments if implemented */}
              {/* <option value="specific">Specific Users</option> */}
              {/* <option value="segment">User Segment</option> */}
            </select>
            {/* Conditionally render inputs for specific users/segments based on selection */}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSending}
          >
            {isSending ? <LoadingSpinner size="sm" /> : "Send Notification"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default NotificationPage;
