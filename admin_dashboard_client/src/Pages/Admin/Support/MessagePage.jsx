// ========================================================================
// FILE: client/src/Pages/Admin/Support/MessagePage.jsx
// ========================================================================

import React, { useState, useEffect } from "react";
import LoadingSpinner from "../../../Components/Common/LoadingSpinner"; // Adjust path if needed
// import supportService from '../../../Services/supportService'; // Adjust path if needed

const MessagePage = () => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  // Add state for filters (read/unread, user, date) if needed

  useEffect(() => {
    const fetchMessages = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // --- Replace with your actual API call ---
        // const response = await supportService.getMessages({ /* params */ });
        // setMessages(response.data.messages);
        // ----------------------------------------

        // Mock Data (Remove when using real API)
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate delay
        const mockMessages = [
          {
            _id: "m1",
            senderName: "Test User 1",
            subject: "Inquiry about product X",
            date: new Date().toISOString(),
            isRead: false,
          },
          {
            _id: "m2",
            senderName: "Another User",
            subject: "Issue with my order ORD-002",
            date: new Date().toISOString(),
            isRead: true,
          },
          {
            _id: "m3",
            senderName: "Support Bot",
            subject: "System Update Notification",
            date: new Date().toISOString(),
            isRead: true,
          },
        ];
        setMessages(mockMessages);
        // --------------------------------------
      } catch (err) {
        console.error("Failed to fetch messages:", err);
        setError("Could not load messages. Please try again later.");
        setMessages([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
    // Add dependencies for filters if needed
  }, []);

  // Handler to view/reply to a message
  const handleViewMessage = (messageId) => {
    console.log("View/Reply to message:", messageId);
    // Navigate to a detail page or open a modal
  };

  return (
    <div className="page-container message-page">
      <header className="page-header">
        <h1>Support Messages</h1>
      </header>

      <div className="page-content">
        {/* Optional Filter/Search Section */}
        {/* <div className="filter-controls mb-4 p-3 border rounded bg-light"> ... Filters ... </div> */}

        {isLoading && <LoadingSpinner message="Loading messages..." />}
        {error && <div className="alert alert-danger">{error}</div>}

        {!isLoading && !error && (
          <div className="list-group">
            {messages.length > 0 ? (
              messages.map((message) => (
                <button
                  key={message._id}
                  type="button"
                  className={`list-group-item list-group-item-action ${
                    !message.isRead ? "fw-bold" : ""
                  }`}
                  onClick={() => handleViewMessage(message._id)}
                  aria-current={!message.isRead ? "true" : undefined} // Highlight unread
                >
                  <div className="d-flex w-100 justify-content-between">
                    <h5 className="mb-1">{message.subject}</h5>
                    <small>{new Date(message.date).toLocaleString()}</small>
                  </div>
                  <p className="mb-1">From: {message.senderName}</p>
                  {/* <small>Click to view details and reply.</small> */}
                </button>
              ))
            ) : (
              <div className="alert alert-info">No messages found.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagePage;
