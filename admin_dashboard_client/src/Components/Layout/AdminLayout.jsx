// client/src/Components/Layout/AdminLayout.jsx

import React, { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom"; // Import useNavigate
import Sidebar from "./Sidebar";
import Header from "./Header";
import orderService from "../../Services/orderService"; // Import orderService
import "./AdminLayout.css";

const POLLING_INTERVAL = 15000; // 15 seconds

function AdminLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem("sidebarCollapsed") === "true";
  });

  // State for new order notification
  const [notification, setNotification] = useState(null); // { orderId, message, shortId, updatedAt }
  const [lastNotifiedUpdatedAt, setLastNotifiedUpdatedAt] = useState(null);

  const navigate = useNavigate();

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prevState) => {
      const newState = !prevState;
      localStorage.setItem("sidebarCollapsed", newState);
      return newState;
    });
  };

  useEffect(() => {
    document.body.classList.toggle(
      "sidebar-collapsed-active",
      isSidebarCollapsed
    );
    return () => {
      document.body.classList.remove("sidebar-collapsed-active");
    };
  }, [isSidebarCollapsed]);

  // Effect for polling for latest orders
  useEffect(() => {
    const fetchLatestOrder = async () => {
      try {
        const latestOrder = await orderService.getLatestAdminOrder();
        if (latestOrder && latestOrder._id) {
          // Check if this order is newer than the last one we notified about
          if (
            !lastNotifiedUpdatedAt ||
            new Date(latestOrder.updatedAt) > new Date(lastNotifiedUpdatedAt)
          ) {
            const shortId =
              latestOrder.orderId || latestOrder._id.slice(-6).toUpperCase();
            let message = "";
            if (latestOrder.createdAt === latestOrder.updatedAt) {
              message = `New Order #${shortId} received.`;
            } else {
              message = `Order #${shortId} has been updated. (Status: ${latestOrder.orderStatus})`;
            }

            // Add user info if available
            if (
              latestOrder.user &&
              (latestOrder.user.displayName || latestOrder.user.name)
            ) {
              message += ` Customer: ${
                latestOrder.user.displayName || latestOrder.user.name
              }.`;
            }

            setNotification({
              orderId: latestOrder._id,
              shortId: shortId,
              message: message,
              updatedAt: latestOrder.updatedAt,
            });
            // Don't set lastNotifiedUpdatedAt here, set it when user dismisses or views
            // This allows re-notification if dismissed and then updated again.
            // Or, set it here to prevent re-notifying for the *exact same update* if poll runs fast.
            // Let's set it to prevent immediate re-notification of the same update:
            setLastNotifiedUpdatedAt(latestOrder.updatedAt);
          }
        }
      } catch (error) {
        console.error("Polling error for latest order:", error);
        // Don't set notification on error, allow next poll to try again
      }
    };

    fetchLatestOrder(); // Initial fetch
    const intervalId = setInterval(fetchLatestOrder, POLLING_INTERVAL);

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, [lastNotifiedUpdatedAt]); // Re-run if lastNotifiedUpdatedAt changes (e.g. after dismissal) or on mount

  const handleViewOrder = () => {
    if (notification && notification.orderId) {
      navigate(`/admin/orders/${notification.orderId}`);
      setLastNotifiedUpdatedAt(notification.updatedAt); // Ensure we don't re-notify for this viewed order
      setNotification(null); // Dismiss notification
    }
  };

  const handleDismissNotification = () => {
    if (notification) {
      setLastNotifiedUpdatedAt(notification.updatedAt); // Mark this version as seen
      setNotification(null);
    }
  };

  return (
    <div
      className={`admin-layout ${
        isSidebarCollapsed ? "sidebar-collapsed" : ""
      }`}
    >
      <Sidebar isCollapsed={isSidebarCollapsed} toggleSidebar={toggleSidebar} />
      <div className="main-content-area">
        <Header
          isSidebarCollapsed={isSidebarCollapsed}
          toggleSidebar={toggleSidebar}
        />
        <main className="page-content-wrapper">
          <Outlet />
        </main>
      </div>

      {/* New Order Notification Popup */}
      {notification && (
        <div
          className={`order-notification-popup ${notification ? "show" : ""}`}
        >
          <p>{notification.message}</p>
          <div className="buttons">
            <button onClick={handleViewOrder} className="btn btn-view">
              View Order
            </button>
            <button
              onClick={handleDismissNotification}
              className="btn btn-dismiss"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminLayout;
