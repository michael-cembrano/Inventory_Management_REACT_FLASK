from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required, create_access_token, get_jwt_identity, get_jwt
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import timedelta, datetime
import os
from dotenv import load_dotenv
import json

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Configuration
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'your-secret-key-change-this')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)

# Initialize extensions
jwt = JWTManager(app)
CORS(app, origins=[os.getenv('FRONTEND_URL', 'http://localhost:5173')])

# Mock database - replace with actual database
users_db = {
    'admin': {
        'id': 1,
        'username': 'admin',
        'email': 'admin@example.com',
        'password': generate_password_hash('admin123'),
        'role': 'admin',
        'is_active': True,
        'created_at': '2024-01-01T00:00:00Z',
        'last_login': None
    }
}

inventory_db = [
    {'id': 1, 'name': 'Laptop XPS 15', 'category': 'Electronics', 'quantity': 25, 'price': 1299.99, 'description': 'High-performance laptop'},
    {'id': 2, 'name': 'Wireless Mouse', 'category': 'Accessories', 'quantity': 50, 'price': 29.99, 'description': 'Ergonomic wireless mouse'},
]

categories_db = [
    {'id': 1, 'name': 'Electronics', 'products': 12, 'value': 5200, 'growth': 12, 'description': 'Electronic devices and components'},
    {'id': 2, 'name': 'Accessories', 'products': 45, 'value': 8500, 'growth': -5, 'description': 'Computer and device accessories'},
]

orders_db = [
    {'id': 1, 'customer_name': 'John Doe', 'items': [{'name': 'Laptop XPS 15', 'quantity': 1, 'price': 1299.99}], 'status': 'pending', 'total': 1299.99},
]

# System settings
system_settings = {
    'company_name': 'Inventory Management Co.',
    'email_notifications': True,
    'backup_frequency': 'daily',
    'max_login_attempts': 3,
    'session_timeout': 30
}

# Audit logs
audit_logs = [
    {
        'id': 1,
        'timestamp': '2024-01-01T12:00:00Z',
        'user': 'admin',
        'action': 'LOGIN',
        'resource': 'User Session',
        'ip_address': '127.0.0.1',
        'details': 'User logged in successfully'
    }
]

# Helper function to add audit log
def add_audit_log(action, resource, details=None):
    current_user = get_jwt_identity()
    log_entry = {
        'id': len(audit_logs) + 1,
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'user': current_user or 'System',
        'action': action,
        'resource': resource,
        'ip_address': request.remote_addr or '127.0.0.1',
        'details': details or f'{action} operation on {resource}'
    }
    audit_logs.append(log_entry)

# Helper function to check admin role
def admin_required(f):
    def decorated_function(*args, **kwargs):
        claims = get_jwt()
        if claims.get('role') != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return decorated_function

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

# Authentication routes
@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'error': 'Username and password required'}), 400
        
        user = users_db.get(username)
        if user and check_password_hash(user['password'], password):
            # Update last login
            users_db[username]['last_login'] = datetime.utcnow().isoformat() + 'Z'
            
            access_token = create_access_token(
                identity=username,
                additional_claims={'role': user['role']}
            )
            
            add_audit_log('LOGIN', 'User Session', f'User {username} logged in')
            
            return jsonify({
                'access_token': access_token,
                'user': {
                    'username': username,
                    'role': user['role'],
                    'email': user['email']
                }
            }), 200
        
        add_audit_log('LOGIN_FAILED', 'User Session', f'Failed login attempt for {username}')
        return jsonify({'error': 'Invalid credentials'}), 401
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/verify', methods=['GET'])
@jwt_required()
def verify_token():
    current_user = get_jwt_identity()
    user = users_db.get(current_user)
    if user:
        return jsonify({
            'user': {
                'username': current_user,
                'role': user['role'],
                'email': user['email']
            }
        }), 200
    return jsonify({'error': 'User not found'}), 404

