import { useState, useEffect } from "react";
import InventoryFilters from "../components/InventoryFilters";
import LoadingScreen from "../components/LoadingScreen";
import ApiService from "../services/api";

function Inventory() {
  const [currentView, setCurrentView] = useState("grid");
  const [isLoading, setIsLoading] = useState(true);
  const [inventory, setInventory] = useState([]);
  const [categories, setCategories] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    category_id: "",
    quantity: "",
    price: "",
    price_per_uom: "",
    unit_of_measure: "pcs",
    conversion_factor: 1,
    base_unit: "pcs",
    description: "",
    vendors: [{ vendor_id: "", unit_price: "" }],
  });
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [selectedVendors, setSelectedVendors] = useState([]);

  // Common units of measure
  const unitOptions = [
    { value: "pcs", label: "Pieces (pcs)" },
    { value: "kg", label: "Kilograms (kg)" },
    { value: "g", label: "Grams (g)" },
    { value: "lbs", label: "Pounds (lbs)" },
    { value: "m", label: "Meters (m)" },
    { value: "cm", label: "Centimeters (cm)" },
    { value: "ft", label: "Feet (ft)" },
    { value: "in", label: "Inches (in)" },
    { value: "l", label: "Liters (l)" },
    { value: "ml", label: "Milliliters (ml)" },
    { value: "gal", label: "Gallons (gal)" },
    { value: "box", label: "Boxes" },
    { value: "pack", label: "Packs" },
    { value: "roll", label: "Rolls" },
    { value: "sheet", label: "Sheets" },
  ];

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

  const fetchVendors = async () => {
    try {
      const response = await ApiService.getVendors();
      setVendors(response.vendors || []);
    } catch (error) {
      console.error("Failed to fetch vendors:", error);
    }
  };

  useEffect(() => {
    fetchInventory();
    fetchCategories();
    fetchVendors();
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
    const { name, value } = e.target;
    setFormData((prev) => {
      const newFormData = { ...prev, [name]: value };

      // Auto-calculate total price when quantity or price_per_uom changes
      if (name === "quantity" || name === "price_per_uom") {
        const quantity =
          parseFloat(name === "quantity" ? value : newFormData.quantity) || 0;
        const pricePerUom =
          parseFloat(
            name === "price_per_uom" ? value : newFormData.price_per_uom
          ) || 0;
        newFormData.price = (quantity * pricePerUom).toFixed(2);
      }

      // Set base_unit same as unit_of_measure if not explicitly set
      if (
        name === "unit_of_measure" &&
        newFormData.base_unit === prev.unit_of_measure
      ) {
        newFormData.base_unit = value;
      }

      return newFormData;
    });
  };

  const handleVendorChange = (index, field, value) => {
    const updatedVendors = [...formData.vendors];
    updatedVendors[index][field] = value;
    setFormData({ ...formData, vendors: updatedVendors });
  };

  const addVendorRow = () => {
    setFormData({
      ...formData,
      vendors: [...formData.vendors, { vendor_id: "", unit_price: "" }],
    });
  };

  const removeVendorRow = (index) => {
    if (formData.vendors.length > 1) {
      const updatedVendors = formData.vendors.filter((_, i) => i !== index);
      setFormData({ ...formData, vendors: updatedVendors });
    }
  };

  const handleAddEdit = (item = null) => {
    setEditingItem(item);
    if (item) {
      // Edit mode
      const initialVendors =
        item.vendors && item.vendors.length > 0
          ? item.vendors.map((v) => ({
              vendor_id: v.vendor_id,
              unit_price: v.unit_price,
            }))
          : [{ vendor_id: "", unit_price: "" }];

      setFormData({
        name: item.name,
        category_id: item.category_id,
        quantity: item.quantity,
        price: item.price,
        price_per_uom: item.price_per_uom || item.price,
        unit_of_measure: item.unit_of_measure || "pcs",
        conversion_factor: item.conversion_factor || 1,
        base_unit: item.base_unit || item.unit_of_measure || "pcs",
        description: item.description || "",
        vendors: initialVendors,
      });
      setSelectedVendors(item.vendors || []);
    } else {
      // Add mode
      setFormData({
        name: "",
        category_id: "",
        quantity: "",
        price: "",
        price_per_uom: "",
        unit_of_measure: "pcs",
        conversion_factor: 1,
        base_unit: "pcs",
        description: "",
        vendors: [{ vendor_id: "", unit_price: "" }],
      });
      setSelectedVendors([]);
    }
    setIsModalOpen(true);
    setError("");
    // Fetch fresh categories and vendors when opening modal
    fetchCategories();
    fetchVendors();
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (
      !formData.name.trim() ||
      !formData.category_id ||
      !formData.quantity ||
      !formData.price_per_uom ||
      !formData.unit_of_measure
    ) {
      setError("Please fill in all required fields");
      return;
    }

    // Validate vendors if any are added
    const validVendors = formData.vendors.filter(
      (v) => v.vendor_id && v.unit_price
    );
    if (validVendors.length > 0) {
      // Make sure each vendor has both ID and price
      const invalidVendors = formData.vendors.filter(
        (v) => (v.vendor_id && !v.unit_price) || (!v.vendor_id && v.unit_price)
      );
      if (invalidVendors.length > 0) {
        setError("Each vendor must have both a vendor selected and a price");
        return;
      }
    }

    try {
      setIsSubmitting(true);
      setError("");

      // Add vendors data to the submission
      const submissionData = {
        ...formData,
        // Only include vendors with both id and price
        vendors: formData.vendors.filter((v) => v.vendor_id && v.unit_price),
      };

      if (editingItem) {
        await ApiService.updateInventoryItem(editingItem.id, submissionData);
      } else {
        await ApiService.addInventoryItem(submissionData);
      }

      await fetchInventory();
      setIsModalOpen(false);
      setEditingItem(null);
      setFormData({
        name: "",
        category_id: "",
        quantity: "",
        price: "",
        price_per_uom: "",
        unit_of_measure: "pcs",
        conversion_factor: 1,
        base_unit: "pcs",
        description: "",
        vendors: [{ vendor_id: "", unit_price: "" }],
      });
    } catch (error) {
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openVendorModal = (item) => {
    setEditingItem(item);
    setSelectedVendors(item.vendors || []);
    setIsVendorModalOpen(true);
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
          <button className="btn btn-sm btn-ghost" onClick={() => setError("")}>
            Dismiss
          </button>
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
                    className="btn btn-sm btn-info"
                    onClick={() => openVendorModal(item)}
                  >
                    Vendors
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
                <th>Quantity</th>
                <th>Price/UOM</th>
                <th>Total Value</th>
                <th>Status</th>
                <th>Vendors</th>
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
                  <td>
                    <div className="flex flex-col">
                      <span className="font-medium">{item.quantity}</span>
                      <span className="text-xs text-base-content/70">
                        {item.unit_of_measure}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        $
                        {parseFloat(item.price_per_uom || item.price).toFixed(
                          4
                        )}
                      </span>
                      <span className="text-xs text-base-content/70">
                        per {item.unit_of_measure}
                      </span>
                    </div>
                  </td>
                  <td>
                    $
                    {(
                      parseFloat(item.price_per_uom || item.price) *
                      item.quantity
                    ).toFixed(2)}
                  </td>
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
                    <span className="badge">
                      {item.vendors ? item.vendors.length : 0} vendors
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
                        className="btn btn-xs btn-info"
                        onClick={() => openVendorModal(item)}
                      >
                        Vendors
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
        <div className="modal-box max-w-4xl">
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Unit of Measure *</span>
                </label>
                <select
                  name="unit_of_measure"
                  className="select select-bordered"
                  value={formData.unit_of_measure}
                  onChange={handleInputChange}
                  required
                  disabled={isSubmitting}
                >
                  {unitOptions.map((unit) => (
                    <option key={unit.value} value={unit.value}>
                      {unit.label}
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
                  <span className="label-text">
                    Price per {formData.unit_of_measure} *
                  </span>
                </label>
                <input
                  type="number"
                  name="price_per_uom"
                  placeholder="0.00"
                  className="input input-bordered"
                  value={formData.price_per_uom}
                  onChange={handleInputChange}
                  min="0"
                  step="0.0001"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Total Value (calculated)</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={`$${formData.price || "0.00"}`}
                  disabled
                />
                <div className="label">
                  <span className="label-text-alt">
                    {formData.quantity || 0} {formData.unit_of_measure} × $
                    {formData.price_per_uom || 0}
                  </span>
                </div>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Conversion Factor</span>
                </label>
                <input
                  type="number"
                  name="conversion_factor"
                  placeholder="1"
                  className="input input-bordered"
                  value={formData.conversion_factor}
                  onChange={handleInputChange}
                  min="0.0001"
                  step="0.0001"
                  disabled={isSubmitting}
                />
                <div className="label">
                  <span className="label-text-alt">
                    For unit conversions (optional)
                  </span>
                </div>
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

            <div className="form-control">
              <label className="label">
                <span className="label-text">Vendors</span>
              </label>

              <div className="overflow-x-auto mb-4">
                <table className="table w-full">
                  <thead>
                    <tr>
                      <th>Vendor</th>
                      <th>Price per {formData.unit_of_measure}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.vendors.map((vendorItem, index) => (
                      <tr key={index}>
                        <td>
                          <select
                            className="select select-bordered w-full"
                            value={vendorItem.vendor_id}
                            onChange={(e) =>
                              handleVendorChange(
                                index,
                                "vendor_id",
                                e.target.value
                              )
                            }
                            disabled={isSubmitting}
                          >
                            <option value="">Select Vendor</option>
                            {vendors.map((vendor) => (
                              <option key={vendor.id} value={vendor.id}>
                                {vendor.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="number"
                            className="input input-bordered w-full"
                            value={vendorItem.unit_price}
                            onChange={(e) =>
                              handleVendorChange(
                                index,
                                "unit_price",
                                e.target.value
                              )
                            }
                            min="0"
                            step="0.0001"
                            placeholder="0.0000"
                            disabled={isSubmitting}
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-sm btn-error"
                            onClick={() => removeVendorRow(index)}
                            disabled={
                              formData.vendors.length <= 1 || isSubmitting
                            }
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={addVendorRow}
                disabled={isSubmitting}
              >
                Add Vendor
              </button>
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
          className="modal-backdrop bg-gray-900 bg-opacity-40 backdrop-blur-sm"
          onClick={() => !isSubmitting && setIsModalOpen(false)}
        ></div>
      </dialog>

      {/* View Vendors Modal */}
      <dialog className={`modal ${isVendorModalOpen ? "modal-open" : ""}`}>
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">
            Vendors for {editingItem?.name || "Item"}
          </h3>

          {selectedVendors.length === 0 ? (
            <div className="text-center py-4">
              <p>No vendors associated with this item</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>Price</th>
                    <th>Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedVendors.map((vendorItem, index) => {
                    const vendor = vendors.find(
                      (v) => v.id === parseInt(vendorItem.vendor_id)
                    );
                    return (
                      <tr key={index}>
                        <td>{vendor?.name || "Unknown"}</td>
                        <td>${parseFloat(vendorItem.unit_price).toFixed(2)}</td>
                        <td>{vendor?.phone || vendor?.email || "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="modal-action">
            <button className="btn" onClick={() => setIsVendorModalOpen(false)}>
              Close
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                setIsVendorModalOpen(false);
                handleAddEdit(editingItem);
              }}
            >
              Edit Vendors
            </button>
          </div>
        </div>
        <div
          className="modal-backdrop bg-gray-900 bg-opacity-40 backdrop-blur-sm"
          onClick={() => setIsVendorModalOpen(false)}
        ></div>
      </dialog>
    </div>
  );
}

export default Inventory;
