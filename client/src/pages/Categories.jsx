import { useState, useEffect } from "react";
import LoadingScreen from "../components/LoadingScreen";
import ApiService from "../services/api";

function Categories() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch categories from API
  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const response = await ApiService.getCategories();
      setCategories(response.categories);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Filter and sort categories
  const filteredCategories = categories
    .filter((cat) => cat.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "products") return (b.products || 0) - (a.products || 0);
      if (sortBy === "value") return (b.value || 0) - (a.value || 0);
      return 0;
    });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddEdit = (category = null) => {
    setEditingCategory(category);
    setFormData(category || { name: "", description: "" });
    setIsModalOpen(true);
    setError("");
  };

  const handleDelete = async (categoryId) => {
    try {
      await ApiService.deleteCategory(categoryId);
      await fetchCategories(); // Refresh the list
      setDeleteConfirmId(null);
    } catch (error) {
      setError(error.message);
    }
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError("Category name is required");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      if (editingCategory) {
        await ApiService.updateCategory(editingCategory.id, formData);
      } else {
        await ApiService.addCategory(formData);
      }

      await fetchCategories(); // Refresh the list
      setIsModalOpen(false);
      setEditingCategory(null);
      setFormData({ name: "", description: "" });
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
        <h2 className="text-2xl font-bold mb-4 md:mb-0">Category Management</h2>
        <button
          className="btn btn-primary transition-transform hover:scale-105"
          onClick={() => handleAddEdit()}
        >
          Add Category
        </button>
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}

      {/* Search and Sort Controls */}
      <div className="bg-base-100 p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Search categories..."
            className="input input-bordered w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="select select-bordered w-full"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="name">Sort by Name</option>
            <option value="products">Sort by Products</option>
            <option value="value">Sort by Value</option>
          </select>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {filteredCategories.length === 0 ? (
          <div className="col-span-full text-center py-10">
            <p className="text-lg opacity-70">No categories found</p>
          </div>
        ) : (
          filteredCategories.map((category) => (
            <div
              key={category.id}
              className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="card-body p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="card-title text-lg">{category.name}</h2>
                    <p className="text-sm opacity-70 mt-1">
                      {category.products || 0} products
                    </p>
                  </div>
                  <div className="dropdown dropdown-end">
                    <button tabIndex={0} className="btn btn-ghost btn-xs">
                      ⋮
                    </button>
                    <ul
                      tabIndex={0}
                      className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52"
                    >
                      <li>
                        <button onClick={() => handleAddEdit(category)}>
                          Edit
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={() => setDeleteConfirmId(category.id)}
                          className="text-error"
                        >
                          Delete
                        </button>
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="stats stats-vertical shadow w-full">
                    <div className="stat p-2">
                      <div className="stat-title text-xs">Total Value</div>
                      <div className="stat-value text-xl">
                        ${category.value || 0}
                      </div>
                      <div className="stat-desc text-xs">
                        {(category.growth || 0) >= 0 ? "↗︎" : "↘︎"}{" "}
                        {Math.abs(category.growth || 0)}% from last month
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Category Modal */}
      <dialog
        id="category_modal"
        className={`modal ${isModalOpen ? "modal-open" : ""}`}
      >
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">
            {editingCategory ? "Edit Category" : "Add New Category"}
          </h3>
          <form onSubmit={handleModalSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Category Name</span>
              </label>
              <input
                type="text"
                name="name"
                placeholder="Enter category name"
                className="input input-bordered"
                value={formData.name}
                onChange={handleInputChange}
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Description</span>
              </label>
              <textarea
                name="description"
                className="textarea textarea-bordered"
                placeholder="Category description"
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
                {isSubmitting ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
        <div
          className="modal-backdrop"
          onClick={() => !isSubmitting && setIsModalOpen(false)}
        ></div>
      </dialog>

      {/* Delete Confirmation Modal */}
      <dialog
        id="delete_modal"
        className={`modal ${deleteConfirmId ? "modal-open" : ""}`}
      >
        <div className="modal-box">
          <h3 className="font-bold text-lg">Confirm Delete</h3>
          <p className="py-4">Are you sure you want to delete this category?</p>
          <div className="modal-action">
            <button
              className="btn btn-ghost"
              onClick={() => setDeleteConfirmId(null)}
            >
              Cancel
            </button>
            <button
              className="btn btn-error"
              onClick={() => handleDelete(deleteConfirmId)}
            >
              Delete
            </button>
          </div>
        </div>
        <div
          className="modal-backdrop"
          onClick={() => setDeleteConfirmId(null)}
        ></div>
      </dialog>
    </div>
  );
}

export default Categories;
