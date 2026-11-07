/**
 * RAG Agent Page
 *
 * Chat interface for querying documents and databases using RAG (Retrieval-Augmented Generation)
 * Features:
 * - ChatGPT-like conversational interface
 * - Complete responses from unified agent (handles both documents and SQL databases)
 * - Auto-scrolling to latest message
 * - Loading states and error handling
 */

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MessageSquare, Send } from 'lucide-react';
import { generateRAGResponseStream } from '../lib/api';
import { Button } from '../components/ui/Button';

export default function RAGAgent() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [streamingTasks, setStreamingTasks] = useState(null); // { tasks: [], finalResponse: null }
  const messagesEndRef = useRef(null);

  /**
   * Auto-scroll to bottom when new messages or tasks arrive
   */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingTasks]);

  /**
   * Handle sending a query with SSE streaming
   */
  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    // Add user message to chat
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setError('');
    setLoading(true);

    // Initialize streaming state
    setStreamingTasks({ tasks: [], finalResponse: null });

    try {
      await generateRAGResponseStream(userMessage.content, (event) => {
        if (event.type === 'task_list_init') {
          // Initialize task list
          setStreamingTasks((prev) => ({
            ...prev,
            tasks: event.tasks,
          }));
        } else if (event.type === 'task_added') {
          // Add new task
          setStreamingTasks((prev) => ({
            ...prev,
            tasks: [...prev.tasks, event.task],
          }));
        } else if (event.type === 'task_completed') {
          // Mark task as completed
          setStreamingTasks((prev) => ({
            ...prev,
            tasks: prev.tasks.map((task) =>
              task.id === event.task_id
                ? {
                    ...task,
                    status: 'completed',
                    duration_ms: event.duration_ms,
                    summary: event.summary,
                  }
                : task
            ),
          }));
        } else if (event.type === 'final_response') {
          // Set final response
          setStreamingTasks((prev) => ({
            ...prev,
            finalResponse: event.answer,
          }));
        } else if (event.type === 'done') {
          // Stream complete - convert to message
          // Use a temporary reference to avoid race conditions
          setStreamingTasks((current) => {
            if (current?.finalResponse) {
              // Queue the message update for after streaming is cleared
              setTimeout(() => {
                const assistantMessage = {
                  role: 'assistant',
                  content: current.finalResponse,
                  tasks: current.tasks, // Store tasks for collapsible view
                  timestamp: new Date(),
                };
                setMessages((prev) => [...prev, assistantMessage]);
              }, 0);
            }
            return null; // Clear streaming state immediately
          });
        }
      });
    } catch (err) {
      setError(err.message);
      setStreamingTasks(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle Enter key to send message
   */
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header with gradient accent */}
      <header className="bg-card border-b border-border px-6 py-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-2xl font-bold text-foreground">RAG Agent</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ask questions about your documents and databases
          </p>
        </div>
      </header>

      {/* Messages container */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground mt-20">
              <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8 text-primary" />
              </div>
              <p className="text-lg font-medium text-foreground">Start a conversation</p>
              <p className="text-sm mt-2">Ask questions about your uploaded documents and databases</p>
            </div>
          )}

          {messages.map((message, index) => (
            <div key={index}>
              {message.role === 'user' ? (
                <UserMessage content={message.content} />
              ) : (
                <AssistantMessage content={message.content} tasks={message.tasks} />
              )}
            </div>
          ))}

          {/* Streaming tasks (shown while agent is working) */}
          {streamingTasks && (
            <StreamingTaskMessage
              tasks={streamingTasks.tasks}
              finalResponse={streamingTasks.finalResponse}
            />
          )}

          {/* Error display */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
              <strong>Error:</strong> {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area with gradient border */}
      <div className="border-t border-border bg-card px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask a question about your documents..."
                disabled={loading}
                rows={1}
                className="w-full resize-none rounded-lg border border-input bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <Button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="px-6 gap-2"
              size="lg"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * User message component with gradient background
 */
function UserMessage({ content }) {
  return (
    <div className="flex justify-end animate-slide-in">
      <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-2xl px-5 py-3 max-w-2xl shadow-lg shadow-primary/20">
        <p className="whitespace-pre-wrap leading-relaxed">{content}</p>
      </div>
    </div>
  );
}

/**
 * Streaming task message (shown while agent is working)
 */
function StreamingTaskMessage({ tasks, finalResponse }) {
  return (
    <div className="flex justify-start animate-fade-in">
      <div className="bg-gradient-to-br from-accent/5 to-primary/5 border border-accent/20 rounded-2xl shadow-lg px-5 py-4 max-w-2xl w-full">
        <div className="flex items-center gap-2 mb-3">
          <div className="relative">
            <div className="animate-spin h-4 w-4 border-2 border-accent border-t-transparent rounded-full"></div>
            <div className="absolute inset-0 animate-ping h-4 w-4 border-2 border-accent/20 rounded-full"></div>
          </div>
          <span className="text-sm font-medium text-foreground">Agent is working...</span>
        </div>
        <TaskList tasks={tasks} />

        {/* Show final response as it arrives */}
        {finalResponse && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-p:text-foreground prose-a:text-primary prose-strong:text-foreground prose-code:text-foreground prose-pre:bg-secondary prose-li:text-foreground">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-6 mb-4 text-foreground" {...props} />,
                  h2: ({node, ...props}) => <h2 className="text-xl font-bold mt-5 mb-3 text-foreground" {...props} />,
                  h3: ({node, ...props}) => <h3 className="text-lg font-bold mt-4 mb-2 text-foreground" {...props} />,
                  p: ({node, ...props}) => <p className="mb-4 text-foreground leading-relaxed" {...props} />,
                  ul: ({node, ...props}) => <ul className="list-disc list-inside mb-4 space-y-2 text-foreground" {...props} />,
                  ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-4 space-y-2 text-foreground" {...props} />,
                  li: ({node, ...props}) => <li className="text-foreground" {...props} />,
                  code: ({node, inline, ...props}) =>
                    inline ? (
                      <code className="bg-secondary px-1.5 py-0.5 rounded text-sm text-foreground font-mono" {...props} />
                    ) : (
                      <code className="block bg-secondary p-4 rounded-lg text-sm text-foreground font-mono overflow-x-auto" {...props} />
                    ),
                  pre: ({node, ...props}) => <pre className="bg-secondary p-4 rounded-lg overflow-x-auto mb-4" {...props} />,
                  a: ({node, ...props}) => <a className="text-primary hover:underline" {...props} />,
                  strong: ({node, ...props}) => <strong className="font-bold text-foreground" {...props} />,
                  table: ({node, ...props}) => <table className="w-full border-collapse border border-border mb-4" {...props} />,
                  thead: ({node, ...props}) => <thead className="bg-secondary" {...props} />,
                  tbody: ({node, ...props}) => <tbody {...props} />,
                  tr: ({node, ...props}) => <tr className="border-b border-border" {...props} />,
                  th: ({node, ...props}) => <th className="border border-border px-4 py-2 text-left font-bold text-foreground" {...props} />,
                  td: ({node, ...props}) => <td className="border border-border px-4 py-2 text-foreground" {...props} />,
                }}
              >
                {finalResponse}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Assistant message component with markdown rendering and collapsible task details
 */
function AssistantMessage({ content, tasks }) {
  const [showTasks, setShowTasks] = useState(false);

  return (
    <div className="flex justify-start animate-slide-in">
      <div className="bg-card border border-border rounded-2xl shadow-lg px-5 py-4 max-w-2xl">
        {/* Collapsible task details */}
        {tasks && tasks.length > 0 && (
          <div className="mb-4 pb-4 border-b border-border">
            <button
              onClick={() => setShowTasks(!showTasks)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
            >
              <span className="transition-transform group-hover:scale-110">{showTasks ? '▼' : '▶'}</span>
              <span>View agent tasks ({tasks.length})</span>
            </button>
            {showTasks && (
              <div className="mt-3 animate-accordion-down">
                <TaskList tasks={tasks} compact />
              </div>
            )}
          </div>
        )}

        {/* Markdown response */}
        <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-p:text-foreground prose-a:text-primary prose-strong:text-foreground prose-code:text-foreground prose-pre:bg-secondary prose-li:text-foreground">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-6 mb-4 text-foreground" {...props} />,
              h2: ({node, ...props}) => <h2 className="text-xl font-bold mt-5 mb-3 text-foreground" {...props} />,
              h3: ({node, ...props}) => <h3 className="text-lg font-bold mt-4 mb-2 text-foreground" {...props} />,
              p: ({node, ...props}) => <p className="mb-4 text-foreground leading-relaxed" {...props} />,
              ul: ({node, ...props}) => <ul className="list-disc list-inside mb-4 space-y-2 text-foreground" {...props} />,
              ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-4 space-y-2 text-foreground" {...props} />,
              li: ({node, ...props}) => <li className="text-foreground" {...props} />,
              code: ({node, inline, ...props}) =>
                inline ? (
                  <code className="bg-secondary px-1.5 py-0.5 rounded text-sm text-foreground font-mono" {...props} />
                ) : (
                  <code className="block bg-secondary p-4 rounded-lg text-sm text-foreground font-mono overflow-x-auto" {...props} />
                ),
              pre: ({node, ...props}) => <pre className="bg-secondary p-4 rounded-lg overflow-x-auto mb-4" {...props} />,
              a: ({node, ...props}) => <a className="text-primary hover:underline" {...props} />,
              strong: ({node, ...props}) => <strong className="font-bold text-foreground" {...props} />,
              table: ({node, ...props}) => <table className="w-full border-collapse border border-border mb-4" {...props} />,
              thead: ({node, ...props}) => <thead className="bg-secondary" {...props} />,
              tbody: ({node, ...props}) => <tbody {...props} />,
              tr: ({node, ...props}) => <tr className="border-b border-border" {...props} />,
              th: ({node, ...props}) => <th className="border border-border px-4 py-2 text-left font-bold text-foreground" {...props} />,
              td: ({node, ...props}) => <td className="border border-border px-4 py-2 text-foreground" {...props} />,
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

/**
 * Task list component - displays tasks with status and modern styling
 */
function TaskList({ tasks, compact = false }) {
  return (
    <div className={`space-y-2 ${compact ? 'text-xs' : 'text-sm'}`}>
      {tasks.map((task) => (
        <div
          key={task.id}
          className={`flex items-start gap-3 transition-all duration-300 rounded-lg p-2 ${
            task.status === 'completed'
              ? 'text-muted-foreground bg-secondary/30'
              : 'text-foreground bg-secondary/50'
          }`}
        >
          {/* Status icon */}
          <div className="mt-0.5 flex-shrink-0">
            {task.status === 'completed' ? (
              <svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <div className="relative">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          {/* Task info */}
          <div className="flex-1 min-w-0">
            <div className={task.status === 'completed' ? 'line-through opacity-70' : 'font-medium'}>
              {task.description}
            </div>

            {/* Optional metadata (agent, duration, summary) */}
            {(task.agent || task.duration_ms || task.summary) && (
              <div className="text-xs text-muted-foreground mt-1.5 space-y-0.5">
                {task.agent && (
                  <div className="flex items-center gap-1">
                    <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                      {task.agent}
                    </span>
                  </div>
                )}
                {task.duration_ms && (
                  <div className="flex items-center gap-1">
                    <span>⏱️ {(task.duration_ms / 1000).toFixed(2)}s</span>
                  </div>
                )}
                {task.summary && <div className="italic opacity-80">{task.summary}</div>}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
