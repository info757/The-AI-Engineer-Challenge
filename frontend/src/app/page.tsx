'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Copy, ThumbsUp, ThumbsDown, Settings, User, LogOut } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  reactions?: {
    thumbsUp: boolean;
    thumbsDown: boolean;
  };
}

interface User {
  id: string;
  username: string;
  email: string;
}

interface APIKey {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [demoMode, setDemoMode] = useState(true);
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini');
  const [systemMessage, setSystemMessage] = useState('You are a helpful AI assistant.');
  
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [userAPIKeys, setUserAPIKeys] = useState<APIKey[]>([]);
  const [selectedAPIKeyId, setSelectedAPIKeyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Authentication functions
  const login = async (email: string, password: string) => {
    try {
      console.log('Starting login for:', email);
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      console.log('Login response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Login successful, data:', data);
        setAuthToken(data.token);
        setIsAuthenticated(true);
        setShowAuth(false);
        await fetchUserData(data.token);
        await fetchUserAPIKeys(data.token);
      } else {
        const errorData = await response.json();
        console.error('Login failed:', errorData);
        setError(errorData.error || 'Login failed');
      }
    } catch (_error) {
      console.error('Login error:', _error);
      setError('Login failed. Please try again.');
    }
  };

  const register = async (username: string, email: string, password: string) => {
    try {
      console.log('Starting registration for:', email);
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      console.log('Registration response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Registration successful, data:', data);
        // Auto-login after successful registration
        await login(email, password);
      } else {
        const errorData = await response.json();
        console.error('Registration failed:', errorData);
        setError(errorData.error || 'Registration failed');
      }
    } catch (_error) {
      console.error('Registration error:', _error);
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
      const response = await fetch('/api/me', {
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
      const response = await fetch('/api/api-keys', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const keys = data.apiKeys || [];
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
      console.log('=== Frontend: Adding API Key ===');
      console.log('API Key (first 10 chars):', apiKey.substring(0, 10) + '...');
      console.log('Key Name:', keyName);
      console.log('Auth Token exists:', !!authToken);
      
      const requestBody = { apiKey: apiKey, name: keyName };
      console.log('Request body:', requestBody);
      
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status);
      
      if (response.ok) {
        console.log('API key added successfully');
        await fetchUserAPIKeys(authToken!);
        setError(null);
      } else {
        const errorData = await response.json();
        console.log('Error response:', errorData);
        setError(errorData.error || 'Failed to add API key');
      }
    } catch (_error) {
      setError('Failed to add API key. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Check if user is authenticated (required for both demo and personal mode)
    if (!isAuthenticated) {
      setError('Please log in to chat');
      return;
    }

    // Clear any previous errors
    setError(null);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
      reactions: { thumbsUp: false, thumbsDown: false }
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add authorization header for all requests (required for both demo and personal mode)
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: input.trim(),
          model: selectedModel,
          system_message: systemMessage,
          demo_mode: demoMode,
          api_key_id: demoMode ? undefined : selectedAPIKeyId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      let assistantMessage = '';
      const assistantMessageId = (Date.now() + 1).toString();

      const assistantMessageObj: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        reactions: { thumbsUp: false, thumbsDown: false }
      };

      setMessages(prev => [...prev, assistantMessageObj]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        assistantMessage += chunk;

        setMessages(prev => 
          prev.map(msg => 
            msg.id === assistantMessageId 
              ? { ...msg, content: assistantMessage }
              : msg
          )
        );
      }

    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
        reactions: { thumbsUp: false, thumbsDown: false }
      }]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleReaction = (messageId: string, reaction: 'thumbsUp' | 'thumbsDown') => {
    setMessages(prev => 
      prev.map(msg => 
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
      )
    );
  };

  const systemMessageTemplates = [
    { label: 'Helpful Assistant', message: 'You are a helpful AI assistant.' },
    { label: 'Coding Expert', message: 'You are a coding expert. Provide clear, concise code examples.' },
    { label: 'Creative Writer', message: 'You are a creative writer. Be imaginative and engaging.' },
    { label: 'Math Tutor', message: 'You are a math tutor. Explain concepts step by step.' },
    { label: 'Language Teacher', message: 'You are a language learning assistant. Help with grammar and vocabulary.' }
  ];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
    }`}>
      {/* Header */}
      <header className={`border-b transition-colors duration-300 ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            AI Chat Assistant
          </h1>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className={`text-sm px-2 py-1 rounded-full ${
                demoMode 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
              }`}>
                {demoMode ? 'Demo Mode' : 'Personal Mode'}
              </span>
            </div>
            
