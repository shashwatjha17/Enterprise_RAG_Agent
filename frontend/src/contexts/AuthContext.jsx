/**
 * AuthContext - Manages authentication state across the application
 *
 * This context provides:
 * - Current user state
 * - Loading state during auth checks
 * - Sign up, sign in, and sign out functions
 * - Automatic session persistence and restoration
 *
 * Usage:
 * Wrap your app with <AuthProvider> and use useAuth() hook in components
 */

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// Create the context
const AuthContext = createContext({});

/**
 * Custom hook to access auth context
 * Must be used within AuthProvider
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

/**
 * AuthProvider Component
 * Wraps the application and provides authentication state and methods
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the user
    // This runs once when the app loads
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => subscription.unsubscribe();
  }, []);

  /**
   * Sign up a new user with email and password
   * @param {string} email - User's email
   * @param {string} password - User's password
   * @returns {Promise} Supabase auth response
   */
  const signUp = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error signing up:', error.message);
      return { data: null, error };
    }
  };

  /**
   * Sign in an existing user with email and password
   * @param {string} email - User's email
   * @param {string} password - User's password
   * @returns {Promise} Supabase auth response
   */
  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error signing in:', error.message);
      return { data: null, error };
    }
  };

  /**
   * Sign out the current user
   * @returns {Promise} Supabase auth response
   */
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Error signing out:', error.message);
      return { error };
    }
  };

  // Context value that will be available to all children
  const value = {
    user,           // Current user object (null if not authenticated)
    loading,        // True while checking authentication state
    signUp,         // Function to register new user
    signIn,         // Function to login existing user
    signOut,        // Function to logout current user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
