# Import required FastAPI components for building the API
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
# Import database and models
from database import get_db, create_tables
from models import User, UserAPIKey
from schemas import UserCreate, UserLogin, UserResponse, Token, APIKeyCreate, APIKeyResponse, ChatRequest
from auth import verify_password, get_password_hash, create_access_token, verify_token, encrypt_api_key, decrypt_api_key
# Import OpenAI client for interacting with OpenAI's API
from openai import OpenAI
import os
from typing import Optional, AsyncGenerator, Dict
from sqlalchemy.orm import Session
from datetime import datetime

# Get the default API key from environment variable (for demo mode)
DEFAULT_API_KEY = os.getenv("OPENAI_API_KEY", "")

# Security scheme for JWT tokens
security = HTTPBearer()

# Initialize FastAPI application with a title
app = FastAPI(title="AI Chat API with User Management")

# Create database tables on startup
@app.on_event("startup")
async def startup_event():
    create_tables()

# Configure CORS (Cross-Origin Resource Sharing) middleware
# This allows the API to be accessed from different domains/origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # Allow specific frontend origins
    allow_credentials=False,  # Disable credentials to avoid auth issues
    allow_methods=["GET", "POST", "OPTIONS"],  # Allow specific HTTP methods
    allow_headers=["*"],  # Allows all headers in requests
)

# Helper function to get current user from JWT token
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    """Get current user from JWT token"""
    token = credentials.credentials
    payload = verify_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    username: str = payload.get("sub")
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

# User authentication endpoints
@app.post("/api/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    # Check if user already exists
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    hashed_password = get_password_hash(user.password)
    db_user = User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/api/login", response_model=Token)
def login(user_credentials: UserLogin, db: Session = Depends(get_db)):
    """Login user and return JWT token"""
    user = db.query(User).filter(User.username == user_credentials.username).first()
    if not user or not verify_password(user_credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user

# API key management endpoints
@app.post("/api/api-keys", response_model=APIKeyResponse)
def create_api_key(api_key_data: APIKeyCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Create a new API key for the current user"""
    encrypted_key = encrypt_api_key(api_key_data.api_key)
    db_api_key = UserAPIKey(
        user_id=current_user.id,
        encrypted_api_key=encrypted_key,
        key_name=api_key_data.key_name
    )
    db.add(db_api_key)
    db.commit()
    db.refresh(db_api_key)
    return db_api_key

@app.get("/api/api-keys", response_model=list[APIKeyResponse])
def get_user_api_keys(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all API keys for the current user"""
    api_keys = db.query(UserAPIKey).filter(UserAPIKey.user_id == current_user.id).all()
    return api_keys

@app.delete("/api/api-keys/{key_id}")
def delete_api_key(key_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Delete an API key"""
    api_key = db.query(UserAPIKey).filter(
        UserAPIKey.id == key_id,
        UserAPIKey.user_id == current_user.id
    ).first()
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")
    
    db.delete(api_key)
    db.commit()
    return {"message": "API key deleted successfully"}

# Define the main chat endpoint that handles POST requests
@app.post("/api/chat")
async def chat(request: ChatRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> StreamingResponse:
    try:
        # Determine which API key to use
        if request.use_demo_mode:
            # Use demo mode with default API key
            if not DEFAULT_API_KEY:
                raise HTTPException(status_code=500, detail="Demo mode not available - no default API key configured")
            api_key_to_use = DEFAULT_API_KEY
            print("Using demo mode with default API key")
        elif request.api_key_id:
            # Use user's stored API key
            user_api_key = db.query(UserAPIKey).filter(
                UserAPIKey.id == request.api_key_id,
                UserAPIKey.user_id == current_user.id,
                UserAPIKey.is_active == True
            ).first()
            if not user_api_key:
                raise HTTPException(status_code=404, detail="API key not found or not accessible")
            
            api_key_to_use = decrypt_api_key(user_api_key.encrypted_api_key)
            # Update last used timestamp
            user_api_key.last_used = datetime.utcnow()
            db.commit()
            print(f"Using user's stored API key: {user_api_key.key_name}")
        else:
            # Try to use user's default API key
            default_key = db.query(UserAPIKey).filter(
                UserAPIKey.user_id == current_user.id,
                UserAPIKey.is_active == True
            ).first()
            if default_key:
                api_key_to_use = decrypt_api_key(default_key.encrypted_api_key)
                default_key.last_used = datetime.utcnow()
                db.commit()
                print(f"Using user's default API key: {default_key.key_name}")
            elif DEFAULT_API_KEY:
                api_key_to_use = DEFAULT_API_KEY
                print("No user API key found, using default API key")
            else:
                raise HTTPException(status_code=400, detail="No API key available. Please add an API key in settings or use demo mode.")
        
        # Initialize OpenAI client with the determined API key
        client = OpenAI(api_key=api_key_to_use)
        
        # Create an async generator function for streaming responses
        async def generate() -> AsyncGenerator[str, None]:
            # Create a streaming chat completion request
            stream = client.chat.completions.create(
                model=request.model,
                messages=[
                    {"role": "system", "content": request.developer_message},
                    {"role": "user", "content": request.user_message}
                ],
                stream=True  # Enable streaming response
            )
            
            # Yield each chunk of the response as it becomes available
            for chunk in stream:
                if chunk.choices[0].delta.content is not None:
                    yield chunk.choices[0].delta.content

        # Return a streaming response to the client
        return StreamingResponse(generate(), media_type="text/plain")
    
    except Exception as e:
        # Handle any errors that occur during processing
        print(f"Error in chat endpoint: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        print(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

# Define a health check endpoint to verify API status
@app.get("/api/health")
async def health_check() -> Dict[str, str]:
    return {"status": "ok"}

# Define an endpoint to check demo mode availability
@app.get("/api/demo-status")
async def demo_status() -> Dict[str, bool]:
    return {"demo_available": bool(DEFAULT_API_KEY)}

# Demo mode chat endpoint (no authentication required)
@app.post("/api/chat-demo")
async def chat_demo(request: ChatRequest) -> StreamingResponse:
    """Chat endpoint for demo mode (no authentication required)"""
    if not request.use_demo_mode:
        raise HTTPException(status_code=400, detail="Demo mode must be enabled for this endpoint")
    
    if not DEFAULT_API_KEY:
        raise HTTPException(status_code=500, detail="Demo mode not available - no default API key configured")
    
    try:
        # Initialize OpenAI client with the default API key
        client = OpenAI(api_key=DEFAULT_API_KEY)
        
        # Create an async generator function for streaming responses
        async def generate() -> AsyncGenerator[str, None]:
            # Create a streaming chat completion request
            stream = client.chat.completions.create(
                model=request.model,
                messages=[
                    {"role": "system", "content": request.developer_message},
                    {"role": "user", "content": request.user_message}
                ],
                stream=True  # Enable streaming response
            )
            
            # Yield each chunk of the response as it becomes available
            for chunk in stream:
                if chunk.choices[0].delta.content is not None:
                    yield chunk.choices[0].delta.content

        # Return a streaming response to the client
        return StreamingResponse(generate(), media_type="text/plain")
    
    except Exception as e:
        # Handle any errors that occur during processing
        print(f"Error in demo chat endpoint: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        print(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

# Entry point for running the application directly
if __name__ == "__main__":
    import uvicorn
    # Start the server on all network interfaces (0.0.0.0) on port 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)
