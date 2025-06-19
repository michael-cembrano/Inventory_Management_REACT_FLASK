import { useState, useEffect } from "react";
import ApiService from "../services/api";
import LoadingScreen from "../components/LoadingScreen";

function PurchaseOrders() {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingPO, setEditingPO] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    vendor_id: "",
    reference_number: "",
    status: "draft",
    notes: "",
    expected_delivery_date: "",
    items: [{ inventory_id: "", quantity: 1, unit_price: 0 }]
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const promises = [
        ApiService.getPurchaseOrders(),
        ApiService.getVendors(),
        ApiService.getInventory()
      ];
      
      const [poResponse, vendorsResponse, inventoryResponse] = await Promise.allSettled(promises);
      
      // Handle purchase orders
      if (poResponse.status === 'fulfilled') {
        setPurchaseOrders(poResponse.value.purchase_orders || []);
      } else {
        console.error("Failed to fetch purchase orders:", poResponse.reason);
      }
      
      // Handle vendors
      if (vendorsResponse.status === 'fulfilled') {
        setVendors(vendorsResponse.value.vendors || []);
      } else {
        console.error("Failed to fetch vendors:", vendorsResponse.reason);
      }
      
      // Handle inventory
      if (inventoryResponse.status === 'fulfilled') {
        setInventory(inventoryResponse.value.inventory || []);
      } else {
        console.error("Failed to fetch inventory:", inventoryResponse.reason);
      }
    } catch (error) {
      console.error("Failed to fetch initial data:", error);
      setError("Failed to load necessary data: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const openModal = (po = null) => {
    if (po) {
      setEditingPO(po);
      setFormData({
        vendor_id: po.vendor_id,
        reference_number: po.reference_number || generateReferenceNumber(),
        status: po.status || "draft",
        notes: po.notes || "",
        expected_delivery_date: po.expected_delivery_date ? new Date(po.expected_delivery_date).toISOString().split('T')[0] : "",
        items: po.items?.map(item => ({
          id: item.id,
          inventory_id: item.inventory_id,
          quantity: item.quantity,
          unit_price: item.unit_price
        })) || [{ inventory_id: "", quantity: 1, unit_price: 0 }]
      });
    } else {
      setEditingPO(null);
      setFormData({
        vendor_id: vendors.length > 0 ? vendors[0].id : "",
        reference_number: generateReferenceNumber(),
        status: "draft",
        notes: "",
        expected_delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        items: [{ inventory_id: "", quantity: 1, unit_price: 0 }]
      });
    }
    setIsModalOpen(true);
  };

  const generateReferenceNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const randomPart = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PO-${year}${month}-${randomPart}`;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // If vendor changed, update all item prices based on the new vendor
    if (name === 'vendor_id' && value) {
      const vendorId = parseInt(value);
      setFormData(prev => {
        const updatedItems = prev.items.map(item => {
          if (item.inventory_id) {
            const selectedItem = inventory.find(invItem => invItem.id === parseInt(item.inventory_id));
            if (selectedItem && selectedItem.vendors && selectedItem.vendors.length > 0) {
              // Find if this item has the selected vendor in its vendor list
              const vendorPrice = selectedItem.vendors.find(v => parseInt(v.vendor_id) === vendorId);
              
              if (vendorPrice) {
                // Use the vendor-specific price
                return { ...item, unit_price: vendorPrice.unit_price };
              }
            }
          }
          return item;
        });
        
        return { ...prev, items: updatedItems };
      });
    }
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[index][field] = value;
    
    if (field === 'inventory_id' && value) {
      const selectedItem = inventory.find(item => item.id === parseInt(value));
      if (selectedItem && selectedItem.vendors && selectedItem.vendors.length > 0) {
        // Find if this item has the current vendor in its vendor list
        const currentVendorId = parseInt(formData.vendor_id);
        const vendorPrice = selectedItem.vendors.find(v => parseInt(v.vendor_id) === currentVendorId);
        
        if (vendorPrice) {
          // Use the vendor-specific price
          updatedItems[index].unit_price = vendorPrice.unit_price;
        } else {
          // Default to the item's default price
          updatedItems[index].unit_price = selectedItem.price;
        }
      } else if (selectedItem) {
        // No vendor information, use default price
        updatedItems[index].unit_price = selectedItem.price;
      }
    }
    
    setFormData(prev => ({ ...prev, items: updatedItems }));
  };

  const addItemRow = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { inventory_id: "", quantity: 1, unit_price: 0 }]
    }));
  };

  const removeItemRow = (index) => {
    if (formData.items.length > 1) {
      const updatedItems = formData.items.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, items: updatedItems }));
    }
  };

  const calculateTotal = () => {
    return formData.items.reduce((total, item) => {
      return total + (parseFloat(item.unit_price) * parseInt(item.quantity || 0));
    }, 0).toFixed(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setError("");
      
      for (const item of formData.items) {
        if (!item.inventory_id || item.quantity <= 0 || item.unit_price <= 0) {
          setError("All items must have a product selected, quantity and price greater than zero");
          return;
        }
      }
      
      const poData = {
        ...formData,
        items: formData.items.map(item => ({
          id: item.id, // Include ID for existing items
          inventory_id: parseInt(item.inventory_id),
          quantity: parseInt(item.quantity),
          unit_price: parseFloat(item.unit_price),
          total_price: parseFloat(item.unit_price) * parseInt(item.quantity)
        }))
      };
      
      if (editingPO) {
        await ApiService.updatePurchaseOrder(editingPO.id, poData);
      } else {
        await ApiService.createPurchaseOrder(poData);
      }
      
      fetchInitialData();
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving purchase order:", error);
      setError(`Failed to ${editingPO ? "update" : "create"} purchase order: ${error.message || "Unknown error"}`);
    }
  };

  const handleDeletePO = async (poId, poRef) => {
    if (window.confirm(`Are you sure you want to delete purchase order "${poRef}"?`)) {
      try {
        await ApiService.deletePurchaseOrder(poId);
        fetchInitialData();
      } catch (error) {
        console.error("Error deleting purchase order:", error);
        setError(`Failed to delete purchase order: ${error.message || "Unknown error"}`);
      }
    }
  };

  const handleStatusChange = async (poId, newStatus) => {
    try {
      await ApiService.updatePurchaseOrderStatus(poId, { status: newStatus });
      fetchInitialData();
    } catch (error) {
      console.error("Error updating purchase order status:", error);
      setError(`Failed to update status: ${error.message || "Unknown error"}`);
    }
  };

  const handleReceivePO = async (po) => {
    // Only approved purchase orders can be received
    if (po.status !== 'approved') {
      setError(`Only approved purchase orders can be received. Current status: ${po.status}`);
      return;
    }
    
    try {
      // For each item in the PO, we'll receive the full quantity
      const receiveData = {
        items: po.items.map(item => ({
          id: item.id,
          received_quantity: item.quantity
        }))
      };
      
      await ApiService.receivePurchaseOrder(po.id, receiveData);
      fetchInitialData();
      
    } catch (error) {
      console.error("Error receiving purchase order:", error);
      setError(`Failed to receive purchase order: ${error.message || "Unknown error"}`);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status.toLowerCase()) {
      case 'draft': return 'badge-ghost';
      case 'submitted': return 'badge-info';
      case 'approved': return 'badge-success';
      case 'received': return 'badge-primary';
      case 'canceled': return 'badge-error';
      default: return 'badge-secondary';
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Purchase Orders</h2>
        <button
          className="btn btn-primary"
          onClick={() => openModal()}
        >
          Create New Purchase Order
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

      <div className="overflow-x-auto bg-base-100 rounded-lg shadow">
        {purchaseOrders.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-base-content/70">No purchase orders found</p>
          </div>
        ) : (
          <table className="table w-full">
            <thead>
              <tr>
                <th>Reference #</th>
                <th>Vendor</th>
                <th>Status</th>
                <th>Total</th>
                <th>Expected Delivery</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {purchaseOrders.map((po) => (
                <tr key={po.id}>
                  <td>{po.reference_number}</td>
                  <td>{po.vendor_name}</td>
                  <td>
                    <div className={`badge ${getStatusBadgeClass(po.status)}`}>
                      {po.status}
                    </div>
                  </td>
                  <td>${parseFloat(po.total).toFixed(2)}</td>
                  <td>
                    {po.expected_delivery_date
                      ? new Date(po.expected_delivery_date).toLocaleDateString()
                      : "Not specified"}
                  </td>
                  <td>
                    <div className="join">
                      <button
                        className="btn btn-sm join-item"
                        onClick={() => openModal(po)}
                        disabled={po.status === 'received'}
                      >
                        Edit
                      </button>
                      <div className="dropdown dropdown-end">
                        <label tabIndex={0} className="btn btn-sm join-item"
                        disabled={po.status === 'received'}
                        >Status</label>
                        <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
                          <li><button onClick={() => handleStatusChange(po.id, 'draft')}>Draft</button></li>
                          <li><button onClick={() => handleStatusChange(po.id, 'submitted')}>Submitted</button></li>
                          <li><button onClick={() => handleStatusChange(po.id, 'approved')}>Approved</button></li>
                          <li><button onClick={() => handleStatusChange(po.id, 'canceled')}>Canceled</button></li>
                        </ul>
                      </div>
                      {po.status === 'approved' && (
                        <button
                          className="btn btn-sm btn-success join-item"
                          onClick={() => handleReceivePO(po)}
                          disabled={po.status === 'received'}
                        >
                          Receive
                        </button>
                      )}
                      <button
                        className="btn btn-sm btn-error join-item"
                        onClick={() => handleDeletePO(po.id, po.reference_number)}
                        disabled={po.status === 'approved' || po.status === 'received'}
                      >
                        Delete
                      </button>
                      <button
                        className="btn btn-sm btn-success join-item"
                        onClick={() => handleReceivePO(po)}
                        disabled={po.status === 'received'}
                      >
                        Receive
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div 
            className="fixed inset-0 bg-gray-900 bg-opacity-40 backdrop-blur-sm" 
            onClick={() => setIsModalOpen(false)}
          ></div>
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="relative bg-base-100 rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg">
                    {editingPO ? "Edit Purchase Order" : "Create New Purchase Order"}
                  </h3>
                  <button 
                    className="btn btn-sm btn-circle" 
                    onClick={() => setIsModalOpen(false)}
                  >
                    ✕
                  </button>
                </div>
                
                <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Vendor *</span>
                      </label>
                      <select
                        name="vendor_id"
                        value={formData.vendor_id}
                        onChange={handleChange}
                        className="select select-bordered"
                        required
                      >
                        <option value="" disabled>Select Vendor</option>
                        {vendors.map(vendor => (
                          <option key={vendor.id} value={vendor.id}>
                            {vendor.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Reference Number *</span>
                      </label>
                      <input
                        type="text"
                        name="reference_number"
                        value={formData.reference_number}
                        onChange={handleChange}
                        className="input input-bordered"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Status</span>
                      </label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="select select-bordered"
                      >
                        <option value="draft">Draft</option>
                        <option value="submitted">Submitted</option>
                        <option value="approved">Approved</option>
                        <option value="received">Received</option>
                        <option value="canceled">Canceled</option>
                      </select>
                    </div>
                    
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Expected Delivery Date</span>
                      </label>
                      <input
                        type="date"
                        name="expected_delivery_date"
                        value={formData.expected_delivery_date}
                        onChange={handleChange}
                        className="input input-bordered"
                      />
                    </div>
                  </div>
                  
                  <div className="form-control mb-6">
                    <label className="label">
                      <span className="label-text">Notes</span>
                    </label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      className="textarea textarea-bordered"
                      rows="2"
                    ></textarea>
                  </div>
                  
                  <div className="mb-2 font-bold">Order Items</div>
                  
                  <div className="overflow-x-auto mb-4">
                    <table className="table w-full">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Quantity</th>
                          <th>Unit Price</th>
                          <th>Total</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.items.map((item, index) => (
                          <tr key={index}>
                            <td>
                              <select
                                value={item.inventory_id}
                                onChange={(e) => handleItemChange(index, 'inventory_id', e.target.value)}
                                className="select select-bordered w-full"
                                required
                              >
                                <option value="">Select Product</option>
                                {inventory.map(product => (
                                  <option key={product.id} value={product.id}>
                                    {product.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                                className="input input-bordered w-full"
                                min="1"
                                required
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                value={item.unit_price}
                                onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                className="input input-bordered w-full"
                                min="0"
                                step="0.01"
                                required
                              />
                            </td>
                            <td>
                              ${(parseFloat(item.unit_price || 0) * parseInt(item.quantity || 0)).toFixed(2)}
                            </td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-sm btn-error"
                                onClick={() => removeItemRow(index)}
                                disabled={formData.items.length <= 1}
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan="3" className="text-right font-bold">Total:</td>
                          <td className="font-bold">${calculateTotal()}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  
                  <div className="mb-6">
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={addItemRow}
                    >
                      + Add Item
                    </button>
                  </div>
                  
                  <div className="modal-action">
                    <button 
                      type="button" 
                      className="btn" 
                      onClick={() => setIsModalOpen(false)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      {editingPO ? "Save Changes" : "Create Purchase Order"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PurchaseOrders;