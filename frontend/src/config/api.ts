// API configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// API endpoints
export const API_ENDPOINTS = {
  demoStatus: `${API_BASE_URL}/api/demo-status`,
  chatDemo: `${API_BASE_URL}/api/chat-demo`,
  chat: `${API_BASE_URL}/api/chat`,
  register: `${API_BASE_URL}/api/register`,
  login: `${API_BASE_URL}/api/login`,
  me: `${API_BASE_URL}/api/me`,
  apiKeys: `${API_BASE_URL}/api/api-keys`,
  health: `${API_BASE_URL}/api/health`,
} as const;
