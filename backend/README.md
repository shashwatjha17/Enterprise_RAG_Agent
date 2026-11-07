# Enterprise RAG Agent - Backend

Production-grade FastAPI backend implementing an agentic RAG system with LLM orchestration, semantic search, and intelligent query routing. Combines retrieval-augmented generation with natural language to SQL capabilities through a hierarchical multi-agent architecture.

## Core AI/ML Capabilities

- **Agentic Orchestration**: LLM-powered main agent dynamically routes queries to specialized agents
- **Semantic Vector Search**: 1536-dimensional embeddings with cosine similarity ranking (pgvector + IVFFlat)
- **Iterative Retrieval**: Query reformulation and multi-pass retrieval strategies for maximum recall
- **Embedding Pipeline**: Automated chunking, vectorization, and indexing with OpenAI embeddings
- **Natural Language to SQL**: LLM-based SQL generation with schema introspection
- **Multi-Format NLP**: Document processing with OCR, text extraction, and intelligent chunking
- **Real-Time Streaming**: SSE-based progressive response generation with task tracking
- **Production ML Stack**: FastAPI + LangChain + OpenAI GPT-4o + pgvector


## Project Structure

```
backend/
├── app/
│   ├── main.py                      # FastAPI application entry point
│   │
│   ├── api/                         # API route handlers
│   │   ├── ingest.py                # Document upload & processing
│   │   └── generate.py              # RAG generation endpoints
│   │
│   ├── services/                    # Business logic
│   │   ├── main_agent.py            # Main orchestrator agent
│   │   ├── rag_agent.py             # Document retrieval agent
│   │   ├── sql_agent.py             # Database querying agent
│   │   ├── document_service.py      # Document CRUD operations
│   │   ├── embedding_service.py     # Embedding generation
│   │   ├── chunking_service.py      # Text chunking
│   │   └── task_tracker.py          # SSE task streaming
│   │
│   ├── core/                        # Configuration
│   │   └── config.py                # Environment config
│   │
│   ├── middleware/                  # Middleware
│   │   └── auth.py                  # JWT authentication
│   │
│   │
│   └── utils/                       # Utilities
│       └── file_reader.py           # Multi-format file reading
│
├── database/                        # SQL migrations
│   ├── 001_create_table_profiles.sql
│   ├── 002_add_policies_to_profiles.sql
│   ├── 003_create_table_documents.sql
│   ├── 004_add_policies_to_documents.sql
│   ├── 005_create_table_chunks.sql
│   ├── 006_add_policies_to_chunks.sql
│   ├── 007_create_match_chunks_function.sql
│   ├── 008_create_table_sqlite_files.sql
│   └── 009_add_policies_to_sqlite_files.sql
│
├── requirements.txt                 # Python dependencies (dev)
├── requirements-prod.txt            # Python dependencies (prod)
├── Dockerfile                       # Docker container configuration
├── .dockerignore                    # Docker ignore patterns
└── README.md                        # This file
```

## Architecture

### Multi-Agent System

The backend implements a hierarchical multi-agent architecture where an LLM-powered orchestrator coordinates specialized agents for optimal query resolution:

```
                    ┌─────────────────┐
                    │   User Query    │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   Main Agent    │
                    │  (Orchestrator) │
                    └────────┬────────┘
                             │
                 ┌───────────┴───────────┐
                 │                       │
        ┌────────▼────────┐    ┌────────▼────────┐
        │   RAG Agent     │    │   SQL Agent     │
        │ (Doc Retrieval) │    │ (DB Querying)   │
        └────────┬────────┘    └────────┬────────┘
                 │                       │
        ┌────────▼────────┐    ┌────────▼────────┐
        │  Vector Search  │    │   SQLite Query  │
        │  (pgvector)     │    │   Execution     │
        └─────────────────┘    └─────────────────┘
```

### Main Agent (`app/services/main_agent.py`)

