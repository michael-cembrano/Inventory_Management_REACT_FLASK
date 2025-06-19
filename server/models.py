from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default='user')
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None
        }

class Category(db.Model):
    __tablename__ = 'categories'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    inventory_items = db.relationship('Inventory', backref='category_ref', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'product_count': len(self.inventory_items)
        }

class Inventory(db.Model):
    __tablename__ = 'inventory'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'), nullable=True)
    quantity = db.Column(db.Integer, nullable=False, default=0)
    price = db.Column(db.Numeric(10, 2), nullable=False)
    description = db.Column(db.Text)
    sku = db.Column(db.String(50), unique=True)
    min_stock_level = db.Column(db.Integer, default=5)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    order_items = db.relationship('OrderItem', backref='inventory_ref', lazy=True)
    vendors = db.relationship('Vendor', secondary='inventory_vendors', 
                             backref=db.backref('inventory_items', lazy='dynamic'),
                             viewonly=True)
    
    def to_dict(self):
        vendors_data = []
        for vendor_assoc in self.vendor_associations:
            vendors_data.append({
                'vendor_id': vendor_assoc.vendor_id,
                'vendor_name': vendor_assoc.vendor.name if vendor_assoc.vendor else 'Unknown',
                'unit_price': float(vendor_assoc.unit_price),
                'is_preferred': vendor_assoc.is_preferred
            })
            
        return {
            'id': self.id,
            'name': self.name,
            'category_id': self.category_id,
            'category': self.category_ref.name if self.category_ref else None,
            'quantity': self.quantity,
            'price': float(self.price),
            'description': self.description,
            'sku': self.sku,
            'min_stock_level': self.min_stock_level,
            'is_active': self.is_active,
            'status': self.get_status(),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'vendors': vendors_data
        }
    
    def get_status(self):
        if not self.is_active:
            return 'Inactive'
        elif self.quantity == 0:
            return 'Out of Stock'
        elif self.quantity <= self.min_stock_level:
            return 'Low Stock'
        else:
            return 'In Stock'

