import { useState, useEffect } from "react";
import InventoryFilters from "../components/InventoryFilters";
import LoadingScreen from "../components/LoadingScreen";
import ApiService from "../services/api";

function Inventory() {
  const [currentView, setCurrentView] = useState("grid");
  const [isLoading, setIsLoading] = useState(true);
  const [inventory, setInventory] = useState([]);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    quantity: "",
    price: "",
    description: "",
  });

  const fetchInventory = async () => {
    try {
      setIsLoading(true);
      const response = await ApiService.getInventory();
      setInventory(response.inventory);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await ApiService.getCategories();
      setCategories(response.categories);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  useEffect(() => {
    fetchInventory();
    fetchCategories();
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleDelete = async (itemId) => {
    try {
      await ApiService.deleteInventoryItem(itemId);
      await fetchInventory(); // Refresh the list
    } catch (error) {
      setError(error.message);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddEdit = (item = null) => {
    setEditingItem(item);
    setFormData(
      item || {
        name: "",
        category: "",
        quantity: "",
        price: "",
        description: "",
      }
    );
    setIsModalOpen(true);
    setError("");
    // Fetch fresh categories when opening modal
    fetchCategories();
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (
      !formData.name.trim() ||
      !formData.category.trim() ||
      !formData.quantity ||
      !formData.price
    ) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      if (editingItem) {
        await ApiService.updateInventoryItem(editingItem.id, formData);
      } else {
        await ApiService.addInventoryItem(formData);
      }

      await fetchInventory();
      setIsModalOpen(false);
      setEditingItem(null);
      setFormData({
        name: "",
        category: "",
        quantity: "",
        price: "",
        description: "",
      });
    } catch (error) {
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="p-4">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <h2 className="text-2xl font-bold mb-4 md:mb-0">
          Inventory Management
        </h2>
        <button className="btn btn-primary" onClick={() => handleAddEdit()}>
          Add New Item
        </button>
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}

      <InventoryFilters />

      <div className="flex gap-2 mb-4">
        <button
          className={`btn btn-sm ${currentView === "grid" ? "btn-active" : ""}`}
          onClick={() => setCurrentView("grid")}
        >
          Grid View
        </button>
        <button
          className={`btn btn-sm ${
            currentView === "table" ? "btn-active" : ""
          }`}
          onClick={() => setCurrentView("table")}
        >
          Table View
        </button>
      </div>

      {currentView === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {inventory.map((item) => (
            <div key={item.id} className="card bg-base-100 shadow-xl">
              <figure className="px-4 pt-4">
                <img
                  src={`https://picsum.photos/200/200?random=${item.id}`}
                  alt={item.name}
                  className="rounded-xl"
                />
              </figure>
              <div className="card-body">
                <h2 className="card-title">{item.name}</h2>
                <p className="text-sm">Category: {item.category}</p>
                <p className="text-sm opacity-70">{item.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold">${item.price}</span>
                  <span
                    className={`badge ${
                      item.quantity > 10
                        ? "badge-success"
                        : item.quantity > 0
                        ? "badge-warning"
                        : "badge-error"
                    }`}
                  >
                    Stock: {item.quantity}
                  </span>
                </div>
                <div className="card-actions justify-end mt-4">
                  <button
                    className="btn btn-sm"
                    onClick={() => handleAddEdit(item)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-sm btn-error"
                    onClick={() => handleDelete(item.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-zebra">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <img
                        src={`https://picsum.photos/50/50?random=${item.id}`}
                        alt={item.name}
                        className="rounded-lg"
                      />
                      <span>{item.name}</span>
                    </div>
                  </td>
                  <td>{item.category}</td>
                  <td>${item.price}</td>
                  <td>{item.quantity}</td>
                  <td>
                    <span
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
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button
                        className="btn btn-xs"
                        onClick={() => handleAddEdit(item)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-xs btn-error"
                        onClick={() => handleDelete(item.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Item Modal */}
      <dialog className={`modal ${isModalOpen ? "modal-open" : ""}`}>
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">
            {editingItem ? "Edit Item" : "Add New Item"}
          </h3>
          <form onSubmit={handleModalSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Item Name *</span>
              </label>
              <input
                type="text"
                name="name"
                placeholder="Enter item name"
                className="input input-bordered"
                value={formData.name}
                onChange={handleInputChange}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Category *</span>
              </label>
              <select
                name="category"
                className="select select-bordered"
                value={formData.category}
                onChange={handleInputChange}
                required
                disabled={isSubmitting}
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
              {categories.length === 0 && (
                <div className="label">
                  <span className="label-text-alt text-warning">
                    No categories available. Please create categories first.
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Quantity *</span>
                </label>
                <input
                  type="number"
                  name="quantity"
                  placeholder="0"
                  className="input input-bordered"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  min="0"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Price *</span>
                </label>
                <input
                  type="number"
                  name="price"
                  placeholder="0.00"
                  className="input input-bordered"
                  value={formData.price}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Description</span>
              </label>
              <textarea
                name="description"
                className="textarea textarea-bordered"
                placeholder="Item description"
                value={formData.description}
                onChange={handleInputChange}
                disabled={isSubmitting}
              />
            </div>

            <div className="modal-action">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`btn btn-primary ${isSubmitting ? "loading" : ""}`}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Save Item"}
              </button>
            </div>
          </form>
        </div>
        <div
          className="modal-backdrop"
          onClick={() => !isSubmitting && setIsModalOpen(false)}
        ></div>
      </dialog>
    </div>
  );
}

export default Inventory;
