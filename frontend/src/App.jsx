/**
 * Main App Component
 *
 * Root component of the application
 * Handles:
 * - Authentication context provider
 * - React Router setup with protected routes
 * - Conditional rendering based on auth state
 * - Loading state while checking authentication
 *
 * Routes:
 * - / → Landing page (unauthenticated) or redirect to /vault (authenticated)
 * - /vault → Document upload page (protected)
 * - /rag-agent → RAG chat interface (protected)
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Landing from './pages/Landing';
import Vault from './pages/Vault';
import RAGAgent from './pages/RAGAgent';
import Layout from './components/Layout';

/**
 * Protected Route wrapper
 * Redirects to landing page if user is not authenticated
 */
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return user ? children : <Navigate to="/" replace />;
}

/**
 * AppContent Component
 * Must be inside AuthProvider to access auth context
 */
function AppContent() {
  const { user, loading } = useAuth();

  // Show loading spinner while checking authentication state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Landing page - shows login/signup or redirects if authenticated */}
      <Route
        path="/"
        element={user ? <Navigate to="/vault" replace /> : <Landing />}
      />

      {/* Protected routes with Layout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="vault" element={<Vault />} />
        <Route path="rag-agent" element={<RAGAgent />} />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/**
 * Main App Component
 * Wraps the app with BrowserRouter, ThemeProvider, and AuthProvider
 */
function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
