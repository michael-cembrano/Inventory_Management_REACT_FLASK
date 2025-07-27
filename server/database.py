from models import db, User, Category, Inventory, Order, OrderItem, Vendor, PurchaseOrder, PurchaseOrderItem, InventoryVendor, AuditLog
from decimal import Decimal
import json
from datetime import datetime, timedelta

def create_audit_log(action, table_name, record_id=None, user_id=None, old_values=None, new_values=None):
    """Create audit log entry during initialization"""
    try:
        audit_log = AuditLog(
            user_id=user_id,
            action=action,
            table_name=table_name,
            record_id=record_id,
            old_values=json.dumps(old_values) if old_values else None,
            new_values=json.dumps(new_values) if new_values else None,
            ip_address='127.0.0.1'  # System initialization
        )
        db.session.add(audit_log)
    except Exception as e:
        print(f"Error creating audit log: {e}")

def init_database(app):
    """Initialize the database with tables and sample data"""
    with app.app_context():
        try:
            # Create all tables
            db.create_all()
            
            # Check if we already have data - be more specific about the check
            if User.query.count() > 0 and Category.query.count() > 0:
                print("Database already initialized with data")
                return
            
            print("Initializing database with sample data...")
            
            # Clear existing data if any (for development)
            db.session.query(AuditLog).delete()
            db.session.query(PurchaseOrderItem).delete()
            db.session.query(PurchaseOrder).delete()
            db.session.query(InventoryVendor).delete()
            db.session.query(OrderItem).delete()
            db.session.query(Order).delete()
            db.session.query(Inventory).delete()
            db.session.query(Vendor).delete()
            db.session.query(Category).delete()
            db.session.query(User).delete()
            db.session.commit()
            
            # Create admin user
            admin_user = User(
                username='admin',
                email='admin@inventory.com',
                role='admin'
            )
            admin_user.set_password('admin123')
            db.session.add(admin_user)
            db.session.flush()  # Get user ID
            
            # Create audit log for admin user creation
            create_audit_log('SYSTEM_INIT', 'users', admin_user.id, None, None, {
                'username': admin_user.username,
                'email': admin_user.email,
                'role': admin_user.role,
                'action': 'Created admin user during system initialization'
            })
            
            # Create regular users
            manager_user = User(
                username='manager1',
                email='manager1@inventory.com',
                role='user'
            )
            manager_user.set_password('manager123')
            db.session.add(manager_user)
            db.session.flush()
            
            create_audit_log('SYSTEM_INIT', 'users', manager_user.id, admin_user.id, None, {
                'username': manager_user.username,
                'email': manager_user.email,
                'role': manager_user.role,
                'action': 'Created manager user during system initialization'
            })
            
            staff_user = User(
                username='staff1',
                email='staff1@inventory.com',
                role='staff'
            )
            staff_user.set_password('staff123')
            db.session.add(staff_user)
            db.session.flush()
            
            create_audit_log('SYSTEM_INIT', 'users', staff_user.id, admin_user.id, None, {
                'username': staff_user.username,
                'email': staff_user.email,
                'role': staff_user.role,
                'action': 'Created staff user during system initialization'
            })
            
            # Commit users first
            db.session.commit()
            print("✅ Users created successfully")
            
            # Create categories
            categories_data = [
                {'name': 'Electronics', 'description': 'Electronic devices, computers, and tech accessories'},
                {'name': 'Office Supplies', 'description': 'Stationery, office equipment, and workplace essentials'},
                {'name': 'Furniture', 'description': 'Office and home furniture, chairs, desks, and storage'},
                {'name': 'Tools & Equipment', 'description': 'Hand tools, power tools, and maintenance equipment'},
                {'name': 'Books & Media', 'description': 'Books, educational materials, and digital media'},
                {'name': 'Health & Safety', 'description': 'Safety equipment, first aid supplies, and protective gear'}
            ]
            
            categories = []
            for cat_data in categories_data:
                category = Category(**cat_data)
                categories.append(category)
                db.session.add(category)
                db.session.flush()
                
                # Create audit log for category creation
                create_audit_log('SYSTEM_INIT', 'categories', category.id, admin_user.id, None, {
                    'name': category.name,
                    'description': category.description,
                    'action': 'Created category during system initialization'
                })
            
            # Commit categories
            db.session.commit()
            print("✅ Categories created successfully")
            
            # Create inventory items
            inventory_data = [
                {
                    'name': 'MacBook Pro 16-inch M3',
                    'category_id': categories[0].id,  # Electronics
                    'quantity': 8,
                    'price': Decimal('2999.99'),
                    'unit_of_measure': 'pcs',
                    'price_per_uom': Decimal('2999.99'),
                    'base_unit': 'pcs',
                    'description': 'Latest MacBook Pro with M3 chip, 16GB RAM, 512GB SSD',
                    'sku': 'MBP-16-M3-512',
                    'min_stock_level': 3
                },
                {
                    'name': 'Dell XPS 15 Laptop',
                    'category_id': categories[0].id,  # Electronics
                    'quantity': 12,
                    'price': Decimal('1799.99'),
                    'unit_of_measure': 'pcs',
                    'price_per_uom': Decimal('1799.99'),
                    'base_unit': 'pcs',
                    'description': 'High-performance laptop with Intel i7, 16GB RAM, 1TB SSD',
                    'sku': 'DELL-XPS15-I7',
                    'min_stock_level': 5
                },
                {
                    'name': 'Sony WH-1000XM5 Headphones',
                    'category_id': categories[0].id,  # Electronics
                    'quantity': 25,
                    'price': Decimal('399.99'),
                    'unit_of_measure': 'pcs',
                    'price_per_uom': Decimal('399.99'),
                    'base_unit': 'pcs',
                    'description': 'Wireless noise-canceling headphones with premium sound',
                    'sku': 'SONY-WH1000XM5',
                    'min_stock_level': 10
                },
                {
                    'name': 'iPad Pro 12.9-inch',
                    'category_id': categories[0].id,  # Electronics
                    'quantity': 15,
                    'price': Decimal('1099.99'),
                    'unit_of_measure': 'pcs',
                    'price_per_uom': Decimal('1099.99'),
                    'base_unit': 'pcs',
                    'description': 'iPad Pro with M2 chip, 128GB storage, Wi-Fi model',
                    'sku': 'IPAD-PRO-12-M2',
                    'min_stock_level': 5
                },
                {
                    'name': 'Samsung 27" 4K Monitor',
                    'category_id': categories[0].id,  # Electronics
                    'quantity': 20,
                    'price': Decimal('449.99'),
                    'unit_of_measure': 'pcs',
                    'price_per_uom': Decimal('449.99'),
                    'base_unit': 'pcs',
                    'description': '27-inch 4K UHD monitor with USB-C connectivity',
                    'sku': 'SAM-27-4K-USC',
                    'min_stock_level': 8
                },
                {
                    'name': 'Logitech MX Master 3S Mouse',
                    'category_id': categories[0].id,  # Electronics
                    'quantity': 35,
                    'price': Decimal('99.99'),
                    'unit_of_measure': 'pcs',
                    'price_per_uom': Decimal('99.99'),
                    'base_unit': 'pcs',
                    'description': 'Advanced wireless mouse with precision tracking',
                    'sku': 'LOG-MX3S-WL',
                    'min_stock_level': 15
                },
                {
                    'name': 'HP LaserJet Pro Printer',
                    'category_id': categories[1].id,  # Office Supplies
                    'quantity': 6,
                    'price': Decimal('299.99'),
                    'unit_of_measure': 'pcs',
                    'price_per_uom': Decimal('299.99'),
                    'base_unit': 'pcs',
                    'description': 'Compact laser printer with wireless connectivity',
                    'sku': 'HP-LJ-PRO-WL',
                    'min_stock_level': 3
                },
                {
                    'name': 'Stapler Heavy Duty',
                    'category_id': categories[1].id,  # Office Supplies
                    'quantity': 25,
                    'price': Decimal('24.99'),
                    'unit_of_measure': 'pcs',
                    'price_per_uom': Decimal('24.99'),
                    'base_unit': 'pcs',
                    'description': 'Heavy-duty stapler for high-volume use',
                    'sku': 'STAPLER-HD-001',
                    'min_stock_level': 10
                },
                {
                    'name': 'A4 Copy Paper (500 sheets)',
                    'category_id': categories[1].id,  # Office Supplies
                    'quantity': 150,
                    'price': Decimal('8.99'),
                    'unit_of_measure': 'ream',
                    'price_per_uom': Decimal('8.99'),
                    'base_unit': 'ream',
                    'description': 'Premium white copy paper, 80gsm weight',
                    'sku': 'PAPER-A4-500',
                    'min_stock_level': 50
                },
                {
                    'name': 'Ergonomic Office Chair',
                    'category_id': categories[2].id,  # Furniture
                    'quantity': 15,
                    'price': Decimal('299.99'),
                    'unit_of_measure': 'pcs',
                    'price_per_uom': Decimal('299.99'),
                    'base_unit': 'pcs',
                    'description': 'Adjustable ergonomic chair with lumbar support',
                    'sku': 'CHAIR-ERG-001',
                    'min_stock_level': 5
                },
                {
                    'name': 'Standing Desk Converter',
                    'category_id': categories[2].id,  # Furniture
                    'quantity': 10,
                    'price': Decimal('199.99'),
                    'unit_of_measure': 'pcs',
                    'price_per_uom': Decimal('199.99'),
                    'base_unit': 'pcs',
                    'description': 'Height-adjustable desk converter for standing work',
                    'sku': 'DESK-STAND-CNV',
                    'min_stock_level': 3
                },
                {
                    'name': 'Cordless Drill Kit',
                    'category_id': categories[3].id,  # Tools & Equipment
                    'quantity': 18,
                    'price': Decimal('89.99'),
                    'unit_of_measure': 'pcs',
                    'price_per_uom': Decimal('89.99'),
                    'base_unit': 'pcs',
                    'description': '20V cordless drill with battery and charger',
                    'sku': 'DRILL-20V-KIT',
                    'min_stock_level': 5
                },
                {
                    'name': 'Python Programming Guide',
                    'category_id': categories[4].id,  # Books & Media
                    'quantity': 30,
                    'price': Decimal('49.99'),
                    'unit_of_measure': 'pcs',
                    'price_per_uom': Decimal('49.99'),
                    'base_unit': 'pcs',
                    'description': 'Comprehensive guide to Python programming',
                    'sku': 'BOOK-PY-GUIDE',
                    'min_stock_level': 10
                },
                {
                    'name': 'First Aid Kit Complete',
                    'category_id': categories[5].id,  # Health & Safety
                    'quantity': 40,
                    'price': Decimal('79.99'),
                    'unit_of_measure': 'pcs',
                    'price_per_uom': Decimal('79.99'),
                    'base_unit': 'pcs',
                    'description': 'Comprehensive first aid kit for workplace use',
                    'sku': 'AID-KIT-COMP',
                    'min_stock_level': 15
                }
            ]
            
            inventory_items = []
            for inv_data in inventory_data:
                item = Inventory(**inv_data)
                inventory_items.append(item)
                db.session.add(item)
                db.session.flush()
                
                # Create audit log for inventory creation
                create_audit_log('SYSTEM_INIT', 'inventory', item.id, admin_user.id, None, {
                    'name': item.name,
                    'sku': item.sku,
                    'quantity': item.quantity,
                    'price': float(item.price),
                    'action': 'Created inventory item during system initialization'
                })
            
            # Commit inventory items
            db.session.commit()
            print("✅ Inventory items created successfully")
            
            # Create sample vendors
            vendors_data = [
                {
                    'name': 'Tech Supplies Inc.',
                    'contact_person': 'David Johnson',
                    'email': 'david@techsupplies.com',
                    'phone': '+1-555-1234',
                    'address': '123 Tech Avenue, San Francisco, CA 94101'
                },
                {
                    'name': 'Office Essentials Ltd.',
                    'contact_person': 'Emily Rodriguez',
                    'email': 'emily@officeessentials.com',
                    'phone': '+1-555-5678',
                    'address': '456 Office Park, Chicago, IL 60601'
                },
                {
                    'name': 'Furniture Concepts',
                    'contact_person': 'Michael Wong',
                    'email': 'mwong@furnitureconcepts.com',
                    'phone': '+1-555-9012',
                    'address': '789 Designer Blvd, New York, NY 10001'
                }
            ]
            
            vendors = []
            for vendor_data in vendors_data:
                vendor = Vendor(**vendor_data)
                vendors.append(vendor)
                db.session.add(vendor)
                db.session.flush()
                
                # Create audit log for vendor creation
                create_audit_log('SYSTEM_INIT', 'vendors', vendor.id, admin_user.id, None, {
                    'name': vendor.name,
                    'email': vendor.email,
                    'action': 'Created vendor during system initialization'
                })
            
            # Commit vendors
            db.session.commit()
            print("✅ Vendors created successfully")
            
            # Create sample orders
            orders_data = [
                {
                    'customer_name': 'John Smith',
                    'customer_email': 'john.smith@company.com',
                    'customer_phone': '+1-555-0123',
                    'status': 'completed',
                    'total': Decimal('3399.98'),
                    'items': [
                        {'inventory_id': inventory_items[0].id, 'quantity': 1, 'unit_price': Decimal('2999.99')},
                        {'inventory_id': inventory_items[5].id, 'quantity': 4, 'unit_price': Decimal('99.99')}
                    ]
                },
                {
                    'customer_name': 'Sarah Johnson',
                    'customer_email': 'sarah.johnson@techcorp.com',
                    'customer_phone': '+1-555-0124',
                    'status': 'completed',
                    'total': Decimal('2249.97'),
                    'items': [
                        {'inventory_id': inventory_items[1].id, 'quantity': 1, 'unit_price': Decimal('1799.99')},
                        {'inventory_id': inventory_items[2].id, 'quantity': 1, 'unit_price': Decimal('399.99')},
                        {'inventory_id': inventory_items[8].id, 'quantity': 5, 'unit_price': Decimal('8.99')}
                    ]
                },
                {
                    'customer_name': 'Michael Davis',
                    'customer_email': 'm.davis@startup.io',
                    'customer_phone': '+1-555-0125',
                    'status': 'pending',
                    'total': Decimal('1799.96'),
                    'items': [
                        {'inventory_id': inventory_items[3].id, 'quantity': 1, 'unit_price': Decimal('1099.99')},
                        {'inventory_id': inventory_items[9].id, 'quantity': 1, 'unit_price': Decimal('299.99')},
                        {'inventory_id': inventory_items[2].id, 'quantity': 1, 'unit_price': Decimal('399.99')}
                    ]
                }
            ]
            
            # Create orders and order items
            for order_data in orders_data:
                items_data = order_data.pop('items')
                order = Order(**order_data)
                db.session.add(order)
                db.session.flush()  # Get order ID
                
                # Create audit log for order creation
                create_audit_log('SYSTEM_INIT', 'orders', order.id, admin_user.id, None, {
                    'customer_name': order.customer_name,
                    'total': float(order.total),
                    'status': order.status,
                    'action': 'Created sample order during system initialization'
                })
                
                for item_data in items_data:
                    item_data['order_id'] = order.id
                    item_data['total_price'] = item_data['quantity'] * item_data['unit_price']
                    # Add UOM fields for order items
                    item_data['unit_of_measure'] = 'pcs'
                    item_data['price_per_uom'] = item_data['unit_price']
                    order_item = OrderItem(**item_data)
                    db.session.add(order_item)
            
            # Commit orders
            db.session.commit()
            print("✅ Orders created successfully")
            
            # Create inventory-vendor associations
            inventory_vendor_data = [
                # MacBook Pro vendors
                {'inventory_id': inventory_items[0].id, 'vendor_id': vendors[0].id, 'unit_price': Decimal('2850.00'), 'is_preferred': True},
                {'inventory_id': inventory_items[0].id, 'vendor_id': vendors[1].id, 'unit_price': Decimal('2899.99')},
                
                # Dell XPS vendors
                {'inventory_id': inventory_items[1].id, 'vendor_id': vendors[0].id, 'unit_price': Decimal('1749.99'), 'is_preferred': True},
                {'inventory_id': inventory_items[1].id, 'vendor_id': vendors[1].id, 'unit_price': Decimal('1799.99')},
                
                # Sony Headphones vendors
                {'inventory_id': inventory_items[2].id, 'vendor_id': vendors[0].id, 'unit_price': Decimal('379.99'), 'is_preferred': True},
                {'inventory_id': inventory_items[2].id, 'vendor_id': vendors[1].id, 'unit_price': Decimal('399.99')},
                
                # Office supplies
                {'inventory_id': inventory_items[7].id, 'vendor_id': vendors[1].id, 'unit_price': Decimal('22.99'), 'is_preferred': True},
                {'inventory_id': inventory_items[8].id, 'vendor_id': vendors[1].id, 'unit_price': Decimal('7.99'), 'is_preferred': True},
                
                # Furniture
                {'inventory_id': inventory_items[9].id, 'vendor_id': vendors[2].id, 'unit_price': Decimal('289.99'), 'is_preferred': True},
                {'inventory_id': inventory_items[10].id, 'vendor_id': vendors[2].id, 'unit_price': Decimal('189.99'), 'is_preferred': True},
            ]
            
            for vendor_assoc_data in inventory_vendor_data:
                inventory_vendor = InventoryVendor(**vendor_assoc_data)
                db.session.add(inventory_vendor)
            
            db.session.commit()
            print("✅ Vendor associations created successfully")
            
            # Create sample purchase orders
            purchase_orders_data = [
                {
                    'vendor_id': vendors[0].id,
                    'reference_number': 'PO-2023-001',
                    'status': 'approved',
                    'notes': 'Restocking electronics inventory',
                    'created_by': admin_user.id,
                    'expected_delivery_date': datetime.utcnow() + timedelta(days=7),
                    'items': [
                        {
                            'inventory_id': inventory_items[0].id,
                            'quantity': 5,
                            'unit_price': Decimal('2799.99'),
                            'total_price': Decimal('13999.95')
                        },
                        {
                            'inventory_id': inventory_items[2].id,
                            'quantity': 10,
                            'unit_price': Decimal('379.99'),
                            'total_price': Decimal('3799.90')
                        }
                    ]
                },
                {
                    'vendor_id': vendors[1].id,
                    'reference_number': 'PO-2023-002',
                    'status': 'submitted',
                    'notes': 'Office supplies for new hires',
                    'created_by': staff_user.id,
                    'expected_delivery_date': datetime.utcnow() + timedelta(days=5),
                    'items': [
                        {
                            'inventory_id': inventory_items[7].id,
                            'quantity': 15,
                            'unit_price': Decimal('22.99'),
                            'total_price': Decimal('344.85')
                        },
                        {
                            'inventory_id': inventory_items[8].id,
                            'quantity': 50,
                            'unit_price': Decimal('7.99'),
                            'total_price': Decimal('399.50')
                        }
                    ]
                },
                {
                    'vendor_id': vendors[2].id,
                    'reference_number': 'PO-2023-003',
                    'status': 'draft',
                    'notes': 'New furniture for conference room',
                    'created_by': admin_user.id,
                    'expected_delivery_date': datetime.utcnow() + timedelta(days=14),
                    'items': [
                        {
                            'inventory_id': inventory_items[9].id,
                            'quantity': 8,
                            'unit_price': Decimal('289.99'),
                            'total_price': Decimal('2319.92')
                        },
                        {
                            'inventory_id': inventory_items[10].id,
                            'quantity': 4,
                            'unit_price': Decimal('189.99'),
                            'total_price': Decimal('759.96')
                        }
                    ]
                }
            ]
            
            # Create purchase orders and items
            for po_data in purchase_orders_data:
                items_data = po_data.pop('items')
                po_total = sum(Decimal(str(item['total_price'])) for item in items_data)
                po_data['total'] = po_total
                
                purchase_order = PurchaseOrder(**po_data)
                db.session.add(purchase_order)
                db.session.flush()  # Get PO ID
                
                # Create audit log for purchase order creation
                create_audit_log('SYSTEM_INIT', 'purchase_orders', purchase_order.id, admin_user.id, None, {
                    'reference_number': purchase_order.reference_number,
                    'vendor_id': purchase_order.vendor_id,
                    'total': float(purchase_order.total),
                    'status': purchase_order.status,
                    'action': 'Created purchase order during system initialization'
                })
                
                for item_data in items_data:
                    item_data['purchase_order_id'] = purchase_order.id
                    # Add UOM fields for purchase order items
                    item_data['unit_of_measure'] = 'pcs'
                    item_data['price_per_uom'] = item_data['unit_price']
                    po_item = PurchaseOrderItem(**item_data)
                    db.session.add(po_item)

            # Create summary audit log
            create_audit_log('SYSTEM_INIT', 'system', None, admin_user.id, None, {
                'action': 'Database initialization completed',
                'users_created': 3,
                'categories_created': len(categories),
                'inventory_items_created': len(inventory_items),
                'vendors_created': len(vendors),
                'orders_created': len(orders_data),
                'purchase_orders_created': len(purchase_orders_data),
                'timestamp': datetime.utcnow().isoformat()
            })

            # Final commit
            db.session.commit()
            print("✅ Purchase orders created successfully")
            print("✅ Audit logs created successfully")
            print("✅ Database initialized successfully with sample data!")
            
        except Exception as e:
            print(f"❌ Error initializing database: {str(e)}")
            db.session.rollback()
            raise

