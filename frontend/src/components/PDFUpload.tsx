'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, X, CheckCircle, AlertCircle } from 'lucide-react';
import { API_ENDPOINTS } from '@/config/api';

interface PDFUploadProps {
  onUploadSuccess: (result: any) => void;
  onUploadError: (error: string) => void;
  authToken: string | null;
  darkMode: boolean;
}

interface UploadStatus {
  isUploading: boolean;
  isSuccess: boolean;
  isError: boolean;
  message: string;
  filename?: string;
  chunksCreated?: number;
  totalCharacters?: number;
}

export default function PDFUpload({ onUploadSuccess, onUploadError, authToken, darkMode }: PDFUploadProps) {
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    isUploading: false,
    isSuccess: false,
    isError: false,
    message: ''
  });
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file.type.includes('pdf')) {
      setUploadStatus({
        isUploading: false,
        isSuccess: false,
        isError: true,
        message: 'Please select a PDF file'
      });
      onUploadError('Please select a PDF file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setUploadStatus({
        isUploading: false,
        isSuccess: false,
        isError: true,
        message: 'File size must be less than 10MB'
      });
      onUploadError('File size must be less than 10MB');
      return;
    }

    setUploadStatus({
      isUploading: true,
      isSuccess: false,
      isError: false,
      message: 'Uploading and processing PDF...'
    });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(API_ENDPOINTS.uploadPDF, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Upload failed');
      }

      const result = await response.json();
      
      setUploadStatus({
        isUploading: false,
        isSuccess: true,
        isError: false,
        message: `PDF processed successfully! Created ${result.chunks_created} chunks.`,
        filename: result.filename,
        chunksCreated: result.chunks_created,
        totalCharacters: result.total_characters
      });

      onUploadSuccess(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setUploadStatus({
        isUploading: false,
        isSuccess: false,
        isError: true,
        message: errorMessage
      });
      onUploadError(errorMessage);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const clearStatus = () => {
    setUploadStatus({
      isUploading: false,
      isSuccess: false,
      isError: false,
      message: ''
    });
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200 ${
          dragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : darkMode
            ? 'border-gray-600 bg-gray-800/50 hover:bg-gray-800'
            : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileInputChange}
          className="hidden"
        />

        {uploadStatus.isUploading ? (
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {uploadStatus.message}
            </p>
          </div>
        ) : uploadStatus.isSuccess ? (
          <div className="flex flex-col items-center space-y-4">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <div className="text-center">
              <p className={`text-sm font-medium ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                {uploadStatus.message}
              </p>
              {uploadStatus.filename && (
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  File: {uploadStatus.filename}
                </p>
              )}
              {uploadStatus.chunksCreated && (
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {uploadStatus.chunksCreated} chunks created from {uploadStatus.totalCharacters?.toLocaleString()} characters
                </p>
              )}
            </div>
            <button
              onClick={clearStatus}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                darkMode
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Upload Another PDF
            </button>
          </div>
        ) : uploadStatus.isError ? (
          <div className="flex flex-col items-center space-y-4">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <div className="text-center">
              <p className={`text-sm font-medium ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                {uploadStatus.message}
              </p>
            </div>
            <button
              onClick={clearStatus}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                darkMode
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-4">
            <div className={`p-4 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
              <Upload className={`h-8 w-8 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} />
            </div>
            <div className="text-center">
              <p className={`text-lg font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                Upload a PDF Document
              </p>
              <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Drag and drop your PDF here, or click to browse
              </p>
              <p className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                Maximum file size: 10MB
              </p>
            </div>
            <button
              onClick={openFileDialog}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                darkMode
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <FileText className="h-4 w-4 inline mr-2" />
              Choose PDF File
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
