# Import required FastAPI components for building the API
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
# Import Pydantic for data validation and settings management
from pydantic import BaseModel
# Import OpenAI client for interacting with OpenAI's API
from openai import OpenAI
import os
from typing import Optional, AsyncGenerator, Dict

# Get the default API key from environment variable (for demo mode)
DEFAULT_API_KEY = os.getenv("OPENAI_API_KEY", "")

# Initialize FastAPI application with a title
app = FastAPI(title="OpenAI Chat API")

# Configure CORS (Cross-Origin Resource Sharing) middleware
# This allows the API to be accessed from different domains/origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # Allow specific frontend origins
    allow_credentials=False,  # Disable credentials to avoid auth issues
    allow_methods=["GET", "POST", "OPTIONS"],  # Allow specific HTTP methods
    allow_headers=["*"],  # Allows all headers in requests
)

# Define the data model for chat requests using Pydantic
# This ensures incoming request data is properly validated
class ChatRequest(BaseModel):
    developer_message: str  # Message from the developer/system
    user_message: str      # Message from the user
    model: Optional[str] = "gpt-4o-mini"  # Optional model selection with default
    api_key: Optional[str] = None  # Optional API key - if not provided, use default
    use_demo_mode: Optional[bool] = False  # Flag to use demo mode (no API key required)

# Define the main chat endpoint that handles POST requests
@app.post("/api/chat")
async def chat(request: ChatRequest) -> StreamingResponse:
    try:
        # Determine which API key to use
        if request.use_demo_mode:
            # Use demo mode with default API key
            if not DEFAULT_API_KEY:
                raise HTTPException(status_code=500, detail="Demo mode not available - no default API key configured")
            api_key_to_use = DEFAULT_API_KEY
            print("Using demo mode with default API key")
        elif request.api_key:
            # Use user-provided API key
            api_key_to_use = request.api_key
            api_key_preview = api_key_to_use[:10] + "..." if len(api_key_to_use) > 10 else api_key_to_use
            print(f"Using user-provided API key: {api_key_preview}")
        else:
            # Try to use default API key if available
            if DEFAULT_API_KEY:
                api_key_to_use = DEFAULT_API_KEY
                print("No API key provided, using default API key")
            else:
                raise HTTPException(status_code=400, detail="No API key provided and no default key available")
        
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

# Entry point for running the application directly
if __name__ == "__main__":
    import uvicorn
    # Start the server on all network interfaces (0.0.0.0) on port 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)
