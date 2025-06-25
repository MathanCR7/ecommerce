import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import customerService from "../../../Services/customerService";
import "./CustomerListPage.css";
import {
  FiEye,
  // FiTrash2, // Removed as per request
  // FiChevronDown, // Removed from export button as it's direct export
  FiSearch,
  FiUpload,
  FiX,
} from "react-icons/fi";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

// --- Constants for Image Handling ---
const IMAGE_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(
  "/api",
  ""
);
const DEFAULT_AVATAR_URL = "/assets/main-logo/default_avatar.png";

// --- Helper for masking ---
const maskEmail = (email) => {
  if (!email || !email.includes("@")) return email || "N/A";
  const parts = email.split("@");
  const localPart = parts[0];
  const domain = parts[1];

  if (localPart.length <= 1) {
    // e.g., a@domain.com
    return `${localPart.charAt(0)}********@${domain}`;
  }
  // For localPart.length > 1
  // Example: "testing@example.com" -> t*****g@example.com
  // Ensure at least one asterisk if middle part exists
  const asterisksCount = Math.max(1, Math.min(8, localPart.length - 2)); // Between 1 and 8 asterisks

  if (localPart.length === 2) {
    // e.g. "ab@example.com" -> "a*b@example.com"
    return `${localPart.charAt(0)}*${localPart.charAt(1)}@${domain}`;
  }

  return `${localPart.charAt(0)}${"*".repeat(asterisksCount)}${localPart.slice(
    -1
  )}@${domain}`;
};

const maskPhone = (phone) => {
  if (!phone || typeof phone !== "string") return "N/A";
  const numericPhone = phone.replace(/\D/g, "");

  if (numericPhone.length === 0) {
    return phone.length > 0 ? phone : "N/A"; // If original had non-digits and wasn't empty, show original. Else N/A.
  }

  if (phone.startsWith("+91") && numericPhone.length === 12) {
    // +91 and 10 digits
    return `+91 ${numericPhone.substring(2, 4)}******${numericPhone.substring(
      10,
      12
    )}`;
  }
  if (phone.startsWith("+1") && numericPhone.length === 11) {
    // +1 and 10 digits
    return `+1 ${numericPhone.substring(1, 3)}******${numericPhone.substring(
      9,
      11
    )}`;
  }
  // Generic masking for 10-digit numbers (common for mobile)
  if (numericPhone.length === 10) {
    return `${numericPhone.substring(0, 2)}******${numericPhone.substring(
      8,
      10
    )}`;
  }
  // Fallback for other numeric lengths or original strings with non-digits not caught by specific country codes
  if (phone.length >= 4) {
    // Mask middle, show first 2 and last 2 characters of the original string
    return `${phone.substring(
      0,
      Math.min(2, Math.floor(phone.length / 3))
    )}******${phone.substring(
      phone.length - Math.min(2, Math.floor(phone.length / 3))
    )}`;
  }
  if (phone.length > 0) {
    return `${phone.charAt(0)}****`; // Minimal masking for very short strings
  }
  return "N/A";
};

// --- Helper function to determine image source ---
const getProfilePictureSrc = (profilePicturePath) => {
  if (!profilePicturePath) {
    return DEFAULT_AVATAR_URL;
  }
  if (
    profilePicturePath.startsWith("http://") ||
    profilePicturePath.startsWith("https://")
  ) {
    return profilePicturePath;
  }
  if (
    profilePicturePath === DEFAULT_AVATAR_URL ||
    profilePicturePath === "default_avatar.png"
  ) {
    return DEFAULT_AVATAR_URL;
  }
  let relativePath = profilePicturePath;
  if (relativePath.startsWith("/")) {
    relativePath = relativePath.substring(1);
  }
  return `${IMAGE_API_BASE_URL}/${relativePath}`;
};

