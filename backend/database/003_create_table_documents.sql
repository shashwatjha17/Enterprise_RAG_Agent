
CREATE TABLE public.documents (
  id Serial PRIMARY KEY ,
  user_id uuid REFERENCES auth.users(id),
  filename text,
  content text,
  uploaded_at timestamp DEFAULT now()
);


ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;