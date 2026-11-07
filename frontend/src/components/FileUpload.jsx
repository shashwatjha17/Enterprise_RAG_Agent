/**
 * FileUpload Component
 *
 * Provides file upload functionality for ingesting documents into the RAG pipeline
 * Features:
 * - File selection input
 * - Extraction mode selection (fast or comprehensive with OCR)
 * - Upload to backend /api/ingest endpoint
 * - Loading state during upload
 * - Success/error message display
 * - Form reset after successful upload
 */

import { useState } from 'react';
import { uploadFile } from '../lib/api';
import DocumentListModal from './DocumentList';

export default function FileUpload({ onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'
  const [mode, setMode] = useState('fast'); // 'fast' or 'comprehensive'
  const [showDocuments, setShowDocuments] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  /**
   * Handle file selection
   * Updates state when user selects a file
   */
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    // Clear any previous messages when new file is selected
    setMessage('');
  };

  /**
   * Handle file upload
   * Sends the file to the backend ingest endpoint using API helper
   */
  const handleUpload = async () => {
    // Validation: check if file is selected
    if (!file) {
      setMessage('Please select a file');
      setMessageType('error');
      return;
    }

    // Start upload
    setUploading(true);
    setMessage('');

    try {
      const data = await uploadFile(file, mode);

      // Success
      setMessage(data.message || 'File uploaded successfully');
      setMessageType('success');
      // Reset file input
      setFile(null);
      // Clear the file input element
      document.getElementById('fileInput').value = '';

      // Notify parent component of successful upload
      if (onUploadSuccess) {
        onUploadSuccess();
      }

      // Trigger document list refresh
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      // Error from backend or network
      setMessage(`Error: ${error.message}`);
      setMessageType('error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      {/* Card container */}
      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Upload Document</h2>

        {/* File input section */}
        <div className="space-y-4">
          <div>
            <label htmlFor="fileInput" className="block text-sm font-medium text-gray-700 mb-2">
              Select a file to ingest
            </label>
            <input
              id="fileInput"
              type="file"
              onChange={handleFileChange}
              disabled={uploading}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100
                disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {file && (
              <p className="mt-2 text-sm text-gray-600">
                Selected: <span className="font-medium">{file.name}</span>
              </p>
            )}
          </div>

          {/* Mode selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Extraction Mode
            </label>
            <div className="space-y-2">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  value="fast"
                  checked={mode === 'fast'}
                  onChange={(e) => setMode(e.target.value)}
                  disabled={uploading}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 disabled:opacity-50"
                />
                <div className="flex-1">
                  <span className="font-medium text-gray-900">Fast</span>
                  <p className="text-sm text-gray-500">Basic text extraction (faster processing)</p>
                </div>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  value="comprehensive"
                  checked={mode === 'comprehensive'}
                  onChange={(e) => setMode(e.target.value)}
                  disabled={uploading}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 disabled:opacity-50"
                />
                <div className="flex-1">
                  <span className="font-medium text-gray-900">Comprehensive</span>
                  <p className="text-sm text-gray-500">OCR-enabled extraction (better for scanned documents and images)</p>
                </div>
              </label>
            </div>
          </div>

          {/* Upload button */}
          <button
            onClick={handleUpload}
            disabled={uploading || !file}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading...' : 'Upload File'}
          </button>

          {/* Message display */}
          {message && (
            <div
              className={`p-3 rounded-md ${
                messageType === 'success'
                  ? 'bg-green-100 border border-green-400 text-green-700'
                  : 'bg-red-100 border border-red-400 text-red-700'
              }`}
            >
              {message}
            </div>
          )}
        </div>

        {/* Info section */}
        <div className="mt-6 p-4 bg-gray-50 rounded-md">
          <p className="text-sm text-gray-600">
            <span className="font-semibold">Note:</span> Supported file types include PDF, TXT, DOCX, and more.
            The file will be processed and ingested into the RAG pipeline's vector database.
          </p>
        </div>

        {/* Document Library button */}
        <div className="mt-4">
          <button
            onClick={() => setShowDocuments(true)}
            className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-md transition-colors flex items-center justify-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
            Document Library
          </button>
        </div>
      </div>

      {/* Document Library Modal */}
      <DocumentListModal
        isOpen={showDocuments}
        onClose={() => setShowDocuments(false)}
        refreshTrigger={refreshTrigger}
      />
    </div>
  );
}
