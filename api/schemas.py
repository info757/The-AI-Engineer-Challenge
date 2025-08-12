# Pydantic schemas for request/response validation
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# User authentication schemas
class UserCreate(BaseModel):
    """Schema for user registration"""
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    """Schema for user login"""
    username: str
    password: str

class UserResponse(BaseModel):
    """Schema for user response (without sensitive data)"""
    id: int
    username: str
    email: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    """Schema for JWT token response"""
    access_token: str
    token_type: str

class TokenData(BaseModel):
    """Schema for token payload data"""
    username: Optional[str] = None

# API key management schemas
class APIKeyCreate(BaseModel):
    """Schema for creating a new API key"""
    api_key: str
    key_name: Optional[str] = "Default"

class APIKeyResponse(BaseModel):
    """Schema for API key response (without the actual key)"""
    id: int
    key_name: str
    is_active: bool
    created_at: datetime
    last_used: Optional[datetime]

    class Config:
        from_attributes = True

# Chat request schema (updated for new system)
class ChatRequest(BaseModel):
    """Schema for chat requests (no longer needs API key)"""
    developer_message: str
    user_message: str
    model: Optional[str] = "gpt-4o-mini"
    use_demo_mode: Optional[bool] = False
    api_key_id: Optional[int] = None  # ID of the user's stored API key to use
