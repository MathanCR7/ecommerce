// ========================================================================
// FILE: client/src/Components/Layout/AdminLayout.jsx
// ========================================================================

import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header"; // Import Header
import "./AdminLayout.css"; // Styles for the layout structure

function AdminLayout() {
  // State for sidebar collapse, potentially saved/loaded from localStorage
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem("sidebarCollapsed") === "true";
  });

  // Toggle sidebar state and save preference
  const toggleSidebar = () => {
    setIsSidebarCollapsed((prevState) => {
      const newState = !prevState;
      localStorage.setItem("sidebarCollapsed", newState);
      return newState;
    });
  };

  // Add/remove body class based on sidebar state for global adjustments if needed
  useEffect(() => {
    document.body.classList.toggle(
      "sidebar-collapsed-active",
      isSidebarCollapsed
    );
    // Cleanup function to remove the class if the component unmounts
    return () => {
      document.body.classList.remove("sidebar-collapsed-active");
    };
  }, [isSidebarCollapsed]);

  return (
    <div
      className={`admin-layout ${
        isSidebarCollapsed ? "sidebar-collapsed" : ""
      }`}
    >
      <Sidebar isCollapsed={isSidebarCollapsed} toggleSidebar={toggleSidebar} />
      {/* Main content area that includes Header and the Page Content (Outlet) */}
      <div className="main-content-area">
        <Header
          isSidebarCollapsed={isSidebarCollapsed} // Pass state if needed by Header
          toggleSidebar={toggleSidebar} // Pass toggle function
        />
        {/* Outlet renders the matched child route component (e.g., DashboardPage) */}
        <main className="page-content-wrapper">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
