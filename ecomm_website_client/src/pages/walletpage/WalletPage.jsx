// src/pages/walletpage/WalletPage.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom"; // Assuming you use React Router
import Header from "../../components/Header/Header"; // Adjust path if necessary
import Footer from "../../components/Footer/Footer"; // Adjust path if necessary
import { getWalletDetailsApi } from "../../services/api"; // Import the API function
import { format } from "date-fns"; // For formatting transaction dates
import "./WalletPage.css"; // Link the CSS file

const WalletPage = () => {
  const [walletData, setWalletData] = useState({
    balance: 0,
    transactions: [], // Assuming backend returns an array of transactions
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWalletData = async () => {
      try {
        // Assuming the API returns { success: true, data: { balance: 150.00, transactions: [...] } }
        const response = await getWalletDetailsApi();
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
          setWalletData({
            balance: data.balance,
            transactions: sortedTransactions,
          });
        } else {
          console.error(
            "API response data structure unexpected for wallet:",
            response.data
          );
          setError("Received unexpected data format from the server.");
          setWalletData({ balance: 0, transactions: [] }); // Reset state
        }
      } catch (err) {
        console.error("Failed to fetch wallet data:", err);
        // Handle specific errors like 401 (unauthenticated) if needed
        setError("Could not load wallet details. Please try again later.");
        setWalletData({ balance: 0, transactions: [] }); // Reset state on error
      } finally {
        setLoading(false);
      }
    };

    // Fetch data only if user is likely logged in.
    // In a real app, you'd check authentication state here, potentially redirecting if not authenticated.
    fetchWalletData();
  }, []); // Empty dependency array means this effect runs once on mount

  return (
    <>
      <Header />
      <div className="wallet-page-container">
        <h1>My Wallet</h1>

        <section className="wallet-summary-section">
          <h2>Current Balance</h2>
          {loading ? (
            <p className="loading-message">Loading balance...</p>
          ) : error ? (
            <p className="error-message">{error}</p>
          ) : (
            <div className="balance-box">
              <span className="currency-symbol">₹</span>
              <span className="wallet-balance">
                {parseFloat(walletData.balance).toFixed(2)}
              </span>{" "}
              {/* Format to 2 decimal places */}
            </div>
          )}
          <p className="wallet-note">
            Wallet balance can be used towards your orders.
            <Link to="/refer-earn" className="refer-link">
              {" "}
              Refer & Earn More
            </Link>{" "}
            {/* Link back to refer & earn */}
          </p>
        </section>

        <section className="transaction-history-section">
          <h2>Transaction History</h2>
          {loading ? (
            <p className="loading-message">Loading transactions...</p>
          ) : error ? (
            <p className="error-message">{error}</p>
          ) : walletData.transactions.length === 0 ? (
            <p className="no-transactions-message">No transactions yet.</p>
          ) : (
            <div className="transaction-list">
              {walletData.transactions.map((transaction) => (
                // Use a unique key for list items, prefer transaction._id if available from backend
                <div
                  key={
                    transaction.id ||
                    transaction._id ||
                    `tx-${transaction.date}-${transaction.amount}`
                  }
                  className={`transaction-item ${transaction.type}`}
                >
                  <div className="transaction-details">
                    <div className="transaction-description">
                      {transaction.description || "Transaction"}
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
                  <div className={`transaction-amount ${transaction.type}`}>
                    {transaction.type === "credit" ? "+" : "-"} ₹
                    {parseFloat(transaction.amount).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Optional: Add buttons like "Add Funds", "Withdraw", etc. */}
        {/* <section className="wallet-actions">
            <h2>Actions</h2>
            <div className="action-buttons">
                <button>Add Funds</button>
                <button>Withdraw</button>
            </div>
        </section> */}
      </div>
      <Footer />
    </>
  );
};

export default WalletPage;
