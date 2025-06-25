// src/pages/couponspage/CouponsPage.jsx
import React, { useEffect, useState } from "react";
import Header from "../../components/Header/Header"; // Adjust path if necessary
import Footer from "../../components/Footer/Footer"; // Adjust path if necessary
import { getPublicCouponsApi } from "../../services/api"; // Import the API function
import { format } from "date-fns"; // Recommended for date formatting
import { CopyToClipboard } from "react-copy-to-clipboard"; // Optional: for easier copy button
import "./CouponsPage.css"; // Link the CSS file

// Helper function to format discount display
const formatDiscount = (type, amount) => {
  if (type === "Percent") {
    // Ensure it's a number before using toFixed
    return `${parseFloat(amount).toFixed(0)}% OFF`; // Format percentage
  }
  // Assuming Indian Rupees, change currency symbol as needed
  // Ensure it's a number before using toFixed
  return `₹${parseFloat(amount).toFixed(2)} OFF`; // Format amount with 2 decimal places
};

const CouponsPage = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null); // State to track which code was copied

  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        const response = await getPublicCouponsApi();

        // --- FIX START ---
        // Check if response.data exists and if it contains the expected array
        // The array is often under a key like 'data' or 'coupons'
        const couponsArray =
          response.data && Array.isArray(response.data.data)
            ? response.data.data // Assuming the array is under 'data' key
            : response.data && Array.isArray(response.data.coupons)
            ? response.data.coupons // Or maybe under 'coupons' key
            : response.data; // Fallback: assume response.data IS the array (less likely based on error)

        if (Array.isArray(couponsArray)) {
          // Sort coupons by expiry date, closest first
          // Filter out coupons that are not active or already expired/upcoming based on dates
          const now = new Date();
          const filteredAndSortedCoupons = couponsArray
            .filter((coupon) => {
              const startDate = new Date(coupon.startDate);
              const expireDate = new Date(coupon.expireDate);
              // Consider active if coupon.isActive is true AND current date is within start/expire range
              return coupon.isActive && startDate <= now && expireDate >= now;
            })
            .sort((a, b) => new Date(a.expireDate) - new Date(b.expireDate)); // Sort active ones by expiry

          setCoupons(filteredAndSortedCoupons);
        } else {
          // Handle cases where the response structure is unexpected
          console.error("API response data is not an array:", response.data);
          setError("Received unexpected data format from the server.");
          setCoupons([]); // Ensure state is an empty array on error/malformed data
        }
        // --- FIX END ---
      } catch (err) {
        console.error("Failed to fetch coupons:", err);
        setError("Failed to load coupons. Please try again later.");
        setCoupons([]); // Ensure state is an empty array on error
      } finally {
        setLoading(false);
      }
    };

    fetchCoupons();
  }, []); // Empty dependency array means this effect runs once on mount

  const handleCopySuccess = (code) => {
    // Use navigator.clipboard.writeText for modern browsers
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(code)
        .then(() => {
          setCopiedCode(code);
          // Temporarily show "Copied!" message
          setTimeout(() => {
            setCopiedCode(null);
          }, 2000); // Hide message after 2 seconds
        })
        .catch((err) => {
          console.error("Failed to copy text: ", err);
          // Fallback if writeText fails (less likely)
          alert(`Failed to copy coupon code "${code}". Please copy manually.`);
        });
    } else {
      // Fallback for older browsers (consider if you need this)
      const textArea = document.createElement("textarea");
      textArea.value = code;
      // Avoid scrolling to bottom
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.position = "fixed";

      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      try {
        document.execCommand("copy");
        setCopiedCode(code);
        setTimeout(() => {
          setCopiedCode(null);
        }, 2000);
      } catch (err) {
        console.error("Fallback: Oops, unable to copy", err);
        alert(`Failed to copy coupon code "${code}". Please copy manually.`);
      }
      document.body.removeChild(textArea);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="coupons-page-container">
          <h1>Available Coupons</h1>
          <p className="loading-message">Loading coupons...</p>
        </div>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <div className="coupons-page-container error-container">
          <h1>Available Coupons</h1>
          <p className="error-message">{error}</p>
        </div>
        <Footer />
      </>
    );
  }

  const hasCoupons = coupons && coupons.length > 0;

  return (
    <>
      <Header />
      <div className="coupons-page-container">
        <h1>Available Coupons</h1>

        {!hasCoupons ? (
          <p className="no-coupons-message">
            No active coupons are available at the moment. Check back later!
          </p>
        ) : (
          <div className="coupon-list">
            {coupons.map((coupon) => {
              // Re-check validity client-side too for display consistency, although fetching only active ones is better
              // This logic was moved into the fetch filter above, so displayed coupons should be active.
              // Adding classes based on potential expiration or upcoming status for consistency if needed
              // (e.g., if you decided to fetch all coupons and display expired ones differently)
              const now = new Date();
              const expireDate = new Date(coupon.expireDate);
              const isExpiredDisplay = expireDate < now; // Use this for styling if needed

              return (
                <div
                  key={coupon._id}
                  className={`coupon-card ${
                    isExpiredDisplay ? "expired-display" : ""
                  }`} // Use a different class name to distinguish from filter
                >
                  <div className="coupon-details">
                    <div className="discount-info">
                      <span className="discount-amount">
                        {formatDiscount(
                          coupon.discountType,
                          coupon.discountAmount
                        )}
                      </span>
                      {/* <span className="discount-type">{coupon.discountType.toUpperCase()}</span> {/* Show type, e.g., PERCENT */}
                    </div>
                    <div className="coupon-title">{coupon.title}</div>
                    {coupon.minPurchase > 0 && (
                      <div className="min-purchase">
                        Min Purchase: ₹
                        {parseFloat(coupon.minPurchase).toFixed(2)}
                      </div>
                    )}
                    {coupon.maxDiscount > 0 &&
                      coupon.discountType === "Percent" && (
                        <div className="max-discount">
                          Max Discount: ₹
                          {parseFloat(coupon.maxDiscount).toFixed(2)}
                        </div>
                      )}
                    {/* You could also add other details like limitForSameUser */}
                    <div className="coupon-type-tag">{coupon.couponType}</div>
                  </div>

                  <div className="coupon-code-section">
                    <div className="code-wrapper">
                      <span className="coupon-code">{coupon.code}</span>
                      <button
                        className="copy-button"
                        onClick={() => handleCopySuccess(coupon.code)}
                        title="Copy Code"
                      >
                        {/* Basic Copy Icon (replace with SVG if preferred) */}
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          height="24px"
                          viewBox="0 0 24 24"
                          width="24px"
                          fill="#ffffff"
                        >
                          <path d="M0 0h24v24H0z" fill="none" />
                          <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                        </svg>
                      </button>
                    </div>
                    {copiedCode === coupon.code && (
                      <span className="copied-feedback">Copied!</span>
                    )}
                  </div>

                  <div className="coupon-validity">
                    <span className="status active">Active</span>{" "}
                    {/* Assuming fetched coupons are active */}
                    <span className="valid-dates">
                      {/* Use virtual property if available, otherwise format manually */}
                      Expires:{" "}
                      {coupon.duration?.split(" - ")[1] ||
                        (coupon.expireDate
                          ? format(new Date(coupon.expireDate), "dd MMM yyyy")
                          : "N/A")}
                      {/* Or show the whole duration: {coupon.duration || 'N/A'} */}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </>
  );
};

export default CouponsPage;
