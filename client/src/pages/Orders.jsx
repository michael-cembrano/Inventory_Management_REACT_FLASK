import { useState, useEffect } from "react";
import LoadingScreen from "../components/LoadingScreen";
import ApiService from "../services/api";

function Orders() {
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const response = await ApiService.getOrders();
      setOrders(response.orders);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="p-4">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <h2 className="text-2xl font-bold mb-4 md:mb-0">Order Management</h2>
        <button className="btn btn-primary">Create Order</button>
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}

      <div className="bg-base-100 p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Search orders..."
            className="input input-bordered"
          />
          <select className="select select-bordered">
            <option value="">Order Status</option>
            <option>pending</option>
            <option>processing</option>
            <option>completed</option>
            <option>cancelled</option>
          </select>
          <input type="date" className="input input-bordered" />
          <select className="select select-bordered">
            <option value="">Sort By</option>
            <option>Newest First</option>
            <option>Oldest First</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="table table-zebra">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Status</th>
              <th>Total</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>ORD-{order.id.toString().padStart(6, "0")}</td>
                <td>{order.customer_name}</td>
                <td>{order.items.length} items</td>
                <td>
                  <div
                    className={`badge ${
                      order.status === "completed"
                        ? "badge-success"
                        : order.status === "processing"
                        ? "badge-warning"
                        : order.status === "pending"
                        ? "badge-info"
                        : "badge-error"
                    }`}
                  >
                    {order.status}
                  </div>
                </td>
                <td>${order.total.toFixed(2)}</td>
                <td>
                  <div className="join">
                    <button className="btn btn-sm join-item">View</button>
                    <button className="btn btn-sm join-item">Edit</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Orders;
