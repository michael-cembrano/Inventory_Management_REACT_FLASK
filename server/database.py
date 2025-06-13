from models import db, User, Category, Inventory, Order, OrderItem
from decimal import Decimal
import json

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
            role='user'
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