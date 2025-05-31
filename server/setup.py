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

def main():
    print("🚀 Setting up Flask API...")
    
    if install_requirements():
        create_env_file()
        print("\n🎉 Setup complete!")
        print("\nTo start the server, run:")
        print("python app.py")
        print("\nDefault login credentials:")
        print("Username: admin")
        print("Password: admin123")
        print("\nAPI will be available at: http://localhost:5001")
    else:
        print("\n❌ Setup failed!")

if __name__ == '__main__':
    main()
