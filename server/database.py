from models import db, User, Category, Inventory, Order, OrderItem, Vendor, PurchaseOrder, PurchaseOrderItem, InventoryVendor
from decimal import Decimal
import json
from datetime import datetime, timedelta

def init_database(app):
    """Initialize the database with tables and sample data"""
    with app.app_context():
        # Create all tables
        db.create_all()
        
        # Check if we already have data
        if User.query.first():
            print("Database already initialized with data")
            return
        
        print("Initializing database with sample data...")
        
        # Create admin user
        admin_user = User(
            username='admin',
            email='admin@inventory.com',
            role='admin'
        )
        admin_user.set_password('admin123')
        db.session.add(admin_user)
        
        # Create regular users
        manager_user = User(
            username='manager1',
            email='manager1@inventory.com',
            role='user'
        )
        manager_user.set_password('manager123')
        db.session.add(manager_user)
        
        staff_user = User(
            username='staff1',
            email='staff1@inventory.com',
            role='staff'
        )
        staff_user.set_password('staff123')
        db.session.add(staff_user)
        
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
        
        # Commit to get category IDs
        db.session.commit()
        
        # Create inventory items
        inventory_data = [
            {
                'name': 'MacBook Pro 16-inch M3',
                'category_id': categories[0].id,  # Electronics
                'quantity': 8,
                'price': Decimal('2999.99'),
                'description': 'Latest MacBook Pro with M3 chip, 16GB RAM, 512GB SSD',
                'sku': 'MBP-16-M3-512',
                'min_stock_level': 3
            },
            {
                'name': 'Dell XPS 15 Laptop',
                'category_id': categories[0].id,  # Electronics
                'quantity': 12,
                'price': Decimal('1799.99'),
                'description': 'High-performance laptop with Intel i7, 16GB RAM, 1TB SSD',
                'sku': 'DELL-XPS15-I7',
                'min_stock_level': 5
            },
            {
                'name': 'Sony WH-1000XM5 Headphones',
                'category_id': categories[0].id,  # Electronics
                'quantity': 25,
                'price': Decimal('399.99'),
                'description': 'Wireless noise-canceling headphones with premium sound',
                'sku': 'SONY-WH1000XM5',
                'min_stock_level': 10
            },
            {
                'name': 'iPad Pro 12.9-inch',
                'category_id': categories[0].id,  # Electronics
                'quantity': 15,
                'price': Decimal('1099.99'),
                'description': 'iPad Pro with M2 chip, 128GB storage, Wi-Fi model',
                'sku': 'IPAD-PRO-12-M2',
                'min_stock_level': 5
            },
            {
                'name': 'Samsung 27" 4K Monitor',
                'category_id': categories[0].id,  # Electronics
                'quantity': 20,
                'price': Decimal('449.99'),
                'description': '27-inch 4K UHD monitor with USB-C connectivity',
                'sku': 'SAM-27-4K-USC',
                'min_stock_level': 8
            },
            {
                'name': 'Logitech MX Master 3S Mouse',
                'category_id': categories[0].id,  # Electronics
                'quantity': 35,
                'price': Decimal('99.99'),
                'description': 'Advanced wireless mouse with precision tracking',
                'sku': 'LOG-MX3S-WL',
                'min_stock_level': 15
            },
            {
                'name': 'HP LaserJet Pro Printer',
                'category_id': categories[1].id,  # Office Supplies
                'quantity': 6,
                'price': Decimal('299.99'),
                'description': 'Compact laser printer with wireless connectivity',
                'sku': 'HP-LJ-PRO-WL',
                'min_stock_level': 3
            },
            {
                'name': 'Stapler Heavy Duty',
                'category_id': categories[1].id,  # Office Supplies
                'quantity': 25,
                'price': Decimal('24.99'),
                'description': 'Heavy-duty stapler for high-volume use',
                'sku': 'STAPLER-HD-001',
                'min_stock_level': 10
            },
            {
                'name': 'A4 Copy Paper (500 sheets)',
                'category_id': categories[1].id,  # Office Supplies
                'quantity': 150,
                'price': Decimal('8.99'),
                'description': 'Premium white copy paper, 80gsm weight',
                'sku': 'PAPER-A4-500',
                'min_stock_level': 50
            },
            {
                'name': 'Ergonomic Office Chair',
                'category_id': categories[2].id,  # Furniture
                'quantity': 15,
                'price': Decimal('299.99'),
                'description': 'Adjustable ergonomic chair with lumbar support',
                'sku': 'CHAIR-ERG-001',
                'min_stock_level': 5
            },
            {
                'name': 'Standing Desk Converter',
                'category_id': categories[2].id,  # Furniture
                'quantity': 10,
                'price': Decimal('199.99'),
                'description': 'Height-adjustable desk converter for standing work',
                'sku': 'DESK-STAND-CNV',
                'min_stock_level': 3
            },
            {
                'name': 'Cordless Drill Kit',
                'category_id': categories[3].id,  # Tools & Equipment
                'quantity': 18,
                'price': Decimal('89.99'),
                'description': '20V cordless drill with battery and charger',
                'sku': 'DRILL-20V-KIT',
                'min_stock_level': 5
            },
            {
                'name': 'Python Programming Guide',
                'category_id': categories[4].id,  # Books & Media
                'quantity': 30,
                'price': Decimal('49.99'),
                'description': 'Comprehensive guide to Python programming',
                'sku': 'BOOK-PY-GUIDE',
                'min_stock_level': 10
            },
            {
                'name': 'First Aid Kit Complete',
                'category_id': categories[5].id,  # Health & Safety
                'quantity': 40,
                'price': Decimal('79.99'),
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
        
        # Commit to get inventory IDs
        db.session.commit()
        
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
        
        for order_data in orders_data:
            items_data = order_data.pop('items')
            order = Order(**order_data)
            db.session.add(order)
            db.session.flush()  # Get order ID
            
            for item_data in items_data:
                item_data['order_id'] = order.id
                item_data['total_price'] = item_data['quantity'] * item_data['unit_price']
                order_item = OrderItem(**item_data)
                db.session.add(order_item)
        
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
        
        # Commit to get vendor IDs
        db.session.commit()
        
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
        
        for po_data in purchase_orders_data:
            items_data = po_data.pop('items')
            po_total = sum(Decimal(str(item['total_price'])) for item in items_data)
            po_data['total'] = po_total
            
            purchase_order = PurchaseOrder(**po_data)
            db.session.add(purchase_order)
            db.session.flush()  # Get PO ID
            
            for item_data in items_data:
                item_data['purchase_order_id'] = purchase_order.id
                po_item = PurchaseOrderItem(**item_data)
                db.session.add(po_item)
        
        # Commit all changes
        db.session.commit()
        print("✅ Database initialized successfully with sample data!")

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