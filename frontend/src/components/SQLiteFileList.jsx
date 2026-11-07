/**
 * SQLiteFileList Modal Component
 *
 * Modal popup that displays list of uploaded SQLite files with delete functionality
 * Features:
 * - Opens as a modal overlay
 * - Fetches and displays user's SQLite files with metadata
 * - Shows file description if available
 * - Delete button with trash icon for each file
 * - Auto-refresh after deletion
 * - Loading and error states
 */

import { useState, useEffect } from 'react';
import { getSQLiteFiles, deleteSQLiteFile } from '../lib/api';

export default function SQLiteFileList({ isOpen, onClose, refreshTrigger }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(null);

  /**
   * Fetch SQLite files from backend
   */
  const fetchFiles = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getSQLiteFiles();
      // Backend returns array of file objects with name, description, etc.
      setFiles(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch files when modal opens or refreshTrigger changes
   */
  useEffect(() => {
    if (isOpen) {
      fetchFiles();
    }
  }, [isOpen, refreshTrigger]);

  /**
   * Handle delete file
   */
  const handleDelete = async (fileName) => {
    if (!window.confirm(`Are you sure you want to delete "${fileName}"?`)) {
      return;
    }

    try {
      setDeleting(fileName);
      await deleteSQLiteFile(fileName);
      // Refresh the list
      await fetchFiles();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">SQLite Files Library</h2>
            <p className="text-sm text-gray-600 mt-1">
              {files.length} database{files.length !== 1 ? 's' : ''} uploaded
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* File list - scrollable */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              <p className="mt-2 text-gray-600">Loading SQLite files...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              <p className="text-lg">No SQLite files uploaded yet</p>
              <p className="text-sm mt-2">Upload your first database to get started</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {files.map((fileObj, index) => (
                <div
                  key={index}
                  className="px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    {/* File icon and details */}
                    <div className="flex items-start flex-1 min-w-0">
                      {/* Database icon */}
                      <svg
                        className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-1"
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

                      {/* File details */}
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 font-medium truncate">
                          {fileObj.file_name || fileObj.name}
                        </p>
                        {fileObj.file_description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {fileObj.file_description}
                          </p>
                        )}
                        {fileObj.uploaded_at && (
                          <p className="text-xs text-gray-400 mt-1">
                            Uploaded: {new Date(fileObj.uploaded_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={() => handleDelete(fileObj.file_name || fileObj.name)}
                      disabled={deleting === (fileObj.file_name || fileObj.name)}
                      className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                      title="Delete database"
                    >
                      {deleting === (fileObj.file_name || fileObj.name) ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                      ) : (
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
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
