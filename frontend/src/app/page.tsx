'use client';

// React hooks for state management and side effects
import { useState, useRef, useEffect } from 'react';
// Lucide React icons for UI elements
import { Send, Bot, Copy, Check, Moon, Sun, ThumbsUp, ThumbsDown, Settings, User, LogOut } from 'lucide-react';
// API configuration
import { API_ENDPOINTS } from '../config/api';

// TypeScript interface for chat messages
interface Message {
  id: string;                    // Unique identifier for each message
  content: string;               // The message text content
  role: 'user' | 'assistant';    // Who sent the message
  timestamp: Date;               // When the message was sent
  reactions?: {                  // Optional user reactions to the message
    thumbsUp: boolean;
    thumbsDown: boolean;
  };
}

// TypeScript interfaces for user and API key data
interface User {
  id: string;
  username: string;
  email: string;
}

interface APIKey {
  id: string;
  key_name: string;
  is_active: boolean;
  last_used?: string;
}

export default function Home() {
  // State management for chat functionality
  const [messages, setMessages] = useState<Message[]>([]);           // Chat message history
  const [input, setInput] = useState('');                            // Current input field value
  const [isLoading, setIsLoading] = useState(false);                 // Loading state for API calls
  const [showSettings, setShowSettings] = useState(false);           // Settings panel visibility
  const [developerMessage, setDeveloperMessage] = useState('You are a helpful AI assistant.'); // System message
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null); // Track copied messages
  const [isDarkMode, setIsDarkMode] = useState(false);               // Theme mode toggle
  const [demoMode, setDemoMode] = useState(true);                    // Demo mode toggle (default to true)
  const [demoAvailable, setDemoAvailable] = useState(false);         // Demo mode availability
  const [error, setError] = useState<string | null>(null);           // Error state management
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini'); // Selected AI model
  const messagesEndRef = useRef<HTMLDivElement>(null);               // Reference for auto-scrolling

  // Authentication state management
  const [isAuthenticated, setIsAuthenticated] = useState(false);     // User authentication status
  const [currentUser, setCurrentUser] = useState<User | null>(null); // Current user data
  const [authToken, setAuthToken] = useState<string | null>(null);   // JWT token
  const [showAuth, setShowAuth] = useState(false);                   // Auth modal visibility
  const [isLogin, setIsLogin] = useState(true);                      // Login vs Register mode
  const [userAPIKeys, setUserAPIKeys] = useState<APIKey[]>([]);      // User's stored API keys
  const [selectedAPIKeyId, setSelectedAPIKeyId] = useState<string | null>(null); // Selected API key

  // Pre-built system message templates for quick AI personality customization
  const systemMessageTemplates = [
    {
      name: "Helpful Assistant",
      message: "You are a helpful AI assistant."
    },
    {
      name: "Creative Writer",
      message: "You are a creative writer who helps with storytelling, poetry, and creative content. Be imaginative and engaging."
    },
    {
      name: "Code Expert",
      message: "You are a programming expert. Provide clear, well-commented code examples and explain technical concepts thoroughly."
    },
    {
      name: "Math Tutor",
      message: "You are a patient math tutor. Break down complex problems step by step and explain your reasoning clearly."
    },
    {
      name: "Business Advisor",
      message: "You are a business consultant. Provide strategic advice, market analysis, and practical business solutions."
    },
    {
      name: "Parent",
      message: "You are a caring and supportive parent figure. Provide gentle guidance, encouragement, and wisdom. Be patient, understanding, and nurturing in your responses. Help with life advice, emotional support, and practical parenting tips when appropriate."
    }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Check demo mode availability on component mount
  useEffect(() => {
    const checkDemoStatus = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.demoStatus);
        if (response.ok) {
          const data = await response.json();
          setDemoAvailable(data.demo_available);
        }
      } catch (error) {
        console.error('Failed to check demo status:', error);
      }
    };

    checkDemoStatus();
  }, []);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Authentication functions
  const login = async (username: string, password: string) => {
    try {
      const response = await fetch(API_ENDPOINTS.login, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data = await response.json();
        setAuthToken(data.access_token);
        setIsAuthenticated(true);
        setShowAuth(false);
        await fetchUserData(data.access_token);
        await fetchUserAPIKeys(data.access_token);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Login failed');
      }
    } catch (_error) {
      setError('Login failed. Please try again.');
    }
  };

  const register = async (username: string, email: string, password: string) => {
    try {
      const response = await fetch(API_ENDPOINTS.register, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      if (response.ok) {
        // Auto-login after successful registration
        await login(username, password);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Registration failed');
      }
    } catch (_error) {
      setError('Registration failed. Please try again.');
    }
  };

  const logout = () => {
    setAuthToken(null);
    setIsAuthenticated(false);
    setCurrentUser(null);
    setUserAPIKeys([]);
    setSelectedAPIKeyId(null);
    setMessages([]);
    setDemoMode(true); // Switch back to demo mode
  };

  const fetchUserData = async (token: string) => {
    try {
      const response = await fetch(API_ENDPOINTS.me, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const userData = await response.json();
        setCurrentUser(userData);
      }
    } catch (_error) {
      console.error('Failed to fetch user data:', _error);
    }
  };

  const fetchUserAPIKeys = async (token: string) => {
    try {
      const response = await fetch(API_ENDPOINTS.apiKeys, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const keys = await response.json();
        setUserAPIKeys(keys);
        if (keys.length > 0) {
          setSelectedAPIKeyId(keys[0].id);
        }
      }
    } catch (_error) {
      console.error('Failed to fetch API keys:', _error);
    }
  };

  const addAPIKey = async (apiKey: string, keyName: string = 'Default') => {
    try {
      const response = await fetch(API_ENDPOINTS.apiKeys, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ api_key: apiKey, key_name: keyName }),
      });

      if (response.ok) {
        await fetchUserAPIKeys(authToken!);
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to add API key');
      }
    } catch (_error) {
      setError('Failed to add API key. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Check if we have either demo mode or authentication with API keys
    if (!demoMode && !isAuthenticated) {
      setError('Please log in or use demo mode to chat');
      return;
    }

    // Clear any previous errors
    setError(null);

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add authorization header for authenticated requests
      if (!demoMode && authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(API_ENDPOINTS.chat, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          developer_message: developerMessage,
          user_message: input,
          model: selectedModel,
          use_demo_mode: demoMode,
          api_key_id: demoMode ? undefined : selectedAPIKeyId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      let assistantMessage = '';
      const assistantMessageId = (Date.now() + 1).toString();

      // Add initial assistant message
      setMessages(prev => [...prev, {
        id: assistantMessageId,
        content: '',
        role: 'assistant',
        timestamp: new Date(),
      }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        assistantMessage += chunk;

        // Update the assistant message with new content
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, content: assistantMessage }
            : msg
        ));
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setError(errorMessage);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        content: `Sorry, there was an error: ${errorMessage}`,
        role: 'assistant',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  const toggleReaction = (messageId: string, reaction: 'thumbsUp' | 'thumbsDown') => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { 
            ...msg, 
            reactions: { 
              thumbsUp: msg.reactions?.thumbsUp || false,
              thumbsDown: msg.reactions?.thumbsDown || false,
              [reaction]: !(msg.reactions?.[reaction] || false)
            } 
          }
        : msg
    ));
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
        : 'bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100'
    }`}>
      {/* Header */}
      <header className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm border-b transition-colors duration-300`}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Bot className={`h-8 w-8 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
            <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Will&apos;s AI Assistant</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Auth button */}
            {isAuthenticated ? (
              <div className="flex items-center space-x-2">
                <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {currentUser?.username}
                </span>
                <button
                  onClick={logout}
                  className={`p-2 rounded-lg transition-colors duration-200 ${
                    isDarkMode 
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className={`p-2 rounded-lg transition-colors duration-200 ${
                  isDarkMode 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <User className="h-5 w-5" />
              </button>
            )}
            
            {/* Settings button */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg transition-colors duration-200 ${
                isDarkMode 
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Settings className="h-5 w-5" />
            </button>
            
            {/* Dark mode toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-lg transition-colors duration-200 ${
                isDarkMode 
                  ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b shadow-sm transition-colors duration-300`}>
          <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
            {/* Demo Mode Toggle */}
            {demoAvailable && (
              <div className="flex items-center justify-between p-3 rounded-lg border transition-colors ${
                isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
              }">
                <div>
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Demo Mode
                  </label>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Use the pre-configured API key (no personal key needed)
                  </p>
                </div>
                <button
                  onClick={() => setDemoMode(!demoMode)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    demoMode 
                      ? 'bg-indigo-600' 
                      : isDarkMode ? 'bg-gray-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      demoMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            )}
            
            {/* API Key Management - only show if authenticated and not in demo mode */}
            {!demoMode && isAuthenticated && (
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Your API Keys
                </label>
                {userAPIKeys.length > 0 ? (
                  <select
                    value={selectedAPIKeyId || ''}
                    onChange={(e) => setSelectedAPIKeyId(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    {userAPIKeys.map((key) => (
                      <option key={key.id} value={key.id}>
                        {key.key_name} (Last used: {key.last_used ? new Date(key.last_used).toLocaleDateString() : 'Never'})
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    No API keys added yet. Add one below.
                  </p>
                )}
                
                {/* Add new API key form */}
                <div className="mt-3 space-y-2">
                  <input
                    type="password"
                    placeholder="sk-... (new API key)"
                    id="new-api-key"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                  <input
                    type="text"
                    placeholder="Key name (optional)"
                    id="key-name"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                  <button
                    onClick={() => {
                      const newKey = (document.getElementById('new-api-key') as HTMLInputElement)?.value;
                      const keyName = (document.getElementById('key-name') as HTMLInputElement)?.value || 'Default';
                      if (newKey) {
                        addAPIKey(newKey, keyName);
                        (document.getElementById('new-api-key') as HTMLInputElement).value = '';
                        (document.getElementById('key-name') as HTMLInputElement).value = '';
                      }
                    }}
                    className="w-full px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Add API Key
                  </button>
                </div>
              </div>
            )}
            
            {/* AI Model Selection */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                AI Model
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="gpt-4o-mini">GPT-4o Mini (Fast & Efficient)</option>
                <option value="gpt-4o">GPT-4o (Most Capable)</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Budget Friendly)</option>
              </select>
            </div>
            
            {/* System Message */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                System Message
              </label>
              
              {/* Quick Templates */}
              <div className="mb-2">
                <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Quick Templates:
                </label>
                <div className="flex flex-wrap gap-1">
                  {systemMessageTemplates.map((template) => (
                    <button
                      key={template.name}
                      onClick={() => setDeveloperMessage(template.message)}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        isDarkMode 
                          ? 'bg-gray-600 hover:bg-gray-500 text-gray-200' 
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                      }`}
                      title={`Switch to ${template.name} personality`}
                    >
                      {template.name}
                    </button>
                  ))}
                </div>
              </div>
              
              <textarea
                value={developerMessage}
                onChange={(e) => setDeveloperMessage(e.target.value)}
                placeholder="You are a helpful AI assistant."
                rows={3}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
              />
            </div>
          </div>
        </div>
      )}

      {/* Authentication Modal */}
      {showAuth && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 w-full max-w-md mx-4`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {isLogin ? 'Login' : 'Register'}
              </h2>
              <button
                onClick={() => setShowAuth(false)}
                className={`p-1 rounded ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const username = formData.get('username') as string;
              const password = formData.get('password') as string;
              
              if (isLogin) {
                login(username, password);
              } else {
                const email = formData.get('email') as string;
                register(username, email, password);
              }
            }}>
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Username
                  </label>
                  <input
                    name="username"
                    type="text"
                    required
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>
                
                {!isLogin && (
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Email
                    </label>
                    <input
                      name="email"
                      type="email"
                      required
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                    />
                  </div>
                )}
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Password
                  </label>
                  <input
                    name="password"
                    type="password"
                    required
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>
                
                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  {isLogin ? 'Login' : 'Register'}
                </button>
              </div>
            </form>
            
            <div className="mt-4 text-center">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className={`text-sm ${isDarkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-500'}`}
              >
                {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main chat area */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Mode indicator */}
        <div className={`mb-4 p-3 rounded-lg ${
          demoMode 
            ? isDarkMode 
              ? 'bg-indigo-900/50 border border-indigo-700' 
              : 'bg-indigo-50 border border-indigo-200'
            : isDarkMode 
              ? 'bg-green-900/50 border border-green-700' 
              : 'bg-green-50 border border-green-200'
        }`}>
          <p className={`text-sm ${demoMode 
            ? isDarkMode ? 'text-indigo-300' : 'text-indigo-700'
            : isDarkMode ? 'text-green-300' : 'text-green-700'
          }`}>
            {demoMode ? (
              <>
                🎯 <strong>Demo Mode:</strong> Using pre-configured API key
                {!demoAvailable && <span className="text-red-400 ml-2">(Demo not available - check API key)</span>}
              </>
            ) : (
              <>
                🔐 <strong>Personal Mode:</strong> Using your API key
                {selectedAPIKeyId && userAPIKeys.find(k => k.id === selectedAPIKeyId) && (
                  <span className="ml-2">({userAPIKeys.find(k => k.id === selectedAPIKeyId)?.key_name})</span>
                )}
              </>
            )}
          </p>
        </div>

        {/* Messages */}
        <div className={`mb-6 h-96 overflow-y-auto rounded-lg border ${
          isDarkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
        }`}>
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className={`text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Start a conversation with your AI assistant!</p>
                {!demoMode && !isAuthenticated && (
                  <p className="text-sm mt-2">Please log in or enable demo mode to start chatting.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-3xl rounded-lg p-3 ${
                    message.role === 'user'
                      ? isDarkMode
                        ? 'bg-indigo-600 text-white'
                        : 'bg-indigo-600 text-white'
                      : isDarkMode
                        ? 'bg-gray-700 text-gray-100'
                        : 'bg-gray-100 text-gray-900'
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {/* Copy button */}
                        <button
                          onClick={() => copyToClipboard(message.content, message.id)}
                          className={`p-1 rounded transition-colors ${
                            isDarkMode 
                              ? 'hover:bg-gray-600' 
                              : 'hover:bg-gray-200'
                          }`}
                        >
                          {copiedMessageId === message.id ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                        
                        {/* Reactions (only for assistant messages) */}
                        {message.role === 'assistant' && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => toggleReaction(message.id, 'thumbsUp')}
                              className={`p-1 rounded transition-colors ${
                                message.reactions?.thumbsUp
                                  ? 'text-green-500'
                                  : isDarkMode 
                                    ? 'text-gray-400 hover:text-green-400' 
                                    : 'text-gray-500 hover:text-green-600'
                              }`}
                            >
                              <ThumbsUp className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => toggleReaction(message.id, 'thumbsDown')}
                              className={`p-1 rounded transition-colors ${
                                message.reactions?.thumbsDown
                                  ? 'text-red-500'
                                  : isDarkMode 
                                    ? 'text-gray-400 hover:text-red-400' 
                                    : 'text-gray-500 hover:text-red-600'
                              }`}
                            >
                              <ThumbsDown className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input form */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading || (!demoMode && !isAuthenticated)}
            className={`flex-1 p-3 rounded-lg border transition-colors ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-indigo-500' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-indigo-500'
            }`}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim() || (!demoMode && !isAuthenticated)}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              isLoading || !input.trim() || (!demoMode && !isAuthenticated)
                ? isDarkMode
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : isDarkMode
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            <Send className="h-5 w-5" />
          </button>
        </form>

        {/* Error display */}
        {error && (
          <div className={`mt-4 p-3 rounded-lg ${
            isDarkMode 
              ? 'bg-red-900/50 border border-red-700' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <p className={`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
              Error: {error}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
