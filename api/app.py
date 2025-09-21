# Import required FastAPI components for building the API
import sys
from fastapi import FastAPI, HTTPException, Depends, status, UploadFile, File
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
import tempfile
import shutil
from typing import Optional, AsyncGenerator, Dict, List
from sqlalchemy.orm import Session
from datetime import datetime
# Import RAG service
from rag_service import get_rag_service

# Get the default API key from environment variable (for demo mode)
DEFAULT_API_KEY = os.getenv("OPENAI_API_KEY", "")

# Security scheme for JWT tokens
security = HTTPBearer()

# Check Python version compatibility
if sys.version_info < (3, 8):
    raise RuntimeError("Python 3.8 or higher is required")

# Initialize FastAPI application with a title
app = FastAPI(title="AI Chat API with User Management")

# Simple root endpoint for basic connectivity
@app.get("/")
async def root():
    return {"message": "AI Chat API is running", "status": "ok"}

# Create database tables on startup
@app.on_event("startup")
async def startup_event():
    try:
        print("Starting up AI Chat API...")
        print(f"Python version: {sys.version}")
        print(f"OpenAI API Key configured: {'Yes' if DEFAULT_API_KEY else 'No'}")
        print(f"SECRET_KEY configured: {'Yes' if os.getenv('SECRET_KEY') else 'No'}")
        print(f"ENCRYPTION_KEY configured: {'Yes' if os.getenv('ENCRYPTION_KEY') else 'No'}")
        
        # Create database tables
        try:
            create_tables()
            print("Database tables created successfully")
        except Exception as db_error:
            print(f"Database error (non-critical): {db_error}")
        
        print("Startup completed successfully!")
    except Exception as e:
        print(f"Error during startup: {e}")
        import traceback
        print(f"Startup traceback: {traceback.format_exc()}")
        # Don't raise the error, just log it

# Configure CORS (Cross-Origin Resource Sharing) middleware
# This allows the API to be accessed from different domains/origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for Railway deployment
    allow_credentials=False,  # Disable credentials to avoid auth issues
    allow_methods=["GET", "POST", "OPTIONS"],  # Allow specific HTTP methods
    allow_headers=["*"],  # Allows all headers in requests
)

# Helper function to get current user from JWT token
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    """Get current user from JWT token"""
    try:
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
    except Exception as e:
        print(f"Error in get_current_user: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"},
        )

