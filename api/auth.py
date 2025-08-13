# Authentication utilities for password hashing, JWT tokens, and API key encryption
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
import os
from cryptography.fernet import Fernet
import base64

# Password hashing configuration
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# API key encryption - ensure we have a stable key
def get_encryption_key():
    """Get or generate a stable encryption key"""
    encryption_key = os.getenv("ENCRYPTION_KEY")
    if not encryption_key:
        # Generate a new key and log a warning
        print("WARNING: ENCRYPTION_KEY not set. Generating new key. Existing encrypted data may not be accessible.")
        new_key = Fernet.generate_key()
        print(f"Generated new encryption key: {new_key.decode()}")
        return new_key
    
    # If the key is a string, try to use it
    if isinstance(encryption_key, str):
        try:
            # Try to decode it as base64
            return base64.b64decode(encryption_key.encode())
        except:
            # If not valid base64, generate a new key
            print("WARNING: Invalid ENCRYPTION_KEY format. Generating new key.")
            new_key = Fernet.generate_key()
            print(f"Generated new encryption key: {new_key.decode()}")
            return new_key
    
    return encryption_key

ENCRYPTION_KEY = get_encryption_key()
cipher_suite = Fernet(ENCRYPTION_KEY)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> Optional[dict]:
    """Verify and decode a JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

def encrypt_api_key(api_key: str) -> str:
    """Encrypt an API key for secure storage"""
    try:
        encrypted_key = cipher_suite.encrypt(api_key.encode())
        return base64.b64encode(encrypted_key).decode()
    except Exception as e:
        print(f"Error encrypting API key: {e}")
        raise

def decrypt_api_key(encrypted_api_key: str) -> str:
    """Decrypt an API key for use"""
    try:
        encrypted_bytes = base64.b64decode(encrypted_api_key.encode())
        decrypted_key = cipher_suite.decrypt(encrypted_bytes)
        return decrypted_key.decode()
    except Exception as e:
        print(f"Error decrypting API key: {e}")
        # Return a placeholder to prevent crashes
        return "invalid-key"
