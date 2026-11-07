CREATE EXTENSION IF NOT EXISTS vector;

  CREATE TABLE chunks (
    id Serial PRIMARY KEY,
    document_id int REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    chunk_text TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    embedding VECTOR(1536),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

-- Performance indexes
  CREATE INDEX idx_chunks_document_id ON chunks(document_id);
  CREATE INDEX idx_chunks_user_id ON chunks(user_id);

  -- Vector similarity search index 
  CREATE INDEX idx_chunks_embedding ON chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);