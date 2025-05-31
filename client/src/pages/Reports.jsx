import { useState, useEffect } from "react";
import LoadingScreen from "../components/LoadingScreen";
import { Line, Bar, Doughnut } from "react-chartjs-2";
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
  const [timePeriod, setTimePeriod] = useState("weekly");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [dateRange, setDateRange] = useState("thisYear");
  const [customDates, setCustomDates] = useState({
    start: "",
    end: "",
  });

  // Simulate data loading
  useEffect(() => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  }, [timePeriod, dateRange, customDates]);

  // Sample data - replace with actual API data
  const timeData = {
    daily: {
      labels: Array.from({ length: 7 }, (_, i) => `Day ${i + 1}`),
      values: [12, 19, 15, 25, 22, 30, 28],
    },
    weekly: {
      labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
      values: [85, 95, 110, 120],
    },
    monthly: {
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      values: [350, 420, 380, 490, 430, 500],
    },
  };

  const chartData = {
    sales: {
      labels: timeData[timePeriod].labels,
      datasets: [
        {
          label: "Revenue",
          data: timeData[timePeriod].values,
          borderColor: "hsl(var(--p))",
          backgroundColor: "hsla(var(--p) / 0.1)",
          tension: 0.3,
        },
      ],
    },
    categoryDistribution: {
      labels: ["Electronics", "Clothing", "Food", "Books", "Others"],
      datasets: [
        {
          data: [45, 25, 20, 15, 12],
          backgroundColor: [
            "hsla(var(--p) / 0.8)",
            "hsla(var(--s) / 0.8)",
            "hsla(var(--a) / 0.8)",
            "hsla(var(--su) / 0.8)",
            "hsla(var(--wa) / 0.8)",
          ],
        },
      ],
    },
    trends: {
      labels: timeData[timePeriod].labels,
      datasets: [
        {
          label: "Orders",
          data: timeData[timePeriod].values.map((v) => v * 0.8),
          borderColor: "hsl(var(--s))",
          backgroundColor: "hsla(var(--s) / 0.1)",
        },
        {
          label: "Revenue",
          data: timeData[timePeriod].values,
          borderColor: "hsl(var(--p))",
          backgroundColor: "hsla(var(--p) / 0.1)",
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
        beginAtZero: true,
        ticks: {
          callback: (value) => `$${value}`,
        },
      },
    },
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="p-4">
      <div className="flex flex-col lg:flex-row justify-between items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold">Analytics Dashboard</h2>

        <div className="flex flex-wrap gap-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              className="select select-bordered"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="thisYear">This Year</option>
              <option value="lastYear">Last Year</option>
              <option value="custom">Custom Range</option>
            </select>

            {dateRange === "custom" && (
              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  className="input input-bordered"
                  value={customDates.start}
                  onChange={(e) =>
                    setCustomDates((prev) => ({
                      ...prev,
                      start: e.target.value,
                    }))
                  }
                />
                <span className="text-sm">to</span>
                <input
                  type="date"
                  className="input input-bordered"
                  value={customDates.end}
                  onChange={(e) =>
                    setCustomDates((prev) => ({ ...prev, end: e.target.value }))
                  }
                />
              </div>
            )}
          </div>

          <select
            className="select select-bordered"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            <option value="electronics">Electronics</option>
            <option value="clothing">Clothing</option>
            <option value="food">Food</option>
          </select>

          <div className="join">
            <button
              className={`btn join-item ${
                timePeriod === "daily" ? "btn-active" : ""
              }`}
              onClick={() => setTimePeriod("daily")}
            >
              Daily
            </button>
            <button
              className={`btn join-item ${
                timePeriod === "weekly" ? "btn-active" : ""
              }`}
              onClick={() => setTimePeriod("weekly")}
            >
              Weekly
            </button>
            <button
              className={`btn join-item ${
                timePeriod === "monthly" ? "btn-active" : ""
              }`}
              onClick={() => setTimePeriod("monthly")}
            >
              Monthly
            </button>
          </div>
        </div>
      </div>

      <div className="stats shadow stats-vertical lg:stats-horizontal w-full mb-6 hover:shadow-lg transition-shadow">
        <div className="stat">
          <div className="stat-title">Revenue</div>
          <div className="stat-value">
            ${timeData[timePeriod].values.reduce((a, b) => a + b, 0)}
          </div>
          <div className="stat-desc">↗︎ 21% more than last period</div>
        </div>
        <div className="stat">
          <div className="stat-title">Orders</div>
          <div className="stat-value">
            {Math.round(
              timeData[timePeriod].values.reduce((a, b) => a + b, 0) * 0.8
            )}
          </div>
          <div className="stat-desc">↗︎ 15% more than last period</div>
        </div>
        <div className="stat">
          <div className="stat-title">Avg. Order Value</div>
          <div className="stat-value">$120</div>
          <div className="stat-desc">↗︎ 5% increase</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <div className="card bg-base-100 shadow-xl xl:col-span-2 hover:shadow-2xl transition-shadow">
          <div className="card-body">
            <h3 className="card-title">Revenue Trends</h3>
            <div className="h-[400px]">
              <Line data={chartData.trends} options={chartOptions} />
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
          <div className="card-body">
            <h3 className="card-title">Category Distribution</h3>
            <div className="h-[300px] flex items-center justify-center">
              <Doughnut
                data={chartData.categoryDistribution}
                options={{
                  ...chartOptions,
                  cutout: "60%",
                }}
              />
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl xl:col-span-3 hover:shadow-2xl transition-shadow">
          <div className="card-body">
            <h3 className="card-title">Sales Performance</h3>
            <div className="h-[400px]">
              <Bar data={chartData.sales} options={chartOptions} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Reports;
