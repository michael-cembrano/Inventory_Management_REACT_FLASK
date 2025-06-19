import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import InventoryStats from "./components/InventoryStats";
import InventoryTable from "./components/InventoryTable";
import Inventory from "./pages/Inventory";
import DashboardCharts from "./components/DashboardCharts";
import Products from "./pages/Products";
import Orders from "./pages/Orders";
import Categories from "./pages/Categories";
import Reports from "./pages/Reports";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import Vendors from "./pages/Vendors";
import PurchaseOrders from "./pages/PurchaseOrders";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoadingScreen from "./components/LoadingScreen";
import RoleBasedRoute from "./components/RoleBasedRoute";

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState("dashboard");

  const DashboardContent = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [editingItem, setEditingItem] = useState(null);

    useEffect(() => {
      const timer = setTimeout(() => setIsLoading(false), 1000);
      return () => clearTimeout(timer);
    }, []);

    const handleEdit = (item) => {
      console.log("Dashboard: Edit requested for item:", item);
      setEditingItem(item);
      // You can add modal or navigation logic here
    };

    const handleRefresh = () => {
      console.log("Dashboard: Refresh requested");
      // Add refresh logic if needed
    };

    if (isLoading) return <LoadingScreen />;

    return (
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-4">Dashboard</h2>
        <InventoryStats />
        <DashboardCharts />
        <div className="mt-6">
          <h3 className="text-xl font-semibold mb-4">Recent Items</h3>
          <InventoryTable 
            onEdit={handleEdit}
            onRefresh={handleRefresh}
          />
        </div>
      </div>
    );
  };

  const DashboardLayout = () => {
    const { isAdmin, isStaff, isUser } = useAuth();

    // Check if user can access current page, otherwise redirect to dashboard
    useEffect(() => {
      const accessMap = {
        dashboard: true, // Everyone can access
        inventory: isAdmin || isStaff,
        products: isAdmin || isStaff,
        orders: true, // Everyone can access
        categories: isAdmin || isStaff,
        reports: isAdmin || isUser,
        admin: isAdmin,
        vendors: isAdmin || isStaff,
        purchaseOrders: isAdmin || isStaff,
        settings: true // Everyone can access
      };

      if (currentPage !== 'dashboard' && !accessMap[currentPage]) {
        setCurrentPage('dashboard');
      }
    }, [currentPage, isAdmin, isStaff, isUser]);

    return (
      <div className="min-h-screen bg-base-200">
        <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <div className="drawer lg:drawer-open">
          <input
            id="inventory-drawer"
            type="checkbox"
            className="drawer-toggle"
            checked={sidebarOpen}
            onChange={() => setSidebarOpen(!sidebarOpen)}
          />

          <div className="drawer-content flex flex-col">
            {currentPage === "dashboard" ? (
              <DashboardContent />
            ) : currentPage === "inventory" ? (
              isAdmin || isStaff ? <Inventory /> : <Navigate to="/" replace />
            ) : currentPage === "products" ? (
              isAdmin || isStaff ? <Products /> : <Navigate to="/" replace />
            ) : currentPage === "orders" ? (
              <Orders />
            ) : currentPage === "categories" ? (
              isAdmin || isStaff ? <Categories /> : <Navigate to="/" replace />
            ) : currentPage === "reports" ? (
              isAdmin || isUser ? <Reports /> : <Navigate to="/" replace />
            ) : currentPage === "admin" ? (
              isAdmin ? <Admin /> : <Navigate to="/" replace />
            ) : currentPage === "vendors" ? (
              isAdmin || isStaff ? <Vendors /> : <Navigate to="/" replace />
            ) : currentPage === "purchaseOrders" ? (
              isAdmin || isStaff ? <PurchaseOrders /> : <Navigate to="/" replace />
            ) : null}
          </div>

          <div className="drawer-side">
            <label htmlFor="inventory-drawer" className="drawer-overlay"></label>
            <Sidebar onNavigate={setCurrentPage} currentPage={currentPage} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={<PrivateRoute element={<DashboardLayout />} />}
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

const PrivateRoute = ({ element }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? element : <Navigate to="/login" replace />;
};

export default App;