**Responsibilities:**
- Receives user queries
- Analyzes query intent with LLM reasoning
- Dynamically routes to appropriate specialized agents
- Manages tool calling loop with function calling
- Synthesizes final response from multi-agent outputs
- Yields SSE events for real-time task tracking

**Tools Available:**
1. `rag_agent_tool` - Semantic search on uploaded documents
2. `sql_agent_tool` - Natural language SQL query execution


### RAG Agent (`app/services/rag_agent.py`)

**Responsibilities:**
- Semantic vector search on document embeddings
- Iterative query reformulation for maximum recall
- Multi-pass retrieval with LLM-guided strategy
- Source attribution and citation generation

**ML Pipeline:**
1. Generate query embedding using OpenAI text-embedding-3-small (1536-dim)
2. Perform cosine similarity search in pgvector with IVFFlat indexing
3. LLM analyzes retrieved chunks and determines if more queries needed
4. If insufficient results, apply query reformulation strategies:
   - Semantic expansion with broader/related terms
   - Synonym substitution
   - Query decomposition into sub-queries
5. Return aggregated chunks with source metadata

**Configuration:**
- LLM: GPT-4o-mini (for query analysis and synthesis)
- Embedding model: `text-embedding-3-small` (1536 dimensions)
- Default similarity threshold: 0.0 (returns all results, LLM filters relevance)
- Top-K results: 3-7 chunks per query iteration

### SQL Agent (`app/services/sql_agent.py`)

**Responsibilities:**
- Natural language to SQL translation using LLMs
- Schema introspection and query planning
- SQLite query execution with error handling
- Result formatting and interpretation

**Process:**
1. Receive natural language query
2. Introspect database schema using `get_tables_schema` tool (tables, columns, types)
3. Generate SQL query using LLM with schema context
4. Execute query on user's SQLite file
5. Format results as human-readable markdown with secondary LLM pass


### Document Processing & Embedding Pipeline

**Full Pipeline:**
```
Upload → Format Detection → Text Extraction → Chunking → Embedding → Vector Storage
```

**Supported Formats:**
- **PDF**: pdfplumber (digital text), PyMuPDF (rendering), pdf2image + Tesseract OCR (scanned)
- **DOCX**: python-docx with layout preservation
- **PPTX**: python-pptx slide-by-slide extraction
- **TXT**: UTF-8 direct read
- **Images**: Tesseract OCR (PNG, JPG, JPEG)

**Processing Modes:**
1. **Fast Mode**: Text extraction only, optimized for digital documents
2. **Comprehensive Mode**: Includes OCR pipeline for scanned/image-based documents

**Chunking Strategy** (`app/services/chunking_service.py`):
- Character-based text splitting with semantic overlap
- Chunk size: 600 characters (optimized for embedding context window)
- Overlap: 400 characters (67% overlap to preserve context across boundaries)
- Token counting with tiktoken for accurate length validation

**Embedding Generation** (`app/services/embedding_service.py`):
- Model: OpenAI `text-embedding-3-small`
- Dimensions: 1536 (standard for semantic search)
- Batch processing for API efficiency
- Stored in PostgreSQL pgvector with IVFFlat index for fast approximate nearest neighbor search

## Getting Started

### Prerequisites

- Python 3.11 or higher
- Supabase account with project setup
- OpenAI API key
- Tesseract OCR installed (for comprehensive mode)

### Installation

