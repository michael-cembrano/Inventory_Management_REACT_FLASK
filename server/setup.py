import subprocess
import sys
import os
import time

def install_requirements():
    """Install required packages"""
    try:
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt'])
        print("✅ Requirements installed successfully!")
    except subprocess.CalledProcessError:
        print("❌ Failed to install requirements")
        return False
    return True

def create_env_file():
    """Create .env file if it doesn't exist"""
    if not os.path.exists('.env'):
        with open('.env', 'w') as f:
            f.write('JWT_SECRET_KEY=your-super-secret-jwt-key-change-this-in-production\n')
            f.write('FRONTEND_URL=http://localhost:5173\n')
            f.write('FLASK_ENV=development\n')
        print("✅ Created .env file")
    else:
        print("ℹ️ .env file already exists")

def initialize_database():
    """Initialize the SQLite database"""
    try:
        print("📊 Initializing SQLite database...")
        
        # Import here to avoid issues if dependencies aren't installed yet
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        
        try:
            from app import app
            from database import init_database
            from models import db, User, Category, Inventory, Order
        except ImportError as e:
            print(f"❌ Import error: {e}")
            print("Make sure all dependencies are installed and files exist")
            return False
        
        # Handle existing database file
        db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'inventory.db')
        if os.path.exists(db_path):
            print("🗑️ Existing database file found, attempting to remove...")
            try:
                # Try to close any existing connections first
                with app.app_context():
                    try:
                        db.session.close()
                        db.engine.dispose()
                    except:
                        pass  # Ignore errors if no connections exist
                
                # Wait a moment for connections to close
                time.sleep(1)
                
                # Try to remove the file
                os.remove(db_path)
                print("✅ Removed existing database file")
            except PermissionError:
                print("⚠️ Cannot remove existing database file (in use by another process)")
                print("   Please close any running Flask applications or database tools")
                print("   and try again, or rename the existing file manually.")
                
                # Try to rename instead of delete
                try:
                    backup_path = db_path + '.backup.' + str(int(time.time()))
                    os.rename(db_path, backup_path)
                    print(f"✅ Renamed existing database to: {backup_path}")
                except Exception as e:
                    print(f"❌ Could not rename database file: {e}")
                    print("   You may need to manually close other processes using the database")
                    return False
            except Exception as e:
                print(f"❌ Error handling existing database file: {e}")
                return False
        
        # Initialize database within app context
        with app.app_context():
            print("🔧 Creating database tables...")
            try:
                db.create_all()
                print("✅ Database tables created successfully")
            except Exception as e:
                print(f"❌ Error creating database tables: {e}")
                return False
            
            print("📝 Inserting sample data...")
            try:
                init_database(app)
                print("✅ Sample data inserted successfully")
            except Exception as e:
                print(f"❌ Error inserting sample data: {e}")
                return False
            
            # Verify data was inserted
            print("🔍 Verifying data insertion...")
            try:
                user_count = User.query.count()
                category_count = Category.query.count()
                inventory_count = Inventory.query.count()
                order_count = Order.query.count()
                
                print(f"📊 Verification Results:")
                print(f"   - Users: {user_count}")
                print(f"   - Categories: {category_count}")
                print(f"   - Inventory Items: {inventory_count}")
                print(f"   - Orders: {order_count}")
                
                if user_count > 0 and category_count > 0 and inventory_count > 0:
                    print("✅ Database initialized and verified successfully!")
                    return True
                else:
                    print("❌ Database verification failed - some data missing")
                    return False
            except Exception as e:
                print(f"❌ Error during verification: {e}")
                return False
                
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
        import traceback
        print(f"📋 Full error trace:")
        traceback.print_exc()
        return False

def verify_setup():
    """Verify the setup is working correctly"""
    try:
        print("🔍 Final verification...")
        
        # Check if database file exists
        db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'inventory.db')
        if not os.path.exists(db_path):
            print("❌ Database file not found")
            return False
        
        # Try to connect and query
        from app import app
        from models import db, User, Category, Inventory
        
        with app.app_context():
            # Test queries
            users = User.query.all()
            categories = Category.query.all()
            inventory_items = Inventory.query.all()
            
            print(f"✅ Final verification passed:")
            print(f"   - Database file: {db_path}")
            print(f"   - Users available: {len(users)}")
            print(f"   - Categories available: {len(categories)}")
            print(f"   - Inventory items available: {len(inventory_items)}")
            
            # Show sample user for login testing
            if users:
                admin_user = next((u for u in users if u.role == 'admin'), users[0])
                print(f"   - Admin user: {admin_user.username}")
            
            return True
            
    except Exception as e:
        print(f"❌ Verification failed: {e}")
        return False

def main():
    print("🚀 Setting up Flask Inventory Management API...")
    
    if install_requirements():
        create_env_file()
        
        if initialize_database():
            if verify_setup():
                print("\n🎉 Setup complete!")
                print("\n" + "="*50)
                print("📋 SETUP SUMMARY")
                print("="*50)
                print("✅ Requirements installed")
                print("✅ Environment file created")
                print("✅ SQLite database initialized")
                print("✅ Sample data loaded and verified")
                print("\n📖 HOW TO START:")
                print("python app.py")
                print("\n🔑 DEFAULT LOGIN CREDENTIALS:")
                print("Username: admin")
                print("Password: admin123")
                print("\n👥 OTHER TEST USERS:")
                print("manager1 / manager123")
                print("staff1 / staff123")
                print("\n🌐 API ENDPOINTS:")
                print("API Base URL: http://localhost:5001")
                print("Health Check: http://localhost:5001/api/health")
                print("\n📊 DATABASE:")
                print("Type: SQLite")
                print("File: ./inventory.db")
                print("Tables: users, categories, inventory, orders, order_items, audit_logs")
                print("\n📁 SAMPLE DATA INCLUDED:")
                print("- 3 users (admin, manager1, staff1)")
                print("- 6 categories")
                print("- 14 inventory items")
                print("- 3 sample orders")
                print("- 3 vendors")
                print("- 3 purchase orders")
                print("="*50)
                print("\n💡 TROUBLESHOOTING:")
                print("- If database errors persist, make sure no other Flask apps are running")
                print("- Check that no database browser tools have the file open")
                print("- You can manually delete inventory.db and run setup.py again")
            else:
                print("\n❌ Setup completed but verification failed!")
                print("Try running 'python app.py' to see if the server starts correctly.")
        else:
            print("\n❌ Setup failed during database initialization!")
            print("Please check the error messages above and try again.")
            print("\n💡 If database file is locked:")
            print("1. Close any running Flask applications")
            print("2. Close any database browser tools")
            print("3. Manually delete inventory.db if needed")
            print("4. Run setup.py again")
    else:
        print("\n❌ Setup failed during requirements installation!")

if __name__ == '__main__':
    main()
