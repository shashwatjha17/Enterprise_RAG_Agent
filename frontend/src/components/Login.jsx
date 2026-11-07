/**
 * Login Component
 *
 * Provides a form for existing users to sign in with email and password
 * Features:
 * - Email and password input fields
 * - Form validation
 * - Error message display
 * - Loading state during authentication
 * - Link to switch to signup if user doesn't have an account
 */

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Login({ onToggleForm }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { signIn } = useAuth();

  /**
   * Handle form submission
   * Validates inputs and attempts to sign in the user
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Reset error state
    setError('');

    // Basic validation
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    // Attempt to sign in
    setLoading(true);
    const { data, error: signInError } = await signIn(email, password);
    setLoading(false);

    if (signInError) {
      setError(signInError.message);
    }
    // If successful, the AuthContext will update and user will be redirected automatically
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Card container with enhanced design */}
      <div className="relative">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl blur-2xl opacity-50"></div>

        {/* Main card */}
        <div className="relative bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl p-8">
          <h2 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Welcome Back
          </h2>
          <p className="text-center text-sm text-muted-foreground mb-8">
            Sign in to access your documents and databases
          </p>

          {/* Error message display */}
          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/50 text-destructive rounded-xl backdrop-blur-sm animate-shake">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Login form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-foreground placeholder:text-muted-foreground transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="you@example.com"
                disabled={loading}
              />
            </div>

            {/* Password input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-foreground placeholder:text-muted-foreground transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Toggle to signup form */}
          <div className="mt-6 pt-6 border-t border-border/50">
            <p className="text-center text-sm text-muted-foreground">
              Don't have an account?{' '}
              <button
                onClick={onToggleForm}
                className="text-primary hover:text-accent font-semibold transition-colors hover:underline"
              >
                Sign up
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
