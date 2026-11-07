/**
 * Signup Component
 *
 * Provides a form for new users to create an account with email and password
 * Features:
 * - Email and password input fields
 * - Password confirmation field
 * - Form validation (matching passwords, minimum length)
 * - Error and success message display
 * - Loading state during registration
 * - Link to switch to login if user already has an account
 */

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Signup({ onToggleForm }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { signUp } = useAuth();

  /**
   * Handle form submission
   * Validates inputs and attempts to create a new user account
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Reset messages
    setError('');
    setSuccess('');

    // Validation checks
    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    // Attempt to sign up
    setLoading(true);
    const { data, error: signUpError } = await signUp(email, password);
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
    } else {
      setSuccess('Account created successfully! You can now login.');
      // Clear form
      setEmail('');
      setPassword('');
      setConfirmPassword('');

      // Auto-switch to login after 2 seconds
      setTimeout(() => {
        onToggleForm();
      }, 2000);
    }
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
            Get Started
          </h2>
          <p className="text-center text-sm text-muted-foreground mb-8">
            Create your account to start processing documents
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

          {/* Success message display */}
          {success && (
            <div className="mb-6 p-4 bg-accent/10 border border-accent/50 text-accent rounded-xl backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>{success}</span>
              </div>
            </div>
          )}

          {/* Signup form */}
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
              <p className="text-xs text-muted-foreground mt-2">Minimum 6 characters</p>
            </div>

            {/* Confirm password input */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
                  Creating account...
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Toggle to login form */}
          <div className="mt-6 pt-6 border-t border-border/50">
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <button
                onClick={onToggleForm}
                className="text-primary hover:text-accent font-semibold transition-colors hover:underline"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
