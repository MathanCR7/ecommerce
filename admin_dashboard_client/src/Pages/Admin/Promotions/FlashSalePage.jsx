// ========================================================================
// FILE: client/src/Pages/Admin/Promotions/FlashSalePage.jsx
// ========================================================================

import React, { useState, useEffect } from "react";
import LoadingSpinner from "../../../Components/Common/LoadingSpinner"; // Adjust path if needed
// import promotionService from '../../../Services/promotionService'; // Adjust path if needed

const FlashSalePage = () => {
  const [activeSales, setActiveSales] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  // Add state for creating/editing a flash sale (modal or separate view)
  // const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    const fetchFlashSales = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // --- Replace with your actual API call ---
        // const response = await promotionService.getFlashSales();
        // setActiveSales(response.data.sales);
        // ----------------------------------------

        // Mock Data (Remove when using real API)
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate delay
        const mockSales = [
          {
            _id: "fs1",
            name: "Weekend Gadget Blowout",
            startDate: new Date().toISOString(),
            endDate: new Date(
              Date.now() + 2 * 24 * 60 * 60 * 1000
            ).toISOString(),
            discountPercentage: 25,
            status: "Active",
          },
          {
            _id: "fs2",
            name: "Summer Fashion Frenzy",
            startDate: new Date(
              Date.now() - 5 * 24 * 60 * 60 * 1000
            ).toISOString(),
            endDate: new Date(
              Date.now() - 1 * 24 * 60 * 60 * 1000
            ).toISOString(),
            discountPercentage: 30,
            status: "Expired",
          },
        ];
        setActiveSales(mockSales);
        // --------------------------------------
      } catch (err) {
        console.error("Failed to fetch flash sales:", err);
        setError("Could not load flash sale data.");
        setActiveSales([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFlashSales();
  }, []);

  // --- Handlers ---
  const handleCreateSale = () => {
    console.log(
      "Open modal or navigate to create flash sale page"
    ); /* setShowCreateModal(true); */
  };
  const handleEditSale = (saleId) => {
    console.log("Edit flash sale:", saleId);
  };
  const handleDeleteSale = (saleId) => {
    console.log("Delete flash sale:", saleId); /* Call API */
  };

  return (
    <div className="page-container flash-sale-page">
      <header className="page-header d-flex justify-content-between align-items-center">
        <h1>Flash Sales Management</h1>
        <button onClick={handleCreateSale} className="btn btn-primary">
          Create New Flash Sale
        </button>
      </header>

      <div className="page-content">
        {/* Optional Filter Section (e.g., Active/Scheduled/Expired) */}
        {/* <div className="filter-controls mb-4 p-3 border rounded bg-light"> ... Filters ... </div> */}

        {isLoading && <LoadingSpinner message="Loading flash sales..." />}
        {error && <div className="alert alert-danger">{error}</div>}

        {!isLoading && !error && (
          <div className="table-responsive">
            <table className="table table-striped table-hover">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Discount (%)</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeSales.length > 0 ? (
                  activeSales.map((sale) => (
                    <tr key={sale._id}>
                      <td>{sale.name}</td>
                      <td>{new Date(sale.startDate).toLocaleString()}</td>
                      <td>{new Date(sale.endDate).toLocaleString()}</td>
                      <td>{sale.discountPercentage}%</td>
                      <td>
                        <span
                          className={`badge bg-${
                            sale.status === "Active"
                              ? "success"
                              : sale.status === "Scheduled"
                              ? "info"
                              : "secondary"
                          }`}
                        >
                          {sale.status}
                        </span>
                      </td>
                      <td>
                        {/* Add Edit/Delete buttons */}
                        <button
                          onClick={() => handleEditSale(sale._id)}
                          className="btn btn-sm btn-outline-secondary me-2"
                          title="Edit"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteSale(sale._id)}
                          className="btn btn-sm btn-outline-danger"
                          title="Delete"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center">
                      No flash sales found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Add Modal for creating/editing flash sales if using modals */}
        {/* {showCreateModal && <CreateFlashSaleModal onClose={() => setShowCreateModal(false)} />} */}
      </div>
    </div>
  );
};

export default FlashSalePage;
