#!/usr/bin/env python3
"""
Setup script for AI Chat API
Compatible with Python 3.8+
"""

import subprocess
import sys
import os

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 8):
        print("❌ Error: Python 3.8 or higher is required")
        print(f"Current version: {sys.version}")
        sys.exit(1)
    print(f"✅ Python version {sys.version.split()[0]} is compatible")

def install_requirements():
    """Install required packages"""
    print("📦 Installing dependencies...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ Dependencies installed successfully")
    except subprocess.CalledProcessError:
        print("❌ Failed to install dependencies")
        sys.exit(1)

def create_env_file():
    """Create .env file if it doesn't exist"""
    env_file = ".env"
    if not os.path.exists(env_file):
        print("🔧 Creating .env file...")
        with open(env_file, "w") as f:
            f.write("# Environment variables for AI Chat API\n")
            f.write("# Add your OpenAI API key here:\n")
            f.write("# OPENAI_API_KEY=your-api-key-here\n")
            f.write("# SECRET_KEY=your-secret-key-here\n")
            f.write("# ENCRYPTION_KEY=your-encryption-key-here\n")
        print("✅ .env file created")
    else:
        print("✅ .env file already exists")

def main():
    print("🚀 Setting up AI Chat API...")
    print("=" * 40)
    
    check_python_version()
    install_requirements()
    create_env_file()
    
    print("=" * 40)
    print("✅ Setup complete!")
    print("\n📝 Next steps:")
    print("1. Edit .env file and add your OpenAI API key")
    print("2. Run: python3 -m uvicorn app:app --reload --host 127.0.0.1 --port 8000")
    print("3. Open http://localhost:8000/docs to test the API")

if __name__ == "__main__":
    main()
