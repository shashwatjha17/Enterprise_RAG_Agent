/**
 * DocumentList Modal Component
 *
 * Modal popup that displays list of uploaded documents with delete functionality
 * Features:
 * - Opens as a modal overlay
 * - Fetches and displays user's documents
 * - Delete button with trash icon for each document
 * - Auto-refresh after deletion
 * - Loading and error states
 */

import { useState, useEffect } from 'react';
import { getDocuments, deleteDocument } from '../lib/api';

export default function DocumentListModal({ isOpen, onClose, refreshTrigger }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(null);

  /**
   * Fetch documents from backend
   */
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getDocuments();
      setDocuments(data.filenames || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch documents when modal opens or refreshTrigger changes
   */
  useEffect(() => {
    if (isOpen) {
      fetchDocuments();
    }
  }, [isOpen, refreshTrigger]);

  /**
   * Handle delete document
   */
  const handleDelete = async (filename) => {
    if (!window.confirm(`Are you sure you want to delete "${filename}"? This will also delete all associated chunks.`)) {
      return;
    }

    try {
      setDeleting(filename);
      await deleteDocument(filename);
      // Refresh the list
      await fetchDocuments();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Document Library</h2>
            <p className="text-sm text-gray-600 mt-1">
              {documents.length} document{documents.length !== 1 ? 's' : ''} uploaded
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

        {/* Document list - scrollable */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading documents...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              <p className="text-lg">No documents uploaded yet</p>
              <p className="text-sm mt-2">Upload your first document to get started</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {documents.map((filename, index) => (
                <div
                  key={index}
                  className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  {/* Document icon and name */}
                  <div className="flex items-center flex-1 min-w-0">
                    {/* Document icon */}
                    <svg
                      className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>

                    {/* Filename */}
                    <span className="text-gray-900 truncate">{filename}</span>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={() => handleDelete(filename)}
                    disabled={deleting === filename}
                    className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                    title="Delete document"
                  >
                    {deleting === filename ? (
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
