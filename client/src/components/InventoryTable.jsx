import { useState, useEffect } from "react";
import ApiService from "../services/api";

function InventoryTable() {
  const [inventory, setInventory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const response = await ApiService.getInventory();
        setInventory(response.inventory.slice(0, 5)); // Show only first 5 items
      } catch (error) {
        console.error("Failed to fetch inventory:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInventory();
  }, []);

  if (isLoading) {
    return (
      <div className="overflow-x-auto bg-base-100 rounded-lg">
        <div className="flex justify-center p-8">
          <span className="loading loading-spinner loading-md"></span>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-base-100 rounded-lg">
      <table className="table">
        <thead>
          <tr>
            <th>Item Name</th>
            <th>Category</th>
            <th>Stock</th>
            <th>Price</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {inventory.map((item) => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td>{item.category}</td>
              <td>{item.quantity}</td>
              <td>${item.price}</td>
              <td>
                <div
                  className={`badge ${
                    item.quantity > 10
                      ? "badge-success"
                      : item.quantity > 0
                      ? "badge-warning"
                      : "badge-error"
                  }`}
                >
                  {item.quantity > 10
                    ? "In Stock"
                    : item.quantity > 0
                    ? "Low Stock"
                    : "Out of Stock"}
                </div>
              </td>
              <td>
                <div className="join">
                  <button className="btn btn-sm join-item">Edit</button>
                  <button className="btn btn-sm join-item btn-error">
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default InventoryTable;
