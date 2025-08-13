from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import os

app = FastAPI(title="Simple AI Chat API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Simple AI Chat API is running", "status": "ok"}

@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "port": os.getenv("PORT", "Not set"),
        "openai_key": "Set" if os.getenv("OPENAI_API_KEY") else "Not set"
    }

@app.get("/api/test")
async def test():
    return {"message": "Test endpoint working!"}
