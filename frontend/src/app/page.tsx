'use client';

// React hooks for state management and side effects
import { useState, useRef, useEffect } from 'react';
// Lucide React icons for UI elements
import { Send, Bot, User, Loader2, Settings, Copy, Check, Moon, Sun, ThumbsUp, ThumbsDown, AlertCircle } from 'lucide-react';

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

export default function Home() {
  // State management for chat functionality
  const [messages, setMessages] = useState<Message[]>([]);           // Chat message history
  const [input, setInput] = useState('');                            // Current input field value
  const [isLoading, setIsLoading] = useState(false);                 // Loading state for API calls
  const [apiKey, setApiKey] = useState('');                          // User's OpenAI API key
  const [showSettings, setShowSettings] = useState(false);           // Settings panel visibility
  const [developerMessage, setDeveloperMessage] = useState('You are a helpful AI assistant.'); // System message
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null); // Track copied messages
  const [isDarkMode, setIsDarkMode] = useState(false);               // Theme mode toggle
  const [demoMode, setDemoMode] = useState(false);                   // Demo mode toggle
  const [demoAvailable, setDemoAvailable] = useState(false);         // Demo mode availability
  const [error, setError] = useState<string | null>(null);           // Error state management
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini'); // Selected AI model
  const messagesEndRef = useRef<HTMLDivElement>(null);               // Reference for auto-scrolling

  // Pre-built system message templates for quick AI personality customization
  // Users can select from these templates or create their own custom system messages
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

  const copyToClipboard = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const toggleReaction = (messageId: string, reaction: 'thumbsUp' | 'thumbsDown') => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        const currentReactions = msg.reactions || { thumbsUp: false, thumbsDown: false };
        return {
          ...msg,
          reactions: {
            ...currentReactions,
            [reaction]: !currentReactions[reaction]
          }
        };
      }
      return msg;
    }));
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check if demo mode is available on component mount
  useEffect(() => {
    const checkDemoStatus = async () => {
      try {
        const response = await fetch('/api/demo-status');
        if (response.ok) {
          const data = await response.json();
          setDemoAvailable(data.demo_available);
        } else {
          console.warn('Demo status check failed:', response.status);
        }
      } catch (error) {
        console.error('Failed to check demo status:', error);
        setError('Unable to check demo mode availability');
      }
    };
    checkDemoStatus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    // Check if we have either demo mode or an API key
    if (!demoMode && !apiKey.trim()) return;

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
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          developer_message: developerMessage,
          user_message: input,
          model: selectedModel,
          api_key: demoMode ? undefined : apiKey,
          use_demo_mode: demoMode,
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
              {/* eslint-disable-next-line react/no-unescaped-entities */}
              <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Will&apos;s AI Assistant</h1>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-2 rounded-lg transition-colors ${
                  isDarkMode 
                    ? 'hover:bg-gray-700 text-gray-300' 
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
                aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
                title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
              >
                {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-lg transition-colors ${
                  isDarkMode 
                    ? 'hover:bg-gray-700 text-gray-300' 
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
                aria-label="Open settings"
                title="Settings"
              >
                <Settings className="h-5 w-5" />
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
            
            {/* API Key Input - only show if not in demo mode */}
            {!demoMode && (
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  OpenAI API Key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                />
              </div>
            )}
            
            {/* AI Model Selection - Choose between different OpenAI models */}
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
            
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                System Message
              </label>
              
              {/* Quick Templates - Pre-built AI personalities for instant customization */}
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

      {/* Error Display */}
      {error && (
        <div className="max-w-4xl mx-auto px-4 py-2">
          <div className={`${isDarkMode ? 'bg-red-900 border-red-700' : 'bg-red-50 border-red-200'} border rounded-lg p-3 flex items-center space-x-2`}>
            <AlertCircle className={`h-5 w-5 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`} />
            <span className={`text-sm ${isDarkMode ? 'text-red-200' : 'text-red-800'}`}>
              {error}
            </span>
            <button
              onClick={() => setError(null)}
              className={`ml-auto text-xs px-2 py-1 rounded ${isDarkMode ? 'hover:bg-red-800' : 'hover:bg-red-100'}`}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Chat Container */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg overflow-hidden transition-colors duration-300`}>
          {/* Messages */}
          <div className="h-96 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <Bot className={`h-12 w-12 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                <p>Start a conversation with the AI assistant!</p>
                {!demoMode && !apiKey && (
                  // eslint-disable-next-line react/no-unescaped-entities
                  <p className="text-sm mt-2">Don&apos;t forget to add your OpenAI API key in settings or enable demo mode.</p>
                )}
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-3 rounded-xl shadow-sm ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                        : isDarkMode
                        ? 'bg-gradient-to-r from-gray-700 to-gray-600 border border-gray-600 text-gray-100'
                        : 'bg-gradient-to-r from-white to-gray-50 border border-gray-200 text-gray-900'
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      {message.role === 'assistant' && (
                        <Bot className="h-4 w-4 mt-0.5 text-gray-500 flex-shrink-0" />
                      )}
                      <div className="whitespace-pre-wrap">{message.content}</div>
                      <div className="flex items-center space-x-2 mt-2">
                        {message.role === 'assistant' && (
                          <>
                            <button
                              onClick={() => copyToClipboard(message.content, message.id)}
                              className={`p-1 rounded transition-colors ${
                                isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'
                              }`}
                              title="Copy to clipboard"
                            >
                              {copiedMessageId === message.id ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className={`h-3 w-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                              )}
                            </button>
                            <button
                              onClick={() => toggleReaction(message.id, 'thumbsUp')}
                              className={`p-1 rounded transition-colors ${
                                message.reactions?.thumbsUp 
                                  ? 'text-green-500' 
                                  : isDarkMode ? 'text-gray-400 hover:text-green-400' : 'text-gray-500 hover:text-green-600'
                              }`}
                              title="Thumbs up"
                            >
                              <ThumbsUp className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => toggleReaction(message.id, 'thumbsDown')}
                              className={`p-1 rounded transition-colors ${
                                message.reactions?.thumbsDown 
                                  ? 'text-red-500' 
                                  : isDarkMode ? 'text-gray-400 hover:text-red-400' : 'text-gray-500 hover:text-red-600'
                              }`}
                              title="Thumbs down"
                            >
                              <ThumbsDown className="h-3 w-3" />
                            </button>
                          </>
                        )}
                        {message.role === 'user' && (
                          <User className="h-4 w-4 text-indigo-200 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-gray-900 max-w-xs lg:max-w-md px-4 py-3 rounded-lg shadow-sm">
                  <div className="flex items-center space-x-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                    <span className="text-sm font-medium text-blue-700">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <div className={`border-t p-4 transition-colors duration-300 ${
            isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
          }`}>
            <form onSubmit={handleSubmit} className="flex space-x-4">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                disabled={isLoading || (!demoMode && !apiKey)}
                className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                  isDarkMode 
                    ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400 disabled:bg-gray-700 disabled:text-gray-500' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 disabled:bg-gray-100 disabled:text-gray-500'
                }`}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim() || (!demoMode && !apiKey)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
