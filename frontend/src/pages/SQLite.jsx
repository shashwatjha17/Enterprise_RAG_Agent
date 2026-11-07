/**
 * SQLite Page
 *
 * Dedicated page for managing SQLite databases
 * Features:
 * - Upload SQLite files
 * - View database schema
 * - Manage existing databases
 */

import { Database } from 'lucide-react';
import SQLiteFileUpload from '../components/SQLiteFileUpload';

export default function SQLite() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header with gradient */}
      <header className="bg-card border-b border-border px-6 py-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-accent/10 via-accent/5 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-xl bg-gradient-to-br from-accent to-accent/80 shadow-lg shadow-accent/20">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">SQL Databases</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Upload and query SQLite databases with natural language
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="py-8 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-fade-in">
            <SQLiteFileUpload />
          </div>
        </div>
      </main>
    </div>
  );
}
