/**
 * Supabase Client Configuration
 *
 * This file initializes and exports the Supabase client.
 * The client is used throughout the app for authentication and database operations.
 *
 * Environment variables required:
 * - VITE_SUPABASE_URL: Your Supabase project URL
 * - VITE_SUPABASE_ANON_KEY: Your Supabase anonymous/public key
 *
 * Note: These should be defined in your .env file at the root of the frontend directory
 */

import { createClient } from '@supabase/supabase-js';

// Get environment variables (Vite uses VITE_ prefix for client-side env vars)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
const isConfigured =
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('placeholder') &&
  !supabaseAnonKey.includes('placeholder');

if (!isConfigured) {
  console.warn('⚠️ Supabase is not configured!');
  console.warn('The app will load but authentication will not work.');
  console.warn('To fix this:');
  console.warn('1. Create a Supabase project (see SUPABASE_SETUP_GUIDE.md)');
  console.warn('2. Update .env with your actual credentials');
  console.warn('3. Restart the dev server');
}

// Create and export the Supabase client
// This single instance is shared across the entire application
// If using placeholder values, the client will be created but won't work properly
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);
