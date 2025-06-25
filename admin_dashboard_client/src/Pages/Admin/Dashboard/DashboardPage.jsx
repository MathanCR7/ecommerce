import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { Link, useNavigate } from "react-router-dom"; // MODIFIED: Added useNavigate
import orderService from "../../../Services/orderService";
import customerService from "../../../Services/customerService";
import itemService from "../../../Services/itemService";
import categoryService from "../../../Services/categoryService";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  TimeScale,
} from "chart.js";
import { Line, Doughnut } from "react-chartjs-2";
import {
  format,
  getMonth,
  getYear,
  getDate,
  getDay,
  getHours,
  parseISO,
  isToday,
  isThisWeek,
  isThisMonth,
  isThisYear,
  getDaysInMonth,
} from "date-fns";

import { FaStar, FaUserCircle } from "react-icons/fa";
import {
  MdPendingActions,
  MdCheckCircleOutline,
  MdDoneAll,
  MdCancel,
  MdOutlineKeyboardReturn,
  MdErrorOutline,
  MdAccessTime,
} from "react-icons/md";
import { TbTruckDelivery } from "react-icons/tb";
import { BsBoxSeam } from "react-icons/bs";

import "./DashboardPage.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  TimeScale,
  Title,
  Tooltip,
  Legend
);

// --- Reusable StatCard Component --- // MODIFIED
const StatCard = ({ icon, title, value, color, isLoading, onClick }) => (
  <article
    className={`stat-card ${onClick ? "stat-card-clickable" : ""}`}
    style={{ "--card-accent-color": color }}
    onClick={isLoading ? undefined : onClick} // Only allow click if not loading
    role={onClick ? "button" : undefined}
    tabIndex={onClick && !isLoading ? 0 : undefined}
    onKeyDown={
      onClick && !isLoading
        ? (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault(); // Prevent scrolling on spacebar
              onClick();
            }
          }
        : undefined
    }
    aria-disabled={isLoading}
  >
    <div className="stat-card-icon">{isLoading ? "..." : icon}</div>
    <div className="stat-card-info">
      <p className="stat-title">{title}</p>
      <h4 className="stat-value">{isLoading ? "..." : value}</h4>
    </div>
  </article>
);

// --- Loading Spinner ---
const LoadingSpinner = () => (
  <div className="loading-spinner-container">
    <div className="loading-spinner"></div>
    <p>Loading...</p>
  </div>
);

// --- Updated DashboardCard Component to handle headerExtra ---
const DashboardCard = ({
  title,
  children,
  viewAllLink,
  isLoading,
  className = "",
  headerExtra,
}) => (
  <div className={`card dashboard-section-card ${className}`}>
    <div className="card-header">
      <div className="card-header-title-group">
        <h3>{title}</h3>
        {viewAllLink && (
          <Link to={viewAllLink} className="view-all-link">
            View All
          </Link>
        )}
      </div>
      {headerExtra && <div className="card-header-extra">{headerExtra}</div>}
    </div>
    <div className="card-body">{isLoading ? <LoadingSpinner /> : children}</div>
  </div>
);

// --- Helper function to construct image URLs ---
const getImageUrl = (path, defaultImage = "/default-product.png") => {
  if (!path) return defaultImage;
  if (path.startsWith("http") || path.startsWith("/")) {
    return path;
  }
  return `/uploads/${path}`;
};

