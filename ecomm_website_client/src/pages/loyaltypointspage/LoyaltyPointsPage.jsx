// src/pages/loyaltypointspage/LoyaltyPointsPage.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom"; // For linking if needed (e.g., to how to earn)
import Header from "../../components/Header/Header"; // Adjust path if necessary
import Footer from "../../components/Footer/Footer"; // Adjust path if necessary
import { getLoyaltyDetailsApi } from "../../services/api"; // Import the new API function
import { format } from "date-fns"; // For formatting transaction dates
import "./LoyaltyPointsPage.css"; // Link the CSS file

const LoyaltyPointsPage = () => {
  const [loyaltyData, setLoyaltyData] = useState({
    balance: 0,
    transactions: [], // Assuming backend returns an array of transactions
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLoyaltyData = async () => {
      try {
        // Assuming the API returns { success: true, data: { balance: 1000, transactions: [...] } }
        const response = await getLoyaltyDetailsApi();
        // Adjust if your backend returns data in a different structure
        const data = response.data?.data || response.data; // Check common patterns

        if (
          data &&
          typeof data.balance === "number" &&
          Array.isArray(data.transactions)
        ) {
          // Sort transactions by date, newest first
          const sortedTransactions = data.transactions.sort(
            (a, b) => new Date(b.date) - new Date(a.date)
          );
          setLoyaltyData({
            balance: data.balance,
            transactions: sortedTransactions,
          });
        } else {
          console.error(
            "API response data structure unexpected for loyalty:",
            response.data
          );
          setError("Received unexpected data format from the server.");
          setLoyaltyData({ balance: 0, transactions: [] }); // Reset state
        }
      } catch (err) {
        console.error("Failed to fetch loyalty data:", err);
        // Handle specific errors like 401 (unauthenticated) if needed
        setError("Could not load loyalty details. Please try again later.");
        setLoyaltyData({ balance: 0, transactions: [] }); // Reset state on error
      } finally {
        setLoading(false);
      }
    };

    // Fetch data only if user is likely logged in.
    // In a real app, you'd check authentication state here, potentially redirecting if not authenticated.
    fetchLoyaltyData();
  }, []); // Empty dependency array means this effect runs once on mount

  return (
    <>
      <Header />
      <div className="loyalty-points-page-container">
        <h1>My Loyalty Points</h1>

        <section className="loyalty-summary-section">
          <h2>Current Balance</h2>
          {loading ? (
            <p className="loading-message">Loading points...</p>
          ) : error ? (
            <p className="error-message">{error}</p>
          ) : (
            <div className="points-box">
              <span className="loyalty-balance">
                {parseFloat(loyaltyData.balance).toFixed(0)}
              </span>{" "}
              {/* Display as whole number */}
              <span className="points-label"> Points</span>
            </div>
          )}
          <p className="how-to-earn">
            Earn points with every purchase! 1 point for every ₹10 spent
            (Example).
            {/* Optional: Link to a page explaining the program */}
            {/* <Link to="/how-to-earn-points">Learn More</Link> */}
          </p>
        </section>

        <section className="transaction-history-section">
          <h2>Points Activity</h2>
          {loading ? (
            <p className="loading-message">Loading transactions...</p>
          ) : error ? (
            <p className="error-message">{error}</p>
          ) : loyaltyData.transactions.length === 0 ? (
            <p className="no-transactions-message">No points activity yet.</p>
          ) : (
            <div className="transaction-list">
              {loyaltyData.transactions.map((transaction) => (
                // Use a unique key for list items, prefer transaction._id if available from backend
                <div
                  key={
                    transaction.id ||
                    transaction._id ||
                    `loyalty-${transaction.date}-${transaction.points}`
                  }
                  className={`transaction-item ${transaction.type}`}
                >
                  <div className="transaction-details">
                    <div className="transaction-description">
                      {transaction.description || "Points Activity"}
                    </div>
                    <div className="transaction-date">
                      {transaction.date
                        ? format(
                            new Date(transaction.date),
                            "dd MMM yyyy, hh:mm a"
                          )
                        : "N/A"}
                    </div>
                  </div>
                  <div className={`transaction-points ${transaction.type}`}>
                    {transaction.type === "earn" ||
                    transaction.type === "adjustment"
                      ? "+"
                      : "-"}{" "}
                    {parseFloat(transaction.points).toFixed(0)} pts
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Optional: Add a section on how to redeem points */}
        <section className="how-to-redeem-section">
          <h2>How to Redeem Points</h2>
          <p>
            You can redeem your loyalty points for discounts at checkout (e.g.,
            100 points = ₹10 discount). More options coming soon!
          </p>
          {/* Optional: Add a button to apply points to next order or visit a redemption page */}
          {/* <button className="redeem-button">Apply Points to Next Order</button> */}
        </section>
      </div>
      <Footer />
    </>
  );
};

export default LoyaltyPointsPage;