# Inventory routes
@app.route('/api/inventory', methods=['GET'])
@jwt_required()
def get_inventory():
    try:
        return jsonify({'inventory': inventory_db}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/inventory', methods=['POST'])
@jwt_required()
def add_inventory_item():
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'category', 'quantity', 'price']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        item = {
            'id': len(inventory_db) + 1,
            'name': data['name'],
            'category': data['category'],
            'quantity': int(data['quantity']),
            'price': float(data['price']),
            'description': data.get('description', ''),
            'created_by': get_jwt_identity()
        }
        
        inventory_db.append(item)
        return jsonify({'message': 'Item added successfully', 'item': item}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/inventory/<int:item_id>', methods=['PUT'])
@jwt_required()
def update_inventory_item(item_id):
    try:
        data = request.get_json()
        
        for item in inventory_db:
            if item['id'] == item_id:
                item.update({
                    'name': data.get('name', item['name']),
                    'category': data.get('category', item['category']),
                    'quantity': int(data.get('quantity', item['quantity'])),
                    'price': float(data.get('price', item['price'])),
                    'description': data.get('description', item['description'])
                })
                return jsonify({'message': 'Item updated successfully', 'item': item}), 200
        
        return jsonify({'error': 'Item not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/inventory/<int:item_id>', methods=['DELETE'])
@jwt_required()
def delete_inventory_item(item_id):
    try:
        global inventory_db
        inventory_db = [item for item in inventory_db if item['id'] != item_id]
        return jsonify({'message': 'Item deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Categories routes
@app.route('/api/categories', methods=['GET'])
@jwt_required()
def get_categories():
    try:
        return jsonify({'categories': categories_db}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/categories', methods=['POST'])
@jwt_required()
def add_category():
    try:
        data = request.get_json()
        
        if 'name' not in data:
            return jsonify({'error': 'Category name is required'}), 400
        
        category = {
            'id': len(categories_db) + 1,
            'name': data['name'],
            'description': data.get('description', ''),
            'products': 0,
            'value': 0,
            'growth': 0,
            'created_by': get_jwt_identity()
        }
        
        categories_db.append(category)
        return jsonify({'message': 'Category added successfully', 'category': category}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/categories/<int:category_id>', methods=['PUT'])
@jwt_required()
def update_category(category_id):
    try:
        data = request.get_json()
        
        for category in categories_db:
            if category['id'] == category_id:
                category.update({
                    'name': data.get('name', category['name']),
                    'description': data.get('description', category['description'])
                })
                return jsonify({'message': 'Category updated successfully', 'category': category}), 200
        
        return jsonify({'error': 'Category not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/categories/<int:category_id>', methods=['DELETE'])
@jwt_required()
def delete_category(category_id):
    try:
        global categories_db
        categories_db = [cat for cat in categories_db if cat['id'] != category_id]
        return jsonify({'message': 'Category deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Orders routes
@app.route('/api/orders', methods=['GET'])
@jwt_required()
def get_orders():
    try:
        return jsonify({'orders': orders_db}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/orders', methods=['POST'])
@jwt_required()
def create_order():
    try:
        data = request.get_json()
        
        required_fields = ['items', 'customer_name']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        order = {
            'id': len(orders_db) + 1,
            'customer_name': data['customer_name'],
            'items': data['items'],
            'status': 'pending',
            'total': sum(item.get('price', 0) * item.get('quantity', 0) for item in data['items']),
            'created_by': get_jwt_identity()
        }
        
        orders_db.append(order)
        return jsonify({'message': 'Order created successfully', 'order': order}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Admin Routes
@app.route('/api/admin/users', methods=['GET'])
@jwt_required()
@admin_required
def get_users():
    try:
        users_list = []
        for username, user_data in users_db.items():
            users_list.append({
                'id': user_data['id'],
                'username': username,
                'email': user_data['email'],
                'role': user_data['role'],
                'is_active': user_data['is_active'],
                'created_at': user_data.get('created_at'),
                'last_login': user_data.get('last_login')
            })
        
        add_audit_log('READ', 'Users', 'Retrieved users list')
        return jsonify({'users': users_list}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/users', methods=['POST'])
@jwt_required()
@admin_required
def create_user():
    try:
        data = request.get_json()
        
        required_fields = ['username', 'email', 'password', 'role']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        username = data['username']
        if username in users_db:
            return jsonify({'error': 'Username already exists'}), 400
        
        user_id = max([user['id'] for user in users_db.values()]) + 1 if users_db else 1
        
        users_db[username] = {
            'id': user_id,
            'username': username,
            'email': data['email'],
            'password': generate_password_hash(data['password']),
            'role': data['role'],
            'is_active': True,
            'created_at': datetime.utcnow().isoformat() + 'Z',
            'last_login': None
        }
        
        add_audit_log('CREATE', 'User', f'Created user {username}')
        return jsonify({'message': 'User created successfully'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/users/<int:user_id>', methods=['PUT'])
@jwt_required()
@admin_required
def update_user(user_id):
    try:
        data = request.get_json()
        
        # Find user by ID
        user_to_update = None
        username_key = None
        for username, user_data in users_db.items():
            if user_data['id'] == user_id:
                user_to_update = user_data
                username_key = username
                break
        
        if not user_to_update:
            return jsonify({'error': 'User not found'}), 404
        
        # Update user data
        if 'email' in data:
            user_to_update['email'] = data['email']
        if 'role' in data:
            user_to_update['role'] = data['role']
        if 'is_active' in data:
            user_to_update['is_active'] = data['is_active']
        if 'password' in data and data['password']:
            user_to_update['password'] = generate_password_hash(data['password'])
        
        add_audit_log('UPDATE', 'User', f'Updated user {username_key}')
        return jsonify({'message': 'User updated successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_user(user_id):
    try:
        current_user = get_jwt_identity()
        
        # Find user by ID
        user_to_delete = None
        username_key = None
        for username, user_data in users_db.items():
            if user_data['id'] == user_id:
                user_to_delete = user_data
                username_key = username
                break
        
        if not user_to_delete:
            return jsonify({'error': 'User not found'}), 404
        
        # Prevent self-deletion
        if username_key == current_user:
            return jsonify({'error': 'Cannot delete your own account'}), 400
        
        del users_db[username_key]
        
        add_audit_log('DELETE', 'User', f'Deleted user {username_key}')
        return jsonify({'message': 'User deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/system-stats', methods=['GET'])
@jwt_required()
@admin_required
def get_system_stats():
    try:
        stats = {
            'total_users': len(users_db),
            'active_users': len([u for u in users_db.values() if u['is_active']]),
            'total_items': len(inventory_db),
            'total_categories': len(categories_db),
            'total_orders': len(orders_db),
            'low_stock_items': len([item for item in inventory_db if item['quantity'] < 10]),
            'server_uptime': '99.9%',
            'storage_used': '2.4 GB',
            'database_size': '1.2 GB'
        }
        
        add_audit_log('READ', 'System Stats', 'Retrieved system statistics')
        return jsonify({'stats': stats}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/settings', methods=['GET'])
@jwt_required()
@admin_required
def get_system_settings():
    try:
        add_audit_log('READ', 'System Settings', 'Retrieved system settings')
        return jsonify({'settings': system_settings}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/settings', methods=['PUT'])
@jwt_required()
@admin_required
def update_system_settings():
    try:
        data = request.get_json()
        
        # Update settings
        for key, value in data.items():
            if key in system_settings:
                system_settings[key] = value
        
        add_audit_log('UPDATE', 'System Settings', 'Updated system settings')
        return jsonify({'message': 'Settings updated successfully', 'settings': system_settings}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/audit-logs', methods=['GET'])
@jwt_required()
@admin_required
def get_audit_logs():
    try:
        # Return last 100 logs, sorted by timestamp (newest first)
        sorted_logs = sorted(audit_logs, key=lambda x: x['timestamp'], reverse=True)[:100]
        
        add_audit_log('READ', 'Audit Logs', 'Retrieved audit logs')
        return jsonify({'logs': sorted_logs}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/backup', methods=['POST'])
@jwt_required()
@admin_required
def backup_database():
    try:
        # Create a backup of the current data
        backup_data = {
            'users': users_db,
            'inventory': inventory_db,
            'categories': categories_db,
            'orders': orders_db,
            'settings': system_settings,
            'audit_logs': audit_logs,
            'backup_timestamp': datetime.utcnow().isoformat() + 'Z'
        }
        
        # Save backup to file
        backup_filename = f"backup_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
        backup_path = os.path.join(os.path.dirname(__file__), 'backups', backup_filename)
        
        # Create backups directory if it doesn't exist
        os.makedirs(os.path.dirname(backup_path), exist_ok=True)
        
        with open(backup_path, 'w') as f:
            json.dump(backup_data, f, indent=2)
        
        add_audit_log('CREATE', 'Database Backup', f'Created backup: {backup_filename}')
        return jsonify({
            'message': 'Database backup created successfully',
            'backup_file': backup_filename
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Dashboard stats
@app.route('/api/dashboard/stats', methods=['GET'])
@jwt_required()
def get_dashboard_stats():
    try:
        stats = {
            'total_items': len(inventory_db),
            'total_categories': len(categories_db),
            'total_orders': len(orders_db),
            'low_stock_items': len([item for item in inventory_db if item['quantity'] < 10])
        }
        return jsonify({'stats': stats}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001)