// --- Main Dashboard Page Component ---
function DashboardPage() {
  const navigate = useNavigate(); // ADDED: Initialize useNavigate

  const [allOrdersData, setAllOrdersData] = useState([]);
  const [allItemsData, setAllItemsData] = useState([]);
  const [allCategoriesData, setAllCategoriesData] = useState([]);

  const [dashboardStats, setDashboardStats] = useState({
    pending: 0,
    confirmed: 0,
    packaging: 0,
    outfordelivery: 0,
    delivered: 0,
    cancelled: 0,
    returned: 0,
    failedtodeliver: 0,
    totalOrders: 0,
    processing: 0,
    shipped: 0,
    readyforpickup: 0,
    pickedup: 0,
  });
  const [orderTrendsData, setOrderTrendsData] = useState(null);
  const [earningTrendsData, setEarningTrendsData] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [topSellingItems, setTopSellingItems] = useState([]);
  const [topSellingCategories, setTopSellingCategories] = useState([]);

  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingOrderTrends, setIsLoadingOrderTrends] = useState(true);
  const [isLoadingEarningTrends, setIsLoadingEarningTrends] = useState(true);
  const [isLoadingRecentOrders, setIsLoadingRecentOrders] = useState(true);
  const [isLoadingTopCustomers, setIsLoadingTopCustomers] = useState(true);
  const [isLoadingTopSellingItems, setIsLoadingTopSellingItems] =
    useState(true);
  const [isLoadingTopSellingCategories, setIsLoadingTopSellingCategories] =
    useState(true);
  const [isLoadingAllItems, setIsLoadingAllItems] = useState(true);
  const [isLoadingAllCategories, setIsLoadingAllCategories] = useState(true);

  const [activeOrderChartTimeframe, setActiveOrderChartTimeframe] =
    useState("This Year");
  const [activeEarningChartTimeframe, setActiveEarningChartTimeframe] =
    useState("This Year");

  // --- Initial Data Fetching ---
  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingStats(true);
      setIsLoadingRecentOrders(true);
      setIsLoadingTopCustomers(true);
      setIsLoadingAllItems(true);
      setIsLoadingAllCategories(true);

      try {
        const [
          allOrdersServiceResponse,
          itemsResponse,
          categoriesResponse,
          recentOrdersServiceResponse,
        ] = await Promise.all([
          orderService.getOrdersByStatus("all", { limit: 10000, page: 1 }),
          itemService.getAllAdminItems(),
          categoryService.getAllCategories(),
          orderService.getOrdersByStatus("all", {
            limit: 5,
            page: 1,
            sortBy: "createdAt",
            sortOrder: "desc",
          }),
        ]);

        const { orders = [], totalCount = 0 } = allOrdersServiceResponse || {};
        setAllOrdersData(orders);

        const fetchedItems = Array.isArray(itemsResponse)
          ? itemsResponse
          : itemsResponse?.items || [];
        setAllItemsData(fetchedItems);
        setIsLoadingAllItems(false);

        const fetchedCategories = Array.isArray(categoriesResponse)
          ? categoriesResponse
          : categoriesResponse?.categories || [];
        setAllCategoriesData(fetchedCategories);
        setIsLoadingAllCategories(false);

        const stats = {
          pending: 0,
          confirmed: 0,
          packaging: 0,
          outfordelivery: 0,
          processing: 0,
          shipped: 0,
          delivered: 0,
          cancelled: 0,
          returned: 0,
          failedtodeliver: 0,
          readyforpickup: 0,
          pickedup: 0,
        };
        orders.forEach((order) => {
          if (order && order.orderStatus) {
            const statusKey = order.orderStatus
              .toLowerCase()
              .replace(/\s+/g, "");
            if (stats.hasOwnProperty(statusKey)) {
              stats[statusKey]++;
            }
          }
        });
        setDashboardStats({
          ...stats,
          totalOrders: totalCount || orders.length,
        });
        setIsLoadingStats(false);

        const { orders: recent = [] } = recentOrdersServiceResponse || {};
        setRecentOrders(recent);
        setIsLoadingRecentOrders(false);

        const customerOrders = {};
        orders.forEach((order) => {
          if (order && order.user) {
            const customerId =
              typeof order.user === "object" && order.user._id
                ? order.user._id
                : typeof order.user === "string"
                ? order.user
                : null;
            if (customerId) {
              customerOrders[customerId] =
                (customerOrders[customerId] || 0) + 1;
            }
          }
        });
        const topCustomerIds = Object.entries(customerOrders)
          .sort(([, aOrders], [, bOrders]) => bOrders - aOrders)
          .slice(0, 6)
          .map(([userId, orderCount]) => ({ userId, orderCount }));

        const topCustomerDetails = await Promise.all(
          topCustomerIds.map(async ({ userId, orderCount }) => {
            try {
              const customerData = await customerService.getCustomerById(
                userId
              );
              return {
                id: userId,
                name:
                  customerData?.user?.username || `User ${userId.slice(-4)}`,
                avatar: customerData?.user?.avatar || null,
                orders: orderCount,
              };
            } catch (e) {
              console.warn(`Failed to fetch customer ${userId}:`, e);
              return {
                id: userId,
                name: `User ${userId.slice(-4)}`,
                orders: orderCount,
                avatar: null,
              };
            }
          })
        );
        setTopCustomers(topCustomerDetails);
        setIsLoadingTopCustomers(false);
      } catch (error) {
        console.error("Failed to fetch initial dashboard data:", error);
        setIsLoadingStats(false);
        setIsLoadingRecentOrders(false);
        setIsLoadingTopCustomers(false);
        setIsLoadingAllItems(false);
        setIsLoadingAllCategories(false);
      }
    };
    fetchData();
  }, []);

  // --- Process Top Selling Items ---
  useEffect(() => {
    if (isLoadingAllItems || !allOrdersData.length || !allItemsData.length) {
      setIsLoadingTopSellingItems(
        isLoadingAllItems || (!allOrdersData.length && !allItemsData.length)
      );
      if (!isLoadingAllItems && allOrdersData.length && !allItemsData.length) {
        console.warn(
          "Cannot process top selling items: AllItemsData is empty."
        );
      }
      if (!allOrdersData.length || !allItemsData.length) {
        setTopSellingItems([]);
      }
      return;
    }
    setIsLoadingTopSellingItems(true);

    const itemsMap = allItemsData.reduce((map, item) => {
      map[item._id] = item;
      return map;
    }, {});

    const itemSales = {};
    allOrdersData.forEach((order) => {
      if (order && order.orderItems && Array.isArray(order.orderItems)) {
        order.orderItems.forEach((orderItem) => {
          const itemId = orderItem.item;
          if (itemId) {
            itemSales[itemId] =
              (itemSales[itemId] || 0) + (orderItem.quantity || 0);
          }
        });
      }
    });

    const sortedTopItems = Object.entries(itemSales)
      .map(([itemId, count]) => {
        const itemDetail = itemsMap[itemId];
        if (!itemDetail) return null;

        const primaryImage = itemDetail.images?.find((img) => img.isPrimary);
        const imagePath = primaryImage?.path || itemDetail.images?.[0]?.path;

        return {
          id: itemId,
          name: itemDetail.name || "Unknown Item",
          sold: count,
          image: getImageUrl(imagePath, "/default-product.png"),
        };
      })
      .filter((item) => item !== null)
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 6);

    setTopSellingItems(sortedTopItems);
    setIsLoadingTopSellingItems(false);
  }, [allOrdersData, allItemsData, isLoadingAllItems]);

  // --- Process Top Selling Categories ---
  useEffect(() => {
    if (
      isLoadingAllItems ||
      isLoadingAllCategories ||
      !allOrdersData.length ||
      !allItemsData.length ||
      !allCategoriesData.length
    ) {
      setIsLoadingTopSellingCategories(
        isLoadingAllItems ||
          isLoadingAllCategories ||
          (!allOrdersData.length &&
            !allItemsData.length &&
            !allCategoriesData.length)
      );
      if (
        !allOrdersData.length ||
        !allItemsData.length ||
        !allCategoriesData.length
      ) {
        setTopSellingCategories([]);
      }
      return;
    }
    setIsLoadingTopSellingCategories(true);

    const itemsMap = allItemsData.reduce((map, item) => {
      map[item._id] = item;
      return map;
    }, {});

    const categoriesMap = allCategoriesData.reduce((map, cat) => {
      map[cat._id] = cat;
      return map;
    }, {});

    const categorySales = {};
    allOrdersData.forEach((order) => {
      if (order && order.orderItems && Array.isArray(order.orderItems)) {
        order.orderItems.forEach((orderItem) => {
          const itemId = orderItem.item;
          const itemDetail = itemsMap[itemId];
          if (itemDetail && itemDetail.category) {
            const categoryId =
              typeof itemDetail.category === "object"
                ? itemDetail.category._id
                : itemDetail.category;
            if (categoryId && categoriesMap[categoryId]) {
              categorySales[categoryId] =
                (categorySales[categoryId] || 0) + (orderItem.quantity || 0);
            }
          }
        });
      }
    });

    const sortedTopCategories = Object.entries(categorySales)
      .map(([categoryId, count]) => {
        const categoryDetail = categoriesMap[categoryId];
        if (!categoryDetail) return null;

        return {
          id: categoryId,
          name: categoryDetail.name || "Unknown Category",
          sold: count,
          image: getImageUrl(categoryDetail.imagePath, "/default-category.png"),
        };
      })
      .filter((cat) => cat !== null)
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 6);

    setTopSellingCategories(sortedTopCategories);
    setIsLoadingTopSellingCategories(false);
  }, [
    allOrdersData,
    allItemsData,
    allCategoriesData,
    isLoadingAllItems,
    isLoadingAllCategories,
  ]);

  // --- Helper: Filter orders by timeframe ---
  const filterOrdersByTimeframe = (orders, timeframe) => {
    return orders.filter((order) => {
      if (!order || !order.createdAt) return false;
      const orderDate = parseISO(order.createdAt);
      if (timeframe === "Today") return isToday(orderDate);
      if (timeframe === "This Week")
        return isThisWeek(orderDate, { weekStartsOn: 1 });
      if (timeframe === "This Month") return isThisMonth(orderDate);
      if (timeframe === "This Year") return isThisYear(orderDate);
      return false;
    });
  };

  // --- Process Order Trends Data ---
  useEffect(() => {
    if (!allOrdersData || !allOrdersData.length) {
      setIsLoadingOrderTrends(allOrdersData ? false : true);
      if (allOrdersData && !allOrdersData.length) setOrderTrendsData(null);
      return;
    }
    setIsLoadingOrderTrends(true);

    const filteredOrders = filterOrdersByTimeframe(
      allOrdersData,
      activeOrderChartTimeframe
    );
    let labels = [];
    let dataCounts = [];

    if (activeOrderChartTimeframe === "Today") {
      labels = Array.from({ length: 24 }, (_, i) =>
        format(new Date(0, 0, 0, i), "ha")
      );
      dataCounts = Array(24).fill(0);
      filteredOrders.forEach((order) => {
        if (order && order.createdAt) {
          const hour = getHours(parseISO(order.createdAt));
          dataCounts[hour]++;
        }
      });
    } else if (activeOrderChartTimeframe === "This Week") {
      labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      dataCounts = Array(7).fill(0);
      filteredOrders.forEach((order) => {
        if (order && order.createdAt) {
          const day = getDay(parseISO(order.createdAt));
          dataCounts[day]++;
        }
      });
    } else if (activeOrderChartTimeframe === "This Month") {
      const daysInMonth = getDaysInMonth(new Date());
      labels = Array.from({ length: daysInMonth }, (_, i) =>
        (i + 1).toString()
      );
      dataCounts = Array(daysInMonth).fill(0);
      filteredOrders.forEach((order) => {
        if (order && order.createdAt) {
          const dayOfMonth = getDate(parseISO(order.createdAt));
          dataCounts[dayOfMonth - 1]++;
        }
      });
    } else if (activeOrderChartTimeframe === "This Year") {
      labels = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      dataCounts = Array(12).fill(0);
      const currentYearOrders = filteredOrders.filter(
        (order) =>
          order &&
          order.createdAt &&
          getYear(parseISO(order.createdAt)) === getYear(new Date())
      );
      currentYearOrders.forEach((order) => {
        if (order && order.createdAt) {
          const month = getMonth(parseISO(order.createdAt));
          dataCounts[month]++;
        }
      });
    }

    setOrderTrendsData({
      labels,
      datasets: [
        {
          label: "Orders",
          data: dataCounts,
          borderColor: "rgb(75, 192, 192)",
          tension: 0.1,
        },
      ],
    });
    setIsLoadingOrderTrends(false);
  }, [allOrdersData, activeOrderChartTimeframe]);

  // --- Process Earning Trends Data ---
  useEffect(() => {
    if (!allOrdersData || !allOrdersData.length) {
      setIsLoadingEarningTrends(allOrdersData ? false : true);
      if (allOrdersData && !allOrdersData.length) setEarningTrendsData(null);
      return;
    }
    setIsLoadingEarningTrends(true);

    const filteredOrders = filterOrdersByTimeframe(
      allOrdersData,
      activeEarningChartTimeframe
    );
    let labels = [];
    let dataAmounts = [];

    const relevantOrders = filteredOrders.filter(
      (order) =>
        order &&
        (order.orderStatus === "Delivered" ||
          order.orderStatus === "Picked Up" ||
          order.isPaid)
    );

    if (activeEarningChartTimeframe === "Today") {
      labels = Array.from({ length: 24 }, (_, i) =>
        format(new Date(0, 0, 0, i), "ha")
      );
      dataAmounts = Array(24).fill(0);
      relevantOrders.forEach((order) => {
        if (order && order.createdAt && typeof order.totalPrice === "number") {
          const hour = getHours(parseISO(order.createdAt));
          dataAmounts[hour] += order.totalPrice;
        }
      });
    } else if (activeEarningChartTimeframe === "This Week") {
      labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      dataAmounts = Array(7).fill(0);
      relevantOrders.forEach((order) => {
        if (order && order.createdAt && typeof order.totalPrice === "number") {
          const day = getDay(parseISO(order.createdAt));
          dataAmounts[day] += order.totalPrice;
        }
      });
    } else if (activeEarningChartTimeframe === "This Month") {
      const daysInMonth = getDaysInMonth(new Date());
      labels = Array.from({ length: daysInMonth }, (_, i) =>
        (i + 1).toString()
      );
      dataAmounts = Array(daysInMonth).fill(0);
      relevantOrders.forEach((order) => {
        if (order && order.createdAt && typeof order.totalPrice === "number") {
          const dayOfMonth = getDate(parseISO(order.createdAt));
          dataAmounts[dayOfMonth - 1] += order.totalPrice;
        }
      });
    } else if (activeEarningChartTimeframe === "This Year") {
      labels = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      dataAmounts = Array(12).fill(0);
      const currentYearOrders = relevantOrders.filter(
        (order) =>
          order &&
          order.createdAt &&
          getYear(parseISO(order.createdAt)) === getYear(new Date())
      );
      currentYearOrders.forEach((order) => {
        if (order && order.createdAt && typeof order.totalPrice === "number") {
          const month = getMonth(parseISO(order.createdAt));
          dataAmounts[month] += order.totalPrice;
        }
      });
    }

    setEarningTrendsData({
      labels,
      datasets: [
        {
          label: "Earnings (₹)",
          data: dataAmounts,
          borderColor: "rgb(54, 162, 235)",
          tension: 0.1,
        },
      ],
    });
    setIsLoadingEarningTrends(false);
  }, [allOrdersData, activeEarningChartTimeframe]);

  // --- Chart Data and Options ---
  const orderStatusDonutData = useMemo(
    () => ({
      labels: [
        "Pending",
        "Ongoing",
        "Delivered",
        "Cancelled",
        "Returned",
        "Failed",
      ],
      datasets: [
        {
          label: "Order Status",
          data: [
            dashboardStats.pending || 0,
            (dashboardStats.confirmed || 0) +
              (dashboardStats.processing || 0) +
              (dashboardStats.packaging || 0) +
              (dashboardStats.shipped || 0) +
              (dashboardStats.outfordelivery || 0) +
              (dashboardStats.readyforpickup || 0),
            (dashboardStats.delivered || 0) + (dashboardStats.pickedup || 0),
            dashboardStats.cancelled || 0,
            dashboardStats.returned || 0,
            dashboardStats.failedtodeliver || 0,
          ],
          backgroundColor: [
            "rgba(54, 162, 235, 0.8)",
            "rgba(255, 206, 86, 0.8)",
            "rgba(75, 192, 192, 0.8)",
            "rgba(255, 99, 132, 0.8)",
            "rgba(255, 159, 64, 0.8)",
            "rgba(153, 102, 255, 0.8)",
          ],
          borderColor: [
            "rgba(54, 162, 235, 1)",
            "rgba(255, 206, 86, 1)",
            "rgba(75, 192, 192, 1)",
            "rgba(255, 99, 132, 1)",
            "rgba(255, 159, 64, 1)",
            "rgba(153, 102, 255, 1)",
          ],
          borderWidth: 1,
        },
      ],
    }),
    [dashboardStats]
  );

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: "top" }, title: { display: false } },
    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: { padding: 15, boxWidth: 12, font: { size: 10 } },
      },
      title: { display: false },
      tooltip: {
        callbacks: {
          label: function (context) {
            let label = context.label || "";
            if (label) label += ": ";
            if (context.parsed !== null) label += context.parsed;
            const total = context.dataset.data.reduce(
              (acc, val) => acc + val,
              0
            );
            const percentage =
              total > 0
                ? ((context.parsed / total) * 100).toFixed(1) + "%"
                : "0%";
            return `${label} (${percentage})`;
          },
        },
      },
    },
    cutout: "60%",
  };

  // MODIFIED: Added statusKey for routing
  const statCardData = useMemo(
    () => [
      {
        title: "Pending",
        value: dashboardStats.pending || 0,
        icon: <MdPendingActions />,
        color: "#3E92CC",
        isLoading: isLoadingStats,
        statusKey: "pending",
      },
      {
        title: "Confirmed",
        value: dashboardStats.confirmed || 0,
        icon: <MdCheckCircleOutline />,
        color: "#28a745",
        isLoading: isLoadingStats,
        statusKey: "confirmed",
      },
      {
        title: "Packaging",
        value: dashboardStats.packaging || 0,
        icon: <BsBoxSeam />,
        color: "#fd7e14",
        isLoading: isLoadingStats,
        statusKey: "packaging", // NOTE: Route /admin/orders/packaging might not exist in App.jsx
      },
      {
        title: "Out for Delivery",
        value: dashboardStats.outfordelivery || 0,
        icon: <TbTruckDelivery />,
        color: "#17a2b8",
        isLoading: isLoadingStats,
        statusKey: "out-for-delivery",
      },
      {
        title: "Delivered",
        value: (dashboardStats.delivered || 0) + (dashboardStats.pickedup || 0),
        icon: <MdDoneAll />,
        color: "#007bff",
        isLoading: isLoadingStats,
        statusKey: "delivered",
      },
      {
        title: "Canceled",
        value: dashboardStats.cancelled || 0,
        icon: <MdCancel />,
        color: "#dc3545",
        isLoading: isLoadingStats,
        statusKey: "canceled",
      },
      {
        title: "Returned",
        value: dashboardStats.returned || 0,
        icon: <MdOutlineKeyboardReturn />,
        color: "#ffc107",
        isLoading: isLoadingStats,
        statusKey: "refunded", // Maps to 'refunded' page as per App.jsx
      },
      {
        title: "Failed To Deliver",
        value: dashboardStats.failedtodeliver || 0,
        icon: <MdErrorOutline />,
        color: "#6c757d",
        isLoading: isLoadingStats,
        statusKey: "failed", // Maps to 'failed' page as per App.jsx
      },
    ],
    [dashboardStats, isLoadingStats]
  );

  const renderTimeframeButtons = (activeTimeframe, setActiveTimeframe) => (
    <div className="timeframe-buttons">
      {["Today", "This Week", "This Month", "This Year"].map((frame) => (
        <button
          key={frame}
          className={activeTimeframe === frame ? "active" : ""}
          onClick={() => setActiveTimeframe(frame)}
        >
          {frame}
        </button>
      ))}
    </div>
  );

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h1 className="page-title">Business Analytics</h1>
        <div className="overall-stats-summary">Overall Statistics</div>
      </div>

      <section className="stats-grid">
        {statCardData.map((stat, index) => (
          <StatCard
            key={index}
            {...stat}
            // MODIFIED: Added onClick handler
            onClick={
              stat.statusKey && !stat.isLoading
                ? () => navigate(`/admin/orders/${stat.statusKey}`)
                : undefined
            }
          />
        ))}
      </section>

      <section className="dashboard-main-grid">
        <DashboardCard
          title="Order Statistics"
          isLoading={isLoadingOrderTrends}
          className="chart-card-large"
          headerExtra={renderTimeframeButtons(
            activeOrderChartTimeframe,
            setActiveOrderChartTimeframe
          )}
        >
          {orderTrendsData && !isLoadingOrderTrends ? (
            <Line options={chartOptions} data={orderTrendsData} />
          ) : isLoadingOrderTrends ? (
            <LoadingSpinner />
          ) : (
            <p>No order data for this period.</p>
          )}
        </DashboardCard>

        <DashboardCard
          title="Order Status Statistics"
          isLoading={isLoadingStats}
          className="chart-card-small"
        >
          {!isLoadingStats && dashboardStats.totalOrders > 0 ? (
            <div className="doughnut-chart-container">
              <Doughnut options={doughnutOptions} data={orderStatusDonutData} />
              <div className="doughnut-center-text">
                <span className="total-value">
                  {dashboardStats.totalOrders}
                </span>
                <span className="total-label">Orders</span>
              </div>
            </div>
          ) : isLoadingStats ? (
            <LoadingSpinner />
          ) : (
            <p>No order status data available.</p>
          )}
        </DashboardCard>

        <DashboardCard
          title="Earning Statistics"
          isLoading={isLoadingEarningTrends}
          className="chart-card-large"
          headerExtra={renderTimeframeButtons(
            activeEarningChartTimeframe,
            setActiveEarningChartTimeframe
          )}
        >
          {earningTrendsData && !isLoadingEarningTrends ? (
            <Line options={chartOptions} data={earningTrendsData} />
          ) : isLoadingEarningTrends ? (
            <LoadingSpinner />
          ) : (
            <p>No earnings data for this period.</p>
          )}
        </DashboardCard>

        <DashboardCard
          title="Recent Orders"
          isLoading={isLoadingRecentOrders}
          viewAllLink="/admin/orders"
          className="list-card-small"
        >
          {!isLoadingRecentOrders && recentOrders.length > 0 ? (
            <ul className="data-list recent-orders-list">
              {recentOrders.map((order) => (
                <li key={order._id}>
                  <div className="order-info">
                    <Link
                      to={`/admin/orders/${order._id}`}
                      className="order-id-link"
                    >
                      <span className="order-id">
                        Order #{order._id ? order._id.slice(-6) : "N/A"}
                      </span>
                    </Link>
                    <span
                      className={`order-status-tag status-${
                        order.orderStatus?.toLowerCase().replace(/\s+/g, "-") ||
                        "unknown"
                      }`}
                    >
                      {order.orderStatus || "Unknown"}
                    </span>
                  </div>
                  <div className="order-meta">
                    <span className="order-date">
                      <MdAccessTime />{" "}
                      {order.createdAt
                        ? format(parseISO(order.createdAt), "dd MMM, hh:mmaa")
                        : "N/A"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : isLoadingRecentOrders ? (
            <LoadingSpinner />
          ) : (
            <p>No recent orders.</p>
          )}
        </DashboardCard>

        <DashboardCard
          title="Top Selling Items"
          isLoading={isLoadingTopSellingItems}
          viewAllLink="/admin/items?sort=top_selling"
          className="list-card-medium"
        >
          {!isLoadingTopSellingItems && topSellingItems.length > 0 ? (
            <ul className="data-list top-items-list">
              {topSellingItems.map((item) => (
                <li key={item.id}>
                  <img
                    src={item.image}
                    alt={item.name}
                    className="item-image"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/default-product.png";
                    }}
                  />
                  <span className="item-name">{item.name}</span>
                  <span className="item-sold">Sold: {item.sold}</span>
                </li>
              ))}
            </ul>
          ) : isLoadingTopSellingItems ? (
            <LoadingSpinner />
          ) : (
            <p>No top selling items data available.</p>
          )}
        </DashboardCard>

        <DashboardCard
          title="Top Selling Categories"
          isLoading={isLoadingTopSellingCategories}
          viewAllLink="/admin/categories?sort=top_selling"
          className="list-card-medium"
        >
          {!isLoadingTopSellingCategories && topSellingCategories.length > 0 ? (
            <ul className="data-list top-categories-list">
              {topSellingCategories.map((category) => (
                <li key={category.id}>
                  <img
                    src={category.image}
                    alt={category.name}
                    className="item-image"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/default-category.png";
                    }}
                  />
                  <span className="item-name">{category.name}</span>
                  <span className="item-sold">Units Sold: {category.sold}</span>
                </li>
              ))}
            </ul>
          ) : isLoadingTopSellingCategories ? (
            <LoadingSpinner />
          ) : (
            <p>No top selling categories data available.</p>
          )}
        </DashboardCard>

        <DashboardCard
          title="Top Customers"
          isLoading={isLoadingTopCustomers}
          viewAllLink="/admin/customers"
          className="list-card-medium"
        >
          {!isLoadingTopCustomers && topCustomers.length > 0 ? (
            <ul className="data-list top-customers-list">
              {topCustomers.map((customer) => (
                <li key={customer.id}>
                  <Link
                    to={`/admin/customers/${customer.id}`}
                    className="customer-link"
                  >
                    {customer.avatar ? (
                      <img
                        src={customer.avatar}
                        alt={customer.name}
                        className="customer-avatar"
                      />
                    ) : (
                      <FaUserCircle className="customer-avatar-placeholder" />
                    )}
                    <span className="customer-name">{customer.name}</span>
                  </Link>
                  <span className="customer-orders">
                    Orders: {customer.orders}
                  </span>
                </li>
              ))}
            </ul>
          ) : isLoadingTopCustomers ? (
            <LoadingSpinner />
          ) : (
            <p>No top customer data.</p>
          )}
        </DashboardCard>
      </section>
    </div>
  );
}

export default DashboardPage;
