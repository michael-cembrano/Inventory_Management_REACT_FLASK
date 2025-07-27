import { useState, useEffect } from "react";
import LoadingScreen from "../components/LoadingScreen";
import ApiService from "../services/api";
import { Line, Bar } from "react-chartjs-2";

function Admin() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [users, setUsers] = useState([]);
  const [systemStats, setSystemStats] = useState({});
  const [auditLogs, setAuditLogs] = useState([]);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    role: "user",
    password: "",
  });
  const [systemSettings, setSystemSettings] = useState({
    company_name: "Inventory Management Co.",
    email_notifications: true,
    backup_frequency: "daily",
    max_login_attempts: 3,
    session_timeout: 30,
  });

  // Fetch admin data from backend endpoints
  const fetchAdminData = async () => {
    try {
      setIsLoading(true);
      setError("");

      // Fetch users - this is the main fix
      try {
        console.log("Fetching users..."); // Debug log
        const usersRes = await ApiService.getUsers();
        console.log("Users response:", usersRes); // Debug log
        setUsers(usersRes.users || []);
      } catch (usersError) {
        console.error("Error fetching users:", usersError);
        setError(`Failed to fetch users: ${usersError.message}`);
        setUsers([]); // Set empty array as fallback
      }

      // Fetch system stats
      try {
        const statsRes = await ApiService.getSystemStats();
        setSystemStats(statsRes);
      } catch (err) {
        console.warn("Failed to fetch system stats, using fallback:", err);
        // fallback to mock if endpoint not implemented
        setSystemStats({
          total_users: users.length || 0,
          total_categories: 6,
          total_products: 14,
          total_orders: 3,
          low_stock_items: 2,
          inventory_value: 45000,
        });
      }

      // Fetch audit logs
      try {
        const logsRes = await ApiService.getAuditLogs();
        setAuditLogs(logsRes.logs || []);
      } catch (err) {
        console.warn("Failed to fetch audit logs, using fallback:", err);
        // fallback to mock logs
        setAuditLogs([
          {
            id: 1,
            created_at: new Date().toISOString(),
            user_id: 1,
            action: "LOGIN",
            table_name: "users",
            record_id: "1",
            ip_address: "192.168.1.100",
            new_values: JSON.stringify({
              username: "admin",
              last_login: new Date().toISOString(),
            }),
          },
          {
            id: 2,
            created_at: new Date(Date.now() - 3600000).toISOString(),
            user_id: null,
            action: "SYSTEM_INIT",
            table_name: "system",
            record_id: null,
            ip_address: "127.0.0.1",
            new_values: JSON.stringify({ status: "Database initialized" }),
          },
        ]);
      }

      // Fetch system settings
      try {
        const settingsRes = await ApiService.getSystemSettings();
        setSystemSettings((prev) => ({ ...prev, ...settingsRes }));
      } catch (err) {
        console.warn("Failed to fetch system settings, using fallback:", err);
        // fallback to localStorage or default
        const savedSettings = localStorage.getItem("systemSettings");
        if (savedSettings) {
          try {
            const parsed = JSON.parse(savedSettings);
            setSystemSettings((prev) => ({ ...prev, ...parsed }));
          } catch (error) {
            // ignore
          }
        }
      }
    } catch (error) {
      console.error("General admin data fetch error:", error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
    // eslint-disable-next-line
  }, []);

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username || !formData.email) {
      setError("Username and email are required");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      if (editingUser) {
        await ApiService.updateUser(editingUser.id, formData);
      } else {
        await ApiService.createUser(formData);
      }

      await fetchAdminData();
      setIsModalOpen(false);
      setEditingUser(null);
      setFormData({ username: "", email: "", role: "user", password: "" });
    } catch (error) {
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (
      window.confirm(
        `Are you sure you want to delete user "${username}"? This action cannot be undone.`
      )
    ) {
      try {
        setError("");
        const response = await ApiService.deleteUser(userId);

        // Show success message
        if (response.message) {
          alert(response.message);
        }

        await fetchAdminData();
      } catch (error) {
        console.error("Delete user error:", error);
        setError(`Failed to delete user: ${error.message}`);
      }
    }
  };

  const handleBackup = async () => {
    try {
      setError("");
      // Since the backup endpoint doesn't exist yet, we'll simulate it
      const confirmed = window.confirm(
        "This will create a backup of the current database. Continue?"
      );

      if (!confirmed) return;

      // Try to call the actual endpoint first
      try {
        await ApiService.backupDatabase();
        alert("Database backup initiated successfully");
      } catch (error) {
        // If endpoint doesn't exist, show a helpful message
        if (error.message.includes("404") || error.message.includes("CORS")) {
          alert(
            "Backup endpoint not yet implemented on the server. " +
              "The backup feature will be available once the admin API endpoints are added to the Flask backend."
          );
        } else {
          throw error;
        }
      }
    } catch (error) {
      setError(`Backup failed: ${error.message}`);
    }
  };

  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    try {
      setError("");

      await ApiService.updateSystemSettings(systemSettings);
      alert("Settings updated successfully");
    } catch (error) {
      console.error("Settings update error:", error);
      // If endpoint doesn't exist, show a helpful message and store locally
      if (error.message.includes("404") || error.message.includes("CORS")) {
        // Store settings in localStorage as fallback
        localStorage.setItem("systemSettings", JSON.stringify(systemSettings));
        alert(
          "Settings saved locally. The system settings API endpoint will need to be implemented on the Flask backend for persistent storage."
        );
      } else {
        setError(`Settings update failed: ${error.message}`);
      }
    }
  };

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem("systemSettings");
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSystemSettings({ ...systemSettings, ...parsed });
      } catch (error) {
        console.warn("Failed to parse saved settings:", error);
      }
    }
  }, []);

  // Chart data
  const userActivityData = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        label: "Active Users",
        data: [12, 19, 15, 25, 22, 30, 28],
        borderColor: "hsl(var(--p))",
        backgroundColor: "hsla(var(--p) / 0.1)",
      },
    ],
  };

  const systemPerformanceData = {
    labels: ["CPU Usage", "Memory", "Storage", "Network"],
    datasets: [
      {
        label: "Usage %",
        data: [45, 65, 30, 20],
        backgroundColor: [
          "hsla(var(--p) / 0.8)",
          "hsla(var(--s) / 0.8)",
          "hsla(var(--a) / 0.8)",
          "hsla(var(--su) / 0.8)",
        ],
      },
    ],
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="p-4">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <h2 className="text-2xl font-bold mb-4 md:mb-0">Admin Dashboard</h2>
        <div className="flex gap-2">
          <button className="btn btn-outline" onClick={handleBackup}>
            Backup Database
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              setEditingUser(null);
              setFormData({
                username: "",
                email: "",
                role: "user",
                password: "",
              });
              setIsModalOpen(true);
            }}
          >
            Add User
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div role="tablist" className="tabs tabs-boxed mb-6">
        <button
          role="tab"
          className={`tab ${activeTab === "overview" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </button>
        <button
          role="tab"
          className={`tab ${activeTab === "users" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("users")}
        >
          User Management
        </button>
        <button
          role="tab"
          className={`tab ${activeTab === "settings" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("settings")}
        >
          System Settings
        </button>
        <button
          role="tab"
          className={`tab ${activeTab === "logs" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("logs")}
        >
          Audit Logs
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* System Stats */}
          <div className="stats shadow stats-vertical lg:stats-horizontal w-full">
            <div className="stat">
              <div className="stat-title">Total Users</div>
              <div className="stat-value">
                {systemStats.total_users || users.length}
              </div>
              <div className="stat-desc">Active system users</div>
            </div>
            <div className="stat">
              <div className="stat-title">Total Products</div>
              <div className="stat-value">
                {systemStats.total_products || 14}
              </div>
              <div className="stat-desc">In inventory</div>
            </div>
            <div className="stat">
              <div className="stat-title">Total Orders</div>
              <div className="stat-value">{systemStats.total_orders || 3}</div>
              <div className="stat-desc">All time</div>
            </div>
            <div className="stat">
              <div className="stat-title">Low Stock Items</div>
              <div className="stat-value text-warning">
                {systemStats.low_stock_items || 2}
              </div>
              <div className="stat-desc">Need attention</div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="card-title">User Activity</h3>
                <div className="h-64">
                  <Line
                    data={userActivityData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { position: "bottom" } },
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="card-title">System Performance</h3>
                <div className="h-64">
                  <Bar
                    data={systemPerformanceData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { position: "bottom" } },
                      scales: { y: { max: 100 } },
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h3 className="card-title">Quick Actions</h3>
              <p className="text-sm text-base-content/70 mb-4">
                Some features require additional backend implementation
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                  className="btn btn-outline"
                  onClick={() =>
                    alert(
                      "Export functionality will be implemented in a future update"
                    )
                  }
                >
                  Export Data
                </button>
                <button
                  className="btn btn-outline"
                  onClick={() =>
                    alert(
                      "System health monitoring will be implemented in a future update"
                    )
                  }
                >
                  System Health
                </button>
                <button
                  className="btn btn-outline"
                  onClick={() =>
                    alert(
                      "Cache management will be implemented in a future update"
                    )
                  }
                >
                  Clear Cache
                </button>
                <button
                  className="btn btn-outline"
                  onClick={() =>
                    alert(
                      "Maintenance mode will be implemented in a future update"
                    )
                  }
                >
                  Maintenance Mode
                </button>
              </div>
            </div>
          </div>

          {/* Backend Implementation Notice */}
          <div className="alert alert-info">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              className="stroke-current shrink-0 w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            <div>
              <h4 className="font-bold">Development Notice</h4>
              <div className="text-sm">
                Some admin features are using mock data. The following Flask
                backend endpoints need to be implemented:
                <ul className="list-disc list-inside mt-2 ml-4">
                  <li>
                    <code>/api/admin/stats</code> - System statistics
                  </li>
                  <li>
                    <code>/api/admin/backup</code> - Database backup
                  </li>
                  <li>
                    <code>/api/admin/settings</code> - System settings
                  </li>
                  <li>
                    <code>/api/admin/logs</code> - Audit logs
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === "users" && (
        <div className="overflow-x-auto">
          <table className="table table-zebra">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Last Login</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td>
                    <span
                      className={`badge ${
                        user.role === "admin"
                          ? "badge-primary"
                          : "badge-secondary"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td>{user.last_login || "Never"}</td>
                  <td>
                    <span
                      className={`badge ${
                        user.is_active ? "badge-success" : "badge-error"
                      }`}
                    >
                      {user.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <div className="join">
                      <button
                        className="btn btn-sm join-item"
                        onClick={() => {
                          setEditingUser(user);
                          setFormData(user);
                          setIsModalOpen(true);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-sm join-item btn-error"
                        onClick={() => handleDeleteUser(user.id, user.username)}
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

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h3 className="card-title">System Settings</h3>
            <div className="alert alert-warning mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="stroke-current shrink-0 h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L3.732 16c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              <span>
                Settings are currently stored locally. Server-side storage will
                be implemented soon.
              </span>
            </div>
            <form onSubmit={handleSettingsSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Company Name</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered"
                    value={systemSettings.company_name}
                    onChange={(e) =>
                      setSystemSettings({
                        ...systemSettings,
                        company_name: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">
                      Session Timeout (minutes)
                    </span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered"
                    value={systemSettings.session_timeout}
                    onChange={(e) =>
                      setSystemSettings({
                        ...systemSettings,
                        session_timeout: parseInt(e.target.value),
                      })
                    }
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Max Login Attempts</span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered"
                    value={systemSettings.max_login_attempts}
                    onChange={(e) =>
                      setSystemSettings({
                        ...systemSettings,
                        max_login_attempts: parseInt(e.target.value),
                      })
                    }
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Backup Frequency</span>
                  </label>
                  <select
                    className="select select-bordered"
                    value={systemSettings.backup_frequency}
                    onChange={(e) =>
                      setSystemSettings({
                        ...systemSettings,
                        backup_frequency: e.target.value,
                      })
                    }
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>

              <div className="form-control">
                <label className="cursor-pointer label">
                  <span className="label-text">Email Notifications</span>
                  <input
                    type="checkbox"
                    className="toggle toggle-primary"
                    checked={systemSettings.email_notifications}
                    onChange={(e) =>
                      setSystemSettings({
                        ...systemSettings,
                        email_notifications: e.target.checked,
                      })
                    }
                  />
                </label>
              </div>

              <div className="card-actions justify-end">
                <button type="submit" className="btn btn-primary">
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === "logs" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Audit Logs</h3>
            <div className="flex gap-2">
              <select className="select select-bordered select-sm">
                <option value="">All Actions</option>
                <option value="LOGIN">Login</option>
                <option value="CREATE">Create</option>
                <option value="UPDATE">Update</option>
                <option value="DELETE">Delete</option>
                <option value="SYSTEM_INIT">System Init</option>
              </select>
              <button className="btn btn-sm btn-outline">Export</button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Table</th>
                  <th>Record ID</th>
                  <th>IP Address</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length > 0 ? (
                  auditLogs.map((log, index) => (
                    <tr key={log.id || index}>
                      <td className="text-sm">
                        {log.created_at
                          ? new Date(log.created_at).toLocaleString()
                          : new Date().toLocaleString()}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="avatar placeholder">
                            <div className="bg-neutral text-neutral-content rounded-full w-8">
                              <span className="text-xs">
                                {log.user_id ? "U" : "S"}
                              </span>
                            </div>
                          </div>
                          <span className="text-sm">
                            {log.user_id ? `User ${log.user_id}` : "System"}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`badge badge-sm ${
                            log.action === "DELETE" || log.action === "ERROR"
                              ? "badge-error"
                              : log.action === "CREATE" ||
                                log.action === "SYSTEM_INIT"
                              ? "badge-success"
                              : log.action === "UPDATE"
                              ? "badge-warning"
                              : log.action === "LOGIN"
                              ? "badge-info"
                              : "badge-neutral"
                          }`}
                        >
                          {log.action || "LOGIN"}
                        </span>
                      </td>
                      <td className="text-sm">{log.table_name || "session"}</td>
                      <td className="text-sm">{log.record_id || "-"}</td>
                      <td className="text-sm">
                        {log.ip_address || "127.0.0.1"}
                      </td>
                      <td>
                        {(log.new_values || log.old_values) && (
                          <details className="dropdown">
                            <summary className="btn btn-xs btn-ghost">
                              View
                            </summary>
                            <div className="dropdown-content card card-compact w-96 p-2 shadow bg-base-100 z-10">
                              <div className="card-body">
                                <h4 className="card-title text-sm">Details</h4>
                                {log.new_values && (
                                  <div className="text-xs">
                                    <strong>New Values:</strong>
                                    <pre className="whitespace-pre-wrap bg-base-200 p-2 rounded mt-1">
                                      {typeof log.new_values === "string"
                                        ? log.new_values
                                        : JSON.stringify(
                                            JSON.parse(log.new_values),
                                            null,
                                            2
                                          )}
                                    </pre>
                                  </div>
                                )}
                                {log.old_values && (
                                  <div className="text-xs">
                                    <strong>Old Values:</strong>
                                    <pre className="whitespace-pre-wrap bg-base-200 p-2 rounded mt-1">
                                      {typeof log.old_values === "string"
                                        ? log.old_values
                                        : JSON.stringify(
                                            JSON.parse(log.old_values),
                                            null,
                                            2
                                          )}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </div>
                          </details>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center text-gray-500 py-8">
                      No audit logs found. Logs will appear here as users
                      perform actions.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {auditLogs.length > 0 && (
            <div className="flex justify-center">
              <div className="join">
                <button className="join-item btn">«</button>
                <button className="join-item btn">Page 1</button>
                <button className="join-item btn">»</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* User Modal */}
      <dialog className={`modal ${isModalOpen ? "modal-open" : ""}`}>
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">
            {editingUser ? "Edit User" : "Add New User"}
          </h3>
          <form onSubmit={handleUserSubmit} className="space-y-4">
            <div className="form-control ">
              <label className="label w-32">
                <span className="label-text">Username:</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="form-control">
              <label className="label w-32">
                <span className="label-text">Email:</span>
              </label>
              <input
                type="email"
                className="input input-bordered"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="form-control">
              <label className="label w-32">
                <span className="label-text">Role:</span>
              </label>
              <select
                className="select select-bordered"
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
                disabled={isSubmitting}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
              </select>
            </div>

            {!editingUser && (
              <div className="form-control">
                <label className="label w-32">
                  <span className="label-text">Initial Password:</span>
                </label>
                <input
                  type="password"
                  className="input input-bordered"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required={!editingUser}
                  disabled={isSubmitting}
                />
              </div>
            )}

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
    </div>
  );
}

export default Admin;
