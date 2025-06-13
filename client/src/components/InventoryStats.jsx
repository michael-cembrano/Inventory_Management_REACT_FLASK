import { useState, useEffect } from "react";
import ApiService from "../services/api";

function InventoryStats() {
  const [stats, setStats] = useState({
    total_items: 0,
    total_categories: 0,
    total_orders: 0,
    low_stock_items: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        setError("");
        
        // Fetch stats from individual endpoints (since dashboard/stats doesn't exist)
        const [inventoryRes, categoriesRes, ordersRes] = await Promise.all([
          ApiService.getInventory().catch(() => ({ inventory: [] })),
          ApiService.getCategories().catch(() => ({ categories: [] })),
          ApiService.getOrders().catch(() => ({ orders: [] }))
        ]);

        const inventory = inventoryRes.inventory || [];
        const categories = categoriesRes.categories || [];
        const orders = ordersRes.orders || [];

        const lowStockItems = inventory.filter(item => 
          item.quantity <= (item.min_stock_level || 5)
        ).length;

        setStats({
          total_items: inventory.length,
          total_categories: categories.length,
          total_orders: orders.length,
          low_stock_items: lowStockItems,
        });
      } catch (error) {
        console.error("Failed to fetch stats:", error);
        setError("Failed to load dashboard statistics");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (error) {
    return (
      <div className="alert alert-error mb-6">
        <span>{error}</span>
        <button 
          className="btn btn-sm btn-outline"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="stats shadow stats-horizontal w-full">
      <div className="stat">
        <div className="stat-figure text-primary">
          <div className="text-3xl">📦</div>
        </div>
        <div className="stat-title">Total Items</div>
        <div className="stat-value">{isLoading ? "..." : stats.total_items}</div>
        <div className="stat-desc">Items in inventory</div>
      </div>

      <div className="stat">
        <div className="stat-figure text-warning">
          <div className="text-3xl">⚠️</div>
        </div>
        <div className="stat-title">Low Stock Items</div>
        <div className="stat-value text-warning">{isLoading ? "..." : stats.low_stock_items}</div>
        <div className="stat-desc">Require attention</div>
      </div>

      <div className="stat">
        <div className="stat-figure text-info">
          <div className="text-3xl">🏷️</div>
        </div>
        <div className="stat-title">Categories</div>
        <div className="stat-value">{isLoading ? "..." : stats.total_categories}</div>
        <div className="stat-desc">Product categories</div>
      </div>

      <div className="stat">
        <div className="stat-figure text-success">
          <div className="text-3xl">📋</div>
        </div>
        <div className="stat-title">Total Orders</div>
        <div className="stat-value text-success">{isLoading ? "..." : stats.total_orders}</div>
        <div className="stat-desc">Orders processed</div>
      </div>
    </div>
  );
}

export default InventoryStats;