def get_system_stats():
    """Get system statistics for admin dashboard"""
    total_users = User.query.count()
    total_categories = Category.query.count()
    total_products = Inventory.query.filter_by(is_active=True).count()
    total_orders = Order.query.count()
    
    # Low stock items
    low_stock_items = Inventory.query.filter(
        Inventory.quantity <= Inventory.min_stock_level,
        Inventory.is_active == True
    ).count()
    
    # Recent orders
    recent_orders = Order.query.order_by(Order.created_at.desc()).limit(5).all()
    
    # Total inventory value
    inventory_value = db.session.query(
        db.func.sum(Inventory.quantity * Inventory.price)
    ).filter_by(is_active=True).scalar() or 0
    
    return {
        'total_users': total_users,
        'total_categories': total_categories,
        'total_products': total_products,
        'total_orders': total_orders,
        'low_stock_items': low_stock_items,
        'inventory_value': float(inventory_value),
        'recent_orders': [order.to_dict() for order in recent_orders]
    }

def get_database_size():
    """Get database file size in bytes"""
    try:
        import os
        basedir = os.path.abspath(os.path.dirname(__file__))
        db_path = os.path.join(basedir, 'inventory.db')
        if os.path.exists(db_path):
            size_bytes = os.path.getsize(db_path)
            # Convert to human readable format
            if size_bytes < 1024:
                return f"{size_bytes} B"
            elif size_bytes < 1024 * 1024:
                return f"{size_bytes / 1024:.1f} KB"
            elif size_bytes < 1024 * 1024 * 1024:
                return f"{size_bytes / (1024 * 1024):.1f} MB"
            else:
                return f"{size_bytes / (1024 * 1024 * 1024):.1f} GB"
        return "0 B"
    except Exception:
        return "Unknown"

