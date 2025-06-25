// ========================================================================
// FILE: client/src/Pages/Admin/Reports/SalesReportPage.jsx
// ========================================================================

import React, { useState, useEffect, useCallback } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler, // Import Filler for area below line
} from "chart.js";
import { format, startOfMonth, endOfMonth, subDays, parseISO } from "date-fns";
import {
  FaCalendarAlt,
  FaDollarSign,
  FaShoppingCart,
  FaCalculator,
} from "react-icons/fa"; // Added icons

import LoadingSpinner from "../../../Components/Common/LoadingSpinner";
// import reportService from '../../../Services/reportService'; // Your actual service
import "./SalesReportPage.css"; // Import dedicated CSS

// Register Chart.js components including Filler
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// --- Helper Functions ---
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount || 0);
};
const formatDateForInput = (date) => format(date, "yyyy-MM-dd");
const formatDisplayDate = (dateString) =>
  format(parseISO(dateString + "T00:00:00"), "MMM d, yyyy"); // For display

// --- Mock API Call (Replace with actual service) ---
const fetchMockSalesReport = async (startDate, endDate) => {
  console.log(
    `Fetching mock sales report from ${formatDateForInput(
      startDate
    )} to ${formatDateForInput(endDate)}`
  );
  return new Promise((resolve) => {
    setTimeout(() => {
      const mockData = {
        summary: {
          totalSales: Math.random() * 50000 + 10000,
          totalOrders: Math.floor(Math.random() * 500 + 100),
          averageOrderValue: Math.random() * 150 + 50,
        },
        timeSeries: [],
      };
      let currentDate = startDate;
      while (currentDate <= endDate) {
        mockData.timeSeries.push({
          date: formatDateForInput(currentDate),
          sales: Math.max(
            0,
            Math.random() * 1500 +
              Math.sin(currentDate.getDate() / 5) * 500 +
              300
          ), // More variation
        });
        currentDate = subDays(currentDate, -1); // Move next day using date-fns
      }
      resolve(mockData);
    }, 1200); // Simulate delay
  });
};
// --- End Mock ---

