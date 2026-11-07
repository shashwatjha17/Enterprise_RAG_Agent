/**
 * Landing Page
 *
 * Public landing page displayed to unauthenticated users
 * Features:
 * - Welcome message and app description
 * - Toggle between Login and Signup forms
 * - Responsive design
 *
 * Note: Users must authenticate to access the main application (Dashboard)
 */

import { useState } from 'react';
import { Brain, Database, FileText, Sparkles, Lock, Mail } from 'lucide-react';
import Login from '../components/Login';
import Signup from '../components/Signup';

export default function Landing() {
  // State to toggle between login and signup forms
  const [showLogin, setShowLogin] = useState(true);

  /**
   * Toggle between login and signup forms
   */
  const toggleForm = () => {
    setShowLogin(!showLogin);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-6xl relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left side - Hero section */}
          <div className="text-center lg:text-left space-y-6 animate-fade-in">
            {/* Logo/Icon */}
            <div className="flex items-center justify-center lg:justify-start gap-3 mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-2xl blur-xl opacity-50"></div>
                <div className="relative bg-gradient-to-br from-primary to-accent p-4 rounded-2xl">
                  <Brain className="w-8 h-8 text-white" />
                </div>
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                Enterprise RAG
              </h1>
            </div>

            {/* Tagline */}
            <div className="space-y-3">
              <h2 className="text-2xl lg:text-3xl font-semibold text-foreground">
                Intelligent Document Processing
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Multi-agent AI system combining semantic search with natural language database querying
              </p>
            </div>

            {/* Features */}
            <div className="grid sm:grid-cols-2 gap-4 pt-6">
              <FeatureCard
                icon={<FileText className="w-5 h-5" />}
                title="Multi-Format Support"
                description="PDFs, DOCX, images with OCR"
              />
              <FeatureCard
                icon={<Database className="w-5 h-5" />}
                title="SQL Integration"
                description="Natural language to SQL"
              />
              <FeatureCard
                icon={<Brain className="w-5 h-5" />}
                title="AI Orchestration"
                description="LLM-powered agent routing"
              />
              <FeatureCard
                icon={<Sparkles className="w-5 h-5" />}
                title="Real-Time Streaming"
                description="Live task tracking via SSE"
              />
            </div>

            {/* Trust indicators */}
            <div className="pt-6 flex items-center justify-center lg:justify-start gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                <span>Secure & Private</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span>Email Authentication</span>
              </div>
            </div>
          </div>

          {/* Right side - Auth form */}
          <div className="animate-slide-in">
            {showLogin ? (
              <Login onToggleForm={toggleForm} />
            ) : (
              <Signup onToggleForm={toggleForm} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Feature card component for the landing page
 */
function FeatureCard({ icon, title, description }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
      <div className="flex-shrink-0 p-2 rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="space-y-1">
        <h3 className="font-semibold text-foreground text-sm">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
