import os
from dotenv import load_dotenv

load_dotenv()

supabase_url = os.getenv("SUPABASE_URL")
supabase_anon_key = os.getenv("SUPABASE_ANON_KEY")
supabase_service_key = os.getenv("SUPABASE_SERVICE_KEY") # Good for admin tasks
openai_api_key: str = os.getenv("OPENAI_API_KEY")



if not supabase_url:
    raise ValueError("Missing required env var: SUPABASE_URL")
if not supabase_anon_key:
    raise ValueError("Missing required env var: SUPABASE_ANON_KEY")
if not openai_api_key:
    raise ValueError("Missing required env var: OPENAI_API_KEY")