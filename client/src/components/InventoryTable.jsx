import { useState, useEffect } from "react";
import ApiService from "../services/api";

function InventoryTable({ onEdit, onRefresh }) {
  const [inventory, setInventory] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Debug props
  useEffect(() => {
    console.log("InventoryTable props:", {
      onEdit: !!onEdit,
      onRefresh: !!onRefresh,
    });
  }, [onEdit, onRefresh]);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setError("");
      const [inventoryRes, categoriesRes] = await Promise.all([
        ApiService.getInventory().catch(() => ({ inventory: [] })),
        ApiService.getCategories().catch(() => ({ categories: [] })),
      ]);

      setInventory(inventoryRes.inventory?.slice(0, 5) || []);
      setCategories(categoriesRes.categories || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      setError("Failed to load inventory data");
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find((cat) => cat.id === categoryId);
    return category ? category.name : "Unknown";
  };

  const handleEdit = (item) => {
    console.log("Edit button clicked for item:", item); // Debug log
    console.log("onEdit function exists:", typeof onEdit); // Debug log
    if (onEdit && typeof onEdit === "function") {
      console.log("Calling onEdit function..."); // Debug log
      onEdit(item);
    } else {
      console.warn(
        "onEdit prop not provided to InventoryTable or is not a function"
      );
      alert(
        "Edit functionality not configured properly. Check console for details."
      );
    }
  };

  const handleDelete = async (itemId, itemName) => {
    console.log("Delete button clicked for item:", itemId, itemName); // Debug log
    console.log("onRefresh function exists:", typeof onRefresh); // Debug log

    if (window.confirm(`Are you sure you want to delete "${itemName}"?`)) {
      try {
        console.log("Attempting to delete item..."); // Debug log
        await ApiService.deleteInventoryItem(itemId);
        console.log("Item deleted successfully, refreshing table..."); // Debug log
        await fetchInventory(); // Refresh the table

        if (onRefresh && typeof onRefresh === "function") {
          console.log("Calling onRefresh function..."); // Debug log
          onRefresh(); // Notify parent component to refresh
        } else {
          console.warn(
            "onRefresh prop not provided to InventoryTable or is not a function"
          );
        }
      } catch (error) {
        console.error("Error deleting item:", error);
        setError("Failed to delete item: " + error.message);
      }
    }
  };
  if (isLoading) {
    return (
      <div className="overflow-x-auto bg-base-100 rounded-lg">
        <div className="flex justify-center p-8">
          <span className="loading loading-spinner loading-md"></span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="overflow-x-auto bg-base-100 rounded-lg">
        <div className="p-8 text-center">
          <div className="alert alert-error">
            <span>{error}</span>
            <button className="btn btn-sm btn-outline" onClick={fetchInventory}>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto bg-base-100 rounded-lg">
      {inventory.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">📦</div>
          <p className="text-base-content/70">No inventory items found</p>
          <button
            className="btn btn-sm btn-outline mt-2"
            onClick={fetchInventory}
          >
            Refresh
          </button>
        </div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Category</th>
              <th>Stock</th>
              <th>Price/UOM</th>
              <th>Total Value</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {inventory.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{getCategoryName(item.category_id)}</td>
                <td>
                  <div className="flex flex-col">
                    <span className="font-medium">{item.quantity}</span>
                    <span className="text-xs text-base-content/70">
                      {item.unit_of_measure || "pcs"}
                    </span>
                  </div>
                </td>
                <td>
                  <div className="flex flex-col">
                    <span className="font-medium">
                      ${parseFloat(item.price_per_uom || item.price).toFixed(4)}
                    </span>
                    <span className="text-xs text-base-content/70">
                      per {item.unit_of_measure || "pcs"}
                    </span>
                  </div>
                </td>
                <td>
                  $
                  {((item.price_per_uom || item.price) * item.quantity).toFixed(
                    2
                  )}
                </td>
                <td>
                  <div
                    className={`badge ${
                      item.quantity > (item.min_stock_level || 10)
                        ? "badge-success"
                        : item.quantity > 0
                        ? "badge-warning"
                        : "badge-error"
                    }`}
                  >
                    {item.quantity > (item.min_stock_level || 10)
                      ? "In Stock"
                      : item.quantity > 0
                      ? "Low Stock"
                      : "Out of Stock"}
                  </div>
                </td>
                <td>
                  <div className="join">
                    <button
                      className="btn btn-sm join-item"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log("Button clicked! Event:", e);
                        handleEdit(item);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-sm join-item btn-error"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log("Delete button clicked! Event:", e);
                        handleDelete(item.id, item.name);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default InventoryTable;
