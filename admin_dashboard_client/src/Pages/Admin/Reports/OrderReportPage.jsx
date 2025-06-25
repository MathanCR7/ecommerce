// ========================================================================
// FILE: client/src/Pages/Admin/Reports/OrderReportPage.jsx
// ========================================================================

import React, { useState, useEffect } from "react";
import LoadingSpinner from "../../../Components/Common/LoadingSpinner"; // Adjust path if needed
// import reportService from '../../../Services/reportService'; // Adjust path if needed
// import PaginationControls from '../../../Components/Common/PaginationControls'; // If needed

const OrderReportPage = () => {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  // Add state for filters (date range, status, customer, etc.) if needed
  // const [startDate, setStartDate] = useState(null);
  // const [endDate, setEndDate] = useState(null);
  // const [orderStatus, setOrderStatus] = useState('');
  // Add state for pagination
  // const [currentPage, setCurrentPage] = useState(1);
  // const [totalPages, setTotalPages] = useState(0);
  // const [totalOrders, setTotalOrders] = useState(0);
  // const ITEMS_PER_PAGE = 15;

  // --- Fetch Orders (Example) ---
  useEffect(
    () => {
      const fetchOrders = async () => {
        setIsLoading(true);
        setError(null);
        try {
          // --- Replace with your actual API call ---
          // Example API call structure:
          // const params = {
          //   page: currentPage,
          //   limit: ITEMS_PER_PAGE,
          //   startDate: startDate ? startDate.toISOString() : undefined,
          //   endDate: endDate ? endDate.toISOString() : undefined,
          //   status: orderStatus || undefined,
          // };
          // const response = await reportService.getOrderReport(params);
          // setOrders(response.data.orders);
          // setTotalPages(response.data.totalPages);
          // setTotalOrders(response.data.totalOrders);
          // ----------------------------------------

          // Mock Data (Remove when using real API)
          await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate delay
          const mockOrders = [
            {
              _id: "o1",
              orderNumber: "ORD-001",
              customerName: "Alice",
              date: new Date().toISOString(),
              total: 55.5,
              status: "Completed",
            },
            {
              _id: "o2",
              orderNumber: "ORD-002",
              customerName: "Bob",
              date: new Date().toISOString(),
              total: 120.0,
              status: "Processing",
            },
            {
              _id: "o3",
              orderNumber: "ORD-003",
              customerName: "Charlie",
              date: new Date().toISOString(),
              total: 35.75,
              status: "Shipped",
            },
          ];
          setOrders(mockOrders);
          // setTotalPages(1); // Mock
          // setTotalOrders(mockOrders.length); // Mock
          // --------------------------------------
        } catch (err) {
          console.error("Failed to fetch order report:", err);
          setError("Could not load order report data. Please try again later.");
          setOrders([]);
        } finally {
          setIsLoading(false);
        }
      };

      fetchOrders();
      // Add dependencies like currentPage, filters if they should trigger refetch
    },
    [
      /* currentPage, startDate, endDate, orderStatus */
    ]
  );

  // --- Handlers ---
  // const handleFilterChange = (e) => { /* update filter state */ };
  // const handlePageChange = (page) => { setCurrentPage(page); };

  return (
    <div className="page-container order-report-page">
      <header className="page-header">
        <h1>Order Report</h1>
      </header>

      <div className="page-content">
        {/* Optional Filter Section */}
        {/* <div className="filter-controls mb-4 p-3 border rounded bg-light"> ... Filters ... </div> */}

        {isLoading && <LoadingSpinner message="Loading order report..." />}
        {error && <div className="alert alert-danger">{error}</div>}

        {!isLoading && !error && (
          <>
            {/* Optional Summary */}
            {/* <div className="summary-stats mb-3">Total Orders: {totalOrders}</div> */}

            <div className="table-responsive">
              <table className="table table-striped table-hover">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th>Total</th>
                    {/* Add more columns as needed */}
                  </tr>
                </thead>
                <tbody>
                  {orders.length > 0 ? (
                    orders.map((order) => (
                      <tr key={order._id}>
                        <td>{order.orderNumber}</td>
                        <td>{new Date(order.date).toLocaleDateString()}</td>
                        <td>{order.customerName}</td>
                        <td>
                          <span
                            className={`badge bg-${
                              order.status === "Completed"
                                ? "success"
                                : order.status === "Processing"
                                ? "warning"
                                : "info"
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td>${order.total.toFixed(2)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center">
                        No orders found for the selected criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {/* {totalPages > 1 && (
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            )} */}
          </>
        )}
      </div>
    </div>
  );
};

export default OrderReportPage;
