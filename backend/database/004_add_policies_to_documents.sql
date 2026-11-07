CREATE POLICY "Users can manage their own documents"
  ON public.documents
  FOR ALL
  TO authenticated
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));