/**
 * Layout Component
 *
 * Main layout wrapper for authenticated pages
 * Features:
 * - Modern sidebar navigation with purple/cyan theme
 * - Dark mode toggle
 * - User info display with avatar
 * - Smooth animations and hover effects
 * - Responsive design
 */

import { NavLink, Outlet } from 'react-router-dom';
import { Folder, MessageSquare, LogOut, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';

export default function Layout() {
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar with gradient accent */}
      <aside className="w-64 bg-card border-r border-border flex flex-col relative overflow-hidden">
        {/* Gradient background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full">
          {/* Logo/Brand with sparkle effect */}
          <div className="px-6 py-6 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Enterprise RAG</h1>
                <p className="text-xs text-muted-foreground">AI-Powered Search</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-6 space-y-1">
            <NavLink
              to="/vault"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 group',
                  isActive
                    ? 'bg-primary/10 text-primary shadow-sm'
                    : 'text-muted-foreground hover:bg-accent/10 hover:text-accent'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Folder className={cn('w-5 h-5 transition-transform group-hover:scale-110', isActive && 'text-primary')} />
                  <span>Vault</span>
                  {isActive && (
                    <div className="ml-auto w-1 h-6 rounded-full bg-primary" />
                  )}
                </>
              )}
            </NavLink>

            <NavLink
              to="/rag-agent"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 group',
                  isActive
                    ? 'bg-gradient-to-r from-primary/10 to-accent/10 text-primary shadow-sm'
                    : 'text-muted-foreground hover:bg-accent/10 hover:text-accent'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <MessageSquare className={cn('w-5 h-5 transition-transform group-hover:scale-110', isActive && 'text-primary')} />
                  <span>RAG Agent</span>
                  {isActive && (
                    <div className="ml-auto">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    </div>
                  )}
                </>
              )}
            </NavLink>
          </nav>

          {/* User info and controls */}
          <div className="border-t border-border px-3 py-4 space-y-3">
            {/* Theme toggle */}
            <div className="flex items-center justify-between px-3">
              <span className="text-sm text-muted-foreground">Theme</span>
              <ThemeToggle />
            </div>

            {/* User info */}
            <div className="px-3 py-2 rounded-lg bg-secondary/50">
              <p className="text-xs text-muted-foreground mb-1">Signed in as</p>
              <p className="text-sm font-medium text-foreground truncate">
                {user?.email}
              </p>
            </div>

            {/* Logout button */}
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
