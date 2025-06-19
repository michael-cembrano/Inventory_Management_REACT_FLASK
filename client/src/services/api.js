const API_BASE_URL = 'http://localhost:5001/api';

class ApiService {
  constructor() {
    this.token = localStorage.getItem('access_token');
    console.log('ApiService initialized');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('access_token', token);
    } else {
      localStorage.removeItem('access_token');
    }
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      method: 'GET',
      headers: this.getHeaders(),
      ...options,
    };

    try {
      console.log(`Making ${config.method} request to: ${url}`); // Debug log
      const response = await fetch(url, config);
      
      if (!response.ok) {
        console.error(`HTTP ${response.status} - ${response.statusText}`); // Debug log
        if (response.status === 401) {
          this.logout();
          window.location.href = '/login';
        }
        
        // Try to parse error response
        try {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        } catch (jsonError) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Authentication
  async login(username, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    
    if (data.access_token) {
      this.setToken(data.access_token);
    }
    
    return data;
  }  async getCurrentUser() {
    return this.request('/auth/me');
  }

  async verifyToken() {
    // Since /auth/verify doesn't exist, we'll use /auth/me to verify the token
    try {
      await this.getCurrentUser();
      return { valid: true };
    } catch (error) {
      return { valid: false };
    }
  }

  logout() {
    this.setToken(null);
  }

  // Inventory
  async getInventory() {
    return this.request('/inventory');
  }
  async addInventoryItem(item) {
    // Make sure vendor data is properly processed
    const formattedItem = {
      ...item,
      vendors: item.vendors ? item.vendors.filter(v => v.vendor_id && v.unit_price) : []
    };
    
    return this.request('/inventory', {
      method: 'POST',
      body: JSON.stringify(formattedItem),
    });
  }

  async updateInventoryItem(id, item) {
    // Make sure vendor data is properly processed
    const formattedItem = {
      ...item,
      vendors: item.vendors ? item.vendors.filter(v => v.vendor_id && v.unit_price) : []
    };
    
    return this.request(`/inventory/${id}`, {
      method: 'PUT',
      body: JSON.stringify(formattedItem),
    });
  }

  async deleteInventoryItem(id) {
    return this.request(`/inventory/${id}`, {
      method: 'DELETE',
    });
  }

  // Categories
  async getCategories() {
    return this.request('/categories');
  }

  async addCategory(category) {
    return this.request('/categories', {
      method: 'POST',
      body: JSON.stringify(category),
    });
  }

  async updateCategory(id, category) {
    return this.request(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(category),
    });
  }

  async deleteCategory(id) {
    return this.request(`/categories/${id}`, {
      method: 'DELETE',
    });
  }

  // Orders
  async getOrders() {
    return this.request('/orders');
  }
  async createOrder(order) {
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify(order),
    });
  }  async updateOrder(id, order) {
    return this.request(`/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(order),
    });
  }

  // Admin endpoints
  async getUsers() {
    return this.request('/admin/users');
  }

  async createUser(userData) {
    return this.request('/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(id, userData) {
    return this.request(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(id) {
    return this.request(`/admin/users/${id}`, {
      method: 'DELETE',
    });
  }
  async getSystemSettings() {
    return this.request('/admin/system-stats');
  }

  async updateSystemSettings(settings) {
    return this.request('/admin/system-stats', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  async getAuditLogs() {
    return this.request('/admin/audit-logs');
  }

  async getSystemStats() {
    return this.request('/admin/system-stats');
  }

  async backupDatabase() {
    return this.request('/admin/backup', {
      method: 'POST',
    });
  }

  // Vendors
  async getVendors() {
    return this.request('/vendors');
  }

  async getVendor(id) {
    return this.request(`/vendors/${id}`);
  }

  async createVendor(vendorData) {
    return this.request('/vendors', {
      method: 'POST',
      body: JSON.stringify(vendorData),
    });
  }

  async updateVendor(id, vendorData) {
    return this.request(`/vendors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(vendorData),
    });
  }

  async deleteVendor(id) {
    return this.request(`/vendors/${id}`, {
      method: 'DELETE',
    });
  }  // Purchase Orders
  async getPurchaseOrders() {
    console.log("Fetching purchase orders...");
    return this.request('/purchase-orders');
  }

  async getPurchaseOrder(id) {
    return this.request(`/purchase-orders/${id}`);
  }

  async createPurchaseOrder(poData) {
    return this.request('/purchase-orders', {
      method: 'POST',
      body: JSON.stringify(poData),
    });
  }

  async updatePurchaseOrder(id, poData) {
    return this.request(`/purchase-orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(poData),
    });
  }

  async updatePurchaseOrderStatus(id, statusData) {
    return this.request(`/purchase-orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(statusData),
    });
  }

  async deletePurchaseOrder(id) {
    return this.request(`/purchase-orders/${id}`, {
      method: 'DELETE',
    });
  }
  async receivePurchaseOrder(id, receiveData) {
    console.log("Receiving purchase order with data:", receiveData);
    return this.request(`/purchase-orders/${id}/receive`, {
      method: 'POST',
      body: JSON.stringify(receiveData),
    });
  }
}

// Create a single instance and export it
const apiService = new ApiService();
export default apiService;
