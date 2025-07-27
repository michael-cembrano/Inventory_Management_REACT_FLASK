from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
from werkzeug.security import check_password_hash
import shutil
import sqlite3

# Import database components
from models import db, User, Category, Inventory, Order, OrderItem, AuditLog, Vendor, PurchaseOrder, PurchaseOrderItem, InventoryVendor
from database import init_database, get_system_stats
from decimal import Decimal
import json

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Configuration
app.config['SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'dev-secret-key')
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'dev-secret-key')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)

# SQLite Database Configuration
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(basedir, "inventory.db")}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize extensions
CORS(app, 
     origins=['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'], 
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
     allow_headers=['Content-Type', 'Authorization'],
     supports_credentials=True)
jwt = JWTManager(app)
db.init_app(app)

# Initialize database with sample data
with app.app_context():
    init_database(app)

def log_action(action, table_name=None, record_id=None, old_values=None, new_values=None, user_id=None):
    """Log user actions for audit trail"""
    try:
        # Use provided user_id or try to get from JWT context
        current_user_id = user_id
        if not current_user_id:
            try:
                jwt_identity = get_jwt_identity()
                if jwt_identity:
                    current_user_id = int(jwt_identity)
            except:
                # If we can't get JWT identity (like during login or initialization), that's ok
                pass
            
        ip_address = request.remote_addr if request else '127.0.0.1'
        
        audit_log = AuditLog(
            user_id=current_user_id,
            action=action,
            table_name=table_name,
            record_id=record_id,
            old_values=json.dumps(old_values) if old_values else None,
            new_values=json.dumps(new_values) if new_values else None,
            ip_address=ip_address
        )
        db.session.add(audit_log)
        db.session.commit()
    except Exception as e:
        print(f"Error logging action: {e}")

# Authentication Routes
@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'error': 'Username and password required'}), 400
        
        user = User.query.filter_by(username=username, is_active=True).first()
        
        if user and user.check_password(password):
            # Update last login
            user.last_login = datetime.utcnow()
            db.session.commit()
            
            access_token = create_access_token(identity=str(user.id))
            
            # Log successful login
            log_action('LOGIN', 'users', user.id)
            
            return jsonify({
                'access_token': access_token,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'role': user.role
                }
            })
        else:
            return jsonify({'error': 'Invalid credentials'}), 401
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def get_current_user():
    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        return jsonify({'user': user.to_dict()})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Category Routes
@app.route('/api/categories', methods=['GET'])
@jwt_required()
def get_categories():
    try:
        categories = Category.query.all()
        return jsonify({'categories': [cat.to_dict() for cat in categories]})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/categories', methods=['POST'])
