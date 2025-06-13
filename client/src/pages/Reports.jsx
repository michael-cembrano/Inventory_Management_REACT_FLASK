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
  const [isLoading, setIsLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState("monthly");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [dateRange, setDateRange] = useState("thisYear");
  const [error, setError] = useState("");
  
  // Data states
  const [inventory, setInventory] = useState([]);
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [analytics, setAnalytics] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    totalProducts: 0,
    lowStockItems: 0,
    totalInventoryValue: 0
  });

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      setIsLoading(true);
      setError("");
      
      // Fetch all necessary data
      const [inventoryRes, ordersRes, categoriesRes] = await Promise.all([
        ApiService.getInventory(),
        ApiService.getOrders(),
        ApiService.getCategories()
      ]);

      const inventoryData = inventoryRes.inventory || [];
      const ordersData = ordersRes.orders || [];
      const categoriesData = categoriesRes.categories || [];

      setInventory(inventoryData);
      setOrders(ordersData);
      setCategories(categoriesData);

      // Calculate analytics
      calculateAnalytics(inventoryData, ordersData);
      
    } catch (error) {
      console.error("Error fetching report data:", error);
      setError("Failed to load report data");
    } finally {
      setIsLoading(false);
    }
  };

  const calculateAnalytics = (inventoryData, ordersData) => {
    // Basic metrics
    const totalProducts = inventoryData.length;
    const lowStockItems = inventoryData.filter(item => 
      item.quantity <= (item.min_stock_level || 5)
    ).length;
    
    const totalInventoryValue = inventoryData.reduce((sum, item) => 
      sum + (parseFloat(item.price) * item.quantity), 0
    );

    // Order metrics
    const totalOrders = ordersData.length;
    const completedOrders = ordersData.filter(order => 
      order.status === 'delivered' || order.status === 'completed'
    );
    
    const totalRevenue = completedOrders.reduce((sum, order) => 
      sum + parseFloat(order.total || 0), 0
    );
    
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    setAnalytics({
      totalRevenue,
      totalOrders,
      avgOrderValue,
      totalProducts,
      lowStockItems,
      totalInventoryValue
    });
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
      ...data.map(row => 
        Object.values(row).map(value => 
          typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value
        ).join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportInventoryReport = () => {
    const inventoryData = inventory.map(item => {
      const category = categories.find(cat => cat.id === item.category_id);
      const stockStatus = item.quantity <= (item.min_stock_level || 5) 
        ? (item.quantity === 0 ? 'Out of Stock' : 'Low Stock')
        : 'In Stock';
      
      return {
        ID: item.id,
        Name: item.name,
        SKU: item.sku || 'N/A',
        Category: category ? category.name : 'Unknown',
        Quantity: item.quantity,
        Price: `$${parseFloat(item.price).toFixed(2)}`,
        'Total Value': `$${(parseFloat(item.price) * item.quantity).toFixed(2)}`,
        'Stock Status': stockStatus,
        'Min Stock Level': item.min_stock_level || 5,
        Description: item.description || 'N/A'
      };
    });

    exportToCSV(inventoryData, `inventory-report-${new Date().toISOString().split('T')[0]}`);
  };

  const exportSalesReport = () => {
    const salesData = orders
      .filter(order => order.status === 'delivered' || order.status === 'completed')
      .map(order => ({
        'Order ID': `#${order.id.toString().padStart(6, "0")}`,
        'Customer Name': order.customer_name,
        'Customer Email': order.customer_email || 'N/A',
        'Customer Phone': order.customer_phone || 'N/A',
        'Order Date': formatDate(order.created_at),
        'Items Count': order.items?.length || 0,
        'Total Amount': `$${parseFloat(order.total || 0).toFixed(2)}`,
        Status: order.status.charAt(0).toUpperCase() + order.status.slice(1),
        'Items': order.items?.map(item => `${item.inventory_name} (${item.quantity})`).join('; ') || 'N/A'
      }));

    exportToCSV(salesData, `sales-report-${new Date().toISOString().split('T')[0]}`);
  };

  const exportOrderReport = () => {
    const orderData = orders.map(order => ({
      'Order ID': `#${order.id.toString().padStart(6, "0")}`,
      'Customer Name': order.customer_name,
      'Customer Email': order.customer_email || 'N/A',
      'Customer Phone': order.customer_phone || 'N/A',
      'Order Date': formatDate(order.created_at),
      'Items Count': order.items?.length || 0,
      'Total Amount': `$${parseFloat(order.total || 0).toFixed(2)}`,
      Status: order.status.charAt(0).toUpperCase() + order.status.slice(1),
      'Items': order.items?.map(item => `${item.inventory_name} (qty: ${item.quantity}, price: $${item.price})`).join('; ') || 'N/A'
    }));

    exportToCSV(orderData, `orders-report-${new Date().toISOString().split('T')[0]}`);
  };

  const exportLowStockReport = () => {
    const lowStockData = lowStockProducts.map(item => {
      const category = categories.find(cat => cat.id === item.category_id);
      return {
        'Product ID': item.id,
        'Product Name': item.name,
        SKU: item.sku || 'N/A',
        Category: category ? category.name : 'Unknown',
        'Current Stock': item.quantity,
        'Minimum Level': item.min_stock_level || 5,
        'Stock Deficit': Math.max(0, (item.min_stock_level || 5) - item.quantity),
        'Unit Price': `$${parseFloat(item.price).toFixed(2)}`,
        'Restock Value Needed': `$${(Math.max(0, (item.min_stock_level || 5) - item.quantity) * parseFloat(item.price)).toFixed(2)}`,
        'Stock Status': item.quantity === 0 ? 'Out of Stock' : 'Low Stock',
        'Priority': item.quantity === 0 ? 'Critical' : item.quantity <= 2 ? 'High' : 'Medium'
      };
    });

    if (lowStockData.length === 0) {
      setError("No low stock items to export");
      return;
    }

    exportToCSV(lowStockData, `low-stock-report-${new Date().toISOString().split('T')[0]}`);
  };

  const exportFullAnalyticsReport = () => {
    // Create comprehensive analytics data
    const analyticsData = [
      {
        'Report Type': 'Business Summary',
        'Total Products': analytics.totalProducts,
        'Total Orders': analytics.totalOrders,
        'Total Revenue': `$${analytics.totalRevenue.toFixed(2)}`,
        'Average Order Value': `$${analytics.avgOrderValue.toFixed(2)}`,
        'Low Stock Items': analytics.lowStockItems,
        'Total Inventory Value': `$${analytics.totalInventoryValue.toFixed(2)}`,
        'Report Date': new Date().toLocaleDateString()
      }
    ];

    // Add category breakdown
    Object.entries(categoryData).forEach(([categoryName, data]) => {
      const sharePercentage = analytics.totalInventoryValue > 0 
        ? (data.value / analytics.totalInventoryValue * 100).toFixed(1)
        : 0;
      
      analyticsData.push({
        'Report Type': 'Category Analysis',
        'Category Name': categoryName,
        'Product Count': data.count,
        'Total Quantity': data.quantity,
        'Total Value': `$${data.value.toFixed(2)}`,
        'Market Share': `${sharePercentage}%`,
        'Average Price': `$${(data.count > 0 ? data.value / data.quantity : 0).toFixed(2)}`
      });
    });

    // Add order status breakdown
    Object.entries(orderStatusData).forEach(([status, data]) => {
      analyticsData.push({
        'Report Type': 'Order Status Analysis',
        'Status': status.charAt(0).toUpperCase() + status.slice(1),
        'Order Count': data.count,
        'Total Revenue': `$${data.revenue.toFixed(2)}`,
        'Percentage of Orders': `${(data.count / analytics.totalOrders * 100).toFixed(1)}%`
      });
    });

    exportToCSV(analyticsData, `full-analytics-report-${new Date().toISOString().split('T')[0]}`);
  };

  // Utility function for date formatting
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Generate chart data based on real data
  const getInventoryByCategory = () => {
    const categoryData = {};
    
    inventory.forEach(item => {
      const category = categories.find(cat => cat.id === item.category_id);
      const categoryName = category ? category.name : 'Unknown';
      
      if (!categoryData[categoryName]) {
        categoryData[categoryName] = {
          count: 0,
          value: 0,
          quantity: 0
        };
      }
      
      categoryData[categoryName].count += 1;
      categoryData[categoryName].value += parseFloat(item.price) * item.quantity;
      categoryData[categoryName].quantity += item.quantity;
    });

    return categoryData;
  };

  const getOrdersByStatus = () => {
    const statusData = {};
    
    orders.forEach(order => {
      const status = order.status || 'unknown';
      if (!statusData[status]) {
        statusData[status] = {
          count: 0,
          revenue: 0
        };
      }
      statusData[status].count += 1;
      statusData[status].revenue += parseFloat(order.total || 0);
    });

    return statusData;
  };

  const getTopProducts = () => {
    // Sort by quantity (most stocked)
    return inventory
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  };

  const getLowStockProducts = () => {
    return inventory
      .filter(item => item.quantity <= (item.min_stock_level || 5))
      .sort((a, b) => a.quantity - b.quantity);
  };

  const getMonthlyTrends = () => {
    const monthlyData = {};
    const last6Months = [];
    const today = new Date();
    
    // Generate last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthKey = date.toISOString().slice(0, 7); // YYYY-MM
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      
      last6Months.push(monthName);
      monthlyData[monthKey] = { orders: 0, revenue: 0 };
    }

    // Process orders
    orders.forEach(order => {
      const orderDate = new Date(order.created_at);
      const monthKey = orderDate.toISOString().slice(0, 7);
      
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].orders += 1;
        monthlyData[monthKey].revenue += parseFloat(order.total || 0);
      }
    });

    const ordersData = last6Months.map((_, index) => {
      const date = new Date(today.getFullYear(), today.getMonth() - (5 - index), 1);
      const monthKey = date.toISOString().slice(0, 7);
      return monthlyData[monthKey]?.orders || 0;
    });

    const revenueData = last6Months.map((_, index) => {
      const date = new Date(today.getFullYear(), today.getMonth() - (5 - index), 1);
      const monthKey = date.toISOString().slice(0, 7);
      return monthlyData[monthKey]?.revenue || 0;
    });

    return { labels: last6Months, ordersData, revenueData };
  };

  // Chart configurations
  const categoryData = getInventoryByCategory();
  const orderStatusData = getOrdersByStatus();
  const monthlyTrends = getMonthlyTrends();
  const topProducts = getTopProducts();
  const lowStockProducts = getLowStockProducts();

  const chartData = {
    categoryDistribution: {
      labels: Object.keys(categoryData),
      datasets: [
        {
          label: 'Inventory Value',
          data: Object.values(categoryData).map(cat => cat.value),
          backgroundColor: [
            "hsla(var(--p) / 0.8)",
            "hsla(var(--s) / 0.8)",
            "hsla(var(--a) / 0.8)",
            "hsla(var(--su) / 0.8)",
            "hsla(var(--wa) / 0.8)",
            "hsla(var(--er) / 0.8)",
          ],
        },
      ],
    },
    orderStatus: {
      labels: Object.keys(orderStatusData).map(status => 
        status.charAt(0).toUpperCase() + status.slice(1)
      ),
      datasets: [
        {
          data: Object.values(orderStatusData).map(status => status.count),
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
      labels: monthlyTrends.labels,
      datasets: [
        {
          label: "Orders",
          data: monthlyTrends.ordersData,
          borderColor: "hsl(var(--s))",
          backgroundColor: "hsla(var(--s) / 0.1)",
          tension: 0.4,
          yAxisID: 'y',
        },
        {
          label: "Revenue ($)",
          data: monthlyTrends.revenueData,
          borderColor: "hsl(var(--p))",
          backgroundColor: "hsla(var(--p) / 0.1)",
          tension: 0.4,
          yAxisID: 'y1',
        },
      ],
    },
    topProductsChart: {
      labels: topProducts.slice(0, 5).map(product => product.name),
      datasets: [
        {
          label: 'Stock Quantity',
          data: topProducts.slice(0, 5).map(product => product.quantity),
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
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleFont: { size: 14 },
        bodyFont: { size: 12 },
      },
    },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        beginAtZero: true,
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
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
        </div>
      )}

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <div className="stat bg-base-100 shadow-lg rounded-box">
          <div className="stat-figure text-primary">
            <div className="text-3xl">💰</div>
          </div>
          <div className="stat-title">Total Revenue</div>
          <div className="stat-value text-primary">${analytics.totalRevenue.toFixed(2)}</div>
          <div className="stat-desc">From completed orders</div>
        </div>

        <div className="stat bg-base-100 shadow-lg rounded-box">
          <div className="stat-figure text-secondary">
            <div className="text-3xl">📦</div>
          </div>
          <div className="stat-title">Total Orders</div>
          <div className="stat-value text-secondary">{analytics.totalOrders}</div>
          <div className="stat-desc">All time orders</div>
        </div>

        <div className="stat bg-base-100 shadow-lg rounded-box">
          <div className="stat-figure text-accent">
            <div className="text-3xl">📊</div>
          </div>
          <div className="stat-title">Avg Order Value</div>
          <div className="stat-value text-accent">${analytics.avgOrderValue.toFixed(2)}</div>
          <div className="stat-desc">Per order average</div>
        </div>

        <div className="stat bg-base-100 shadow-lg rounded-box">
          <div className="stat-figure text-info">
            <div className="text-3xl">📋</div>
          </div>
          <div className="stat-title">Total Products</div>
          <div className="stat-value text-info">{analytics.totalProducts}</div>
          <div className="stat-desc">In inventory</div>
        </div>

        <div className="stat bg-base-100 shadow-lg rounded-box">
          <div className="stat-figure text-warning">
            <div className="text-3xl">⚠️</div>
          </div>
          <div className="stat-title">Low Stock Items</div>
          <div className="stat-value text-warning">{analytics.lowStockItems}</div>
          <div className="stat-desc">Need attention</div>
        </div>

        <div className="stat bg-base-100 shadow-lg rounded-box">
          <div className="stat-figure text-success">
            <div className="text-3xl">💎</div>
          </div>
          <div className="stat-title">Inventory Value</div>
          <div className="stat-value text-success">${analytics.totalInventoryValue.toFixed(2)}</div>
          <div className="stat-desc">Total stock value</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
        {/* Monthly Trends Chart */}
        <div className="card bg-base-100 shadow-xl xl:col-span-2">
          <div className="card-body">
            <h3 className="card-title text-lg mb-4">📈 Monthly Trends (Last 6 Months)</h3>
            <div className="h-[350px]">
              <Line data={chartData.monthlyTrends} options={chartOptions} />
            </div>
          </div>
        </div>

        {/* Order Status Distribution */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h3 className="card-title text-lg mb-4">📋 Order Status</h3>
            <div className="h-[300px] flex items-center justify-center">
              <Doughnut 
                data={chartData.orderStatus} 
                options={{
                  ...chartOptions,
                  cutout: "60%",
                  scales: undefined
                }}
              />
            </div>
          </div>
        </div>

        {/* Category Distribution */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h3 className="card-title text-lg mb-4">🏷️ Inventory by Category</h3>
            <div className="h-[300px] flex items-center justify-center">
              <Pie 
                data={chartData.categoryDistribution} 
                options={{
                  ...chartOptions,
                  scales: undefined
                }}
              />
            </div>
          </div>
        </div>

        {/* Top Products */}
        <div className="card bg-base-100 shadow-xl xl:col-span-2">
          <div className="card-body">
            <h3 className="card-title text-lg mb-4">🔝 Top Products by Stock</h3>
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
          </div>
        </div>
      </div>

      {/* Data Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alert */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h3 className="card-title text-lg mb-4">⚠️ Low Stock Alerts</h3>
            {lowStockProducts.length > 0 ? (
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
                    {lowStockProducts.slice(0, 10).map((product) => (
                      <tr key={product.id}>
                        <td className="font-medium">{product.name}</td>
                        <td>{product.quantity}</td>
                        <td>{product.min_stock_level || 5}</td>
                        <td>
                          <div className={`badge ${product.quantity === 0 ? 'badge-error' : 'badge-warning'} badge-sm`}>
                            {product.quantity === 0 ? 'Out of Stock' : 'Low Stock'}
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
                <p className="text-base-content/70">All products are well-stocked!</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Products List */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h3 className="card-title text-lg mb-4">🏆 Top Inventory Items</h3>
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
                        <div className="badge badge-primary badge-sm">#{index + 1}</div>
                      </td>
                      <td className="font-medium">{product.name}</td>
                      <td>{product.quantity} units</td>
                      <td>${(parseFloat(product.price) * product.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Category Analysis */}
      <div className="card bg-base-100 shadow-xl mt-6">
        <div className="card-body">
          <h3 className="card-title text-lg mb-4">📊 Category Analysis</h3>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Products</th>
                  <th>Total Quantity</th>
                  <th>Total Value</th>
                  <th>Avg Price</th>
                  <th>Share</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(categoryData).map(([categoryName, data]) => {
                  const avgPrice = data.count > 0 ? data.value / data.quantity : 0;
                  const sharePercentage = analytics.totalInventoryValue > 0 
                    ? (data.value / analytics.totalInventoryValue * 100).toFixed(1)
                    : 0;
                  
                  return (
                    <tr key={categoryName}>
                      <td className="font-medium">{categoryName}</td>
                      <td>{data.count}</td>
                      <td>{data.quantity} units</td>
                      <td>${data.value.toFixed(2)}</td>
                      <td>${avgPrice.toFixed(2)}</td>
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
              disabled={orders.filter(o => o.status === 'delivered' || o.status === 'completed').length === 0}
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
              disabled={lowStockProducts.length === 0}
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
            <p>📝 Reports are exported as CSV files with current date in filename</p>
            <p>💾 Files will be downloaded to your default download folder</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Reports;
