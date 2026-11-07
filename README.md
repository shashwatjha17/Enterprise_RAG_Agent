# Enterprise RAG Agent

A production-ready **multi-agent RAG system** that combines intelligent document retrieval with structured database querying through an orchestrated agent architecture. Built for enterprise use cases requiring real-time streaming, secure multi-tenant access, and hybrid query capabilities.

## Overview

Enterprise RAG Agent is a full-stack platform that enables users to query both unstructured documents and structured databases using natural language. The system employs a sophisticated multi-agent architecture where specialized agents (RAG Agent, SQL Agent) are orchestrated by a main agent to deliver accurate, source-attributed responses in real-time.

### Key Features

- **Multi-Agent Orchestration**: Intelligent main agent coordinates specialized RAG and SQL agents based on query context
- **Real-Time Streaming**: Server-Sent Events (SSE) provide live task updates and progressive response rendering
- **Hybrid Querying**: Seamlessly combines semantic document search with SQL database queries in a single conversation
- **Enterprise Security**: JWT authentication, Row-Level Security (RLS), and complete user data isolation
- **Multi-Format Support**: Process PDFs, DOCX, PPTX, images, and more with OCR capabilities
- **Vector Search**: PostgreSQL pgvector for fast semantic similarity search with IVFFlat indexing
- **Source Attribution**: All responses include inline citations with source documents

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│               React Frontend (Vite)                     │
│  ┌────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │   Vault    │  │  RAG Agent   │  │  Auth/Theme    │  │
│  │  (Upload)  │  │  (Chat UI)   │  │    Context     │  │
│  └────────────┘  └──────────────┘  └────────────────┘  │
└─────────────────────┬───────────────────────────────────┘
                      │ REST API + SSE
┌─────────────────────▼───────────────────────────────────┐
│              FastAPI Backend                            │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Main Agent (Orchestrator)                       │   │
│  │    ├─► RAG Agent (Document Retrieval)           │   │
│  │    └─► SQL Agent (Database Querying)            │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Services: Chunking, Embedding, Document Mgmt   │   │
│  └──────────────────────────────────────────────────┘   │
└───┬─────────────────────────────────────────┬───────────┘
    │                                         │
┌───▼──────────────────────┐      ┌──────────▼──────────┐
│  Supabase PostgreSQL     │      │  User SQLite Files  │
│  ├─ documents            │      │  (Uploaded DBs)     │
│  ├─ chunks + embeddings  │      └─────────────────────┘
│  └─ pgvector search      │
└──────────────────────────┘
```

### Technology Stack

**Frontend**
- React 19 + Vite
- Tailwind CSS v4
- React Router v7 (protected routes)
- Supabase JS SDK
- Framer Motion
- React Markdown

**Backend**
- FastAPI (async Python web framework)
- LangChain (LLM orchestration)
- OpenAI GPT-4o/GPT-4o-mini
- Supabase (PostgreSQL + Auth)
- pgvector (vector embeddings)
- pdf2image, pdfplumber, PyMuPDF (document processing)
- Tesseract OCR

**Infrastructure**
- Supabase (database, auth, storage)
- Docker (containerization)
- PostgreSQL with pgvector extension

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Supabase account
- OpenAI API key

### Environment Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/enterprise-rag-agent.git
   cd enterprise-rag-agent
   ```

2. **Backend Setup**
   ```bash
   cd backend

   # Create virtual environment
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate

   # Install dependencies
   pip install -r requirements.txt

   # Create .env file
   cp .env.example .env
   # Edit .env with your credentials:
   # - OPENAI_API_KEY
   # - SUPABASE_URL
   # - SUPABASE_KEY
   # - SUPABASE_JWT_SECRET

   # Run database migrations (see backend/database/README.md)
   # Execute migration files in Supabase SQL editor

   # Start the server
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

3. **Frontend Setup**
   ```bash
   cd ../frontend

   # Install dependencies
   npm install

   # Create .env file
   cp .env.example .env
   # Edit .env with your Supabase credentials:
   # - VITE_SUPABASE_URL
   # - VITE_SUPABASE_ANON_KEY

   # Start dev server
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

## Usage

### 1. Upload Documents

Navigate to the **Vault** page and upload documents:
- **Fast Mode**: Quick text extraction for digital documents
- **Comprehensive Mode**: Includes OCR for scanned documents

Supported formats: PDF, DOCX, TXT, PPTX, images (PNG, JPG)

### 2. Upload Databases (Optional)

Upload SQLite database files with descriptions for natural language querying.

### 3. Query with the RAG Agent

Navigate to the **RAG Agent** page and ask questions:

```
Example queries:
- "What are the key findings in the Q3 financial report?"
- "Summarize all documents related to project Alpha"
- "How many transactions occurred in the last quarter?" (SQL query)
- "What does the contract say about termination clauses?"
```

The system will:
1. Analyze your query
2. Invoke appropriate agents (RAG, SQL, or both)
3. Stream real-time task updates
4. Return a comprehensive answer with source citations

### 4. Real-Time Task Streaming

Watch as the agent works:
- ✅ RAG agent called - searching documents
- ✅ SQL agent called - querying database
- ✅ Response synthesized with citations

## How It Works

### Multi-Agent Flow

1. **Query Reception**: User submits a natural language query
2. **Agent Orchestration**: Main agent analyzes the query and determines which specialized agents to invoke
3. **Parallel Execution**:
   - **RAG Agent**: Performs semantic search on document embeddings, retrieves relevant chunks
   - **SQL Agent**: Translates natural language to SQL, queries user databases
4. **Iterative Retrieval**: RAG agent performs multiple retrieval attempts with query reformulation for maximum recall
5. **Response Synthesis**: Main agent combines results from all agents
6. **Source Attribution**: Returns markdown-formatted response with inline citations
7. **Streaming Updates**: All tasks streamed to frontend via SSE for real-time feedback

### RAG Pipeline

```
Document Upload → Text Extraction → Chunking (600 chars, 400 overlap)
  → OpenAI Embeddings (1536-dim) → Store in pgvector

Query → Generate Embedding → Cosine Similarity Search → Retrieve Top-K Chunks
  → Iterative Reformulation → Return Ranked Results
```

## Security

- **Authentication**: Supabase JWT-based authentication
- **Authorization**: Row-Level Security (RLS) on all database tables
- **User Isolation**: Complete data separation between users
- **Token Validation**: FastAPI middleware validates JWT on every request
- **Secure File Storage**: Documents stored in Supabase storage with user-scoped access

## Project Structure

```
enterprise-rag-agent/
├── frontend/              # React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── contexts/      # Auth & Theme contexts
│   │   ├── pages/         # Page components (Vault, RAGAgent, etc.)
│   │   ├── lib/           # API client and utilities
│   │   └── assets/        # Static assets
│   └── README.md         # Frontend-specific documentation
│
├── backend/              # FastAPI application
│   ├── app/
│   │   ├── api/          # API routes
│   │   ├── services/     # Business logic (agents, document processing)
│   │   ├── core/         # Configuration
│   │   ├── middleware/   # Auth middleware
│   │   └── schemas/      # Pydantic models
│   ├── database/         # SQL migration files
│   └── README.md         # Backend-specific documentation
│
└── README.md             # This file
```

## Configuration

### Backend Configuration

Edit `backend/.env`:
```env
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_JWT_SECRET=your-jwt-secret
```

### Frontend Configuration

Edit `frontend/.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

