/**
 * SQLiteFileUpload Component
 *
 * Provides SQLite file upload functionality for database ingestion
 * Features:
 * - SQLite file selection input
 * - Optional description field
 * - Upload to backend /api/sqlite_file endpoint
 * - Loading state during upload
 * - Success/error message display
 * - Form reset after successful upload
 */

import { useState } from 'react';
import { uploadSQLiteFile } from '../lib/api';
import SQLiteFileList from './SQLiteFileList';

export default function SQLiteFileUpload({ onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'
  const [showFiles, setShowFiles] = useState(false);
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
   * Handle SQLite file upload
   * Sends the file to the backend sqlite_file endpoint using API helper
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
      const data = await uploadSQLiteFile(file, description);

      // Success
      setMessage(data.message || 'SQLite file uploaded successfully');
      setMessageType('success');

      // Reset form
      setFile(null);
      setDescription('');
      document.getElementById('sqliteFileInput').value = '';

      // Notify parent component of successful upload
      if (onUploadSuccess) {
        onUploadSuccess();
      }

      // Trigger file list refresh
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
    <div className="w-full">
      {/* Card container */}
      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Upload SQLite Database</h2>

        {/* File input section */}
        <div className="space-y-4">
          <div>
            <label htmlFor="sqliteFileInput" className="block text-sm font-medium text-gray-700 mb-2">
              Select a SQLite file
            </label>
            <input
              id="sqliteFileInput"
              type="file"
              accept=".db,.sqlite,.sqlite3"
              onChange={handleFileChange}
              disabled={uploading}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-green-50 file:text-green-700
                hover:file:bg-green-100
                disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {file && (
              <p className="mt-2 text-sm text-gray-600">
                Selected: <span className="font-medium">{file.name}</span>
              </p>
            )}
          </div>

          {/* Description field */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description (optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={uploading}
              rows={3}
              placeholder="Describe the contents of this database..."
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Upload button */}
          <button
            onClick={handleUpload}
            disabled={uploading || !file}
            className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading...' : 'Upload SQLite File'}
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
            <span className="font-semibold">Note:</span> Upload SQLite database files (.db, .sqlite, .sqlite3).
            The agent will be able to query these databases using natural language.
          </p>
        </div>

        {/* SQLite Files Library button */}
        <div className="mt-4">
          <button
            onClick={() => setShowFiles(true)}
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
                d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
              />
            </svg>
            SQLite Files Library
          </button>
        </div>
      </div>

      {/* SQLite Files Library Modal */}
      <SQLiteFileList
        isOpen={showFiles}
        onClose={() => setShowFiles(false)}
        refreshTrigger={refreshTrigger}
      />
    </div>
  );
}
