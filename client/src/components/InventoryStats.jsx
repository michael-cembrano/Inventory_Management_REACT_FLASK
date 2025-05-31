import { useState, useEffect } from "react";
import ApiService from "../services/api";

function InventoryStats() {
  const [stats, setStats] = useState({
    total_items: 0,
    total_categories: 0,
    total_orders: 0,
    low_stock_items: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await ApiService.getDashboardStats();
        setStats(response.stats);
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="stats shadow stats-horizontal w-full">
      <div className="stat">
        <div className="stat-title">Total Items</div>
        <div className="stat-value">{stats.total_items}</div>
        <div className="stat-desc">Items in inventory</div>
      </div>

      <div className="stat">
        <div className="stat-title">Low Stock Items</div>
        <div className="stat-value text-warning">{stats.low_stock_items}</div>
        <div className="stat-desc">Require attention</div>
      </div>

      <div className="stat">
        <div className="stat-title">Categories</div>
        <div className="stat-value">{stats.total_categories}</div>
        <div className="stat-desc">Product categories</div>
      </div>

      <div className="stat">
        <div className="stat-title">Total Orders</div>
        <div className="stat-value text-success">{stats.total_orders}</div>
        <div className="stat-desc">Orders processed</div>
      </div>
    </div>
  );
}

export default InventoryStats;
