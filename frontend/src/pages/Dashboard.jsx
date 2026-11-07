/**
 * Dashboard Page
 *
 * Protected page - only accessible to authenticated users
 * Features:
 * - File upload functionality
 * - User info display
 * - Logout button
 *
 * Future enhancements can include:
 * - File history/list
 * - Query interface
 * - Analytics
 */

import { useAuth } from '../contexts/AuthContext';
import FileUpload from '../components/FileUpload';

export default function Dashboard() {
  const { user, signOut } = useAuth();

  /**
   * Handle user logout
   */
  const handleLogout = async () => {
    await signOut();
    // AuthContext will handle the redirect automatically
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation/Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">RAG Pipeline Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">
                Logged in as: <span className="font-medium">{user?.email}</span>
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* File upload section */}
        <FileUpload />

        {/* Future sections can be added here */}
        {/* Example: Query interface, file history, etc. */}
      </main>
    </div>
  );
}