@jwt_required()
def create_category():
    try:
        data = request.get_json()
        name = data.get('name')
        description = data.get('description', '')
        
        if not name:
            return jsonify({'error': 'Category name is required'}), 400
        
        # Check if category already exists
        existing = Category.query.filter_by(name=name).first()
        if existing:
            return jsonify({'error': 'Category already exists'}), 400
        
        category = Category(name=name, description=description)
        db.session.add(category)
        db.session.commit()
        
        log_action('CREATE', 'categories', category.id, None, category.to_dict())
        
        return jsonify({'category': category.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/categories/<int:category_id>', methods=['PUT'])
@jwt_required()
def update_category(category_id):
    try:
        category = Category.query.get_or_404(category_id)
        old_values = category.to_dict()
        
        data = request.get_json()
        category.name = data.get('name', category.name)
        category.description = data.get('description', category.description)
        category.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        log_action('UPDATE', 'categories', category.id, old_values, category.to_dict())
        
        return jsonify({'category': category.to_dict()})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/categories/<int:category_id>', methods=['DELETE'])
@jwt_required()
def delete_category(category_id):
    try:
        category = Category.query.get_or_404(category_id)
        old_values = category.to_dict()
        
        # Check if category has inventory items
        if category.inventory_items:
            return jsonify({'error': 'Cannot delete category with existing inventory items'}), 400
        
        db.session.delete(category)
        db.session.commit()
        
        log_action('DELETE', 'categories', category_id, old_values, None)
        
        return jsonify({'message': 'Category deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Inventory Routes
@app.route('/api/inventory', methods=['GET'])
@jwt_required()
def get_inventory():
    try:
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search', '')
        category_id = request.args.get('category_id', type=int)
        status = request.args.get('status', '')
        
        # Build query
        query = Inventory.query.filter_by(is_active=True)
        
        if search:
            # Use like instead of contains for better SQLite compatibility
            query = query.filter(Inventory.name.like(f'%{search}%'))
        
        if category_id:
            query = query.filter_by(category_id=category_id)
        
        if status == 'low_stock':
            query = query.filter(Inventory.quantity <= Inventory.min_stock_level)
        elif status == 'out_of_stock':
            query = query.filter_by(quantity=0)
        
        # Execute query with pagination - using different approach for SQLite
        try:
            inventory = query.order_by(Inventory.name).paginate(
                page=page, per_page=per_page, error_out=False
            )
            
            return jsonify({
                'inventory': [item.to_dict() for item in inventory.items],
                'pagination': {
                    'page': page,
                    'pages': inventory.pages,
                    'per_page': per_page,
                    'total': inventory.total,
                    'has_next': inventory.has_next,
                    'has_prev': inventory.has_prev
                }
            })
        except Exception as paginate_error:
            # Fallback: manual pagination for older SQLAlchemy versions
            total = query.count()
            items = query.order_by(Inventory.name).offset((page - 1) * per_page).limit(per_page).all()
            
            return jsonify({
                'inventory': [item.to_dict() for item in items],
                'pagination': {
                    'page': page,
                    'pages': (total + per_page - 1) // per_page,
                    'per_page': per_page,
                    'total': total,
                    'has_next': page * per_page < total,
                    'has_prev': page > 1
                }
            })
            
    except Exception as e:
        print(f"Inventory GET error: {str(e)}")  # Debug logging
        return jsonify({'error': str(e)}), 500

@app.route('/api/inventory', methods=['POST'])
@jwt_required()
def create_inventory():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate required fields
        required_fields = ['name', 'quantity', 'price_per_uom', 'unit_of_measure']
        for field in required_fields:
            if field not in data or data[field] == '' or data[field] is None:
                return jsonify({'error': f'{field} is required'}), 400
        
        # Validate data types
        try:
            quantity = int(data['quantity'])
            price_per_uom = float(data['price_per_uom'])
            conversion_factor = float(data.get('conversion_factor', 1))
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid quantity, price, or conversion factor format'}), 400
        
        if quantity < 0:
            return jsonify({'error': 'Quantity cannot be negative'}), 400
        
        if price_per_uom < 0:
            return jsonify({'error': 'Price cannot be negative'}), 400
        
        # Calculate total price
        total_price = price_per_uom * quantity
        
        # Validate category if provided
        category_id = data.get('category_id')
        if category_id:
            try:
                category_id = int(category_id)
                category = Category.query.get(category_id)
                if not category:
                    return jsonify({'error': 'Invalid category ID'}), 400
            except (ValueError, TypeError):
                return jsonify({'error': 'Invalid category ID format'}), 400
        
        # Check if SKU already exists
        sku = data.get('sku')
        if sku and Inventory.query.filter_by(sku=sku).first():
            return jsonify({'error': 'SKU already exists'}), 400
        
        inventory = Inventory(
            name=data['name'].strip(),
            category_id=category_id,
            quantity=quantity,
            price=Decimal(str(total_price)),
            price_per_uom=Decimal(str(price_per_uom)),
            unit_of_measure=data['unit_of_measure'].strip(),
            conversion_factor=Decimal(str(conversion_factor)),
            base_unit=data.get('base_unit', data['unit_of_measure']).strip(),
            description=data.get('description', '').strip(),
            sku=sku.strip() if sku else None,
            min_stock_level=data.get('min_stock_level', 5)
        )
        
        db.session.add(inventory)
        db.session.flush()  # Get inventory ID
        
        # Process vendor associations if provided
        if 'vendors' in data and isinstance(data['vendors'], list):
            for vendor_data in data['vendors']:
                if vendor_data.get('vendor_id') and vendor_data.get('unit_price'):
                    try:
                        vendor_id = int(vendor_data['vendor_id'])
                        unit_price = Decimal(str(vendor_data['unit_price']))
                        
                        # Verify the vendor exists
                        vendor = Vendor.query.get(vendor_id)
                        if not vendor:
                            continue  # Skip this invalid vendor
                            
                        vendor_assoc = InventoryVendor(
                            inventory_id=inventory.id,
                            vendor_id=vendor_id,
                            unit_price=unit_price,
                            is_preferred=vendor_data.get('is_preferred', False)
                        )
                        db.session.add(vendor_assoc)
                    except (ValueError, TypeError) as e:
                        print(f"Error processing vendor data: {e}")
                        # Continue with other vendors
        
        db.session.commit()
        
        log_action('CREATE', 'inventory', inventory.id, None, inventory.to_dict())
        
        return jsonify({'inventory': inventory.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        print(f"Create inventory error: {str(e)}")  # Debug logging
        return jsonify({'error': str(e)}), 500

@app.route('/api/inventory/<int:inventory_id>', methods=['PUT'])
@jwt_required()
def update_inventory(inventory_id):
    try:
        inventory = Inventory.query.get_or_404(inventory_id)
        old_values = inventory.to_dict()
        
        data = request.get_json()
        
        # Check SKU uniqueness if being updated
        new_sku = data.get('sku')
        if new_sku and new_sku != inventory.sku:
            existing = Inventory.query.filter_by(sku=new_sku).first()
            if existing:
                return jsonify({'error': 'SKU already exists'}), 400
        
        # Update fields
        inventory.name = data.get('name', inventory.name)
        inventory.category_id = data.get('category_id', inventory.category_id)
        inventory.quantity = data.get('quantity', inventory.quantity)
        
        # Update UOM fields
        if 'price_per_uom' in data:
            inventory.price_per_uom = Decimal(str(data['price_per_uom']))
            # Recalculate total price
            inventory.price = inventory.price_per_uom * inventory.quantity
        
        inventory.unit_of_measure = data.get('unit_of_measure', inventory.unit_of_measure)
        inventory.conversion_factor = Decimal(str(data.get('conversion_factor', inventory.conversion_factor)))
        inventory.base_unit = data.get('base_unit', inventory.base_unit)
        inventory.description = data.get('description', inventory.description)
        inventory.sku = new_sku or inventory.sku
        inventory.min_stock_level = data.get('min_stock_level', inventory.min_stock_level)
        inventory.updated_at = datetime.utcnow()
        
        # Update vendor associations if provided
        if 'vendors' in data and isinstance(data['vendors'], list):
            # Delete existing vendor associations
            InventoryVendor.query.filter_by(inventory_id=inventory_id).delete()
            
            # Create new vendor associations
            for vendor_data in data['vendors']:
                if vendor_data.get('vendor_id') and vendor_data.get('unit_price'):
                    try:
                        vendor_id = int(vendor_data['vendor_id'])
                        unit_price = Decimal(str(vendor_data['unit_price']))
                        
                        # Verify the vendor exists
                        vendor = Vendor.query.get(vendor_id)
                        if not vendor:
                            continue
                            
                        vendor_assoc = InventoryVendor(
                            inventory_id=inventory_id,
                            vendor_id=vendor_id,
                            unit_price=unit_price,
                            is_preferred=vendor_data.get('is_preferred', False)
                        )
                        db.session.add(vendor_assoc)
                    except (ValueError, TypeError) as e:
                        print(f"Error processing vendor data: {e}")
        
        db.session.commit()
        
        log_action('UPDATE', 'inventory', inventory.id, old_values, inventory.to_dict())
        
        return jsonify({'inventory': inventory.to_dict()})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/inventory/<int:inventory_id>', methods=['DELETE'])
@jwt_required()
def delete_inventory(inventory_id):
    try:
        inventory = Inventory.query.get_or_404(inventory_id)
        old_values = inventory.to_dict()
        
        # Soft delete by setting is_active to False
        inventory.is_active = False
        inventory.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        log_action('DELETE', 'inventory', inventory.id, old_values, inventory.to_dict())
        
        return jsonify({'message': 'Inventory item deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Debug endpoint to test what data is being sent
@app.route('/api/debug/inventory', methods=['POST'])
@jwt_required()
def debug_inventory():
    try:
        data = request.get_json()
        print(f"DEBUG - Received data: {data}")
        print(f"DEBUG - Data type: {type(data)}")
        if data:
            for key, value in data.items():
                print(f"DEBUG - {key}: {value} (type: {type(value)})")
        
        return jsonify({
            'received_data': data,
            'data_keys': list(data.keys()) if data else [],
            'message': 'Debug successful'
        })
    except Exception as e:
        print(f"DEBUG - Error: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Test endpoint for CORS debugging
@app.route('/api/test-cors', methods=['GET', 'POST'])
def test_cors():
    return jsonify({
        'message': 'CORS test successful',
        'method': request.method,
        'origin': request.headers.get('Origin'),
        'timestamp': datetime.utcnow().isoformat()
    })

# Order Routes
@app.route('/api/orders', methods=['GET'])
@jwt_required()
def get_orders():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status = request.args.get('status', '')
        
        query = Order.query
        
        if status:
            query = query.filter_by(status=status)
        
        orders = query.order_by(Order.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'orders': [order.to_dict() for order in orders.items],
            'pagination': {
                'page': page,
                'pages': orders.pages,
                'per_page': per_page,
                'total': orders.total,
                'has_next': orders.has_next,
                'has_prev': orders.has_prev
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/orders', methods=['POST'])
@jwt_required()
def create_order():
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['customer_name', 'items']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        if not data['items']:
            return jsonify({'error': 'Order must have at least one item'}), 400
        
        # Calculate total and validate inventory
        total = Decimal('0')
        items_data = []
        
        for item in data['items']:
            inventory = Inventory.query.get(item['inventory_id'])
            if not inventory or not inventory.is_active:
                return jsonify({'error': f'Invalid inventory item: {item["inventory_id"]}'}), 400
            
            if inventory.quantity < item['quantity']:
                return jsonify({'error': f'Insufficient stock for {inventory.name}'}), 400
            
            # Use price_per_uom for calculations
            unit_price = Decimal(str(item.get('price_per_uom', inventory.price_per_uom)))
            quantity = item['quantity']
            total_price = unit_price * quantity
            total += total_price
            
            items_data.append({
                'inventory_id': inventory.id,
                'quantity': quantity,
                'unit_price': inventory.price_per_uom,  # Store as legacy unit_price
                'total_price': total_price,
                'unit_of_measure': inventory.unit_of_measure,
                'price_per_uom': unit_price
            })
        
        # Create order
        order = Order(
            customer_name=data['customer_name'],
            customer_email=data.get('customer_email'),
            customer_phone=data.get('customer_phone'),
            status=data.get('status', 'pending'),
            total=total
        )
        
        db.session.add(order)
        db.session.flush()  # Get order ID
        
        # Create order items and update inventory
        for item_data in items_data:
            item_data['order_id'] = order.id
            order_item = OrderItem(**item_data)
            db.session.add(order_item)
            
            # Update inventory quantity
            inventory = Inventory.query.get(item_data['inventory_id'])
            inventory.quantity -= item_data['quantity']
            inventory.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        log_action('CREATE', 'orders', order.id, None, order.to_dict())
        
        return jsonify({'order': order.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/orders/<int:order_id>', methods=['PUT'])
@jwt_required()
def update_order(order_id):
    try:
        order = Order.query.get_or_404(order_id)
        old_values = order.to_dict()
        
        data = request.get_json()
        
        # Update basic order info
        order.customer_name = data.get('customer_name', order.customer_name)
        order.customer_email = data.get('customer_email', order.customer_email)
        order.customer_phone = data.get('customer_phone', order.customer_phone)
        order.status = data.get('status', order.status)
        order.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        log_action('UPDATE', 'orders', order.id, old_values, order.to_dict())
        
        return jsonify({'order': order.to_dict()})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Admin Routes
@app.route('/api/admin/system-stats', methods=['GET'])
@jwt_required()
def admin_system_stats():
    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        
        if user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        stats = get_system_stats()
        return jsonify(stats)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/stats', methods=['GET'])
@jwt_required()
def admin_stats():
    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        
        if user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        # Get comprehensive system statistics
        stats = get_system_stats()
        
        # Add additional admin-specific stats
        # stats.update({
        #     'database_size': get_database_size(),
        #     'system_uptime': get_system_uptime(),
        #     'api_performance': get_api_performance_stats(),
        #     'storage_usage': get_storage_usage(),
        #     'recent_activity': get_recent_system_activity()
        # })
        
        return jsonify(stats)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/settings', methods=['GET'])
@jwt_required()
def admin_get_settings():
    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        
        if user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        # For now, return default settings
        # In a production environment, these would be stored in a database table
        settings = {
            'company_name': 'TechFlow Inventory Solutions',
            'company_address': '123 Business Ave, Suite 100, Tech City, TC 12345',
            'company_phone': '+1-555-INVENTORY',
            'company_email': 'support@techflow-inventory.com',
            'currency': 'USD',
            'timezone': 'America/New_York',
            'email_notifications': True,
            'low_stock_alerts': True,
            'order_notifications': True,
            'system_alerts': True,
            'max_login_attempts': 3,
            'account_lockout_duration': 30,
            'session_timeout': 30,
            'password_min_length': 8,
            'require_uppercase': True,
            'require_numbers': True,
            'require_special_characters': True,
            'two_factor_authentication': False,
            'backup_frequency': 'daily',
            'backup_time': '02:00',
            'backup_retention_days': 30,
            'auto_backup_enabled': True,
            'low_stock_threshold': 10,
            'auto_reorder': False,
            'default_category': 'Miscellaneous',
            'sku_auto_generation': True,
            'sku_prefix': 'INV',
            'track_serial_numbers': False
        }
        
        return jsonify(settings)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/settings', methods=['PUT'])
@jwt_required()
def admin_update_settings():
    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        
        if user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No settings data provided'}), 400
        
        # Validate settings data
        valid_settings = {
            'company_name', 'company_address', 'company_phone', 'company_email',
            'currency', 'timezone', 'email_notifications', 'low_stock_alerts',
            'order_notifications', 'system_alerts', 'max_login_attempts',
            'account_lockout_duration', 'session_timeout', 'password_min_length',
            'require_uppercase', 'require_numbers', 'require_special_characters',
            'two_factor_authentication', 'backup_frequency', 'backup_time',
            'backup_retention_days', 'auto_backup_enabled', 'low_stock_threshold',
            'auto_reorder', 'default_category', 'sku_auto_generation',
            'sku_prefix', 'track_serial_numbers'
        }
        
        # Filter out invalid settings
        filtered_settings = {k: v for k, v in data.items() if k in valid_settings}
        
        # In a production environment, you would save these to a database table
        # For now, we'll just log the action and return success
        log_action('UPDATE_SETTINGS', 'system_settings', None, None, {
            'updated_settings': list(filtered_settings.keys()),
            'updated_by': current_user_id,
            'timestamp': datetime.utcnow().isoformat()
        })
        
        return jsonify({
            'message': 'Settings updated successfully',
            'updated_settings': filtered_settings
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/logs', methods=['GET'])
@jwt_required()
def admin_logs():
    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        
        if user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        action_filter = request.args.get('action', '')
        user_filter = request.args.get('user_id', type=int)
        table_filter = request.args.get('table', '')
        
        # Build query
        query = AuditLog.query
        
        if action_filter:
            query = query.filter(AuditLog.action.ilike(f'%{action_filter}%'))
        
        if user_filter:
            query = query.filter_by(user_id=user_filter)
        
        if table_filter:
            query = query.filter(AuditLog.table_name.ilike(f'%{table_filter}%'))
        
        # Execute query with pagination
        try:
            logs = query.order_by(AuditLog.created_at.desc()).paginate(
                page=page, per_page=per_page, error_out=False
            )
            
            return jsonify({
                'logs': [log.to_dict() for log in logs.items],
                'pagination': {
                    'page': page,
                    'pages': logs.pages,
                    'per_page': per_page,
                    'total': logs.total,
                    'has_next': logs.has_next,
                    'has_prev': logs.has_prev
                },
                'filters': {
                    'action': action_filter,
                    'user_id': user_filter,
                    'table': table_filter
                }
            })
        except Exception as paginate_error:
            # Fallback: manual pagination
            total = query.count()
            items = query.order_by(AuditLog.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
            
            return jsonify({
                'logs': [log.to_dict() for log in items],
                'pagination': {
                    'page': page,
                    'pages': (total + per_page - 1) // per_page,
                    'per_page': per_page,
                    'total': total,
                    'has_next': page * per_page < total,
                    'has_prev': page > 1
                },
                'filters': {
                    'action': action_filter,
                    'user_id': user_filter,
                    'table': table_filter
                }
            })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/backup', methods=['POST'])
@jwt_required()
def admin_backup_database():
    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        
        if user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        # Generate backup filename with timestamp
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        backup_filename = f'inventory_backup_{timestamp}.db'
        
        # Get database file path
        basedir = os.path.abspath(os.path.dirname(__file__))
        source_db_path = os.path.join(basedir, 'inventory.db')
        backup_db_path = os.path.join(basedir, 'backups', backup_filename)
        
        # Create backups directory if it doesn't exist
        backup_dir = os.path.join(basedir, 'backups')
        os.makedirs(backup_dir, exist_ok=True)
        
        # Check if source database exists
        if not os.path.exists(source_db_path):
            return jsonify({'error': 'Source database file not found'}), 404
        
        try:
            # Method 1: Use SQLite backup API (preferred for active databases)
            source_conn = sqlite3.connect(source_db_path)
            backup_conn = sqlite3.connect(backup_db_path)
            
            # Perform the backup
            source_conn.backup(backup_conn)
            
            # Close connections
            backup_conn.close()
            source_conn.close()
            
            # Get file size for confirmation
            backup_size = os.path.getsize(backup_db_path)
            
            # Log the backup action
            log_action('BACKUP', 'database', None, None, {
                'backup_file': backup_filename,
                'backup_size': backup_size,
                'timestamp': timestamp
            })
            
            return jsonify({
                'message': 'Database backup created successfully',
                'backup_file': backup_filename,
                'backup_path': backup_db_path,
                'backup_size': backup_size,
                'timestamp': timestamp
            }), 200
            
        except sqlite3.Error as e:
            # Fallback: Use file copy if SQLite backup fails
            try:
                shutil.copy2(source_db_path, backup_db_path)
                backup_size = os.path.getsize(backup_db_path)
                
                log_action('BACKUP', 'database', None, None, {
                    'backup_file': backup_filename,
                    'backup_size': backup_size,
                    'timestamp': timestamp,
                    'method': 'file_copy'
                })
                
                return jsonify({
                    'message': 'Database backup created successfully (file copy method)',
                    'backup_file': backup_filename,
                    'backup_path': backup_db_path,
                    'backup_size': backup_size,
                    'timestamp': timestamp
                }), 200
                
            except Exception as copy_error:
                return jsonify({'error': f'Backup failed: {str(copy_error)}'}), 500
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/backups', methods=['GET'])
@jwt_required()
def admin_list_backups():
    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        
        if user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        # Get backups directory
        basedir = os.path.abspath(os.path.dirname(__file__))
        backup_dir = os.path.join(basedir, 'backups')
        
        backups = []
        
        if os.path.exists(backup_dir):
            for filename in os.listdir(backup_dir):
                if filename.endswith('.db') and filename.startswith('inventory_backup_'):
                    file_path = os.path.join(backup_dir, filename)
                    file_stats = os.stat(file_path)
                    
                    backups.append({
                        'filename': filename,
                        'size': file_stats.st_size,
                        'created_at': datetime.fromtimestamp(file_stats.st_ctime).isoformat(),
                        'modified_at': datetime.fromtimestamp(file_stats.st_mtime).isoformat()
                    })
        
        # Sort by creation date (newest first)
        backups.sort(key=lambda x: x['created_at'], reverse=True)
        
        return jsonify({
            'backups': backups,
            'total': len(backups)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/backups/<filename>', methods=['DELETE'])
@jwt_required()
def admin_delete_backup(filename):
    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        
        if user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        # Validate filename for security
        if not filename.endswith('.db') or not filename.startswith('inventory_backup_'):
            return jsonify({'error': 'Invalid backup filename'}), 400
        
        # Get backup file path
        basedir = os.path.abspath(os.path.dirname(__file__))
        backup_path = os.path.join(basedir, 'backups', filename)
        
        # Check if file exists
        if not os.path.exists(backup_path):
            return jsonify({'error': 'Backup file not found'}), 404
        
        # Delete the backup file
        os.remove(backup_path)
        
        # Log the deletion
        log_action('DELETE_BACKUP', 'database', None, None, {
            'deleted_file': filename
        })
        
        return jsonify({'message': f'Backup {filename} deleted successfully'})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Analytics Routes
@app.route('/api/analytics/low-stock', methods=['GET'])
@jwt_required()
def get_low_stock_items():
    try:
        items = Inventory.query.filter(
            Inventory.quantity <= Inventory.min_stock_level,
            Inventory.is_active == True
        ).all()
        
        return jsonify({'low_stock_items': [item.to_dict() for item in items]})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analytics/inventory-value', methods=['GET'])
@jwt_required()
def get_inventory_value():
    try:
        # Total inventory value
        total_value = db.session.query(
            db.func.sum(Inventory.quantity * Inventory.price)
        ).filter_by(is_active=True).scalar() or 0
        
        # Value by category
        category_values = db.session.query(
            Category.name,
            db.func.sum(Inventory.quantity * Inventory.price).label('value')
        ).join(Inventory).filter(Inventory.is_active == True).group_by(Category.id).all()
        
        return jsonify({
            'total_value': float(total_value),
            'category_breakdown': [
                {'category': name, 'value': float(value or 0)} 
                for name, value in category_values
            ]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Add new analytics endpoints
@app.route('/api/analytics/dashboard-stats', methods=['GET'])
@jwt_required()
def get_dashboard_stats():
    try:
        # Basic inventory stats
        total_products = Inventory.query.filter_by(is_active=True).count()
        low_stock_count = Inventory.query.filter(
            Inventory.quantity <= Inventory.min_stock_level,
            Inventory.is_active == True
        ).count()
        out_of_stock_count = Inventory.query.filter_by(quantity=0, is_active=True).count()
        
        # Calculate total inventory value
        total_inventory_value = db.session.query(
            db.func.sum(Inventory.quantity * Inventory.price)
        ).filter_by(is_active=True).scalar() or 0
        
        # Order stats
        total_orders = Order.query.count()
        pending_orders = Order.query.filter_by(status='pending').count()
        completed_orders = Order.query.filter(
            Order.status.in_(['delivered', 'completed'])
        ).count()
        
        # Calculate total revenue from completed orders
        total_revenue = db.session.query(
            db.func.sum(Order.total)
        ).filter(Order.status.in_(['delivered', 'completed'])).scalar() or 0
        
        # Average order value
        avg_order_value = float(total_revenue) / max(completed_orders, 1)
        
        # Recent orders (last 7 days)
        week_ago = datetime.utcnow() - timedelta(days=7)
        recent_orders = Order.query.filter(Order.created_at >= week_ago).count()
        
        return jsonify({
            'inventory': {
                'total_products': total_products,
                'low_stock_items': low_stock_count,
                'out_of_stock_items': out_of_stock_count,
                'total_value': float(total_inventory_value)
            },
            'orders': {
                'total_orders': total_orders,
                'pending_orders': pending_orders,
                'completed_orders': completed_orders,
                'recent_orders': recent_orders,
                'total_revenue': float(total_revenue),
                'avg_order_value': avg_order_value
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analytics/monthly-trends', methods=['GET'])
@jwt_required()
def get_monthly_trends():
    try:
        # Get last 6 months of data
        months_data = []
        today = datetime.utcnow()
        
        for i in range(5, -1, -1):  # Last 6 months
            month_start = datetime(today.year, today.month - i, 1)
            if month_start.month <= 0:
                month_start = datetime(month_start.year - 1, month_start.month + 12, 1)
            
            month_end = datetime(month_start.year, month_start.month + 1, 1) - timedelta(days=1)
            if month_start.month == 12:
                month_end = datetime(month_start.year + 1, 1, 1) - timedelta(days=1)
            
            # Count orders and revenue for this month
            orders_count = Order.query.filter(
                Order.created_at >= month_start,
                Order.created_at <= month_end
            ).count()
            
            revenue = db.session.query(
                db.func.sum(Order.total)
            ).filter(
                Order.created_at >= month_start,
                Order.created_at <= month_end,
                Order.status.in_(['delivered', 'completed'])
            ).scalar() or 0
            
            months_data.append({
                'month': month_start.strftime('%b %Y'),
                'month_short': month_start.strftime('%b'),
                'orders': orders_count,
                'revenue': float(revenue)
            })
        
        return jsonify({'monthly_data': months_data})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Vendor Routes
@app.route('/api/vendors', methods=['GET'])
@jwt_required()
def get_vendors():
    try:
        # Check if user is admin or staff
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        
        if user.role not in ['admin', 'staff']:
            return jsonify({'error': 'Access denied - must be admin or staff'}), 403
        
        vendors = Vendor.query.filter_by(is_active=True).all()
        return jsonify({'vendors': [vendor.to_dict() for vendor in vendors]})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/vendors/<int:vendor_id>', methods=['GET'])
@jwt_required()
def get_vendor(vendor_id):
    try:
        # Check if user is admin or staff
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        
        if user.role not in ['admin', 'staff']:
            return jsonify({'error': 'Access denied - must be admin or staff'}), 403
        
        vendor = Vendor.query.get_or_404(vendor_id)
        return jsonify({'vendor': vendor.to_dict()})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/vendors', methods=['POST'])
@jwt_required()
def create_vendor():
    try:
        # Check if user is admin or staff
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        
        if user.role not in ['admin', 'staff']:
            return jsonify({'error': 'Access denied - must be admin or staff'}), 403
        
        data = request.get_json()
        
        if not data.get('name'):
            return jsonify({'error': 'Vendor name is required'}), 400
        
        vendor = Vendor(
            name=data['name'].strip(),
            contact_person=data.get('contact_person', '').strip(),
            email=data.get('email', '').strip(),
            phone=data.get('phone', '').strip(),
            address=data.get('address', '').strip()
        )
        
        db.session.add(vendor)
        db.session.commit()
        
        log_action('CREATE', 'vendors', vendor.id, None, vendor.to_dict())
        
        return jsonify({'vendor': vendor.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/vendors/<int:vendor_id>', methods=['PUT'])
@jwt_required()
def update_vendor(vendor_id):
    try:
        # Check if user is admin or staff
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        
        if user.role not in ['admin', 'staff']:
            return jsonify({'error': 'Access denied - must be admin or staff'}), 403
        
        vendor = Vendor.query.get_or_404(vendor_id)
        old_values = vendor.to_dict()
        
        data = request.get_json()
        
        vendor.name = data.get('name', vendor.name).strip()
        vendor.contact_person = data.get('contact_person', vendor.contact_person).strip()
        vendor.email = data.get('email', vendor.email).strip()
        vendor.phone = data.get('phone', vendor.phone).strip()
        vendor.address = data.get('address', vendor.address).strip()
        vendor.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        log_action('UPDATE', 'vendors', vendor.id, old_values, vendor.to_dict())
        
        return jsonify({'vendor': vendor.to_dict()})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/vendors/<int:vendor_id>', methods=['DELETE'])
@jwt_required()
def delete_vendor(vendor_id):
    try:
        # Check if user is admin or staff
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        
        if user.role not in ['admin', 'staff']:
            return jsonify({'error': 'Access denied - must be admin or staff'}), 403
        
        vendor = Vendor.query.get_or_404(vendor_id)
        old_values = vendor.to_dict()
        
        # Check if vendor has associated purchase orders
        if PurchaseOrder.query.filter_by(vendor_id=vendor_id).first():
            # Soft delete by setting is_active to False
            vendor.is_active = False
            vendor.updated_at = datetime.utcnow()
            db.session.commit()
        else:
            # Hard delete if no associated purchase orders
            db.session.delete(vendor)
            db.session.commit()
        
        log_action('DELETE', 'vendors', vendor_id, old_values, None)
        
        return jsonify({'message': 'Vendor deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Purchase Order Routes
@app.route('/api/purchase-orders', methods=['GET'])
@jwt_required()
def get_purchase_orders():
    try:
        # Check if user is admin or staff
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        
        if user.role not in ['admin', 'staff']:
            return jsonify({'error': 'Access denied - must be admin or staff'}), 403
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status = request.args.get('status', '')
        
        query = PurchaseOrder.query
        
        if status:
            query = query.filter_by(status=status)
        
        try:
            purchase_orders = query.order_by(PurchaseOrder.created_at.desc()).paginate(
                page=page, per_page=per_page, error_out=False
            )
            
            return jsonify({
                'purchase_orders': [po.to_dict() for po in purchase_orders.items],
                'pagination': {
                    'page': page,
                    'pages': purchase_orders.pages,
                    'per_page': per_page,
                    'total': purchase_orders.total,
                    'has_next': purchase_orders.has_next,
                    'has_prev': purchase_orders.has_prev
                }
            })
        except Exception as paginate_error:
            # Fallback: manual pagination
            total = query.count()
            items = query.order_by(PurchaseOrder.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
            
            return jsonify({
                'purchase_orders': [po.to_dict() for po in items],
                'pagination': {
                    'page': page,
                    'pages': (total + per_page - 1) // per_page,
                    'per_page': per_page,
                    'total': total,
                    'has_next': page * per_page < total,
                    'has_prev': page > 1
                }
            })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/purchase-orders/<int:po_id>', methods=['GET'])
@jwt_required()
def get_purchase_order(po_id):
    try:
        # Check if user is admin or staff
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        
        if user.role not in ['admin', 'staff']:
            return jsonify({'error': 'Access denied - must be admin or staff'}), 403
        
        purchase_order = PurchaseOrder.query.get_or_404(po_id)
        return jsonify({'purchase_order': purchase_order.to_dict()})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/purchase-orders', methods=['POST'])
@jwt_required()
def create_purchase_order():
    try:
        # Check if user is admin or staff
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        
        if user.role not in ['admin', 'staff']:
            return jsonify({'error': 'Access denied - must be admin or staff'}), 403
        
        data = request.get_json()
        
        # Validate required fields
        if 'vendor_id' not in data:
            return jsonify({'error': 'Vendor is required'}), 400
        
        if 'items' not in data or len(data['items']) == 0:
            return jsonify({'error': 'Purchase order must contain at least one item'}), 400
        
        # Calculate total
        total = Decimal('0')
        for item in data['items']:
            if 'inventory_id' not in item or 'quantity' not in item or 'unit_price' not in item:
                return jsonify({'error': 'Each item must have inventory_id, quantity, and unit_price'}), 400
            
            quantity = int(item['quantity'])
            unit_price = Decimal(str(item['unit_price']))
            item_total = quantity * unit_price
            total += item_total
        
        # Prepare date if provided
        expected_delivery_date = None
        if data.get('expected_delivery_date'):
            try:
                expected_delivery_date = datetime.fromisoformat(data['expected_delivery_date'].replace('Z', '+00:00'))
            except ValueError:
                return jsonify({'error': 'Invalid date format for expected_delivery_date'}), 400
        
        # Create purchase order
        purchase_order = PurchaseOrder(
            vendor_id=int(data['vendor_id']),
            reference_number=data.get('reference_number', f'PO-{datetime.utcnow().strftime("%Y%m%d%H%M%S")}'),
            status=data.get('status', 'draft'),
            total=total,
            notes=data.get('notes', ''),
            created_by=current_user_id,
            expected_delivery_date=expected_delivery_date
        )
        
        db.session.add(purchase_order)
        db.session.flush()  # Get PO ID
        
        # Create purchase order items
        for item_data in data['items']:
            inventory_id = int(item_data['inventory_id'])
            quantity = int(item_data['quantity'])
            unit_price = Decimal(str(item_data['unit_price']))
            total_price = quantity * unit_price
            
            po_item = PurchaseOrderItem(
                purchase_order_id=purchase_order.id,
                inventory_id=inventory_id,
                quantity=quantity,
                unit_price=unit_price,
                total_price=total_price
            )
            db.session.add(po_item)
        
        db.session.commit()
        
        log_action('CREATE', 'purchase_orders', purchase_order.id, None, purchase_order.to_dict())
        
        return jsonify({'purchase_order': purchase_order.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/purchase-orders/<int:po_id>', methods=['PUT'])
@jwt_required()
def update_purchase_order(po_id):
    try:
        # Check if user is admin or staff
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        
        if user.role not in ['admin', 'staff']:
            return jsonify({'error': 'Access denied - must be admin or staff'}), 403
        
        purchase_order = PurchaseOrder.query.get_or_404(po_id)
        old_values = purchase_order.to_dict()
        
        # Cannot edit if status is not draft
        if purchase_order.status not in ['draft', 'submitted']:
            return jsonify({'error': 'Cannot modify purchase orders that are approved or received'}), 400
        
        data = request.get_json()
        
        # Update purchase order fields
        purchase_order.vendor_id = data.get('vendor_id', purchase_order.vendor_id)
        purchase_order.reference_number = data.get('reference_number', purchase_order.reference_number)
        purchase_order.status = data.get('status', purchase_order.status)
        purchase_order.notes = data.get('notes', purchase_order.notes)
        purchase_order.updated_at = datetime.utcnow()
        
        # Update expected delivery date if provided
        if data.get('expected_delivery_date'):
            try:
                purchase_order.expected_delivery_date = datetime.fromisoformat(
                    data['expected_delivery_date'].replace('Z', '+00:00')
                )
            except ValueError:
                return jsonify({'error': 'Invalid date format for expected_delivery_date'}), 400
        
        # Update items if provided
        if 'items' in data:
            # Delete existing items
            PurchaseOrderItem.query.filter_by(purchase_order_id=po_id).delete()
            
            # Calculate new total and add new items
            total = Decimal('0')
            for item_data in data['items']:
                inventory_id = int(item_data['inventory_id'])
                quantity = int(item_data['quantity'])
                unit_price = Decimal(str(item_data['unit_price']))
                total_price = quantity * unit_price
                total += total_price
                
                po_item = PurchaseOrderItem(
                    purchase_order_id=purchase_order.id,
                    inventory_id=inventory_id,
                    quantity=quantity,
                    unit_price=unit_price,
                    total_price=total_price
                )
                db.session.add(po_item)
            
            purchase_order.total = total
        
        db.session.commit()
        
        log_action('UPDATE', 'purchase_orders', purchase_order.id, old_values, purchase_order.to_dict())
        
        return jsonify({'purchase_order': purchase_order.to_dict()})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/purchase-orders/<int:po_id>/status', methods=['PATCH'])
@jwt_required()
def update_purchase_order_status(po_id):
    try:
        # Check if user is admin or staff
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        
        if user.role not in ['admin', 'staff']:
            return jsonify({'error': 'Access denied - must be admin or staff'}), 403
        
        purchase_order = PurchaseOrder.query.get_or_404(po_id)
        old_values = purchase_order.to_dict()
        
        data = request.get_json()
        new_status = data.get('status')
        
        if not new_status:
            return jsonify({'error': 'Status is required'}), 400
        
        # Validate status transition
        valid_statuses = ['draft', 'submitted', 'approved', 'received', 'canceled']
        if new_status not in valid_statuses:
            return jsonify({'error': 'Invalid status'}), 400
        
        purchase_order.status = new_status
        purchase_order.updated_at = datetime.utcnow()
        
        # If status is received, update the received date
        if new_status == 'received':
            purchase_order.received_date = datetime.utcnow()
        
        db.session.commit()
        
        log_action('UPDATE_STATUS', 'purchase_orders', purchase_order.id, {'status': old_values['status']}, {'status': new_status})
        
        return jsonify({'purchase_order': purchase_order.to_dict()})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/purchase-orders/<int:po_id>/receive', methods=['POST'])
@jwt_required()
def receive_purchase_order(po_id):
    try:
        # Check if user is admin or staff
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        
        if user.role not in ['admin', 'staff']:
            return jsonify({'error': 'Access denied - must be admin or staff'}), 403
        
        purchase_order = PurchaseOrder.query.get_or_404(po_id)
        
        # Cannot receive if not approved
        if purchase_order.status != 'approved':
            return jsonify({'error': 'Only approved purchase orders can be received'}), 400
        
        data = request.get_json()
        received_items = data.get('items', [])
        
        # Validate received items
        if not received_items:
            return jsonify({'error': 'At least one item must be received'}), 400
        
        # Update inventory quantities
        for item_data in received_items:
            po_item_id = item_data.get('id')
            received_qty = int(item_data.get('received_quantity', 0))
            
            if not po_item_id or received_qty <= 0:
                continue
            
            po_item = PurchaseOrderItem.query.get(po_item_id)
            if not po_item or po_item.purchase_order_id != po_id:
                continue
            
            # Update PO item's received quantity
            po_item.received_quantity = received_qty
            
            # Update inventory quantity
            inventory_item = Inventory.query.get(po_item.inventory_id)
            if inventory_item:
                old_qty = inventory_item.quantity
                inventory_item.quantity += received_qty
                inventory_item.updated_at = datetime.utcnow()
                
                # Log inventory update
                log_action('INVENTORY_UPDATE', 'inventory', inventory_item.id, 
                          {'quantity': old_qty}, 
                          {'quantity': inventory_item.quantity, 'purchase_order_id': po_id})
        
        # Update PO status and received date
        purchase_order.status = 'received'
        purchase_order.received_date = datetime.utcnow()
        purchase_order.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        log_action('RECEIVE', 'purchase_orders', purchase_order.id, 
                  {'status': 'approved'}, 
                  {'status': 'received', 'received_date': purchase_order.received_date.isoformat()})
        
        return jsonify({'purchase_order': purchase_order.to_dict()})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/purchase-orders/<int:po_id>', methods=['DELETE'])
@jwt_required()
def delete_purchase_order(po_id):
    try:
        # Check if user is admin or staff
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        
        if user.role not in ['admin', 'staff']:
            return jsonify({'error': 'Access denied - must be admin or staff'}), 403
        
        purchase_order = PurchaseOrder.query.get_or_404(po_id)
        
        # Cannot delete if not in draft or submitted status
        if purchase_order.status not in ['draft', 'submitted']:
            return jsonify({'error': 'Cannot delete purchase orders that are approved or received'}), 400
        
        old_values = purchase_order.to_dict()
        
        # Delete PO items first
        PurchaseOrderItem.query.filter_by(purchase_order_id=po_id).delete()
        
        # Then delete the PO
        db.session.delete(purchase_order)
        db.session.commit()
        
        log_action('DELETE', 'purchase_orders', po_id, old_values, None)
        
        return jsonify({'message': 'Purchase order deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# User Management Routes
@app.route('/api/admin/users', methods=['GET'])
@jwt_required()
def admin_get_users():
    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        
        if user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        users = User.query.all()
        return jsonify({'users': [u.to_dict() for u in users]})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/users', methods=['POST'])
@jwt_required()
def admin_create_user():
    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        
        if user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['username', 'email', 'password', 'role']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        username = data['username'].strip()
        email = data['email'].strip()
        password = data['password']
        role = data['role']
        
        # Validate role
        valid_roles = ['admin', 'staff', 'viewer']
        if role not in valid_roles:
            return jsonify({'error': f'Role must be one of: {", ".join(valid_roles)}'}), 400
        
        # Check for duplicate username
        if User.query.filter_by(username=username).first():
            return jsonify({'error': 'Username already exists'}), 400
        
        # Check for duplicate email
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already exists'}), 400
        
        # Validate email format (basic validation)
        if '@' not in email or '.' not in email:
            return jsonify({'error': 'Invalid email format'}), 400
        
        # Validate password strength (minimum requirements)
        if len(password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters long'}), 400
        
        # Create new user
        new_user = User(
            username=username,
            email=email,
            role=role,
            is_active=data.get('is_active', True)
        )
        new_user.set_password(password)
        
        db.session.add(new_user)
        db.session.commit()
        
        # Log the user creation action
        log_action('CREATE', 'users', new_user.id, None, {
            'username': new_user.username,
            'email': new_user.email,
            'role': new_user.role,
            'is_active': new_user.is_active,
            'created_by': current_user_id
        })
        
        return jsonify({
            'message': 'User created successfully',
            'user': new_user.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
def admin_delete_user(user_id):
    try:
        current_user_id = int(get_jwt_identity())
        current_user = User.query.get(current_user_id)
        
        if current_user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        # Prevent deletion of the current user
        if user_id == current_user_id:
            return jsonify({'error': 'Cannot delete your own account'}), 400
        
        # Find the user to delete
        user_to_delete = User.query.get(user_id)
        if not user_to_delete:
            return jsonify({'error': 'User not found'}), 404
        
        # Store user data for audit log before deletion
        old_values = user_to_delete.to_dict()
        
        # Check if this is the last admin user
        if user_to_delete.role == 'admin':
            admin_count = User.query.filter_by(role='admin', is_active=True).count()
            if admin_count <= 1:
                return jsonify({'error': 'Cannot delete the last admin user'}), 400
        
        # Perform soft delete by setting is_active to False
        # This preserves audit trail and prevents data integrity issues
        user_to_delete.is_active = False
        user_to_delete.updated_at = datetime.utcnow()
        
        # Alternatively, for hard delete, uncomment the line below and comment out the soft delete above
        # db.session.delete(user_to_delete)
        
        db.session.commit()
        
        # Log the user deletion action
        log_action('DELETE', 'users', user_id, old_values, {
            'is_active': False,
            'deleted_by': current_user_id,
            'deleted_at': datetime.utcnow().isoformat()
        })
        
        return jsonify({
            'message': f'User "{user_to_delete.username}" has been deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Health check route
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'database': 'connected',
        'timestamp': datetime.utcnow().isoformat()
    })

if __name__ == '__main__':
    print("🚀 Starting Flask Inventory Management API...")
    print("📊 Database: SQLite (inventory.db)")
    print("🔑 Default Admin Login: admin / admin123")
    print("🌐 API URL: http://localhost:5001")
    print("📚 API Documentation available at endpoints above")
    
    app.run(host='0.0.0.0', port=5001, debug=True)
