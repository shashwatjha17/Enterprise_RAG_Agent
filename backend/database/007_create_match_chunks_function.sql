-- RPC function for vector similarity search
-- This function performs cosine similarity search on chunk embeddings

CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.0,
  match_count INT DEFAULT 5,
  filter_document_id INT DEFAULT NULL
)
RETURNS TABLE (
  id INT,
  document_id INT,
  user_id UUID,
  chunk_text TEXT,
  chunk_index INT,
  metadata JSONB,
  filename TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.document_id,
    c.user_id,
    c.chunk_text,
    c.chunk_index,
    c.metadata,
    d.filename,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM chunks c
  JOIN documents d ON c.document_id = d.id
  WHERE
    -- RLS handles user filtering via auth.uid()
    (filter_document_id IS NULL OR c.document_id = filter_document_id)
    AND 1 - (c.embedding <=> query_embedding) > match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION match_chunks TO authenticated, anon;

