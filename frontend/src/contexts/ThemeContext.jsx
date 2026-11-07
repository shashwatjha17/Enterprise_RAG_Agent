/**
 * Theme Context
 *
 * Manages dark/light theme toggling across the application
 * Features:
 * - Persists theme preference in localStorage
 * - Defaults to dark mode
 * - Applies theme class to document element
 * - Provides theme state and toggle function to all components
 */

import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
});

/**
 * Hook to access theme context
 * @returns {Object} Theme state and functions
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

/**
 * Theme Provider Component
 * Wraps the app to provide theme functionality
 */
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    // Check localStorage first, default to dark
    const stored = localStorage.getItem('theme');
    return stored || 'dark';
  });

  useEffect(() => {
    // Apply theme class to document root
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);

    // Persist to localStorage
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