def get_system_uptime():
    """Get system uptime (mock implementation)"""
    try:
        import psutil
        import time
        boot_time = psutil.boot_time()
        uptime_seconds = time.time() - boot_time
        
        days = int(uptime_seconds // 86400)
        hours = int((uptime_seconds % 86400) // 3600)
        minutes = int((uptime_seconds % 3600) // 60)
        
        return f"{days}d {hours}h {minutes}m"
    except ImportError:
        # Fallback if psutil is not available
        return "N/A (psutil not installed)"
    except Exception:
        return "Unknown"

def get_api_performance_stats():
    """Get API performance statistics (mock implementation)"""
    return {
        'avg_response_time': '125ms',
        'total_requests_today': 1247,
        'error_rate': '0.2%',
        'active_sessions': 12
    }

def get_storage_usage():
    """Get storage usage statistics"""
    try:
        import shutil
        import os
        basedir = os.path.abspath(os.path.dirname(__file__))
        
        total, used, free = shutil.disk_usage(basedir)
        
        def bytes_to_gb(bytes_val):
            return bytes_val / (1024 * 1024 * 1024)
        
        return {
            'total_gb': round(bytes_to_gb(total), 2),
            'used_gb': round(bytes_to_gb(used), 2),
            'free_gb': round(bytes_to_gb(free), 2),
            'usage_percentage': round((used / total) * 100, 1)
        }
    except Exception:
        return {
            'total_gb': 0,
            'used_gb': 0,
            'free_gb': 0,
            'usage_percentage': 0
        }

def get_recent_system_activity():
    """Get recent system activity"""
    try:
        from models import AuditLog
        # Get last 10 audit log entries
        recent_logs = AuditLog.query.order_by(AuditLog.created_at.desc()).limit(10).all()
        
        return [{
            'timestamp': log.created_at.isoformat() if log.created_at else None,
            'action': log.action,
            'user_id': log.user_id,
            'table_name': log.table_name,
            'description': f"{log.action} on {log.table_name}" if log.table_name else log.action
        } for log in recent_logs]
    except Exception:
        return []