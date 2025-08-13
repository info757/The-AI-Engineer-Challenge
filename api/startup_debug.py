#!/usr/bin/env python3
"""
Startup debug script to test if the FastAPI app can be imported and started
"""
import os
import sys

print("=== Startup Debug Script ===")
print(f"Python version: {sys.version}")
print(f"Current working directory: {os.getcwd()}")
print(f"Files in current directory: {os.listdir('.')}")

# Test environment variables
print("\n=== Environment Variables ===")
print(f"OPENAI_API_KEY: {'Set' if os.getenv('OPENAI_API_KEY') else 'Not set'}")
print(f"SECRET_KEY: {'Set' if os.getenv('SECRET_KEY') else 'Not set'}")
print(f"ENCRYPTION_KEY: {'Set' if os.getenv('ENCRYPTION_KEY') else 'Not set'}")
print(f"PORT: {os.getenv('PORT', 'Not set')}")

# Test imports
print("\n=== Testing Imports ===")
try:
    print("Importing FastAPI...")
    from fastapi import FastAPI
    print("✓ FastAPI imported successfully")
except Exception as e:
    print(f"✗ FastAPI import failed: {e}")

try:
    print("Importing database...")
    from database import get_db, create_tables
    print("✓ Database imported successfully")
except Exception as e:
    print(f"✗ Database import failed: {e}")

try:
    print("Importing models...")
    from models import User, UserAPIKey
    print("✓ Models imported successfully")
except Exception as e:
    print(f"✗ Models import failed: {e}")

try:
    print("Importing auth...")
    from auth import verify_password, get_password_hash, create_access_token, verify_token, encrypt_api_key, decrypt_api_key
    print("✓ Auth imported successfully")
except Exception as e:
    print(f"✗ Auth import failed: {e}")

try:
    print("Importing schemas...")
    from schemas import UserCreate, UserLogin, UserResponse, Token, APIKeyCreate, APIKeyResponse, ChatRequest
    print("✓ Schemas imported successfully")
except Exception as e:
    print(f"✗ Schemas import failed: {e}")

try:
    print("Importing OpenAI...")
    from openai import OpenAI
    print("✓ OpenAI imported successfully")
except Exception as e:
    print(f"✗ OpenAI import failed: {e}")

# Test app import
print("\n=== Testing App Import ===")
try:
    print("Importing app...")
    from app import app
    print("✓ App imported successfully")
    print(f"App title: {app.title}")
except Exception as e:
    print(f"✗ App import failed: {e}")
    import traceback
    print(f"Traceback: {traceback.format_exc()}")

print("\n=== Debug Complete ===")