# User authentication endpoints
@app.post("/api/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    try:
        print(f"Registration attempt for email: {user.email}")
        
        # Auto-generate username from email if not provided
        username = user.username or user.email.split('@')[0]
        print(f"Generated username: {username}")
        
        # Check if user already exists
        db_user = db.query(User).filter(User.username == username).first()
        if db_user:
            print(f"Username already exists: {username}")
            raise HTTPException(status_code=400, detail="Username already registered")
        
        db_user = db.query(User).filter(User.email == user.email).first()
        if db_user:
            print(f"Email already exists: {user.email}")
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Create new user
        print("Hashing password...")
        hashed_password = get_password_hash(user.password)
        print("Password hashed successfully")
        
        print("Creating user object...")
        db_user = User(
            username=username,
            email=user.email,
            hashed_password=hashed_password
        )
        
        print("Adding user to database...")
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        print(f"User created successfully with ID: {db_user.id}")
        
        return db_user
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        print(f"Detailed error in register: {type(e).__name__}: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

@app.post("/api/login", response_model=Token)
def login(user_credentials: UserLogin, db: Session = Depends(get_db)):
    """Login user and return JWT token"""
    try:
        user = db.query(User).filter(User.email == user_credentials.email).first()
        if not user or not verify_password(user_credentials.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        access_token = create_access_token(data={"sub": user.username})
        return {"access_token": access_token, "token_type": "bearer"}
    except Exception as e:
        print(f"Error in login: {e}")
        raise HTTPException(status_code=500, detail="Login failed")

@app.get("/api/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user

# API key management endpoints
@app.post("/api/api-keys", response_model=APIKeyResponse)
def create_api_key(api_key_data: APIKeyCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Create a new API key for the current user"""
    try:
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
    except Exception as e:
        print(f"Error in create_api_key: {e}")
        print(f"ENCRYPTION_KEY configured: {'Yes' if os.getenv('ENCRYPTION_KEY') else 'No'}")
        raise HTTPException(status_code=500, detail=f"Failed to create API key: {str(e)}")

@app.get("/api/api-keys", response_model=List[APIKeyResponse])
def get_user_api_keys(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all API keys for the current user"""
    try:
        api_keys = db.query(UserAPIKey).filter(UserAPIKey.user_id == current_user.id).all()
        return api_keys
    except Exception as e:
        print(f"Error in get_user_api_keys: {e}")
        raise HTTPException(status_code=500, detail="Failed to get API keys")

@app.delete("/api/api-keys/{key_id}")
def delete_api_key(key_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Delete an API key for the current user"""
    try:
        api_key = db.query(UserAPIKey).filter(
            UserAPIKey.id == key_id,
            UserAPIKey.user_id == current_user.id
        ).first()
        if not api_key:
            raise HTTPException(status_code=404, detail="API key not found")
        
        db.delete(api_key)
        db.commit()
        return {"message": "API key deleted successfully"}
    except Exception as e:
        print(f"Error in delete_api_key: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete API key")

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
            if api_key_to_use == "invalid-key":
                raise HTTPException(status_code=500, detail="API key decryption failed. Please re-add your API key.")
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
                if api_key_to_use == "invalid-key":
                    raise HTTPException(status_code=500, detail="API key decryption failed. Please re-add your API key.")
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
    try:
        # Basic health check without database access
        return {
            "status": "ok",
            "timestamp": datetime.utcnow().isoformat(),
            "openai_configured": "Yes" if DEFAULT_API_KEY else "No",
            "secret_key_configured": "Yes" if os.getenv("SECRET_KEY") else "No",
            "encryption_key_configured": "Yes" if os.getenv("ENCRYPTION_KEY") else "No"
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }

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
        print(f"Error in chat_demo endpoint: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        print(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

# PDF Upload endpoint
@app.post("/api/upload-pdf")
async def upload_pdf(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload and process a PDF file for RAG system"""
    try:
        # Validate file type
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
        # Get user's API key for RAG processing
        user_api_key = db.query(UserAPIKey).filter(
            UserAPIKey.user_id == current_user.id,
            UserAPIKey.is_active == True
        ).first()
        
        if not user_api_key:
            # Try to use default API key if available
            if not DEFAULT_API_KEY:
                raise HTTPException(
                    status_code=400, 
                    detail="No API key available. Please add an API key in settings or ensure demo mode is configured."
                )
            api_key_to_use = DEFAULT_API_KEY
        else:
            api_key_to_use = decrypt_api_key(user_api_key.encrypted_api_key)
            if api_key_to_use == "invalid-key":
                raise HTTPException(status_code=500, detail="API key decryption failed. Please re-add your API key.")
        
        # Create temporary file to store uploaded PDF
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
            # Copy uploaded file to temporary file
            shutil.copyfileobj(file.file, temp_file)
            temp_file_path = temp_file.name
        
        try:
            # Get RAG service for this user
            rag_service = get_rag_service(str(current_user.id), api_key_to_use)
            
            # Process the PDF
            result = await rag_service.process_pdf(temp_file_path)
            
            if result["success"]:
                return {
                    "message": "PDF uploaded and processed successfully",
                    "chunks_created": result["chunks_created"],
                    "total_characters": result["total_characters"],
                    "filename": file.filename
                }
            else:
                raise HTTPException(status_code=500, detail=result["error"])
                
        finally:
            # Clean up temporary file
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
    
    except Exception as e:
        print(f"Error in upload_pdf endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# RAG Chat endpoint
@app.post("/api/chat-rag")
async def chat_rag(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> StreamingResponse:
    """Chat with uploaded PDF using RAG system"""
    try:
        # Get user's API key
        user_api_key = db.query(UserAPIKey).filter(
            UserAPIKey.user_id == current_user.id,
            UserAPIKey.is_active == True
        ).first()
        
        if not user_api_key:
            if not DEFAULT_API_KEY:
                raise HTTPException(
                    status_code=400, 
                    detail="No API key available. Please add an API key in settings or ensure demo mode is configured."
                )
            api_key_to_use = DEFAULT_API_KEY
        else:
            api_key_to_use = decrypt_api_key(user_api_key.encrypted_api_key)
            if api_key_to_use == "invalid-key":
                raise HTTPException(status_code=500, detail="API key decryption failed. Please re-add your API key.")
        
        # Get RAG service for this user
        rag_service = get_rag_service(str(current_user.id), api_key_to_use)
        
        # Check if RAG system is initialized
        status = rag_service.get_status()
        if not status["vector_db_initialized"]:
            raise HTTPException(
                status_code=400, 
                detail="No PDF uploaded. Please upload a PDF first before using RAG chat."
            )
        
        # Create streaming response using RAG
        async def generate() -> AsyncGenerator[str, None]:
            async for chunk in rag_service.generate_rag_response_stream(request.user_message):
                yield chunk
        
        return StreamingResponse(generate(), media_type="text/plain")
    
    except Exception as e:
        print(f"Error in chat_rag endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# RAG Status endpoint
@app.get("/api/rag-status")
async def get_rag_status(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get the current status of the RAG system for the user"""
    try:
        # Get user's API key
        user_api_key = db.query(UserAPIKey).filter(
            UserAPIKey.user_id == current_user.id,
            UserAPIKey.is_active == True
        ).first()
        
        if not user_api_key:
            if not DEFAULT_API_KEY:
                return {"status": "no_api_key", "message": "No API key available"}
            api_key_to_use = DEFAULT_API_KEY
        else:
            api_key_to_use = decrypt_api_key(user_api_key.encrypted_api_key)
            if api_key_to_use == "invalid-key":
                return {"status": "api_key_error", "message": "API key decryption failed"}
        
        # Get RAG service for this user
        rag_service = get_rag_service(str(current_user.id), api_key_to_use)
        status = rag_service.get_status()
        
        return {
            "status": "ok",
            "rag_initialized": status["vector_db_initialized"],
            "documents_uploaded": status["documents_uploaded"],
            "total_chunks": status["total_chunks"]
        }
    
    except Exception as e:
        print(f"Error in get_rag_status endpoint: {e}")
        return {"status": "error", "message": str(e)}

# Clear RAG documents endpoint
@app.delete("/api/rag-clear")
async def clear_rag_documents(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Clear all uploaded documents from the RAG system"""
    try:
        # Get user's API key
        user_api_key = db.query(UserAPIKey).filter(
            UserAPIKey.user_id == current_user.id,
            UserAPIKey.is_active == True
        ).first()
        
        if not user_api_key:
            if not DEFAULT_API_KEY:
                raise HTTPException(
                    status_code=400, 
                    detail="No API key available. Please add an API key in settings or ensure demo mode is configured."
                )
            api_key_to_use = DEFAULT_API_KEY
        else:
            api_key_to_use = decrypt_api_key(user_api_key.encrypted_api_key)
            if api_key_to_use == "invalid-key":
                raise HTTPException(status_code=500, detail="API key decryption failed. Please re-add your API key.")
        
        # Get RAG service for this user and clear documents
        rag_service = get_rag_service(str(current_user.id), api_key_to_use)
        rag_service.clear_documents()
        
        return {"message": "RAG documents cleared successfully"}
    
    except Exception as e:
        print(f"Error in clear_rag_documents endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Entry point for running the application directly
if __name__ == "__main__":
    import uvicorn
    # Start the server on all network interfaces (0.0.0.0) on port 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)
