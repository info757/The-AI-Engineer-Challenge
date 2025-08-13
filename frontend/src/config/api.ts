// API configuration for Vercel serverless functions
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

// API endpoints (relative paths for Vercel serverless functions)
export const API_ENDPOINTS = {
  demoStatus: `/api/demo-status`,
  chatDemo: `/api/chat`,
  chat: `/api/chat`,
  register: `/api/register`,
  login: `/api/login`,
  me: `/api/me`,
  apiKeys: `/api/api-keys`,
  health: `/api/health`,
} as const;

// Check if we're in production and backend is not available
export const isBackendAvailable = async (): Promise<boolean> => {
  try {
    const response = await fetch(API_ENDPOINTS.health);
    return response.ok;
  } catch (error) {
    console.warn('Backend not available:', error);
    return false;
  }
};
