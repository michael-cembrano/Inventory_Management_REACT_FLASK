import { useState, useEffect } from "react";
import { Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import ApiService from "../services/api";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

function DashboardCharts() {  const [isLoading, setIsLoading] = useState(true);
  const [salesData, setSalesData] = useState(null);
  const [categoryData, setCategoryData] = useState(null);
  const [error, setError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchChartData();
    
    // Set up auto-refresh every 5 minutes
    const interval = setInterval(fetchChartData, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchChartData = async (isManualRefresh = false) => {
    try {
      setError("");
      if (isManualRefresh) {
        setIsRefreshing(true);
      }
      
      const [inventoryRes, ordersRes, categoriesRes] = await Promise.all([
        ApiService.getInventory().catch(() => ({ inventory: [] })),
        ApiService.getOrders().catch(() => ({ orders: [] })),
        ApiService.getCategories().catch(() => ({ categories: [] }))
      ]);

      const inventory = inventoryRes.inventory || [];
      const orders = ordersRes.orders || [];
      const categories = categoriesRes.categories || [];

      // Generate revenue data for last 6 months
      const revenueData = generateMonthlyRevenue(orders);
      setSalesData({
        labels: revenueData.labels,
        datasets: [
          {
            label: "Monthly Revenue",
            data: revenueData.data,
            borderColor: "hsl(var(--p))",
            backgroundColor: "hsla(var(--p) / 0.1)",
            tension: 0.3,
          },
        ],
      });

      // Generate category distribution data
      const categoryStats = generateCategoryDistribution(inventory, categories);
      setCategoryData({
        labels: categoryStats.labels,
        datasets: [
          {
            data: categoryStats.data,
            backgroundColor: [
              "hsla(var(--p) / 0.8)",
              "hsla(var(--s) / 0.8)",
              "hsla(var(--a) / 0.8)",
              "hsla(var(--su) / 0.8)",
              "hsla(var(--wa) / 0.8)",
              "hsla(var(--er) / 0.8)",
              "hsla(var(--in) / 0.8)",
            ],
          },
        ],
      });

    } catch (error) {
      console.error("Error fetching chart data:", error);
      setError("Failed to load chart data");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const generateMonthlyRevenue = (orders) => {
    const months = [];
    const revenue = [];
    const today = new Date();

    // Generate last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      const monthKey = date.toISOString().slice(0, 7); // YYYY-MM
      
      months.push(monthName);
      
      // Calculate revenue for this month
      const monthRevenue = orders
        .filter(order => {
          if (!order.created_at) return false;
          const orderDate = new Date(order.created_at);
          const orderMonth = orderDate.toISOString().slice(0, 7);
          return orderMonth === monthKey && (order.status === 'delivered' || order.status === 'completed');
        })
        .reduce((sum, order) => sum + parseFloat(order.total || 0), 0);
      
      revenue.push(monthRevenue);
    }

    return { labels: months, data: revenue };
  };

  const generateCategoryDistribution = (inventory, categories) => {
    const categoryStats = {};
    
    // Initialize category stats
    categories.forEach(category => {
      categoryStats[category.name] = 0;
    });

    // Count items per category
    inventory.forEach(item => {
      const category = categories.find(cat => cat.id === item.category_id);
      const categoryName = category ? category.name : 'Unknown';
      
      if (!categoryStats[categoryName]) {
        categoryStats[categoryName] = 0;
      }
      categoryStats[categoryName] += item.quantity;
    });

    // Filter out categories with 0 items and sort by quantity
    const sortedCategories = Object.entries(categoryStats)
      .filter(([_, quantity]) => quantity > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 7); // Limit to top 7 categories

    return {
      labels: sortedCategories.map(([name]) => name),
      data: sortedCategories.map(([, quantity]) => quantity),
    };
  };
  if (isLoading) {
    return (
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 mt-6">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Revenue Trend</h2>
            <div className="flex justify-center items-center h-64">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          </div>
        </div>
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Category Distribution</h2>
            <div className="flex justify-center items-center h-64">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error mt-6">
        <span>{error}</span>
        <button 
          className="btn btn-sm btn-outline"
          onClick={fetchChartData}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!salesData || !categoryData) {
    return (
      <div className="text-center mt-6">
        <p className="text-base-content/70">No data available for charts</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 mt-6">      {/* Revenue Chart */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex justify-between items-center mb-4">
            <h2 className="card-title">📈 Revenue Trend (Last 6 Months)</h2>
            <button 
              className="btn btn-sm btn-ghost"
              onClick={() => fetchChartData(true)}
              disabled={isRefreshing}
            >
              {isRefreshing ? "..." : "🔄"}
            </button>
          </div>
          {salesData && (
            <div className="h-80 w-full">
              <Line
                key={`revenue-${JSON.stringify(salesData.labels)}`}
                data={salesData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { 
                      position: "top",
                      labels: {
                        usePointStyle: true,
                      }
                    },
                    tooltip: {
                      callbacks: {
                        label: (context) => `Revenue: $${context.parsed.y.toFixed(2)}`,
                      },
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: (value) => `$${value}`,
                      },
                    },
                  },
                  animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart',
                  },
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Category Chart */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex justify-between items-center mb-4">
            <h2 className="card-title">🏷️ Category Distribution</h2>
            <button 
              className="btn btn-sm btn-ghost"
              onClick={() => fetchChartData(true)}
              disabled={isRefreshing}
            >
              {isRefreshing ? "..." : "🔄"}
            </button>
          </div>
          {categoryData && (
            <div className="flex justify-center h-80 w-full">
              <div className="w-80 h-80">
                <Doughnut
                  key={`category-${JSON.stringify(categoryData.labels)}`}
                  data={categoryData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { 
                        position: "bottom",
                        labels: {
                          usePointStyle: true,
                          padding: 20,
                        }
                      },
                      tooltip: {
                        callbacks: {
                          label: (context) => {
                            const label = context.label;
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} items (${percentage}%)`;
                          },
                        },
                      },
                    },
                    cutout: "60%",
                    animation: {
                      duration: 1000,
                      easing: 'easeInOutQuart',
                    },
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardCharts;
