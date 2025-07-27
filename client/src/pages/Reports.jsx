import { useState, useEffect } from "react";
import LoadingScreen from "../components/LoadingScreen";
import ApiService from "../services/api";
import { Line, Bar, Doughnut, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

function Reports() {
  // Random color generator
  const getRandomColor = () => {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    return `rgba(${r}, ${g}, ${b}, 0.7)`;
  };

  const generateRandomColors = (count) => {
    return Array.from({ length: count }, () => getRandomColor());
  };

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Data states
  const [dashboardStats, setDashboardStats] = useState({
    inventory: {
      total_products: 0,
      low_stock_items: 0,
      out_of_stock_items: 0,
      total_value: 0,
    },
    orders: {
      total_orders: 0,
      pending_orders: 0,
      completed_orders: 0,
      recent_orders: 0,
      total_revenue: 0,
      avg_order_value: 0,
    },
  });
  const [monthlyTrends, setMonthlyTrends] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [inventoryValueData, setInventoryValueData] = useState({
    total_value: 0,
    category_breakdown: [],
  });

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      setIsLoading(true);
      setError("");

      // Fetch all necessary data in parallel
      const [
        dashboardRes,
        trendsRes,
        inventoryRes,
        ordersRes,
        categoriesRes,
        lowStockRes,
        inventoryValueRes,
      ] = await Promise.all([
        ApiService.getDashboardStats(),
        ApiService.getMonthlyTrends(),
        ApiService.getInventory(),
        ApiService.getOrders(),
        ApiService.getCategories(),
        ApiService.getLowStockItems(),
        ApiService.getInventoryValue(),
      ]);

      // Set all data
      setDashboardStats(dashboardRes);
      setMonthlyTrends(trendsRes.monthly_data || []);
      setInventory(inventoryRes.inventory || []);
      setOrders(ordersRes.orders || []);
      setCategories(categoriesRes.categories || []);
      setLowStockItems(lowStockRes.low_stock_items || []);
      setInventoryValueData(inventoryValueRes);
    } catch (error) {
      console.error("Error fetching report data:", error);
      setError("Failed to load report data: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Export functions
  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) {
      setError("No data available to export");
      return;
    }

    const headers = Object.keys(data[0]).join(",");
    const csvContent = [
      headers,
      ...data.map((row) =>
        Object.values(row)
          .map((value) =>
            typeof value === "string" && value.includes(",")
              ? `"${value}"`
              : value
          )
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportInventoryReport = () => {
    const inventoryData = inventory.map((item) => {
      const category = categories.find((cat) => cat.id === item.category_id);
      const stockStatus =
        item.quantity <= (item.min_stock_level || 5)
          ? item.quantity === 0
            ? "Out of Stock"
            : "Low Stock"
          : "In Stock";

      return {
        ID: item.id,
        Name: item.name,
        SKU: item.sku || "N/A",
        Category: category ? category.name : "Unknown",
        Quantity: item.quantity,
        Price: `$${parseFloat(item.price).toFixed(2)}`,
        "Total Value": `$${(parseFloat(item.price) * item.quantity).toFixed(
          2
        )}`,
        "Stock Status": stockStatus,
        "Min Stock Level": item.min_stock_level || 5,
        Description: item.description || "N/A",
        "Created At": formatDate(item.created_at),
        "Updated At": formatDate(item.updated_at),
      };
    });

    exportToCSV(
      inventoryData,
      `inventory-report-${new Date().toISOString().split("T")[0]}`
    );
  };

  const exportSalesReport = () => {
    const salesData = orders
      .filter(
        (order) => order.status === "delivered" || order.status === "completed"
      )
      .map((order) => ({
        "Order ID": `#${order.id.toString().padStart(6, "0")}`,
        "Customer Name": order.customer_name,
        "Customer Email": order.customer_email || "N/A",
        "Customer Phone": order.customer_phone || "N/A",
        "Order Date": formatDate(order.created_at),
        "Total Amount": `$${parseFloat(order.total || 0).toFixed(2)}`,
        Status: order.status.charAt(0).toUpperCase() + order.status.slice(1),
        "Updated At": formatDate(order.updated_at),
      }));

    exportToCSV(
      salesData,
      `sales-report-${new Date().toISOString().split("T")[0]}`
    );
  };

  const exportOrderReport = () => {
    const orderData = orders.map((order) => ({
      "Order ID": `#${order.id.toString().padStart(6, "0")}`,
      "Customer Name": order.customer_name,
      "Customer Email": order.customer_email || "N/A",
      "Customer Phone": order.customer_phone || "N/A",
      "Order Date": formatDate(order.created_at),
      "Total Amount": `$${parseFloat(order.total || 0).toFixed(2)}`,
      Status: order.status.charAt(0).toUpperCase() + order.status.slice(1),
      "Created At": formatDate(order.created_at),
      "Updated At": formatDate(order.updated_at),
    }));

    exportToCSV(
      orderData,
      `orders-report-${new Date().toISOString().split("T")[0]}`
    );
  };

  const exportLowStockReport = () => {
    if (lowStockItems.length === 0) {
      setError("No low stock items to export");
      return;
    }

    const lowStockData = lowStockItems.map((item) => {
      const category = categories.find((cat) => cat.id === item.category_id);
      return {
        "Product ID": item.id,
        "Product Name": item.name,
        SKU: item.sku || "N/A",
        Category: category ? category.name : "Unknown",
        "Current Stock": item.quantity,
        "Minimum Level": item.min_stock_level || 5,
        "Stock Deficit": Math.max(
          0,
          (item.min_stock_level || 5) - item.quantity
        ),
        "Unit Price": `$${parseFloat(item.price).toFixed(2)}`,
        "Restock Value Needed": `$${(
          Math.max(0, (item.min_stock_level || 5) - item.quantity) *
          parseFloat(item.price)
        ).toFixed(2)}`,
        "Stock Status": item.quantity === 0 ? "Out of Stock" : "Low Stock",
        Priority:
          item.quantity === 0
            ? "Critical"
            : item.quantity <= 2
            ? "High"
            : "Medium",
        "Last Updated": formatDate(item.updated_at),
      };
    });

    exportToCSV(
      lowStockData,
      `low-stock-report-${new Date().toISOString().split("T")[0]}`
    );
  };

  const exportFullAnalyticsReport = () => {
    // Create comprehensive analytics data
    const analyticsData = [
      {
        "Report Type": "Business Summary",
        "Total Products": dashboardStats.inventory.total_products,
        "Total Orders": dashboardStats.orders.total_orders,
        "Completed Orders": dashboardStats.orders.completed_orders,
        "Pending Orders": dashboardStats.orders.pending_orders,
        "Total Revenue": `$${dashboardStats.orders.total_revenue.toFixed(2)}`,
        "Average Order Value": `$${dashboardStats.orders.avg_order_value.toFixed(
          2
        )}`,
        "Low Stock Items": dashboardStats.inventory.low_stock_items,
        "Out of Stock Items": dashboardStats.inventory.out_of_stock_items,
        "Total Inventory Value": `$${dashboardStats.inventory.total_value.toFixed(
          2
        )}`,
        "Report Date": new Date().toLocaleDateString(),
      },
    ];

    // Add category breakdown
    inventoryValueData.category_breakdown.forEach((category) => {
      const sharePercentage =
        dashboardStats.inventory.total_value > 0
          ? (
              (category.value / dashboardStats.inventory.total_value) *
              100
            ).toFixed(1)
          : 0;

      analyticsData.push({
        "Report Type": "Category Analysis",
        "Category Name": category.category,
        "Total Value": `$${category.value.toFixed(2)}`,
        "Market Share": `${sharePercentage}%`,
      });
    });

    // Add monthly trends
    monthlyTrends.forEach((month) => {
      analyticsData.push({
        "Report Type": "Monthly Trends",
        Month: month.month,
        Orders: month.orders,
        Revenue: `$${month.revenue.toFixed(2)}`,
      });
    });

    exportToCSV(
      analyticsData,
      `full-analytics-report-${new Date().toISOString().split("T")[0]}`
    );
  };

  // Utility function for date formatting
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Generate chart data based on real data
  const getOrdersByStatus = () => {
    const statusData = {};

    orders.forEach((order) => {
      const status = order.status || "unknown";
      if (!statusData[status]) {
        statusData[status] = {
          count: 0,
          revenue: 0,
        };
      }
      statusData[status].count += 1;
      statusData[status].revenue += parseFloat(order.total || 0);
    });

    return statusData;
  };

  const getTopProducts = () => {
    // Sort by quantity (most stocked)
    return inventory.sort((a, b) => b.quantity - a.quantity).slice(0, 10);
  };

  // Chart configurations
  const orderStatusData = getOrdersByStatus();
  const topProducts = getTopProducts();

  const chartData = {
    categoryDistribution: {
      labels: inventoryValueData.category_breakdown.map((cat) => cat.category),
      datasets: [
        {
          label: "Inventory Value",
          data: inventoryValueData.category_breakdown.map((cat) => cat.value),
          backgroundColor: [
            "hsla(var(--p) / 0.8)",
            "hsla(var(--s) / 0.8)",
            "hsla(var(--a) / 0.8)",
            "hsla(var(--su) / 0.8)",
            "hsla(var(--wa) / 0.8)",
            "hsla(var(--er) / 0.8)",
            "hsla(var(--in) / 0.8)",
            "hsla(var(--ne) / 0.8)",
          ],
        },
      ],
    },
    orderStatus: {
      labels: Object.keys(orderStatusData).map(
        (status) => status.charAt(0).toUpperCase() + status.slice(1)
      ),
      datasets: [
        {
          data: Object.values(orderStatusData).map((status) => status.count),
          backgroundColor: [
            "hsla(var(--wa) / 0.8)", // pending
            "hsla(var(--in) / 0.8)", // processing
            "hsla(var(--pr) / 0.8)", // shipped
            "hsla(var(--su) / 0.8)", // delivered
            "hsla(var(--er) / 0.8)", // cancelled
          ],
        },
      ],
    },
    monthlyTrends: {
      labels: monthlyTrends.map((m) => m.month_short),
      datasets: [
        {
          label: "Orders",
          data: monthlyTrends.map((m) => m.orders),
          borderColor: "#2C5F2D",
          backgroundColor: "#2C5F2D",
          tension: 0.4,
          yAxisID: "y",
        },
        {
          label: "Revenue ($)",
          data: monthlyTrends.map((m) => m.revenue),
          borderColor: "#00246B",
          backgroundColor: "#00246B",
          tension: 0.4,
          yAxisID: "y1",
        },
      ],
    },
    topProductsChart: {
      labels: topProducts
        .slice(0, 5)
        .map((product) =>
          product.name.length > 15
            ? product.name.substring(0, 15) + "..."
            : product.name
        ),
      datasets: [
        {
          label: "Stock Quantity",
          data: topProducts.slice(0, 5).map((product) => product.quantity),
          backgroundColor: "hsla(var(--p) / 0.8)",
        },
      ],
    },
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: {
        position: "bottom",
      },
      tooltip: {
        padding: 10,
        backgroundColor: generateRandomColors(20),
        titleFont: { size: 14 },
        bodyFont: { size: 12 },
      },
    },
    scales: {
      y: {
        type: "linear",
        display: true,
        position: "left",
        beginAtZero: true,
      },
      y1: {
        type: "linear",
        display: true,
        position: "right",
        beginAtZero: true,
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          callback: (value) => `$${value}`,
        },
      },
    },
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="p-4">
      <div className="flex flex-col lg:flex-row justify-between items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold">Analytics & Reports Dashboard</h2>
        <button
          className="btn btn-outline btn-sm"
          onClick={fetchReportData}
          disabled={isLoading}
        >
          {isLoading ? "Loading..." : "Refresh Data"}
        </button>
      </div>

      {error && (
        <div className="alert alert-error mb-6">
          <span>{error}</span>
          <button className="btn btn-sm btn-ghost" onClick={() => setError("")}>
            ✕
          </button>
        </div>
      )}

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <div className="stat bg-base-100 shadow-lg rounded-box">
          <div className="stat-figure text-primary">
            <div className="text-3xl">💰</div>
          </div>
          <div className="stat-title">Total Revenue</div>
          <div className="stat-value text-primary">
            ${dashboardStats.orders.total_revenue.toFixed(2)}
          </div>
          <div className="stat-desc">
            From {dashboardStats.orders.completed_orders} completed orders
          </div>
        </div>

        <div className="stat bg-base-100 shadow-lg rounded-box">
          <div className="stat-figure text-secondary">
            <div className="text-3xl">📦</div>
          </div>
          <div className="stat-title">Total Orders</div>
          <div className="stat-value text-secondary">
            {dashboardStats.orders.total_orders}
          </div>
          <div className="stat-desc">
            {dashboardStats.orders.pending_orders} pending
          </div>
        </div>

        <div className="stat bg-base-100 shadow-lg rounded-box">
          <div className="stat-figure text-accent">
            <div className="text-3xl">📊</div>
          </div>
          <div className="stat-title">Avg Order Value</div>
          <div className="stat-value text-accent">
            ${dashboardStats.orders.avg_order_value.toFixed(2)}
          </div>
          <div className="stat-desc">Per order average</div>
        </div>

        <div className="stat bg-base-100 shadow-lg rounded-box">
          <div className="stat-figure text-info">
            <div className="text-3xl">📋</div>
          </div>
          <div className="stat-title">Total Products</div>
          <div className="stat-value text-info">
            {dashboardStats.inventory.total_products}
          </div>
          <div className="stat-desc">In inventory</div>
        </div>

        <div className="stat bg-base-100 shadow-lg rounded-box">
          <div className="stat-figure text-warning">
            <div className="text-3xl">⚠️</div>
          </div>
          <div className="stat-title">Low Stock Items</div>
          <div className="stat-value text-warning">
            {dashboardStats.inventory.low_stock_items}
          </div>
          <div className="stat-desc">
            {dashboardStats.inventory.out_of_stock_items} out of stock
          </div>
        </div>

        <div className="stat bg-base-100 shadow-lg rounded-box">
          <div className="stat-figure text-success">
            <div className="text-3xl">💎</div>
          </div>
          <div className="stat-title">Inventory Value</div>
          <div className="stat-value text-success">
            ${dashboardStats.inventory.total_value.toFixed(2)}
          </div>
          <div className="stat-desc">Total stock value</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
        {/* Monthly Trends Chart */}
        <div className="card bg-base-100 shadow-xl xl:col-span-2">
          <div className="card-body">
            <h3 className="card-title text-lg mb-4">
              📈 Monthly Trends (Last 6 Months)
            </h3>
            {monthlyTrends.length > 0 ? (
              <div className="h-[350px]">
                <Line data={chartData.monthlyTrends} options={chartOptions} />
              </div>
            ) : (
              <div className="h-[350px] flex items-center justify-center text-base-content/50">
                <div className="text-center">
                  <div className="text-4xl mb-2">📊</div>
                  <p>No trend data available</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Order Status Distribution */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h3 className="card-title text-lg mb-4">📋 Order Status</h3>
            {Object.keys(orderStatusData).length > 0 ? (
              <div className="h-[300px] flex items-center justify-center">
                <Doughnut
                  data={chartData.orderStatus}
                  options={{
                    ...chartOptions,
                    cutout: "60%",
                    scales: undefined,
                  }}
                />
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-base-content/50">
                <div className="text-center">
                  <div className="text-4xl mb-2">📋</div>
                  <p>No order data available</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Category Distribution */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h3 className="card-title text-lg mb-4">
              🏷️ Inventory by Category
            </h3>
            {inventoryValueData.category_breakdown.length > 0 ? (
              <div className="h-[300px] flex items-center justify-center">
                <Pie
                  data={chartData.categoryDistribution}
                  options={{
                    ...chartOptions,
                    scales: undefined,
                  }}
                />
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-base-content/50">
                <div className="text-center">
                  <div className="text-4xl mb-2">🏷️</div>
                  <p>No category data available</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Top Products */}
        <div className="card bg-base-100 shadow-xl xl:col-span-2">
          <div className="card-body">
            <h3 className="card-title text-lg mb-4">
              🔝 Top Products by Stock
            </h3>
            {topProducts.length > 0 ? (
              <div className="h-[300px]">
                <Bar
                  data={chartData.topProductsChart}
                  options={{
                    ...chartOptions,
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          callback: (value) => `${value} units`,
                        },
                      },
                    },
                  }}
                />
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-base-content/50">
                <div className="text-center">
                  <div className="text-4xl mb-2">🔝</div>
                  <p>No inventory data available</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Data Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alert */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h3 className="card-title text-lg mb-4">⚠️ Low Stock Alerts</h3>
            {lowStockItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Current Stock</th>
                      <th>Min Level</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockItems.slice(0, 10).map((product) => (
                      <tr key={product.id}>
                        <td className="font-medium">{product.name}</td>
                        <td>{product.quantity}</td>
                        <td>{product.min_stock_level || 5}</td>
                        <td>
                          <div
                            className={`badge ${
                              product.quantity === 0
                                ? "badge-error"
                                : "badge-warning"
                            } badge-sm`}
                          >
                            {product.quantity === 0
                              ? "Out of Stock"
                              : "Low Stock"}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">✅</div>
                <p className="text-base-content/70">
                  All products are well-stocked!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Top Products List */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h3 className="card-title text-lg mb-4">🏆 Top Inventory Items</h3>
            {topProducts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Product</th>
                      <th>Stock</th>
                      <th>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.slice(0, 10).map((product, index) => (
                      <tr key={product.id}>
                        <td>
                          <div className="badge badge-primary badge-sm">
                            #{index + 1}
                          </div>
                        </td>
                        <td className="font-medium">{product.name}</td>
                        <td>{product.quantity} units</td>
                        <td>
                          $
                          {(
                            parseFloat(product.price) * product.quantity
                          ).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">📋</div>
                <p className="text-base-content/70">
                  No inventory data available
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Category Analysis */}
      {inventoryValueData.category_breakdown.length > 0 && (
        <div className="card bg-base-100 shadow-xl mt-6">
          <div className="card-body">
            <h3 className="card-title text-lg mb-4">📊 Category Analysis</h3>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Total Value</th>
                    <th>Share</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryValueData.category_breakdown.map((category) => {
                    const sharePercentage =
                      dashboardStats.inventory.total_value > 0
                        ? (
                            (category.value /
                              dashboardStats.inventory.total_value) *
                            100
                          ).toFixed(1)
                        : 0;

                    return (
                      <tr key={category.category}>
                        <td className="font-medium">{category.category}</td>
                        <td>${category.value.toFixed(2)}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <progress
                              className="progress progress-primary w-16"
                              value={sharePercentage}
                              max="100"
                            ></progress>
                            <span className="text-sm">{sharePercentage}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Export Options */}
      <div className="card bg-base-100 shadow-xl mt-6">
        <div className="card-body">
          <h3 className="card-title text-lg mb-4">📥 Export Reports</h3>
          <div className="flex flex-wrap gap-4">
            <button
              className="btn btn-outline btn-sm"
              onClick={exportInventoryReport}
              disabled={inventory.length === 0}
            >
              📊 Export Inventory Report
            </button>
            <button
              className="btn btn-outline btn-sm"
              onClick={exportSalesReport}
              disabled={
                orders.filter(
                  (o) => o.status === "delivered" || o.status === "completed"
                ).length === 0
              }
            >
              📈 Export Sales Report
            </button>
            <button
              className="btn btn-outline btn-sm"
              onClick={exportOrderReport}
              disabled={orders.length === 0}
            >
              📋 Export Order Report
            </button>
            <button
              className="btn btn-outline btn-sm"
              onClick={exportLowStockReport}
              disabled={lowStockItems.length === 0}
            >
              ⚠️ Export Low Stock Report
            </button>
            <button
              className="btn btn-outline btn-sm"
              onClick={exportFullAnalyticsReport}
              disabled={inventory.length === 0 && orders.length === 0}
            >
              📋 Export Full Analytics
            </button>
          </div>
          <div className="mt-4 text-sm text-base-content/70">
            <p>
              📝 Reports are exported as CSV files with current date in filename
            </p>
            <p>💾 Files will be downloaded to your default download folder</p>
            <p>🔄 Data is refreshed from live database</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Reports;
//             >
//               📋 Export Order Report
//             </button>
//             <button
//               className="btn btn-outline btn-sm"
//               onClick={exportLowStockReport}
//               disabled={lowStockProducts.length === 0}
//             >
//               ⚠️ Export Low Stock Report
//             </button>
//             <button
//               className="btn btn-outline btn-sm"
//               onClick={exportFullAnalyticsReport}
//               disabled={inventory.length === 0 && orders.length === 0}
//             >
//               📋 Export Full Analytics
//             </button>
//           </div>
//           <div className="mt-4 text-sm text-base-content/70">
//             <p>📝 Reports are exported as CSV files with current date in filename</p>
//             <p>💾 Files will be downloaded to your default download folder</p>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default Reports;
