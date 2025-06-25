// frontend/src/pages/myorderspage/MyOrdersPage.jsx
import React, { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getMyOrdersApi } from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import { FaSpinner, FaShoppingBag, FaEye, FaInfoCircle } from "react-icons/fa";
import "./MyOrdersPage.css"; // Create this CSS file

const MyOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, loading: authLoading } = useContext(AuthContext);
  const navigate = useNavigate();

  // State for pagination (assuming backend supports it)
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1); // Total pages
  // You could add a limit state and pass it to the API call as well

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // Redirect to login, remembering the current page to return after login
      navigate("/login", { state: { from: "/my-orders" } });
      return;
    }

    const fetchOrders = async () => {
      setLoading(true);
      setError(null);
      try {
        // Pass pagination params if implementing infinite scroll or pagination UI
        const response = await getMyOrdersApi({ page }); // Example: pass current page
        const data = response.data; // Access the data object from the response

        // FIX: Check if data exists, if it has an 'orders' property, and if 'orders' is an array
        if (data && Array.isArray(data.orders)) {
          setOrders(data.orders); // FIX: Set the orders state to the 'orders' array inside the response data
          setPage(data.page); // Update current page from response
          setPages(data.pages); // Update total pages from response
        } else {
          // If the data format is unexpected
          console.error("API response data format unexpected:", data);
          throw new Error("Received unexpected data format from server.");
        }
      } catch (err) {
        console.error("Error fetching orders:", err);
        const errorMessage =
          err.response?.data?.message ||
          err.message ||
          "Failed to fetch orders.";
        setError(errorMessage);
        toast.error(errorMessage);
        // Optional: Handle specific error statuses like 401 if middleware didn't catch it
        // if (err.response?.status === 401) {
        //   navigate("/login", { state: { from: "/my-orders" } });
        // }
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
    // Add 'page' to dependencies if you add pagination controls
  }, [user, navigate, authLoading, page]); // Added page to dependencies for pagination example

  const formatPriceToINR = (price) => {
    const numPrice = Number(price);
    return `₹${isNaN(numPrice) ? "0.00" : numPrice.toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid Date";
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch (e) {
      console.error("Error formatting date:", dateString, e);
      return "Invalid Date";
    }
  };

  // Render full page loader if authentication or initial data is loading
  if (authLoading || loading) {
    return (
      <>
        <Header
          // Use placeholder cart count while loading if cart state isn't available
          cartItemCount={0} // Or pass actual cart count if available from context/props
        />
        <div
          className="loading-full-page"
          style={{
            minHeight: "calc(100vh - 120px)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <FaSpinner className="fa-spin" size="2em" />
          <p style={{ marginTop: "10px" }}>Loading your orders...</p>
        </div>
        <Footer />
      </>
    );
  }

  // Render error state if fetching failed
  if (error) {
    return (
      <>
        <Header /> {/* Consider showing cart count if available */}
        <div
          className="container my-orders-page error-state"
          style={{
            minHeight: "calc(100vh - 120px)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <h2>
            <FaInfoCircle /> Error Loading Orders
          </h2>
          <p>{error}</p>
          <Link to="/" className="btn-primary" style={{ marginTop: "15px" }}>
            Go to Homepage
          </Link>
        </div>
        <Footer />
      </>
    );
  }

  // Helper to handle pagination change (if you add controls)
  // const handlePageChange = (newPage) => {
  //   if (newPage >= 1 && newPage <= pages) {
  //     setPage(newPage);
  //   }
  // };

  return (
    <>
      {/* Header cart count - ensure it's using the actual cart state from context/props */}
      <Header />
      <main className="my-orders-page-wrapper">
        <div className="container my-orders-page">
          <h1>My Orders</h1>
          {orders.length === 0 ? (
            <div className="empty-orders-container">
              <FaShoppingBag className="empty-icon" />
              <h2>No Orders Yet</h2>
              <p>You haven't placed any orders with us. Start shopping now!</p>
              <Link to="/all-items" className="btn-primary">
                Shop Now
              </Link>
            </div>
          ) : (
            <div className="orders-list">
              {/* FIX: Added key={order._id} to the main order card loop */}
              {orders.map((order) => (
                <div className="order-card" key={order._id}>
                  <div className="order-card-header">
                    <div className="order-id-date">
                      <span className="order-id">
                        Order ID: #{order._id?.slice(-8).toUpperCase() || "N/A"}
                      </span>{" "}
                      {/* Added optional chaining and fallback */}
                      <span className="order-date">
                        Placed on: {formatDate(order.createdAt)}
                      </span>
                    </div>
                    <span
                      className={`order-status-badge status-${order.orderStatus
                        ?.toLowerCase()
                        .replace(/\s+/g, "-")}`}
                    >
                      {order.orderStatus}
                    </span>
                  </div>
                  <div className="order-card-body">
                    <div className="order-items-preview">
                      {/* FIX: Use item._id as the key in the inner loop */}
                      {order.orderItems?.slice(0, 2).map((item) => (
                        <img
                          key={item._id} // Use the subdocument _id for uniqueness
                          src={
                            item.image?.startsWith("http") // Check if image is a full URL
                              ? item.image
                              : `${import.meta.env.VITE_BACKEND_URL || ""}${
                                  item.image?.startsWith("/") ? "" : "/"
                                }${item.image}` // Assume uploads are in /uploads or root
                          }
                          alt={item.name}
                          title={item.name}
                          className="order-item-thumbnail"
                          // Add fallback for image errors
                          onError={(e) => {
                            e.target.onerror = null; // Prevents infinite loop
                            e.target.src =
                              "/assets/images/placeholder-item.png"; // Path to your placeholder image
                          }}
                        />
                      ))}
                      {order.orderItems && order.orderItems.length > 2 && (
                        <span className="more-items-count">
                          +{order.orderItems.length - 2} more
                        </span>
                      )}
                    </div>
                    <div className="order-total">
                      <span>Total:</span>
                      {/* Added optional chaining and fallback for totalPrice */}
                      <strong>{formatPriceToINR(order.totalPrice || 0)}</strong>
                    </div>
                  </div>
                  <div className="order-card-footer">
                    <Link
                      to={`/my-orders/${order._id}`}
                      className="btn-view-details"
                    >
                      <FaEye /> View Details
                    </Link>
                    {/* Add Track Order button if applicable */}
                    {/* {order.trackingNumber && (
                        <Link to={`/track-order/${order._id}`} className="btn-track-order">
                            <FaTruck /> Track Order
                        </Link>
                    )} */}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add pagination controls here if needed, using 'page' and 'pages' state */}
          {/* {pages > 1 && (
            <div className="pagination">
              <button onClick={() => handlePageChange(page - 1)} disabled={page === 1}>Prev</button>
              <span>Page {page} of {pages}</span>
              <button onClick={() => handlePageChange(page + 1)} disabled={page === pages}>Next</button>
            </div>
          )} */}
        </div>
      </main>
      <Footer />
    </>
  );
};

export default MyOrdersPage;
