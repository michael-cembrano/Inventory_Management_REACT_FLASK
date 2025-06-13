import subprocess
import sys
import os

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
        from app import app
        from database import init_database
        
        with app.app_context():
            init_database(app)
        
        print("✅ Database initialized successfully!")
        return True
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
        return False

def main():
    print("🚀 Setting up Flask Inventory Management API...")
    
    if install_requirements():
        create_env_file()
        
        if initialize_database():
            print("\n🎉 Setup complete!")
            print("\n" + "="*50)
            print("📋 SETUP SUMMARY")
            print("="*50)
            print("✅ Requirements installed")
            print("✅ Environment file created")
            print("✅ SQLite database initialized")
            print("✅ Sample data loaded")
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
            print("="*50)
        else:
            print("\n❌ Setup failed during database initialization!")
    else:
        print("\n❌ Setup failed during requirements installation!")

if __name__ == '__main__':
    main()
