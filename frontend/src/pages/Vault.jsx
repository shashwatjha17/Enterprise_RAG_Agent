/**
 * Vault Page
 *
 * Modern data ingestion page for uploading and processing files
 * Features:
 * - Two sections: Documents and SQLite Files
 * - Document upload with mode selection
 * - SQLite file upload with optional description
 * - Modern purple/cyan theme with gradients
 */

import { FileText, Database } from 'lucide-react';
import FileUpload from '../components/FileUpload';
import SQLiteFileUpload from '../components/SQLiteFileUpload';

export default function Vault() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header with gradient */}
      <header className="bg-card border-b border-border px-6 py-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-3xl font-bold text-foreground">Vault</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Upload and manage your documents and databases for AI-powered search
          </p>
        </div>
      </header>

      {/* Main content */}
      <main className="py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Documents Section */}
            <div className="animate-fade-in">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground">
                    Documents
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Upload PDFs, DOCX, TXT and other formats for semantic search
                </p>
              </div>
              <FileUpload />
            </div>

            {/* SQLite Files Section */}
            <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-accent/10 to-accent/5">
                    <Database className="w-5 h-5 text-accent" />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground">
                    SQLite Databases
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Upload SQLite databases for natural language querying
                </p>
              </div>
              <SQLiteFileUpload />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