            {/* Auth button */}
            {isAuthenticated ? (
              <div className="flex items-center space-x-2">
                <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {currentUser?.username}
                </span>
                <button
                  onClick={logout}
                  className={`p-2 rounded-lg transition-colors ${
                    darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                <User className="w-5 h-5" />
              </button>
            )}
            
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg transition-colors ${
                darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
            >
              <Settings className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg transition-colors ${
                darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
            >
              {darkMode ? '🌞' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className={`border-b transition-colors duration-300 ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
            {/* Demo Mode Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium">Demo Mode</label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Use shared API key (requires login)
                </p>
              </div>
              <button
                onClick={() => setDemoMode(!demoMode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  demoMode ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  demoMode ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* API Key Management - only show if authenticated and not in demo mode */}
            {!demoMode && isAuthenticated && (
              <div>
                <label htmlFor="api-keys-select" className="block font-medium mb-2">Your API Keys</label>
                {userAPIKeys.length > 0 ? (
                  <select
                    id="api-keys-select"
                    value={selectedAPIKeyId || ''}
                    onChange={(e) => setSelectedAPIKeyId(e.target.value)}
                    className={`w-full p-2 border rounded-lg ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                  >
                    {userAPIKeys.map((key) => (
                      <option key={key.id} value={key.id}>
                        {key.name} (Created: {new Date(key.created_at).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    No API keys added yet. Add one below.
                  </p>
                )}
                
                {/* Add new API key form */}
                <div className="mt-3 space-y-2">
                  <label htmlFor="new-api-key" className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    API Key
                  </label>
                  <input
                    type="password"
                    name="api-key"
                    placeholder="sk-... (new API key)"
                    id="new-api-key"
                    className={`w-full p-2 border rounded-lg ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 placeholder-gray-500'
                    }`}
                  />
                  <label htmlFor="key-name" className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Key Name (optional)
                  </label>
                  <input
                    type="text"
                    name="key-name"
                    placeholder="Key name (optional)"
                    id="key-name"
                    className={`w-full p-2 border rounded-lg ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 placeholder-gray-500'
                    }`}
                  />
                  <button
                    onClick={() => {
                      console.log('=== Button Click Handler ===');
                      const newKey = (document.getElementById('new-api-key') as HTMLInputElement)?.value;
                      const keyName = (document.getElementById('key-name') as HTMLInputElement)?.value || 'Default';
                      
                      console.log('Captured API key (first 10 chars):', newKey ? newKey.substring(0, 10) + '...' : 'EMPTY');
                      console.log('Captured key name:', keyName);
                      console.log('API key exists:', !!newKey);
                      
                      if (newKey) {
                        console.log('Calling addAPIKey function...');
                        addAPIKey(newKey, keyName);
                        (document.getElementById('new-api-key') as HTMLInputElement).value = '';
                        (document.getElementById('key-name') as HTMLInputElement).value = '';
                      } else {
                        console.log('No API key provided - not calling addAPIKey');
                      }
                    }}
                    className="w-full p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add API Key
                  </button>
                  
                  {/* Test JWT Button */}
                </div>
              </div>
            )}

            {/* AI Model Selection */}
            <div>
              <label className="block font-medium mb-2">AI Model</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className={`w-full p-2 border rounded-lg ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                }`}
              >
                <option value="gpt-4o-mini">GPT-4o Mini (Fast & Affordable)</option>
                <option value="gpt-4o">GPT-4o (Most Capable)</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Legacy)</option>
              </select>
            </div>

            {/* System Message */}
            <div>
              <label className="block font-medium mb-2">System Message</label>
              <div className="mb-2">
                <div className="flex flex-wrap gap-2">
                  {systemMessageTemplates.map((template, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setSystemMessage(template.message);
                        setMessages([]); // Clear conversation when changing personality
                      }}
                      className={`px-3 py-1 text-sm rounded-full transition-colors ${
                        systemMessage === template.message
                          ? 'bg-blue-600 text-white'
                          : darkMode
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {template.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                Current: {systemMessage}
              </div>
              <textarea
                value={systemMessage}
                onChange={(e) => setSystemMessage(e.target.value)}
                rows={3}
                className={`w-full p-2 border rounded-lg resize-none ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                }`}
                placeholder="Enter a custom system message..."
              />
            </div>
          </div>
        </div>
      )}

      {/* Authentication Modal */}
      {showAuth && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 w-full max-w-md mx-4`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {isLogin ? 'Login' : 'Register'}
              </h2>
              <button
                onClick={() => setShowAuth(false)}
                className={`p-1 rounded ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const password = formData.get('password') as string;
              
              if (isLogin) {
                const email = formData.get('email') as string;
                login(email, password);
              } else {
                const username = formData.get('username') as string;
                const email = formData.get('email') as string;
                register(username, email, password);
              }
            }}>
              <div className="space-y-4">
                {!isLogin && (
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Username
                    </label>
                    <input
                      name="username"
                      type="text"
                      required
                      className={`w-full p-2 border rounded-lg ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 placeholder-gray-500'
                      }`}
                    />
                  </div>
                )}
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Email
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    className={`w-full p-2 border rounded-lg ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 placeholder-gray-500'
                    }`}
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Password
                  </label>
                  <input
                    name="password"
                    type="password"
                    required
                    className={`w-full p-2 border rounded-lg ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 placeholder-gray-500'
                    }`}
                  />
                </div>
                
                <button
                  type="submit"
                  className="w-full p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {isLogin ? 'Login' : 'Register'}
                </button>
              </div>
            </form>
            
            <div className="mt-4 text-center">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className={`text-sm ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'}`}
              >
                {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Container */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className={`rounded-lg border transition-colors duration-300 ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          {/* Messages */}
          <div className="h-96 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                <div className="text-4xl mb-4">🤖</div>
                <p className="text-lg font-medium mb-2">Welcome to AI Chat Assistant!</p>
                <p>Start a conversation by typing a message below.</p>
                {!isAuthenticated && (
                  <p className="text-sm mt-2">Please log in to start chatting.</p>
                )}
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : darkMode
                      ? 'bg-gray-700 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 whitespace-pre-wrap">{message.content}</div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => copyToClipboard(message.content)}
                          className={`p-1 rounded transition-colors ${
                            message.role === 'user'
                              ? 'hover:bg-blue-700'
                              : darkMode
                              ? 'hover:bg-gray-600'
                              : 'hover:bg-gray-200'
                          }`}
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        {message.role === 'assistant' && (
                          <>
                            <button
                              onClick={() => handleReaction(message.id, 'thumbsUp')}
                              className={`p-1 rounded transition-colors ${
                                message.reactions?.thumbsUp
                                  ? 'text-green-500'
                                  : darkMode
                                  ? 'hover:bg-gray-600'
                                  : 'hover:bg-gray-200'
                              }`}
                            >
                              <ThumbsUp className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleReaction(message.id, 'thumbsDown')}
                              className={`p-1 rounded transition-colors ${
                                message.reactions?.thumbsDown
                                  ? 'text-red-500'
                                  : darkMode
                                  ? 'hover:bg-gray-600'
                                  : 'hover:bg-gray-200'
                              }`}
                            >
                              <ThumbsDown className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className={`text-xs mt-2 ${
                      message.role === 'user' ? 'text-blue-200' : 'text-gray-500'
                    }`}>
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className={`max-w-[80%] rounded-lg p-3 ${
                  darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                }`}>
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-sm text-gray-500">AI is typing...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <div className={`border-t p-4 transition-colors duration-300 ${
            darkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <form onSubmit={handleSubmit} className="flex gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="Type your message..."
                rows={1}
                className={`flex-1 p-3 border rounded-lg resize-none transition-colors duration-300 ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 placeholder-gray-500'
                }`}
                disabled={isLoading || !isAuthenticated}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim() || !isAuthenticated}
                                  className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                    isLoading || !input.trim() || !isAuthenticated
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className={`mt-4 p-3 rounded-lg ${
            darkMode ? 'bg-red-900/50 border border-red-700' : 'bg-red-50 border border-red-200'
          }`}>
            <p className={`text-sm ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
              Error: {error}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
