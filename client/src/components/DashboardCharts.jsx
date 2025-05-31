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

function DashboardCharts() {
  const salesData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    datasets: [
      {
        label: "Monthly Revenue",
        data: [3200, 4100, 3800, 4900, 4300, 5000],
        borderColor: "hsl(var(--p))",
        backgroundColor: "hsla(var(--p) / 0.1)",
        tension: 0.3,
      },
    ],
  };

  const categoryData = {
    labels: ["Electronics", "Accessories", "Storage", "Networking", "Software"],
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
  };

  return (
    <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 mt-6">
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Revenue Trend</h2>
          <Line
            data={salesData}
            options={{
              responsive: true,
              plugins: {
                legend: { position: "top" },
              },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: {
                    callback: (value) => `$${value}`,
                  },
                },
              },
            }}
          />
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Category Distribution</h2>
          <div className="p-4 flex justify-center">
            <div className="w-64">
              <Doughnut
                data={categoryData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { position: "bottom" },
                  },
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardCharts;
