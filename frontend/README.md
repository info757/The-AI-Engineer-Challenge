# AI Chat Assistant Frontend

A modern, responsive chat interface built with Next.js that integrates with the FastAPI backend for AI-powered conversations.

## 🚀 Features

- **Real-time streaming responses** from OpenAI's GPT models
- **Beautiful, modern UI** with Tailwind CSS
- **Settings panel** for API key and system message configuration
- **Responsive design** that works on desktop and mobile
- **Auto-scrolling** chat interface
- **Loading states** and error handling

## 🛠️ Tech Stack

- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **FastAPI Backend** - AI chat API

## 📋 Prerequisites

1. **Node.js 18+** (you have v24.5.0 ✅)
2. **OpenAI API Key** - Get one from [OpenAI Platform](https://platform.openai.com/api-keys)
3. **FastAPI Backend** - Make sure the backend is running on `http://localhost:8000`

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Development Server

```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

### 3. Configure Your API Key

1. Click the **Settings** button (gear icon) in the top-right corner
2. Enter your **OpenAI API Key** in the settings panel
3. Optionally customize the **System Message** to define the AI's behavior
4. Close the settings panel

### 4. Start Chatting!

- Type your message in the input field
- Press Enter or click the Send button
- Watch the AI response stream in real-time

## 🔧 Development

### Project Structure

```
src/
├── app/
│   ├── page.tsx          # Main chat interface
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Global styles
├── components/           # Reusable components (if any)
└── lib/                  # Utility functions (if any)
```

### Key Features Implementation

- **Streaming Responses**: Uses `fetch` with `ReadableStream` to handle real-time AI responses
- **State Management**: React hooks for managing chat state, loading states, and settings
- **Auto-scroll**: Automatically scrolls to the latest message
- **Error Handling**: Graceful error handling with user-friendly messages

## 🌐 API Integration

The frontend communicates with the FastAPI backend at `http://localhost:8000`:

- **POST `/api/chat`** - Send chat messages and receive streaming responses
- **GET `/api/health`** - Health check endpoint

### Request Format

```json
{
  "developer_message": "You are a helpful AI assistant.",
  "user_message": "Hello, how are you?",
  "model": "gpt-4.1-mini",
  "api_key": "sk-..."
}
```

## 🎨 Customization

### Styling

The app uses Tailwind CSS for styling. You can customize:

- **Colors**: Modify the color scheme in the gradient backgrounds and buttons
- **Layout**: Adjust the max-width, padding, and spacing
- **Components**: Customize the chat bubbles, input field, and buttons

### System Message

You can customize the AI's behavior by changing the system message in settings:

- **Default**: "You are a helpful AI assistant."
- **Custom**: Define specific roles, personalities, or instructions

## 🚀 Deployment

### Vercel (Recommended)

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel
   ```

3. **Follow the prompts** to connect your GitHub repository

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- **Netlify**
- **Railway**
- **DigitalOcean App Platform**
- **AWS Amplify**

## 🔒 Security Notes

- **API Key**: Never commit your OpenAI API key to version control
- **Environment Variables**: Use `.env.local` for local development
- **Production**: Set environment variables in your deployment platform

## 🐛 Troubleshooting

### Common Issues

1. **"Failed to get response"**
   - Check if the FastAPI backend is running on `http://localhost:8000`
   - Verify your OpenAI API key is correct
   - Check the browser console for detailed error messages

2. **"No response body"**
   - Ensure the backend is properly configured for streaming responses
   - Check CORS settings in the backend

3. **Styling Issues**
   - Make sure Tailwind CSS is properly configured
   - Check if all dependencies are installed

### Getting Help

If you encounter issues:
1. Check the browser console for error messages
2. Verify the backend is running and accessible
3. Test your API key with a simple curl request
4. Check the FastAPI backend logs for errors

## 📝 License

This project is part of the AI Engineering Challenge by AI Maker Space.

---

**Happy coding! 🚀**