1. **Clone the repository** (if not already done)
   ```bash
   git clone https://github.com/yourusername/enterprise-rag-agent.git
   cd enterprise-rag-agent/backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv

   # On Windows
   venv\Scripts\activate

   # On macOS/Linux
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Install Tesseract OCR** (for comprehensive mode with OCR)

   **Windows:**
   - Download installer from https://github.com/UB-Mannheim/tesseract/wiki
   - Add to PATH: `C:\Program Files\Tesseract-OCR`

   **macOS:**
   ```bash
   brew install tesseract
   ```

   **Linux:**
   ```bash
   sudo apt-get install tesseract-ocr
   ```

5. **Configure environment variables**

   Create `.env` file:
   ```env
   # OpenAI
   OPENAI_API_KEY=sk-...

   # Supabase
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your-anon-key
   SUPABASE_JWT_SECRET=your-jwt-secret

   # Optional
   LOG_LEVEL=INFO
   ```

   Get Supabase credentials:
   - URL: Project Settings → API → Project URL
   - Anon Key: Project Settings → API → Project API keys → anon public
   - JWT Secret: Project Settings → API → JWT Settings → JWT Secret

6. **Set up database**

   Run SQL migrations in order in Supabase SQL Editor:
   ```bash
   # Navigate to Supabase Dashboard → SQL Editor
   # Execute each file in database/ folder in order (001-009)
   ```

   Or use the Supabase CLI:
   ```bash
   supabase db reset
   ```

7. **Start the server**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

   Server will be available at http://localhost:8000

## API Endpoints

### Authentication

All endpoints except `/health` require JWT authentication via Bearer token:

```bash
Authorization: Bearer <jwt_token>
```

Token obtained from Supabase authentication.

### Health Check

**GET** `/health`

Check server status.

**Response:**
```json
{
  "status": "healthy"
}
```

### Document Management

**POST** `/api/ingest`

Upload and process documents.

**Query Parameters:**
- `mode` (optional): `fast` or `comprehensive` (default: `fast`)

**Request:**
```bash
curl -X POST http://localhost:8000/api/ingest?mode=comprehensive \
  -H "Authorization: Bearer <token>" \
  -F "file=@document.pdf"
```

**Response:**
```json
{
  "message": "Document processed successfully",
  "document_id": "uuid",
  "chunks_created": 15
}
```

---

**GET** `/api/documents`

List user's uploaded documents.

**Response:**
```json
{
  "documents": [
    {
      "id": "uuid",
      "filename": "report.pdf",
      "created_at": "2025-01-15T10:30:00Z"
    }
  ]
}
```

---

**DELETE** `/api/documents`

Delete a document and its chunks.

**Query Parameters:**
- `document_id` (required): UUID of document to delete

**Response:**
```json
{
  "message": "Document deleted successfully"
}
```

### Database Management

**POST** `/api/sqlite_file`

Upload SQLite database file.

**Request:**
```bash
curl -X POST http://localhost:8000/api/sqlite_file \
  -H "Authorization: Bearer <token>" \
  -F "file=@data.sqlite" \
  -F "description=Sales data Q4 2024"
```

**Response:**
```json
{
  "message": "SQLite file uploaded successfully",
  "file_id": "uuid"
}
```

---

**GET** `/api/sqlite_files`

List user's uploaded SQLite databases.

**Response:**
```json
{
  "sqlite_files": [
    {
      "id": "uuid",
      "filename": "data.sqlite",
      "description": "Sales data Q4 2024",
      "created_at": "2025-01-15T10:30:00Z"
    }
  ]
}
```

---

**DELETE** `/api/sqlite_file`

Delete a SQLite database file.

**Query Parameters:**
- `file_id` (required): UUID of file to delete

**Response:**
```json
{
  "message": "SQLite file deleted successfully"
}
```

### RAG Generation

**POST** `/api/generate`

Generate response (non-streaming).

**Request:**
```json
{
  "query": "What are the key findings in the Q3 report?"
}
```

**Response:**
```json
{
  "answer": "## Key Findings\n\nBased on the Q3 report...",
  "sources": [
    {
      "document_id": "uuid",
      "filename": "q3-report.pdf",
      "chunk_text": "..."
    }
  ]
}
```

---

**POST** `/api/generate-events`

Generate response with real-time streaming via SSE.

**Query Parameters:**
- `query` (required): User's natural language query

**Request:**
```bash
curl -N http://localhost:8000/api/generate-events?query="Summarize%20the%20report" \
  -H "Authorization: Bearer <token>"
