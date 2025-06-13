#!/usr/bin/env python3
"""
Database migration utility for Flask Inventory Management System
"""

import os
import sys
import sqlite3
from datetime import datetime

def backup_database():
    """Create a backup of the current database"""
    if os.path.exists('inventory.db'):
        backup_name = f'inventory_backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}.db'
        os.system(f'cp inventory.db {backup_name}')
        print(f"✅ Database backed up to {backup_name}")
        return backup_name
    return None

def check_database_version():
    """Check the current database version"""
    try:
        conn = sqlite3.connect('inventory.db')
        cursor = conn.cursor()
        
        # Check if version table exists
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='database_version'
        """)
        
        if cursor.fetchone():
            cursor.execute("SELECT version FROM database_version ORDER BY id DESC LIMIT 1")
            version = cursor.fetchone()
            conn.close()
            return version[0] if version else '1.0.0'
        else:
            conn.close()
            return '1.0.0'
    except Exception as e:
        print(f"Error checking database version: {e}")
        return '1.0.0'

def create_version_table():
    """Create version tracking table"""
    try:
        conn = sqlite3.connect('inventory.db')
        cursor = conn.cursor()
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS database_version (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                version TEXT NOT NULL,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                description TEXT
            )
        """)
        
        # Insert initial version if table is empty
        cursor.execute("SELECT COUNT(*) FROM database_version")
        if cursor.fetchone()[0] == 0:
            cursor.execute("""
                INSERT INTO database_version (version, description) 
                VALUES ('1.0.0', 'Initial database schema')
            """)
        
        conn.commit()
        conn.close()
        print("✅ Version tracking table created")
    except Exception as e:
        print(f"Error creating version table: {e}")

def migrate_to_1_1_0():
    """Migration to version 1.1.0 - Add indexes for better performance"""
    try:
        conn = sqlite3.connect('inventory.db')
        cursor = conn.cursor()
        
        # Add indexes
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(category_id)",
            "CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory(sku)",
            "CREATE INDEX IF NOT EXISTS idx_inventory_active ON inventory(is_active)",
            "CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)",
            "CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at)",
            "CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at)"
        ]
        
        for index_sql in indexes:
            cursor.execute(index_sql)
        
        # Update version
        cursor.execute("""
            INSERT INTO database_version (version, description) 
            VALUES ('1.1.0', 'Added performance indexes')
        """)
        
        conn.commit()
        conn.close()
        print("✅ Migrated to version 1.1.0 - Performance indexes added")
        return True
    except Exception as e:
        print(f"Error migrating to 1.1.0: {e}")
        return False

def run_migrations():
    """Run all pending migrations"""
    current_version = check_database_version()
    print(f"Current database version: {current_version}")
    
    # Create version table if it doesn't exist
    create_version_table()
    
    # Create backup before migrations
    backup_file = backup_database()
    
    migrations_applied = 0
    
    # Run migrations based on current version
    if current_version < '1.1.0':
        if migrate_to_1_1_0():
            migrations_applied += 1
    
    if migrations_applied > 0:
        print(f"✅ Applied {migrations_applied} migrations successfully")
        new_version = check_database_version()
        print(f"Database updated to version: {new_version}")
    else:
        print("ℹ️ Database is up to date")
        if backup_file and os.path.exists(backup_file):
            os.remove(backup_file)
            print("🗑️ Backup file removed (no migrations needed)")

def reset_database():
    """Reset database to initial state"""
    if input("⚠️ This will delete all data. Are you sure? (yes/no): ").lower() == 'yes':
        if os.path.exists('inventory.db'):
            backup_database()
            os.remove('inventory.db')
            print("✅ Database reset")
            
            # Reinitialize
            from app import app
            from database import init_database
            
            with app.app_context():
                init_database(app)
            print("✅ Database reinitialized with sample data")
        else:
            print("ℹ️ No database file found")
    else:
        print("❌ Reset cancelled")

def show_database_info():
    """Show database information"""
    if not os.path.exists('inventory.db'):
        print("❌ Database file not found")
        return
    
    conn = sqlite3.connect('inventory.db')
    cursor = conn.cursor()
    
    # Get table information
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cursor.fetchall()
    
    print("\n📊 DATABASE INFORMATION")
    print("="*40)
    print(f"Database file: inventory.db")
    print(f"File size: {os.path.getsize('inventory.db')} bytes")
    print(f"Version: {check_database_version()}")
    print(f"Tables: {len(tables)}")
    
    for table in tables:
        table_name = table[0]
        cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
        count = cursor.fetchone()[0]
        print(f"  - {table_name}: {count} records")
    
    conn.close()

def main():
    if len(sys.argv) < 2:
        print("Database Migration Utility")
        print("Usage:")
        print("  python migrate.py migrate    - Run pending migrations")
        print("  python migrate.py reset      - Reset database")
        print("  python migrate.py info       - Show database info")
        print("  python migrate.py backup     - Create database backup")
        return
    
    command = sys.argv[1].lower()
    
    if command == 'migrate':
        run_migrations()
    elif command == 'reset':
        reset_database()
    elif command == 'info':
        show_database_info()
    elif command == 'backup':
        backup_file = backup_database()
        if backup_file:
            print(f"✅ Backup created: {backup_file}")
    else:
        print(f"❌ Unknown command: {command}")

if __name__ == '__main__':
    main()