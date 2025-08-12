# Database models for user management and API key storage
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text
from sqlalchemy.sql import func
from datetime import datetime
from database import Base

class User(Base):
    """User model for authentication and account management"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class UserAPIKey(Base):
    """Encrypted API key storage for users"""
    __tablename__ = "user_api_keys"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    encrypted_api_key = Column(Text, nullable=False)  # Encrypted OpenAI API key
    key_name = Column(String(100), default="Default")  # User can name their keys
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    last_used = Column(DateTime, nullable=True)
