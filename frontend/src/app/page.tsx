'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Copy, ThumbsUp, ThumbsDown, Settings } from 'lucide-react';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

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
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input.trim(),
          model: selectedModel,
          system_message: systemMessage,
          demo_mode: demoMode
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
    'You are a helpful AI assistant.',
    'You are a coding expert. Provide clear, concise code examples.',
    'You are a creative writer. Be imaginative and engaging.',
    'You are a math tutor. Explain concepts step by step.',
    'You are a language learning assistant. Help with grammar and vocabulary.'
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
              <label className="font-medium">Demo Mode</label>
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
                        setSystemMessage(template);
                        setMessages([]); // Clear conversation when changing personality
                      }}
                      className={`px-3 py-1 text-sm rounded-full transition-colors ${
                        systemMessage === template
                          ? 'bg-blue-600 text-white'
                          : darkMode
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {template.split(' ').slice(0, 3).join(' ')}...
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
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                  isLoading || !input.trim()
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
