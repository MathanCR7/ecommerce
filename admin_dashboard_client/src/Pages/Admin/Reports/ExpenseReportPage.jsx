// ========================================================================
// FILE: client/src/Pages/Admin/Reports/ExpenseReportPage.jsx
// ========================================================================

import React, { useState, useEffect } from "react";
import LoadingSpinner from "../../../Components/Common/LoadingSpinner"; // Adjust path if needed
// import reportService from '../../../Services/reportService'; // Adjust path if needed

const ExpenseReportPage = () => {
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  // Add state for filters (date range, category, etc.) if needed

  useEffect(() => {
    const fetchExpenses = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // --- Replace with your actual API call ---
        // const response = await reportService.getExpenseReport({ /* params */ });
        // setExpenses(response.data.expenses);
        // ----------------------------------------

        // Mock Data (Remove when using real API)
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate delay
        const mockExpenses = [
          {
            _id: "e1",
            date: new Date().toISOString(),
            category: "Marketing",
            description: "Online Ads",
            amount: 350.0,
          },
          {
            _id: "e2",
            date: new Date().toISOString(),
            category: "Supplies",
            description: "Office stationery",
            amount: 75.5,
          },
          {
            _id: "e3",
            date: new Date().toISOString(),
            category: "Utilities",
            description: "Electricity Bill",
            amount: 120.0,
          },
        ];
        setExpenses(mockExpenses);
        // --------------------------------------
      } catch (err) {
        console.error("Failed to fetch expense report:", err);
        setError("Could not load expense report data. Please try again later.");
        setExpenses([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExpenses();
    // Add dependencies for filters if needed
  }, []);

  return (
    <div className="page-container expense-report-page">
      <header className="page-header">
        <h1>Expense Report</h1>
        {/* Optional: Button to add new expense? */}
      </header>

      <div className="page-content">
        {/* Optional Filter Section */}
        {/* <div className="filter-controls mb-4 p-3 border rounded bg-light"> ... Filters ... </div> */}

        {isLoading && <LoadingSpinner message="Loading expense report..." />}
        {error && <div className="alert alert-danger">{error}</div>}

        {!isLoading && !error && (
          <div className="table-responsive">
            <table className="table table-striped table-hover">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Amount</th>
                  {/* Add more columns as needed */}
                </tr>
              </thead>
              <tbody>
                {expenses.length > 0 ? (
                  expenses.map((expense) => (
                    <tr key={expense._id}>
                      <td>{new Date(expense.date).toLocaleDateString()}</td>
                      <td>{expense.category}</td>
                      <td>{expense.description}</td>
                      <td>${expense.amount.toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center">
                      No expenses found for the selected criteria.
                    </td>
                  </tr>
                )}
              </tbody>
              {/* Optional: Footer with total expenses */}
              {/* <tfoot><tr><td colSpan="3" className="text-end"><strong>Total:</strong></td><td><strong>$XXX.XX</strong></td></tr></tfoot> */}
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpenseReportPage;
