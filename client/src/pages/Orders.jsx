import { useState, useEffect } from "react";
import LoadingScreen from "../components/LoadingScreen";
import ApiService from "../services/api";

function Orders() {  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("created_at_desc");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    status: "pending",
    items: []
  });
  const [currentOrderItem, setCurrentOrderItem] = useState({
    inventory_id: "",
    quantity: 1,
    price: ""
  });
  useEffect(() => {
    fetchOrders();
    fetchInventory();
    fetchCategories();
  }, []);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const response = await ApiService.getOrders();
      setOrders(response.orders || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
      setError("Failed to load orders");
    } finally {
      setIsLoading(false);
    }
  };
  const fetchInventory = async () => {
    try {
      const response = await ApiService.getInventory();
      setInventory(response.inventory || []);
    } catch (error) {
      console.error("Error fetching inventory:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await ApiService.getCategories();
      setCategories(response.categories || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleItemChange = (e) => {
    const { name, value } = e.target;
    if (name === "inventory_id") {
      const selectedItem = inventory.find(item => item.id === parseInt(value));
      setCurrentOrderItem({
        ...currentOrderItem,
        [name]: value,
        price: selectedItem ? selectedItem.price : ""
      });
    } else {
      setCurrentOrderItem({
        ...currentOrderItem,
        [name]: value,
      });
    }
  };

  const addItemToOrder = () => {
    if (!currentOrderItem.inventory_id || !currentOrderItem.quantity) {
      setError("Please select an item and enter quantity");
      return;
    }

    const selectedInventory = inventory.find(item => item.id === parseInt(currentOrderItem.inventory_id));
    if (!selectedInventory) {
      setError("Invalid inventory item selected");
      return;
    }

    if (parseInt(currentOrderItem.quantity) > selectedInventory.quantity) {
      setError(`Only ${selectedInventory.quantity} units available in stock`);
      return;
    }

    const newItem = {
      inventory_id: parseInt(currentOrderItem.inventory_id),
      inventory_name: selectedInventory.name,
      quantity: parseInt(currentOrderItem.quantity),
      price: parseFloat(currentOrderItem.price || selectedInventory.price),
      total: parseFloat(currentOrderItem.price || selectedInventory.price) * parseInt(currentOrderItem.quantity)
    };

    setFormData({
      ...formData,
      items: [...formData.items, newItem]
    });

    setCurrentOrderItem({
      inventory_id: "",
      quantity: 1,
      price: ""
    });
    setError("");
  };

  const removeItemFromOrder = (index) => {
    const updatedItems = formData.items.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      items: updatedItems
    });
  };

  const calculateOrderTotal = () => {
    return formData.items.reduce((total, item) => total + item.total, 0).toFixed(2);
  };

  const handleAddEdit = (order = null) => {
    setEditingOrder(order);
    if (order) {
      setFormData({
        customer_name: order.customer_name || "",
        customer_email: order.customer_email || "",
        customer_phone: order.customer_phone || "",
        status: order.status || "pending",
        items: order.items || []
      });
    } else {
      setFormData({
        customer_name: "",
        customer_email: "",
        customer_phone: "",
        status: "pending",
        items: []
      });
    }
    setCurrentOrderItem({
      inventory_id: "",
      quantity: 1,
      price: ""
    });
    setIsModalOpen(true);
    setError("");
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customer_name.trim() || formData.items.length === 0) {
      setError("Please provide customer name and at least one item");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      if (editingOrder) {
        const updateData = {
          customer_name: formData.customer_name,
          customer_email: formData.customer_email,
          customer_phone: formData.customer_phone,
          status: formData.status
        };
        await ApiService.updateOrder(editingOrder.id, updateData);
      } else {
        await ApiService.createOrder(formData);
      }

      await fetchOrders();
      await fetchInventory(); // Refresh inventory to show updated quantities
      setIsModalOpen(false);
      setEditingOrder(null);
      setFormData({
        customer_name: "",
        customer_email: "",
        customer_phone: "",
        status: "pending",
        items: []
      });
    } catch (error) {
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredOrders = orders
    .filter((order) =>
      order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toString().includes(searchTerm)
    )
    .filter((order) =>
      statusFilter ? order.status === statusFilter : true
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "created_at_desc":
          return new Date(b.created_at) - new Date(a.created_at);
        case "created_at_asc":
          return new Date(a.created_at) - new Date(b.created_at);
        case "total_desc":
          return parseFloat(b.total) - parseFloat(a.total);
        case "total_asc":
          return parseFloat(a.total) - parseFloat(b.total);
        case "customer_asc":
          return a.customer_name.localeCompare(b.customer_name);
        case "customer_desc":
          return b.customer_name.localeCompare(a.customer_name);
        default:
          return 0;
      }
    });

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { text: "Pending", class: "badge-warning" },
      processing: { text: "Processing", class: "badge-info" },
      shipped: { text: "Shipped", class: "badge-primary" },
      delivered: { text: "Delivered", class: "badge-success" },
      cancelled: { text: "Cancelled", class: "badge-error" }
    };
    return statusConfig[status] || { text: status, class: "badge-ghost" };
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="p-4">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <h2 className="text-2xl font-bold mb-4 md:mb-0">Order Management</h2>
        <button 
          className="btn btn-primary"
          onClick={() => handleAddEdit()}
        >
          Create New Order
        </button>
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
          <button 
            className="btn btn-sm btn-circle btn-ghost ml-auto"
            onClick={() => setError("")}
          >
            ✕
          </button>
        </div>
      )}

      <div className="bg-base-100 p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Search by customer name or order ID..."
            className="input input-bordered"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select 
            className="select select-bordered"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select 
            className="select select-bordered"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="created_at_desc">Newest First</option>
            <option value="created_at_asc">Oldest First</option>
            <option value="total_desc">Highest Amount</option>
            <option value="total_asc">Lowest Amount</option>
            <option value="customer_asc">Customer A-Z</option>
            <option value="customer_desc">Customer Z-A</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto bg-base-100 rounded-lg shadow">
        <table className="table table-zebra">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Contact</th>
              <th>Items</th>
              <th>Status</th>
              <th>Total</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => {
              const statusBadge = getStatusBadge(order.status);
              return (
                <tr key={order.id}>
                  <td className="font-mono text-sm">
                    #{order.id.toString().padStart(6, "0")}
                  </td>
                  <td>
                    <div className="font-semibold">{order.customer_name}</div>
                    {order.customer_email && (
                      <div className="text-sm text-base-content/70">{order.customer_email}</div>
                    )}
                  </td>
                  <td>
                    {order.customer_phone && (
                      <div className="text-sm">{order.customer_phone}</div>
                    )}
                  </td>
                  <td>
                    <div className="flex flex-col">
                      <span className="font-semibold">{order.items?.length || 0} items</span>
                      {order.items && order.items.length > 0 && (
                        <div className="text-xs text-base-content/70">
                          {order.items.slice(0, 2).map((item, idx) => (
                            <div key={idx}>{item.inventory_name} x{item.quantity}</div>
                          ))}
                          {order.items.length > 2 && (
                            <div>+{order.items.length - 2} more...</div>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className={`badge ${statusBadge.class} badge-sm`}>
                      {statusBadge.text}
                    </div>
                  </td>
                  <td className="font-semibold text-primary">
                    ${parseFloat(order.total || 0).toFixed(2)}
                  </td>
                  <td className="text-sm">
                    {formatDate(order.created_at)}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button 
                        className="btn btn-sm btn-outline"
                        onClick={() => handleAddEdit(order)}
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredOrders.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-semibold mb-2">No orders found</h3>
          <p className="text-base-content/70 mb-4">
            {searchTerm || statusFilter 
              ? "Try adjusting your search or filter criteria" 
              : "Get started by creating your first order"}
          </p>
          <button 
            className="btn btn-primary"
            onClick={() => handleAddEdit()}
          >
            Create Your First Order
          </button>
        </div>
      )}

      {/* Create/Edit Order Modal */}
      {isModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-4xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-lg mb-4">
              {editingOrder ? "Edit Order" : "Create New Order"}
            </h3>
            
            {error && (
              <div className="alert alert-error mb-4">
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleModalSubmit}>
              {/* Customer Information */}
              <div className="mb-6">
                <h4 className="font-semibold mb-3">Customer Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Customer Name *</span>
                    </label>
                    <input
                      type="text"
                      name="customer_name"
                      className="input input-bordered"
                      value={formData.customer_name}
                      onChange={handleInputChange}
                      required
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Email</span>
                    </label>
                    <input
                      type="email"
                      name="customer_email"
                      className="input input-bordered"
                      value={formData.customer_email}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Phone</span>
                    </label>
                    <input
                      type="tel"
                      name="customer_phone"
                      className="input input-bordered"
                      value={formData.customer_phone}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>

              {/* Order Status (only for editing) */}
              {editingOrder && (
                <div className="mb-6">
                  <h4 className="font-semibold mb-3">Order Status</h4>
                  <div className="form-control max-w-xs">
                    <select
                      name="status"
                      className="select select-bordered"
                      value={formData.status}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Order Items (only for new orders) */}
              {!editingOrder && (
                <div className="mb-6">
                  <h4 className="font-semibold mb-3">Order Items</h4>
                  
                  {/* Add Item Form */}
                  <div className="bg-base-200 p-4 rounded-lg mb-4">
                    <h5 className="font-medium mb-2">Add Item</h5>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="form-control">
                        <select
                          name="inventory_id"
                          className="select select-bordered select-sm"
                          value={currentOrderItem.inventory_id}
                          onChange={handleItemChange}
                          disabled={isSubmitting}
                        >
                          <option value="">Select Product</option>
                          {inventory
                            .filter(item => item.quantity > 0)
                            .map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name} (Stock: {item.quantity})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-control">
                        <input
                          type="number"
                          name="quantity"
                          placeholder="Quantity"
                          className="input input-bordered input-sm"
                          value={currentOrderItem.quantity}
                          onChange={handleItemChange}
                          min="1"
                          disabled={isSubmitting}
                        />
                      </div>
                      <div className="form-control">
                        <input
                          type="number"
                          name="price"
                          placeholder="Price"
                          className="input input-bordered input-sm"
                          value={currentOrderItem.price}
                          onChange={handleItemChange}
                          min="0"
                          step="0.01"
                          disabled={isSubmitting}
                        />
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={addItemToOrder}
                        disabled={isSubmitting}
                      >
                        Add Item
                      </button>
                    </div>
                  </div>

                  {/* Order Items List */}
                  {formData.items.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="table table-sm">
                        <thead>
                          <tr>
                            <th>Product</th>
                            <th>Quantity</th>
                            <th>Price</th>
                            <th>Total</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.items.map((item, index) => (
                            <tr key={index}>
                              <td>{item.inventory_name}</td>
                              <td>{item.quantity}</td>
                              <td>${item.price.toFixed(2)}</td>
                              <td>${item.total.toFixed(2)}</td>
                              <td>
                                <button
                                  type="button"
                                  className="btn btn-xs btn-error"
                                  onClick={() => removeItemFromOrder(index)}
                                  disabled={isSubmitting}
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <th colSpan="3">Total</th>
                            <th>${calculateOrderTotal()}</th>
                            <th></th>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              )}

              <div className="modal-action">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting || (!editingOrder && formData.items.length === 0)}
                >
                  {isSubmitting ? "Saving..." : (editingOrder ? "Update Order" : "Create Order")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Orders;
