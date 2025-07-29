# 📦 Inventory Management System

A modern, full-stack inventory management system built with React and Flask, featuring a beautiful daisyUI interface, comprehensive analytics, and robust admin controls.

![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)
![React](https://img.shields.io/badge/React-18.2+-61DAFB.svg)
![Flask](https://img.shields.io/badge/Flask-2.3+-000000.svg)
![SQLite](https://img.shields.io/badge/SQLite-3.0+-003B57.svg)
![daisyUI](https://img.shields.io/badge/daisyUI-4.0+-5A0EF8.svg)

## 🚀 Features

### 📊 Dashboard & Analytics
- **Real-time Statistics**: Live inventory metrics, order analytics, and system performance
- **Interactive Charts**: Monthly trends, category distribution, and top products visualization
- **Export Capabilities**: CSV export for inventory, sales, orders, and analytics reports
- **Low Stock Alerts**: Automated notifications for items requiring restocking

### 📦 Inventory Management
- **Multi-UOM Support**: Handle different units of measure with conversion factors
- **Vendor Management**: Track multiple suppliers with pricing per product
- **SKU Generation**: Automatic or manual SKU assignment with prefix customization
- **Category Organization**: Hierarchical product categorization
- **Stock Tracking**: Real-time quantity updates with minimum level alerts

### 🛒 Order Processing
- **Order Lifecycle**: From creation to completion with status tracking
- **Customer Management**: Store customer details and order history
- **Inventory Integration**: Automatic stock deduction upon order completion
- **Order Analytics**: Revenue tracking and customer insights

### 🏭 Procurement & Vendors
- **Purchase Orders**: Create, manage, and track purchase orders
- **Vendor Relationships**: Maintain supplier contacts and pricing
- **Approval Workflow**: Draft → Submitted → Approved → Received
- **Delivery Tracking**: Expected delivery dates and receipt confirmation

### 👥 User Management & Security
- **Role-Based Access**: Admin, Staff, and Viewer permission levels
- **JWT Authentication**: Secure token-based authentication
- **Audit Logging**: Complete activity trail for compliance
- **Session Management**: Configurable timeout and security settings

### ⚙️ System Administration
- **Database Backups**: Automated and manual backup functionality
- **System Settings**: Configurable company info, notifications, and security
- **Performance Monitoring**: System uptime, storage usage, and API metrics
- **Maintenance Tools**: Cache management and system health checks

## 🛠️ Technology Stack

### Backend
- **Flask**: Python web framework
- **SQLAlchemy**: ORM for database operations
- **Flask-JWT-Extended**: JWT token authentication
- **SQLite**: Lightweight database (easily upgradeable to PostgreSQL/MySQL)
- **Flask-CORS**: Cross-origin resource sharing

### Frontend
- **React 18**: Modern React with hooks
- **Vite**: Fast build tool and development server
- **daisyUI**: Tailwind CSS component library
- **Chart.js**: Interactive charts and visualizations
- **Axios**: HTTP client for API communication

## 📋 Prerequisites

- **Python 3.8+**
- **Node.js 16+**
- **npm or yarn**

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd Inventory_Management_REACT_FLASK
```

### 2. Backend Setup
```bash
# Navigate to server directory
cd server

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the Flask server
python app.py
```

The Flask server will start on `http://localhost:5001`

### 3. Frontend Setup
```bash
# Navigate to client directory (in a new terminal)
cd client

# Install dependencies
npm install

# Start the development server
npm run dev
```

The React app will start on `http://localhost:5173`

## 🔑 Default Login Credentials

| Role | Username | Password | Access Level |
|------|----------|----------|--------------|
| Admin | `admin` | `admin123` | Full system access |
| Manager | `manager1` | `manager123` | Limited management access |
| Staff | `staff1` | `staff123` | Basic operations |

## 📂 Project Structure

```
Inventory_Management_REACT_FLASK/
├── client/                     # React frontend
│   ├── src/
│   │   ├── components/         # Reusable React components
│   │   ├── pages/             # Page components
│   │   ├── services/          # API service layer
│   │   ├── styles/            # CSS and styling
│   │   └── main.jsx           # Application entry point
│   ├── public/                # Static assets
│   └── package.json           # Node.js dependencies
├── server/                    # Flask backend
│   ├── models.py             # Database models
│   ├── database.py           # Database initialization
│   ├── app.py               # Flask application
│   └── requirements.txt     # Python dependencies
├── test_data.txt            # Sample data for testing
├── database_queries.txt     # SQL queries reference
└── README.md               # This file
```

## 🎯 Key Features Guide

### Dashboard Overview
- **System Metrics**: View total products, orders, users, and inventory value
- **Charts**: Interactive visualization of sales trends and category distribution
- **Quick Actions**: Direct access to common tasks

### Inventory Management
1. **Add Products**: Include name, category, quantity, pricing, and vendor info
2. **UOM Support**: Define units of measure with conversion factors
3. **Stock Tracking**: Monitor quantities with automatic low-stock alerts
4. **Vendor Integration**: Link products to suppliers with pricing

### Order Processing
1. **Create Orders**: Select products, set quantities, add customer details
2. **Status Management**: Track orders through pending → processing → completed
3. **Inventory Updates**: Automatic stock deduction upon completion
4. **Customer History**: View past orders and customer information

### Admin Features
- **User Management**: Create, edit, and manage user accounts
- **System Settings**: Configure company information and system preferences
- **Audit Logs**: Track all system activities for compliance
- **Database Backup**: Manual and scheduled backup functionality

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user info

### Inventory
- `GET /api/inventory` - List inventory items
- `POST /api/inventory` - Create new item
- `PUT /api/inventory/:id` - Update item
- `DELETE /api/inventory/:id` - Delete item

### Orders
- `GET /api/orders` - List orders
- `POST /api/orders` - Create order
- `PUT /api/orders/:id` - Update order

### Analytics
- `GET /api/analytics/dashboard-stats` - Dashboard statistics
- `GET /api/analytics/monthly-trends` - Monthly trend data
- `GET /api/analytics/low-stock` - Low stock items
- `GET /api/analytics/inventory-value` - Inventory valuation

### Admin
- `GET /api/admin/users` - List users (Admin only)
- `POST /api/admin/users` - Create user (Admin only)
- `GET /api/admin/stats` - System statistics
- `GET /api/admin/logs` - Audit logs
- `POST /api/admin/backup` - Database backup

## 🎨 UI Components

The system uses **daisyUI** components for a consistent, modern interface:

- **Navigation**: Responsive navbar with user menu
- **Cards**: Product cards with images and actions
- **Tables**: Sortable data tables with pagination
- **Modals**: Forms for adding/editing items
- **Charts**: Interactive visualizations using Chart.js
- **Alerts**: Success/error notifications
- **Badges**: Status indicators and labels

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the server directory:

```env
JWT_SECRET_KEY=your-secret-key-here
DATABASE_URL=sqlite:///inventory.db
FLASK_ENV=development
```

### System Settings
Configure through the Admin → System Settings panel:
- Company information
- Email notifications
- Security settings
- Backup preferences

## 📈 Performance Optimization

- **Database Indexing**: Optimized queries with proper indexes
- **Pagination**: Large datasets split into manageable pages
- **Caching**: Session and data caching for improved performance
- **Lazy Loading**: Components loaded on demand
- **Image Optimization**: Placeholder images for products

## 🧪 Testing

### Sample Data
The system includes comprehensive test data:
- 14 sample inventory items across 6 categories
- 3 vendors with contact information
- Sample orders and purchase orders
- User accounts with different roles

### Testing Scenarios
1. **Inventory Operations**: Add, edit, delete products
2. **Order Processing**: Create orders, update status
3. **User Management**: Create users, manage permissions
4. **Reporting**: Generate and export reports
5. **System Administration**: Backup, settings, logs

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access**: Different permission levels
- **Input Validation**: Server-side validation for all inputs
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Input sanitization
- **Audit Logging**: Complete activity trail

## 🚀 Deployment

### Production Deployment
1. **Database**: Upgrade to PostgreSQL or MySQL for production
2. **Environment**: Set `FLASK_ENV=production`
3. **Security**: Use strong JWT secrets and HTTPS
4. **Monitoring**: Implement logging and monitoring
5. **Backup**: Schedule regular database backups

### Docker Deployment (Optional)
```dockerfile
# Example Dockerfile for Flask backend
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 5001
CMD ["python", "app.py"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Common Issues

**Database Connection Error**
```bash
# Reset the database
rm server/inventory.db
python server/app.py
```

**Port Already in Use**
```bash
# Kill process on port 5001
kill -9 $(lsof -ti:5001)
# Or use a different port in app.py
```

**Dependencies Issues**
```bash
# Backend
pip install --upgrade -r requirements.txt

# Frontend  
npm install --force
```

### Getting Help
- Check the [Issues](../../issues) section for common problems
- Review the `test_data.txt` file for sample data format
- Examine `database_queries.txt` for SQL query examples

## 🎉 Acknowledgments

- **daisyUI** for the beautiful component library
- **Chart.js** for interactive visualizations
- **Flask** community for excellent documentation
- **React** team for the amazing framework

---

Made with ❤️ by [Your Name]

**Happy Inventorying! 📦✨**