class Order(db.Model):
    __tablename__ = 'orders'
    
    id = db.Column(db.Integer, primary_key=True)
    customer_name = db.Column(db.String(200), nullable=False)
    customer_email = db.Column(db.String(255))
    customer_phone = db.Column(db.String(20))
    status = db.Column(db.String(50), default='pending')
    total = db.Column(db.Numeric(10, 2), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    order_items = db.relationship('OrderItem', backref='order_ref', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'customer_name': self.customer_name,
            'customer_email': self.customer_email,
            'customer_phone': self.customer_phone,
            'status': self.status,
            'total': float(self.total),
            'items': [item.to_dict() for item in self.order_items],
            'item_count': len(self.order_items),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class OrderItem(db.Model):
    __tablename__ = 'order_items'
    
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    inventory_id = db.Column(db.Integer, db.ForeignKey('inventory.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(db.Numeric(10, 2), nullable=False)
    total_price = db.Column(db.Numeric(10, 2), nullable=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'order_id': self.order_id,
            'inventory_id': self.inventory_id,
            'product_name': self.inventory_ref.name if self.inventory_ref else 'Unknown',
            'quantity': self.quantity,
            'unit_price': float(self.unit_price),
            'total_price': float(self.total_price)
        }

class AuditLog(db.Model):
    __tablename__ = 'audit_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    action = db.Column(db.String(100), nullable=False)
    table_name = db.Column(db.String(50))
    record_id = db.Column(db.Integer)
    old_values = db.Column(db.Text)  # JSON string
    new_values = db.Column(db.Text)  # JSON string
    ip_address = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'action': self.action,
            'table_name': self.table_name,
            'record_id': self.record_id,
            'old_values': self.old_values,
            'new_values': self.new_values,
            'ip_address': self.ip_address,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Vendor(db.Model):
    __tablename__ = 'vendors'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    contact_person = db.Column(db.String(100))
    email = db.Column(db.String(255))
    phone = db.Column(db.String(20))
    address = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    purchase_orders = db.relationship('PurchaseOrder', backref='vendor', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'contact_person': self.contact_person,
            'email': self.email,
            'phone': self.phone,
            'address': self.address,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class PurchaseOrder(db.Model):
    __tablename__ = 'purchase_orders'
    
    id = db.Column(db.Integer, primary_key=True)
    vendor_id = db.Column(db.Integer, db.ForeignKey('vendors.id'), nullable=False)
    reference_number = db.Column(db.String(50), unique=True)
    status = db.Column(db.String(50), default='draft')  # draft, submitted, approved, received, canceled
    total = db.Column(db.Numeric(10, 2), default=0.00)
    notes = db.Column(db.Text)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    expected_delivery_date = db.Column(db.DateTime)
    received_date = db.Column(db.DateTime)
    
    # Relationships
    po_items = db.relationship('PurchaseOrderItem', backref='purchase_order', lazy=True, cascade='all, delete-orphan')
    creator = db.relationship('User', backref='created_purchase_orders', foreign_keys=[created_by])
    
    def to_dict(self):
        return {
            'id': self.id,
            'vendor_id': self.vendor_id,
            'vendor_name': self.vendor.name if self.vendor else None,
            'reference_number': self.reference_number,
            'status': self.status,
            'total': float(self.total),
            'notes': self.notes,
            'created_by': self.created_by,
            'creator_name': self.creator.username if self.creator else None,
            'items': [item.to_dict() for item in self.po_items],
            'item_count': len(self.po_items),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'expected_delivery_date': self.expected_delivery_date.isoformat() if self.expected_delivery_date else None,
            'received_date': self.received_date.isoformat() if self.received_date else None
        }

class PurchaseOrderItem(db.Model):
    __tablename__ = 'purchase_order_items'
    
    id = db.Column(db.Integer, primary_key=True)
    purchase_order_id = db.Column(db.Integer, db.ForeignKey('purchase_orders.id'), nullable=False)
    inventory_id = db.Column(db.Integer, db.ForeignKey('inventory.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(db.Numeric(10, 2), nullable=False)
    total_price = db.Column(db.Numeric(10, 2), nullable=False)
    received_quantity = db.Column(db.Integer, default=0)
    
    # Relationships
    inventory = db.relationship('Inventory', backref='purchase_order_items')
    
    def to_dict(self):
        return {
            'id': self.id,
            'purchase_order_id': self.purchase_order_id,
            'inventory_id': self.inventory_id,
            'product_name': self.inventory.name if self.inventory else 'Unknown',
            'quantity': self.quantity,
            'unit_price': float(self.unit_price),
            'total_price': float(self.total_price),
            'received_quantity': self.received_quantity
        }

class InventoryVendor(db.Model):
    """Association table for the many-to-many relationship between Inventory and Vendor"""
    __tablename__ = 'inventory_vendors'
    
    id = db.Column(db.Integer, primary_key=True)
    inventory_id = db.Column(db.Integer, db.ForeignKey('inventory.id'), nullable=False)
    vendor_id = db.Column(db.Integer, db.ForeignKey('vendors.id'), nullable=False)
    unit_price = db.Column(db.Numeric(10, 2), nullable=False)
    is_preferred = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    inventory = db.relationship('Inventory', backref=db.backref('vendor_associations', lazy='dynamic', cascade='all, delete-orphan'))
    vendor = db.relationship('Vendor', backref=db.backref('inventory_associations', lazy='dynamic', cascade='all, delete-orphan'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'inventory_id': self.inventory_id,
            'vendor_id': self.vendor_id,
            'vendor_name': self.vendor.name if self.vendor else 'Unknown',
            'unit_price': float(self.unit_price),
            'is_preferred': self.is_preferred,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }