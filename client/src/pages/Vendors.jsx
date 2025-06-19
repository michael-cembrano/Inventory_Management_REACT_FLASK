import { useState, useEffect } from 'react';
import ApiService from '../services/api';
import LoadingScreen from '../components/LoadingScreen';

function Vendors() {
  const [vendors, setVendors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    setIsLoading(true);
    try {
      const response = await ApiService.getVendors();
      setVendors(response.vendors || []);
      setError('');
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
      setError('Failed to load vendors');
    } finally {
      setIsLoading(false);
    }
  };

  const openModal = (vendor = null) => {
    if (vendor) {
      // Edit mode
      setEditingVendor(vendor);
      setFormData({
        name: vendor.name,
        contact_person: vendor.contact_person || '',
        email: vendor.email || '',
        phone: vendor.phone || '',
        address: vendor.address || ''
      });
    } else {
      // Add mode
      setEditingVendor(null);
      setFormData({
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setError('');
      
      if (!formData.name.trim()) {
        setError('Vendor name is required');
        return;
      }
      
      if (editingVendor) {
        // Update existing vendor
        await ApiService.updateVendor(editingVendor.id, formData);
      } else {
        // Create new vendor
        await ApiService.createVendor(formData);
      }
      
      // Refresh vendors list and close modal
      fetchVendors();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving vendor:', error);
      setError(`Failed to ${editingVendor ? 'update' : 'create'} vendor: ${error.message || 'Unknown error'}`);
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete vendor "${name}"?`)) {
      try {
        await ApiService.deleteVendor(id);
        fetchVendors();
      } catch (error) {
        console.error('Error deleting vendor:', error);
        setError(`Failed to delete vendor: ${error.message || 'Unknown error'}`);
      }
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Vendors</h2>
        <button 
          className="btn btn-primary"
          onClick={() => openModal()}
        >
          Add New Vendor
        </button>
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
          <button className="btn btn-sm btn-ghost" onClick={() => setError('')}>
            Dismiss
          </button>
        </div>
      )}

      <div className="overflow-x-auto bg-base-100 rounded-lg shadow">
        {vendors.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-base-content/70">No vendors found</p>
          </div>
        ) : (
          <table className="table w-full">
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact Person</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map(vendor => (
                <tr key={vendor.id}>
                  <td>{vendor.name}</td>
                  <td>{vendor.contact_person || '-'}</td>
                  <td>{vendor.email || '-'}</td>
                  <td>{vendor.phone || '-'}</td>
                  <td>
                    <div className="join">
                      <button
                        className="btn btn-sm join-item"
                        onClick={() => openModal(vendor)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-sm btn-error join-item"
                        onClick={() => handleDelete(vendor.id, vendor.name)}
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

      {/* Vendor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div 
            className="fixed inset-0 bg-gray-900 bg-opacity-40 backdrop-blur-sm" 
            onClick={() => setIsModalOpen(false)}
          ></div>
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="relative bg-base-100 rounded-lg shadow-lg p-6 max-w-md w-full">
              <h3 className="font-bold text-lg mb-4">
                {editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
            </h3>
            
            <form onSubmit={handleSubmit}>
              <div className="form-control mb-3">
                <label className="label">
                  <span className="label-text">Name *</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="input input-bordered"
                  required
                />
              </div>
              
              <div className="form-control mb-3">
                <label className="label">
                  <span className="label-text">Contact Person</span>
                </label>
                <input
                  type="text"
                  name="contact_person"
                  value={formData.contact_person}
                  onChange={handleChange}
                  className="input input-bordered"
                />
              </div>
              
              <div className="form-control mb-3">
                <label className="label">
                  <span className="label-text">Email</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input input-bordered"
                />
              </div>
              
              <div className="form-control mb-3">
                <label className="label">
                  <span className="label-text">Phone</span>
                </label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="input input-bordered"
                />
              </div>
              
              <div className="form-control mb-6">
                <label className="label">
                  <span className="label-text">Address</span>
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="textarea textarea-bordered"
                  rows="3"
                ></textarea>
              </div>
              
              <div className="modal-action">
                <button type="button" className="btn" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingVendor ? 'Save Changes' : 'Add Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
    </div>
      )}
    </div>
  )};


export default Vendors;