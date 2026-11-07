-- Enable RLS
  ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;

  -- Policy: Users can only see their own chunks
  CREATE POLICY "Users see own chunks"
    ON chunks FOR SELECT
    USING (auth.uid() = user_id);

  -- Policy: Users can only insert their own chunks
  CREATE POLICY "Users insert own chunks"
    ON chunks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

  -- Policy: Users can only delete their own chunks
  CREATE POLICY "Users delete own chunks"
    ON chunks FOR DELETE
    USING (auth.uid() = user_id);
