# AI Chat API - Dual Mode Backend

This FastAPI backend supports two modes of operation:

## 🔑 User API Key Mode
Users provide their own OpenAI API key for full control and privacy.

## 🎯 Demo Mode  
Uses a pre-configured API key for easy testing and demonstration.

## Setup Instructions

### For Demo Mode (Recommended for testing):
1. Set your OpenAI API key as an environment variable:
   ```bash
   export OPENAI_API_KEY="sk-your-api-key-here"
   ```

2. For Vercel deployment, add the environment variable in your Vercel dashboard:
   - Go to your project settings
   - Add environment variable: `OPENAI_API_KEY`
   - Set the value to your OpenAI API key

### For Local Development:
1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Set the environment variable:
   ```bash
   export OPENAI_API_KEY="sk-your-api-key-here"
   ```

3. Run the server:
   ```bash
   cd api
   uvicorn app:app --reload --host 0.0.0.0 --port 8000
   ```

## API Endpoints

- `POST /api/chat` - Main chat endpoint
- `GET /api/health` - Health check
- `GET /api/demo-status` - Check if demo mode is available

## Request Format

```json
{
  "developer_message": "You are a helpful AI assistant.",
  "user_message": "Hello!",
  "model": "gpt-4o-mini",
  "api_key": "sk-...",  // Optional if demo mode is enabled
  "use_demo_mode": true  // Optional, defaults to false
}
```

## Features

✅ **Dual Mode Support** - Choose between user API key or demo mode  
✅ **Streaming Responses** - Real-time AI responses  
✅ **Error Handling** - Comprehensive error messages  
✅ **CORS Support** - Frontend integration ready  
✅ **Health Checks** - Monitor API status  

## Security Notes

- Demo mode uses environment variables for API key storage
- User API keys are never stored on the server
- CORS is configured for specific origins
- All requests are validated using Pydantic models 