'use client';

import { useState, useEffect } from 'react';
import { FileText, Database, Trash2, RefreshCw } from 'lucide-react';
import { API_ENDPOINTS } from '@/config/api';

interface RAGStatusData {
  status: string;
  rag_initialized: boolean;
  documents_uploaded: number;
  total_chunks: number;
  message?: string;
}

interface RAGStatusProps {
  authToken: string | null;
  darkMode: boolean;
  onStatusChange: (status: RAGStatusData) => void;
  refreshTrigger?: number; // Add refresh trigger
}

export default function RAGStatus({ authToken, darkMode, onStatusChange, refreshTrigger }: RAGStatusProps) {
  const [status, setStatus] = useState<RAGStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    if (!authToken) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(API_ENDPOINTS.ragStatus, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch RAG status');
      }

      const data = await response.json();
      setStatus(data);
      onStatusChange(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch status';
      setError(errorMessage);
      console.error('Error fetching RAG status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const clearDocuments = async () => {
    if (!authToken) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(API_ENDPOINTS.ragClear, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to clear documents');
      }

      // Refresh status after clearing
      await fetchStatus();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear documents';
      setError(errorMessage);
      console.error('Error clearing documents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (authToken) {
      fetchStatus();
    }
  }, [authToken, refreshTrigger]);

  if (!authToken) {
    return null;
  }

  return (
    <div className={`p-4 rounded-lg border ${
      darkMode 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`text-sm font-medium flex items-center ${
          darkMode ? 'text-gray-200' : 'text-gray-900'
        }`}>
          <Database className="h-4 w-4 mr-2" />
          RAG System Status
        </h3>
        <button
          onClick={fetchStatus}
          disabled={isLoading}
          className={`p-1 rounded transition-colors ${
            darkMode
              ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className={`p-3 rounded-lg mb-3 ${
          darkMode ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'
        }`}>
          <p className={`text-sm ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
            {error}
          </p>
        </div>
      )}

      {isLoading && !status ? (
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Loading status...
          </p>
        </div>
      ) : status ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                status.rag_initialized ? 'bg-green-500' : 'bg-gray-400'
              }`}></div>
              <span className={`text-sm ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {status.rag_initialized ? 'Ready for RAG Chat' : 'No documents uploaded'}
              </span>
            </div>
            {status.rag_initialized && (
              <button
                onClick={clearDocuments}
                disabled={isLoading}
                className={`p-1 rounded transition-colors ${
                  darkMode
                    ? 'text-red-400 hover:text-red-300 hover:bg-red-900/20'
                    : 'text-red-600 hover:text-red-700 hover:bg-red-50'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="Clear all documents"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>

          {status.rag_initialized && (
            <div className={`p-3 rounded-lg ${
              darkMode ? 'bg-gray-700' : 'bg-gray-50'
            }`}>
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-1">
                  <FileText className={`h-4 w-4 ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`} />
                  <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                    {status.documents_uploaded} document{status.documents_uploaded !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <Database className={`h-4 w-4 ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`} />
                  <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                    {status.total_chunks} chunk{status.total_chunks !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>
          )}

          {!status.rag_initialized && (
            <p className={`text-xs ${
              darkMode ? 'text-gray-500' : 'text-gray-500'
            }`}>
              Upload a PDF document to enable RAG chat functionality
            </p>
          )}
        </div>
      ) : (
        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Unable to load status
        </p>
      )}
    </div>
  );
}