const formatCurrency = (amount) => {
  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount)) return "₹0.00";
  return numericAmount.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const CustomerListPage = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [limit] = useState(10);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [inputValue, setInputValue] = useState("");

  const navigate = useNavigate();

  const fetchCustomers = useCallback(
    async (currentPage, currentSearchTerm) => {
      setLoading(true);
      setError(null);
      try {
        const data = await customerService.getCustomers({
          page: currentPage,
          limit,
          search: currentSearchTerm,
        });
        setCustomers(data.customers);
        setPage(data.page);
        setPages(data.pages);
        setTotalCustomers(data.totalCount);
      } catch (err) {
        const errorMessage =
          err.response?.data?.message ||
          err.message ||
          "Failed to fetch customers. Please try again.";
        setError(errorMessage);
        console.error("Fetch customers error details:", err.response || err);
      } finally {
        setLoading(false);
      }
    },
    [limit]
  );

  useEffect(() => {
    fetchCustomers(page, searchTerm);
  }, [fetchCustomers, page, searchTerm]);

  const handleSearchChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchTerm(inputValue);
    setPage(1);
  };

  const clearSearch = () => {
    setInputValue("");
    setSearchTerm("");
    setPage(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pages && newPage !== page) {
      setPage(newPage);
    }
  };

  const handleViewCustomer = (customerId) => {
    navigate(`/admin/customers/${customerId}`);
  };

  // Placeholder - Kept for potential future use, but button is removed
  const handleDeleteCustomer = async (customerId) => {
    if (window.confirm("Are you sure you want to delete this customer?")) {
      console.log("Delete customer:", customerId);
      alert("Delete functionality not fully implemented yet.");
      // try {
      //   await customerService.deleteCustomer(customerId);
      //   fetchCustomers(page, searchTerm); // Refresh list
      // } catch (err) {
      //   alert("Failed to delete customer.");
      // }
    }
  };

  const handleExport = () => {
    if (customers.length === 0) {
      alert("No data to export.");
      return;
    }

    const headers = [
      "SL",
      "Customer Name",
      "Email",
      "Phone",
      "Total Orders",
      "Total Order Amount", // No (₹) here, Excel handles currency symbols if type is currency
    ];

    const dataToExport = customers.map((customer, index) => ({
      SL: (page - 1) * limit + index + 1,
      "Customer Name": customer.displayName || customer.username || "N/A",
      Email: customer.email || "N/A", // Unmasked for export
      Phone: customer.phone || "N/A", // Unmasked for export
      "Total Orders": customer.totalOrders ?? 0,
      "Total Order Amount": parseFloat(customer.totalOrderAmount ?? 0), // Export as number
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet([]); // Start with empty array

    // Add headers manually
    XLSX.utils.sheet_add_aoa(worksheet, [headers]);

    // Add data starting from the second row
    XLSX.utils.sheet_add_json(worksheet, dataToExport, {
      origin: "A2",
      skipHeader: true,
    });

    // Style headers
    const headerCellStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "10B981" } }, // Using the green from search button
      alignment: { horizontal: "center", vertical: "center" },
    };

    headers.forEach((_, index) => {
      const cellAddress = XLSX.utils.encode_cell({ c: index, r: 0 });
      if (worksheet[cellAddress]) {
        worksheet[cellAddress].s = headerCellStyle;
      } else {
        worksheet[cellAddress] = { s: headerCellStyle, v: headers[index] }; // create cell if it doesn't exist
      }
    });

    // Set column for Total Order Amount to currency format (INR)
    const amountCol = headers.indexOf("Total Order Amount");
    if (amountCol > -1) {
      for (let i = 1; i <= dataToExport.length; i++) {
        // Start from row 1 (0-indexed data, but row 2 in sheet)
        const cellAddress = XLSX.utils.encode_cell({ c: amountCol, r: i });
        if (worksheet[cellAddress]) {
          worksheet[cellAddress].z = "₹#,##0.00"; // Excel currency format for INR
          worksheet[cellAddress].t = "n"; // Set type to number
        }
      }
    }

    // Adjust column widths
    worksheet["!cols"] = [
      { wch: 5 }, // SL
      { wch: 25 }, // Customer Name
      { wch: 30 }, // Email
      { wch: 18 }, // Phone
      { wch: 12 }, // Total Orders
      { wch: 20 }, // Total Order Amount
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const dataBlob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
    });
    saveAs(
      dataBlob,
      `customers_list_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  return (
    <div className="customer-list-page">
      <div className="page-header">
        <h1 className="page-title">
          Customers List{" "}
          {!loading && totalCustomers > 0 && (
            <span className="count-badge">{totalCustomers}</span>
          )}
        </h1>
        <div className="header-actions">
          <button
            className="btn btn-outline export-button"
            onClick={handleExport}
          >
            <FiUpload /> Export
          </button>
        </div>
      </div>

      <div className="filter-controls">
        <form onSubmit={handleSearchSubmit} className="search-form">
          <div className="search-input-container">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search by Name, Phone or Email..."
              value={inputValue}
              onChange={handleSearchChange}
              className="search-input"
            />
            {inputValue && (
              <button
                type="button"
                onClick={clearSearch}
                className="clear-search-btn"
                aria-label="Clear search"
              >
                <FiX />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="btn btn-primary search-button"
            disabled={loading}
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </form>
      </div>

      {loading && <div className="loading-indicator">Loading customers...</div>}
      {error && <div className="error-message">Error: {error}</div>}

      {!loading && !error && customers.length === 0 && (
        <div className="no-data-message">
          {searchTerm
            ? `No customers found for "${searchTerm}".`
            : "No customers found. Start by adding a new customer or adjusting your filters."}
        </div>
      )}

      {!loading && !error && customers.length > 0 && (
        <>
          <div className="table-responsive-container">
            <table className="customers-table">
              <thead>
                <tr>
                  <th>SL</th>
                  <th>Customer Name</th>
                  <th>Contact Info</th>
                  <th className="text-center">Total Orders</th>
                  <th className="text-right">Total Spent</th>
                  {/* Status column removed */}
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer, index) => (
                  <tr key={customer._id || index}>
                    <td data-label="SL">{(page - 1) * limit + index + 1}</td>
                    <td data-label="Customer Name">
                      <div className="customer-name-cell">
                        <img
                          src={getProfilePictureSrc(customer.profilePicture)}
                          alt={
                            customer.displayName ||
                            customer.username ||
                            "Avatar"
                          }
                          className="customer-avatar"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = DEFAULT_AVATAR_URL;
                          }}
                        />
                        <span>
                          {customer.displayName || customer.username || "N/A"}
                        </span>
                      </div>
                    </td>
                    <td data-label="Contact Info">
                      <div className="contact-info-cell">
                        <span>{maskEmail(customer.email)}</span>
                        <span>{maskPhone(customer.phone)}</span>
                      </div>
                    </td>
                    <td data-label="Total Orders" className="text-center">
                      {customer.totalOrders ?? 0}
                    </td>
                    <td data-label="Total Spent" className="text-right">
                      {formatCurrency(customer.totalOrderAmount ?? 0)}
                    </td>
                    {/* Status td removed */}
                    <td data-label="Action" className="text-center">
                      <div className="action-buttons">
                        <button
                          onClick={() => handleViewCustomer(customer._id)}
                          className="action-btn view-btn"
                          title="View Customer"
                        >
                          <FiEye />
                          <span className="action-btn-text">View</span>
                        </button>
                        {/* Delete button removed */}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="pagination-controls">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1 || loading}
                className="btn btn-outline"
              >
                Previous
              </button>
              <span>
                Page {page} of {pages}
              </span>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === pages || loading}
                className="btn btn-outline"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CustomerListPage;
