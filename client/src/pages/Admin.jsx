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

  const fetchAdminData = async () => {
    try {
      setIsLoading(true);
      const [usersRes, statsRes, logsRes, settingsRes] = await Promise.all([
        ApiService.getUsers().catch(() => ({ users: [] })),
        ApiService.getSystemStats().catch(() => ({ stats: {} })),
        ApiService.getAuditLogs().catch(() => ({ logs: [] })),
        ApiService.getSystemSettings().catch(() => ({ settings: {} })),
      ]);

      setUsers(usersRes.users || []);
      setSystemStats(statsRes.stats || {});
      setAuditLogs(logsRes.logs || []);
      setSystemSettings({ ...systemSettings, ...(settingsRes.settings || {}) });
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
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

  const handleDeleteUser = async (userId) => {
    try {
      await ApiService.deleteUser(userId);
      await fetchAdminData();
    } catch (error) {
      setError(error.message);
    }
  };

  const handleBackup = async () => {
    try {
      await ApiService.backupDatabase();
      alert("Database backup initiated successfully");
    } catch (error) {
      setError(error.message);
    }
  };

  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    try {
      await ApiService.updateSystemSettings(systemSettings);
      alert("Settings updated successfully");
    } catch (error) {
      setError(error.message);
    }
  };

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
              setFormData({ username: "", email: "", role: "user", password: "" });
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
              <div className="stat-value">{users.length}</div>
              <div className="stat-desc">Active system users</div>
            </div>
            <div className="stat">
              <div className="stat-title">Server Uptime</div>
              <div className="stat-value">99.9%</div>
              <div className="stat-desc">Last 30 days</div>
            </div>
            <div className="stat">
              <div className="stat-title">Storage Used</div>
              <div className="stat-value">2.4 GB</div>
              <div className="stat-desc">of 10 GB available</div>
            </div>
            <div className="stat">
              <div className="stat-title">Database Size</div>
              <div className="stat-value">1.2 GB</div>
              <div className="stat-desc">↗︎ Growing</div>
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <button className="btn btn-outline">Export Data</button>
                <button className="btn btn-outline">System Health</button>
                <button className="btn btn-outline">Clear Cache</button>
                <button className="btn btn-outline">Maintenance Mode</button>
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
                        user.role === "admin" ? "badge-primary" : "badge-secondary"
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
                        onClick={() => handleDeleteUser(user.id)}
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
                    <span className="label-text">Session Timeout (minutes)</span>
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
        <div className="overflow-x-auto">
          <table className="table table-zebra">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Resource</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log, index) => (
                <tr key={index}>
                  <td>{log.timestamp || new Date().toLocaleString()}</td>
                  <td>{log.user || "System"}</td>
                  <td>
                    <span
                      className={`badge ${
                        log.action === "DELETE"
                          ? "badge-error"
                          : log.action === "CREATE"
                          ? "badge-success"
                          : "badge-info"
                      }`}
                    >
                      {log.action || "LOGIN"}
                    </span>
                  </td>
                  <td>{log.resource || "User Session"}</td>
                  <td>{log.ip_address || "127.0.0.1"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* User Modal */}
      <dialog className={`modal ${isModalOpen ? "modal-open" : ""}`}>
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">
            {editingUser ? "Edit User" : "Add New User"}
          </h3>
          <form onSubmit={handleUserSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Username</span>
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
              <label className="label">
                <span className="label-text">Email</span>
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
              <label className="label">
                <span className="label-text">Role</span>
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
              </select>
            </div>

            {!editingUser && (
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Password</span>
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