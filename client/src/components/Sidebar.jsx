import { useAuth } from "../context/AuthContext";

function Sidebar({ onNavigate, currentPage }) {
  const { isAdmin, isStaff, isUser } = useAuth();

  // Define navigation items with role-based access
  const navigationItems = [
    { 
      id: "dashboard", 
      label: "Dashboard", 
      show: true // Show to everyone
    },
    { 
      id: "inventory", 
      label: "Inventory", 
      show: isAdmin || isStaff
    },
    { 
      id: "products", 
      label: "Products", 
      show: isAdmin || isStaff
    },
    { 
      id: "vendors", 
      label: "Vendors", 
      show: isAdmin || isStaff // Only admin and staff can access vendors
    },
    { 
      id: "purchaseOrders", 
      label: "Purchase Orders", 
      show: isAdmin || isStaff // Only admin and staff can access purchase orders
    },
    { 
      id: "orders", 
      label: "Orders", 
      show: true // Show to everyone
    },
    { 
      id: "categories", 
      label: "Categories", 
      show: isAdmin || isStaff // Updated to allow staff access too
    },
    { 
      id: "reports", 
      label: "Reports", 
      show: isAdmin || isUser
    },
    { 
      id: "admin", 
      label: "Admin", 
      show: isAdmin
    },
  ];

  return (
    <ul className="menu p-4 w-80 min-h-full bg-base-100">
      {navigationItems
        .filter(item => item.show)
        .map(item => (
          <li key={item.id}>
            <a
              className={`text-lg mb-2 ${currentPage === item.id ? "active" : ""}`}
              onClick={() => onNavigate(item.id)}
            >
              {item.label}
            </a>
          </li>
        ))}
      <li className="mt-auto">
        <a
          className={`text-lg ${currentPage === "settings" ? "active" : ""}`}
          onClick={() => onNavigate("settings")}
        >
          Settings
        </a>
      </li>
    </ul>
  );
}

export default Sidebar;
