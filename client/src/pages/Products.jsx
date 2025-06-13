import { useState, useEffect } from "react";
import LoadingScreen from "../components/LoadingScreen";
import ApiService from "../services/api";

function Products() {
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    category_id: "",
    quantity: "",
    price: "",
    description: "",
    sku: "",
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const response = await ApiService.getInventory();
      setProducts(response.inventory || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      setError("Failed to load products");
    } finally {
      setIsLoading(false);
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

  const handleAddEdit = (product = null) => {
    setEditingProduct(product);
    setFormData(
      product || {
        name: "",
        category_id: "",
        quantity: "",
        price: "",
        description: "",
        sku: "",
      }
    );
    setIsModalOpen(true);
    setError("");
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (
      !formData.name.trim() ||
      !formData.category_id ||
      !formData.quantity ||
      !formData.price
    ) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      if (editingProduct) {
        await ApiService.updateInventoryItem(editingProduct.id, formData);
      } else {
        await ApiService.addInventoryItem(formData);
      }

      await fetchProducts();
      setIsModalOpen(false);
      setEditingProduct(null);
      setFormData({
        name: "",
        category_id: "",
        quantity: "",
        price: "",
        description: "",
        sku: "",
      });
    } catch (error) {
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (productId) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        await ApiService.deleteInventoryItem(productId);
        await fetchProducts();
      } catch (error) {
        setError(error.message);
      }
    }
  };

  const filteredProducts = products
    .filter((product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter((product) =>
      selectedCategory ? product.category_id.toString() === selectedCategory : true
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "name_asc":
          return a.name.localeCompare(b.name);
        case "name_desc":
          return b.name.localeCompare(a.name);
        case "price_asc":
          return parseFloat(a.price) - parseFloat(b.price);
        case "price_desc":
          return parseFloat(b.price) - parseFloat(a.price);
        default:
          return 0;
      }
    });

  const getCategoryName = (categoryId) => {
    const category = categories.find((cat) => cat.id === categoryId);
    return category ? category.name : "Unknown";
  };

  const getStockStatus = (quantity, minStock = 5) => {
    if (quantity === 0) return { text: "Out of Stock", class: "badge-error" };
    if (quantity <= minStock) return { text: "Low Stock", class: "badge-warning" };
    return { text: "In Stock", class: "badge-success" };
  };

  if (isLoading) return <LoadingScreen />;
  return (
    <div className="p-4">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <h2 className="text-2xl font-bold mb-4 md:mb-0">Product Management</h2>
        <button 
          className="btn btn-primary"
          onClick={() => handleAddEdit()}
        >
          Add New Product
        </button>
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}

      <div className="bg-base-100 p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Search products..."
            className="input input-bordered"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select 
            className="select select-bordered"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select 
            className="select select-bordered"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="">Sort By</option>
            <option value="name_asc">Name: A-Z</option>
            <option value="name_desc">Name: Z-A</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => {
          const stockStatus = getStockStatus(product.quantity, product.min_stock_level);
          return (
            <div key={product.id} className="card bg-base-100 shadow-xl">
              <figure className="px-4 pt-4">
                <div className="w-full h-48 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl flex items-center justify-center">
                  <div className="text-4xl opacity-50">📦</div>
                </div>
              </figure>
              <div className="card-body">
                <div className="flex justify-between items-start">
                  <h2 className="card-title text-lg">{product.name}</h2>
                  <div className={`badge ${stockStatus.class} badge-sm`}>
                    {stockStatus.text}
                  </div>
                </div>
                
                <p className="text-sm text-base-content/70 mb-2">
                  {product.description || "No description available"}
                </p>
                
                <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                  <div>
                    <span className="font-semibold">Category:</span>
                    <br />
                    <span className="text-base-content/70">
                      {getCategoryName(product.category_id)}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold">Stock:</span>
                    <br />
                    <span className="text-base-content/70">{product.quantity} units</span>
                  </div>
                  {product.sku && (
                    <div className="col-span-2">
                      <span className="font-semibold">SKU:</span>
                      <br />
                      <span className="text-base-content/70 font-mono text-xs">
                        {product.sku}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold text-primary">
                    ${parseFloat(product.price).toFixed(2)}
                  </span>
                  <div className="card-actions">
                    <button 
                      className="btn btn-sm btn-outline"
                      onClick={() => handleAddEdit(product)}
                    >
                      Edit
                    </button>
                    <button 
                      className="btn btn-sm btn-error"
                      onClick={() => handleDelete(product.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredProducts.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-xl font-semibold mb-2">No products found</h3>
          <p className="text-base-content/70 mb-4">
            {searchTerm || selectedCategory 
              ? "Try adjusting your search or filter criteria" 
              : "Get started by adding your first product"}
          </p>
          <button 
            className="btn btn-primary"
            onClick={() => handleAddEdit()}
          >
            Add Your First Product
          </button>
        </div>
      )}

      {/* Add/Edit Product Modal */}
      {isModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-2xl">
            <h3 className="font-bold text-lg mb-4">
              {editingProduct ? "Edit Product" : "Add New Product"}
            </h3>
            
            {error && (
              <div className="alert alert-error mb-4">
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleModalSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Product Name *</span>
                  </label>
                  <input
                    type="text"
                    name="name"
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
                    name="category_id"
                    className="select select-bordered"
                    value={formData.category_id}
                    onChange={handleInputChange}
                    required
                    disabled={isSubmitting}
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Quantity *</span>
                  </label>
                  <input
                    type="number"
                    name="quantity"
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
                    className="input input-bordered"
                    value={formData.price}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">SKU</span>
                  </label>
                  <input
                    type="text"
                    name="sku"
                    className="input input-bordered"
                    value={formData.sku}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="form-control md:col-span-2">
                  <label className="label">
                    <span className="label-text">Description</span>
                  </label>
                  <textarea
                    name="description"
                    className="textarea textarea-bordered"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="3"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

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
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving..." : (editingProduct ? "Update" : "Add")} Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Products;
