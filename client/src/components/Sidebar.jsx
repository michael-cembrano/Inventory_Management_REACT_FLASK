function Sidebar({ onNavigate, currentPage }) {
  return (
    <ul className="menu p-4 w-80 min-h-full bg-base-100">
      <li>
        <a
          className={`text-lg mb-2 ${
            currentPage === "dashboard" ? "active" : ""
          }`}
          onClick={() => onNavigate("dashboard")}
        >
          Dashboard
        </a>
      </li>
      <li>
        <a
          className={`text-lg mb-2 ${
            currentPage === "inventory" ? "active" : ""
          }`}
          onClick={() => onNavigate("inventory")}
        >
          Inventory
        </a>
      </li>
      <li>
        <a
          className={`text-lg mb-2 ${
            currentPage === "products" ? "active" : ""
          }`}
          onClick={() => onNavigate("products")}
        >
          Products
        </a>
      </li>
      <li>
        <a
          className={`text-lg mb-2 ${currentPage === "orders" ? "active" : ""}`}
          onClick={() => onNavigate("orders")}
        >
          Orders
        </a>
      </li>
      <li>
        <a
          className={`text-lg mb-2 ${
            currentPage === "categories" ? "active" : ""
          }`}
          onClick={() => onNavigate("categories")}
        >
          Categories
        </a>
      </li>
      <li>
        <a
          className={`text-lg mb-2 ${
            currentPage === "reports" ? "active" : ""
          }`}
          onClick={() => onNavigate("reports")}
        >
          Reports
        </a>
      </li>
      <li>
        <a
          className={`text-lg mb-2 ${
            currentPage === "admin" ? "active" : ""
          }`}
          onClick={() => onNavigate("admin")}
        >
          Admin
        </a>
      </li>
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
