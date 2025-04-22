// ========================================================================
// FILE: client/src/Pages/Admin/Dashboard/DashboardPage.jsx
// ========================================================================

import React from "react";
import { useAuth } from "../../../Context/AuthContext"; // Get user info if needed
// import data from "../../../Assets/dummy.json"; // Example using dummy data
import { FaUsers, FaBoxOpen, FaDollarSign, FaChartLine } from "react-icons/fa"; // Example icons
import "./DashboardPage.css"; // Component-specific styles

// --- Example Components (Replace with actual charts/tables) ---
const StatCard = ({ icon, title, value, trend, color }) => (
  <article className="stat-card" style={{ "--card-accent-color": color }}>
    <div className="stat-card-icon">{icon}</div>
    <div className="stat-card-info">
      <p className="stat-title">{title}</p>
      <h4 className="stat-value">{value}</h4>
      {trend && (
        <span className={`stat-trend ${trend > 0 ? "positive" : "negative"}`}>
          {trend > 0 ? "+" : ""}
          {trend}%
        </span>
      )}
    </div>
  </article>
);

const SimpleChartPlaceholder = ({ title }) => (
  <div className="card chart-placeholder-card">
    <h3 className="card-header">{title}</h3>
    <div className="card-body chart-placeholder-body">
      <p>(Chart Component Goes Here)</p>
      <FaChartLine
        size={50}
        style={{ color: "var(--color-border)", marginTop: "1rem" }}
      />
    </div>
  </div>
);

const SimpleTablePlaceholder = ({ title }) => (
  <div className="card table-placeholder-card">
    <h3 className="card-header">{title}</h3>
    <div className="card-body table-placeholder-body">
      <p>(Table Component Goes Here)</p>
      <div className="placeholder-row"></div>
      <div className="placeholder-row"></div>
      <div className="placeholder-row"></div>
    </div>
  </div>
);
// --- End Example Components ---

function DashboardPage() {
  const { user } = useAuth(); // Get logged-in user info

  // --- Replace with actual data fetching logic ---
  const stats = [
    {
      icon: <FaDollarSign />,
      title: "Total Revenue",
      value: "₹1,25,430",
      trend: 5.2,
      color: "#28a745",
    },
    {
      icon: <FaBoxOpen />,
      title: "Orders This Month",
      value: "845",
      trend: -1.8,
      color: "#17a2b8",
    },
    {
      icon: <FaUsers />,
      title: "New Customers",
      value: "56",
      trend: 12.0,
      color: "#ffc107",
    },
    {
      icon: <FaChartLine />,
      title: "Conversion Rate",
      value: "3.1%",
      trend: 0.5,
      color: "#6f42c1",
    },
  ];
  // --- End Data Fetching Placeholder ---

  return (
    <div className="dashboard-page">
      <h1 className="page-title">Dashboard</h1>
      <p className="page-subtitle">
        Welcome back, {user?.username || "Admin"}! Here's an overview.
      </p>

      {/* Statistics Cards */}
      <section className="stats-grid">
        {stats.map((stat, index) => (
          <StatCard
            key={index}
            icon={stat.icon}
            title={stat.title}
            value={stat.value}
            trend={stat.trend}
            color={stat.color}
          />
        ))}
      </section>

      {/* Main Content Area (Charts, Recent Activity, etc.) */}
      <section className="dashboard-main-content-grid">
        <div className="main-chart-area">
          <SimpleChartPlaceholder title="Sales Trends" />
        </div>
        <div className="secondary-content-area">
          <SimpleTablePlaceholder title="Recent Orders" />
          {/* Add more components like recent reviews, top products etc. */}
        </div>
      </section>
    </div>
  );
}

export default DashboardPage;
