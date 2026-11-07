CREATE POLICY "Users can manage their own sqlite files"
  ON public.sqlite_files
  FOR ALL
  TO authenticated
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));