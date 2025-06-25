// src/pages/referearnpage/ReferEarnPage.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom"; // Assuming you use React Router for linking
import Header from "../../components/Header/Header"; // Adjust path if necessary
import Footer from "../../components/Footer/Footer"; // Adjust path if necessary
import { getReferralCodeApi } from "../../services/api"; // Import the API function
import "./ReferEarnPage.css"; // Link the CSS file

const ReferEarnPage = () => {
  const [referralCode, setReferralCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchReferralCode = async () => {
      try {
        // Assuming the API returns { success: true, code: "YOURCODE" } or { success: true, data: { code: "YOURCODE" } }
        const response = await getReferralCodeApi();
        // Adjust if your backend returns the code in a different structure
        setReferralCode(response.data?.code || response.data?.data?.code); // Check common patterns
      } catch (err) {
        console.error("Failed to fetch referral code:", err);
        // Handle specific errors like 401 (unauthenticated) if needed
        setError("Could not load your referral code. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    // Fetch code only if user is likely logged in.
    // In a real app, you'd check authentication state here, potentially redirecting if not authenticated.
    fetchReferralCode();
  }, []); // Empty dependency array means this effect runs once on mount

  const handleCopy = () => {
    if (referralCode) {
      // Use navigator.clipboard for modern browsers
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard
          .writeText(referralCode)
          .then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000); // Hide "Copied!" message after 2 seconds
          })
          .catch((err) => {
            console.error("Failed to copy text: ", err);
            alert(
              "Could not copy the code automatically. Please copy it manually."
            );
          });
      } else {
        // Fallback for older browsers (less common now)
        const textArea = document.createElement("textarea");
        textArea.value = referralCode;
        textArea.style.position = "fixed"; // Avoid scrolling
        textArea.style.opacity = "0"; // Hide textarea
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand("copy");
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch (err) {
          console.error("Fallback: Oops, unable to copy", err);
          alert(
            "Could not copy the code automatically. Please copy it manually."
          );
        }
        document.body.removeChild(textArea);
      }
    }
  };

  return (
    <>
      <Header />
      <div className="refer-earn-page-container">
        <h1>Refer & Earn with THE FRUITBOWL & CO</h1>

        <section className="referral-steps">
          <h2>How it Works</h2>
          <div className="steps-list">
            <div className="step-card">
              <div className="step-icon">🍏</div>
              <div className="step-text">
                Share your unique referral code with friends and family.
              </div>
            </div>
            <div className="step-card">
              <div className="step-icon">🍎</div>
              <div className="step-text">
                Your friend uses your code during their sign-up or first
                purchase.
              </div>
            </div>
            <div className="step-card">
              <div className="step-icon">💰</div>
              <div className="step-text">
                You earn ₹50 when their first eligible order is completed!
              </div>
            </div>
          </div>
        </section>

        <section className="your-code-section">
          <h2>Your Referral Code</h2>
          {loading ? (
            <p className="loading-message">Loading your code...</p>
          ) : error ? (
            <p className="error-message">{error}</p>
          ) : referralCode ? (
            <div className="code-display-area">
              <div className="referral-code-box">
                <span className="referral-code">{referralCode}</span>
                <button
                  className="copy-button"
                  onClick={handleCopy}
                  disabled={!referralCode}
                >
                  {copied ? "Copied!" : "Copy Code"}
                  {!copied && ( // Optional: add a copy icon SVG
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      height="20px"
                      viewBox="0 0 24 24"
                      width="20px"
                      fill="#ffffff"
                    >
                      <path d="M0 0h24v24H0z" fill="none" />
                      <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                    </svg>
                  )}
                </button>
              </div>
              {copied && (
                <span className="copy-feedback-message">
                  Code copied to clipboard!
                </span>
              )}
            </div>
          ) : (
            <p className="no-code-message">
              Could not retrieve your referral code.
            </p>
          )}
          <p className="refer-earn-note">
            Earned rewards will be credited to your Wallet.
            <Link to="/wallet" className="wallet-link">
              {" "}
              Visit Your Wallet
            </Link>{" "}
            {/* Link to wallet */}
          </p>
          <p className="refer-terms">Terms and conditions apply.</p>
        </section>

        {/* Optional: Add sharing buttons here (requires more implementation) */}
        {/* <section className="share-options">
            <h2>Share Directly</h2>
             <div className="share-buttons">
                 <button>WhatsApp</button>
                 <button>Facebook</button>
                  <button>Email</button>
             </div>
         </section> */}
      </div>
      <Footer />
    </>
  );
};

export default ReferEarnPage;
