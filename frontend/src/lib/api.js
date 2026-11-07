/**
 * API Configuration
 *
 * Central configuration for all API endpoints
 * Makes it easy to change backend URL in one place
 * Automatically includes JWT authentication tokens in requests
 */

import { supabase } from './supabaseClient';

// Base URL for backend API
// In production, this should come from environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// API endpoints
export const API_ENDPOINTS = {
  INGEST: `${API_BASE_URL}/api/ingest`,
  RETRIEVE: `${API_BASE_URL}/api/retrieve`,
  GENERATE: `${API_BASE_URL}/api/generate`,
  DOCUMENTS: `${API_BASE_URL}/api/documents`,
  SQLITE_FILE: `${API_BASE_URL}/api/sqlite_file`,
  SQLITE_FILES: `${API_BASE_URL}/api/sqlite_files`,
  HEALTH: `${API_BASE_URL}/health`,
};

/**
 * Generic API call helper
 * Handles common patterns: authentication, error handling, etc.
 *
 * Automatically includes JWT token from Supabase session in Authorization header
 *
 * @param {string} url - API endpoint URL
 * @param {object} options - Fetch options
 * @returns {Promise} Response data or throws error
 */
export async function apiCall(url, options = {}) {
  try {
    // Get the current session to extract JWT token
    const { data: { session } } = await supabase.auth.getSession();

    // Build headers with authentication token if user is logged in
    const headers = {
      ...options.headers,
    };

    // Add JWT token to Authorization header if session exists
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    return data;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

/**
 * Upload a file to the ingest endpoint
 *
 * @param {File} file - File to upload
 * @param {string} mode - Extraction mode: 'fast' (default) or 'comprehensive' (includes OCR)
 * @returns {Promise} Upload response
 */
export async function uploadFile(file, mode = 'fast') {
  const formData = new FormData();
  formData.append('file', file);

  // Append mode as query parameter
  const url = `${API_ENDPOINTS.INGEST}?mode=${mode}`;

  return apiCall(url, {
    method: 'POST',
    body: formData,
  });
}

/**
 * Generate a RAG response (non-streaming)
 * Sends query to backend and returns complete response
 *
 * @param {string} query - User's question
 * @returns {Promise} Response with query and answer
 */
export async function generateRAGResponse(query) {
  return apiCall(API_ENDPOINTS.GENERATE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
}

/**
 * Generate a RAG response with SSE streaming (Server-Sent Events)
 * Streams task updates and final response in real-time
 *
 * @param {string} query - User's question
 * @param {Function} onEvent - Callback for each SSE event: (event) => void
 * @returns {Promise<void>} Resolves when stream ends
 */
export async function generateRAGResponseStream(query, onEvent) {
  // Get auth token
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(`${API_BASE_URL}/api/generate-events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` }),
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  // Read SSE stream
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // Keep incomplete line in buffer

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const eventData = JSON.parse(line.slice(6));
        onEvent(eventData);

        if (eventData.type === 'done') {
          return; // Stream finished
        }
      }
    }
  }
}

/**
 * Get all documents for the authenticated user
 *
 * @returns {Promise} List of document filenames
 */
export async function getDocuments() {
  return apiCall(API_ENDPOINTS.DOCUMENTS, {
    method: 'GET',
  });
}

/**
 * Delete a document by filename
 *
 * @param {string} docName - Name of the document to delete
 * @returns {Promise} Delete response
 */
export async function deleteDocument(docName) {
  return apiCall(`${API_ENDPOINTS.DOCUMENTS}?doc_name=${encodeURIComponent(docName)}`, {
    method: 'DELETE',
  });
}

/**
 * Upload a SQLite file with optional description
 *
 * @param {File} file - SQLite file to upload
 * @param {string} fileDescription - Optional description of the file
 * @returns {Promise} Upload response
 */
export async function uploadSQLiteFile(file, fileDescription = '') {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('file_description', fileDescription);

  return apiCall(API_ENDPOINTS.SQLITE_FILE, {
    method: 'POST',
    body: formData,
  });
}

/**
 * Get all SQLite files for the authenticated user
 *
 * @returns {Promise} List of SQLite files with metadata
 */
export async function getSQLiteFiles() {
  return apiCall(API_ENDPOINTS.SQLITE_FILES, {
    method: 'GET',
  });
}

/**
 * Delete a SQLite file by filename
 *
 * @param {string} fileName - Name of the SQLite file to delete
 * @returns {Promise} Delete response
 */
export async function deleteSQLiteFile(fileName) {
  return apiCall(`${API_ENDPOINTS.SQLITE_FILE}?file_name=${encodeURIComponent(fileName)}`, {
    method: 'DELETE',
  });
}

export default API_ENDPOINTS;
