create table public.sqlite_files(
  id serial primary key,
  user_id uuid references auth.users(id),
  file_name text not null,
  description text 
);

alter table public.sqlite_files enable row level security;