const SalesReportPage = () => {
  const today = new Date();
  const defaultStartDate = startOfMonth(today);

  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(today);
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchReport = useCallback(async () => {
    // Basic date validation
    if (startDate > endDate) {
      setError("Start date cannot be after end date.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setReportData(null);

    try {
      // const data = await reportService.getSalesReport(startDate, endDate);
      const data = await fetchMockSalesReport(startDate, endDate); // Using Mock
      setReportData(data);
    } catch (err) {
      console.error("Failed to fetch sales report:", err);
      setError(err.message || "Could not load sales report data.");
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Use ISO string format for date inputs which works reliably across browsers
  const handleStartDateChange = (e) => {
    // Prevent setting start date after end date
    const newStartDate = parseISO(e.target.value);
    if (newStartDate <= endDate) {
      setStartDate(newStartDate);
    } else {
      toast.warn("Start date cannot be after end date."); // Use toast for feedback
    }
  };

  const handleEndDateChange = (e) => {
    // Prevent setting end date before start date or after today
    const newEndDate = parseISO(e.target.value);
    if (newEndDate >= startDate && newEndDate <= today) {
      setEndDate(newEndDate);
    } else if (newEndDate < startDate) {
      toast.warn("End date cannot be before start date.");
    } else {
      toast.warn("End date cannot be in the future.");
    }
  };

  // --- Chart Configuration ---
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false, // Allow chart to fill container height
    plugins: {
      legend: { display: false }, // Hide legend if only one dataset
      title: {
        display: true,
        text: `Sales Trend (${format(startDate, "MMM d")} - ${format(
          endDate,
          "MMM d, yyyy"
        )})`,
        font: { size: 16 },
        padding: { top: 10, bottom: 20 },
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleFont: { size: 14 },
        bodyFont: { size: 12 },
        padding: 10,
        cornerRadius: 4,
        displayColors: false, // Hide color box
        callbacks: {
          title: (tooltipItems) => formatDisplayDate(tooltipItems[0].label), // Show full date in tooltip title
          label: (context) => `Sales: ${formatCurrency(context.parsed.y)}`,
        },
      },
    },
    scales: {
      x: { grid: { display: false } }, // Hide x-axis grid lines
      y: {
        beginAtZero: true,
        grid: { color: "#e9ecef" }, // Lighter grid lines
        ticks: {
          callback: (value) => formatCurrency(value).replace(".00", ""),
        }, // Format Y-axis as currency (remove cents if zero)
      },
    },
    interaction: { mode: "index", intersect: false }, // Show tooltip for nearest index
    elements: {
      point: {
        radius: 3,
        hoverRadius: 6,
        backgroundColor: "rgb(75, 192, 192)",
      },
    }, // Style points
  };

  const chartData = {
    // Use original date strings for labels, format in tooltip/axis
    labels: reportData?.timeSeries?.map((item) => item.date) || [],
    datasets: [
      {
        label: "Daily Sales",
        data: reportData?.timeSeries?.map((item) => item.sales) || [],
        borderColor: "rgb(75, 192, 192)",
        backgroundColor: "rgba(75, 192, 192, 0.2)", // Fill color with transparency
        fill: true, // Fill area below line
        tension: 0.3, // Smoother curve
        borderWidth: 2,
      },
    ],
  };
  // --- End Chart Configuration ---

  return (
    <div className="sales-report-page">
      <header className="report-header">
        <h2>Sales Report Dashboard</h2>
        <p>Analyze sales performance over selected periods.</p>
      </header>

      {/* --- Filter Bar --- */}
      <div className="filter-bar card-style">
        <FaCalendarAlt className="filter-icon" />
        <div className="filter-group">
          <label htmlFor="start-date">Start Date</label>
          <input
            type="date"
            id="start-date"
            className="form-control form-control-sm" // Smaller control
            value={formatDateForInput(startDate)}
            onChange={handleStartDateChange}
            max={formatDateForInput(endDate)}
          />
        </div>
        <div className="filter-group">
          <label htmlFor="end-date">End Date</label>
          <input
            type="date"
            id="end-date"
            className="form-control form-control-sm"
            value={formatDateForInput(endDate)}
            onChange={handleEndDateChange}
            min={formatDateForInput(startDate)}
            max={formatDateForInput(today)}
          />
        </div>
        {/* Optional: Button if not using useEffect */}
        {/* <button onClick={fetchReport} className="btn btn-sm btn-primary" disabled={isLoading}>
             {isLoading ? 'Loading...' : 'Apply Filter'}
         </button> */}
      </div>

      {/* --- Report Content --- */}
      <div className="report-content">
        {isLoading && (
          <div className="loading-container">
            <LoadingSpinner message="Generating Report..." />
          </div>
        )}
        {error && (
          <div className="error-container alert alert-danger">{error}</div>
        )}

        {!isLoading && !error && reportData && (
          <>
            {/* Summary Statistics Cards */}
            <div className="summary-cards">
              <div className="summary-card card-style">
                <FaDollarSign className="summary-icon sales" />
                <div className="summary-value">
                  {formatCurrency(reportData.summary.totalSales)}
                </div>
                <div className="summary-label">Total Sales</div>
              </div>
              <div className="summary-card card-style">
                <FaShoppingCart className="summary-icon orders" />
                <div className="summary-value">
                  {reportData.summary.totalOrders}
                </div>
                <div className="summary-label">Total Orders</div>
              </div>
              <div className="summary-card card-style">
                <FaCalculator className="summary-icon avg-order" />
                <div className="summary-value">
                  {formatCurrency(reportData.summary.averageOrderValue)}
                </div>
                <div className="summary-label">Avg. Order Value</div>
              </div>
            </div>

            {/* Chart Section */}
            {reportData.timeSeries && reportData.timeSeries.length > 0 ? (
              <div className="chart-section card-style">
                {/* Title moved to chart options */}
                <div className="chart-wrapper">
                  <Line options={chartOptions} data={chartData} />
                </div>
              </div>
            ) : (
              <div className="no-data-info card-style">
                No sales data points available for the selected period to
                display chart.
              </div>
            )}

            {/* Optional: Detailed Table (Keep commented or implement/style if needed) */}
            {/* <div className="detailed-table card-style"> ... </div> */}
          </>
        )}

        {/* Case where API returns successfully but with no data */}
        {!isLoading && !error && !reportData && (
          <div className="no-data-info card-style">
            No report data could be generated for the selected period.
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesReportPage;