```

**SSE Events:**

1. **task_added**
   ```json
   {
     "type": "task_added",
     "task": {
       "id": 1,
       "description": "RAG agent called",
       "status": "in_progress"
     }
   }
   ```

2. **task_completed**
   ```json
   {
     "type": "task_completed",
     "task_id": 1
   }
   ```

3. **final_response**
   ```json
   {
     "type": "final_response",
     "answer": "## Answer\n\nBased on the documents..."
   }
   ```

4. **done**
   ```json
   {
     "type": "done"
   }
   ```

## Database Schema

### documents

Stores uploaded document metadata.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to auth.users |
| filename | VARCHAR | Original filename |
| content | TEXT | Extracted text content |
| created_at | TIMESTAMPTZ | Upload timestamp |

**Indexes:**
- `idx_documents_user_id` on `user_id`

**RLS Policies:**
- Users can only access their own documents

### chunks

Stores document chunks with vector embeddings.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| document_id | UUID | Foreign key to documents |
| user_id | UUID | Foreign key to auth.users |
| chunk_text | TEXT | Chunk content |
| embedding | VECTOR(1536) | OpenAI embedding |
| metadata | JSONB | Additional metadata |
| created_at | TIMESTAMPTZ | Creation timestamp |

**Indexes:**
- `idx_chunks_document_id` on `document_id`
- `idx_chunks_user_id` on `user_id`
- `idx_chunks_embedding` (IVFFlat) on `embedding` for fast vector search

**RLS Policies:**
- Users can only access their own chunks

### sqlite_files

Stores SQLite database metadata.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to auth.users |
| filename | VARCHAR | Original filename |
| file_path | VARCHAR | Storage path in Supabase |
| description | TEXT | User-provided description |
| created_at | TIMESTAMPTZ | Upload timestamp |

**Indexes:**
- `idx_sqlite_files_user_id` on `user_id`

**RLS Policies:**
- Users can only access their own files

### Vector Search Function

**match_chunks(query_embedding, match_threshold, match_count)**

PostgreSQL function for semantic search:

```sql
SELECT
  id,
  document_id,
  chunk_text,
  1 - (embedding <=> query_embedding) AS similarity
FROM chunks
WHERE user_id = auth.uid()
  AND 1 - (embedding <=> query_embedding) > match_threshold
ORDER BY similarity DESC
LIMIT match_count;
```

Uses cosine distance operator `<=>` from pgvector.

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_KEY` | Yes | Supabase anon key |
| `SUPABASE_JWT_SECRET` | Yes | JWT secret for token validation |
| `LOG_LEVEL` | No | Logging level (default: INFO) |

### Model Configuration

Edit `app/services/main_agent.py`, `app/services/rag_agent.py`, `app/services/sql_agent.py`:

```python
# Change LLM model
llm = ChatOpenAI(model="gpt-4o", temperature=0)

# Change embedding model
embedding_model = OpenAIEmbeddings(model="text-embedding-3-small")

# Adjust chunk size
chunk_size = 600
chunk_overlap = 400

# Adjust retrieval parameters
similarity_threshold = 0.7
top_k = 10
```



## Deployment

### Docker Deployment

**Build image:**
```bash
docker build -t enterprise-rag-backend .
```

**Run container:**
```bash
docker run -p 8080:8080 \
  -e OPENAI_API_KEY=sk-... \
  -e SUPABASE_URL=https://... \
  -e SUPABASE_KEY=... \
  -e SUPABASE_JWT_SECRET=... \
  enterprise-rag-backend
```

### Production Configuration

**Dockerfile** uses:
- Python 3.11 slim image
- Multi-stage build for smaller size
- Production dependencies only (`requirements-prod.txt`)
- Gunicorn with Uvicorn workers
- Port 8080

**Recommended environment:**
- 2 CPU cores minimum
- 4GB RAM minimum
- Persistent storage for SQLite files

