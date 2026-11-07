"""
Authentication Middleware
This middleware validates JWT tokens from Supabase and extracts user information.
It ensures that protected endpoints are only accessible to authenticated users.
"""

from fastapi import HTTPException, Request

from supabase import create_client, Client
import os


SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")


supabase: Client = create_client(
    SUPABASE_URL ,
    SUPABASE_SERVICE_KEY
)



async def get_current_user(request: Request) -> dict:
    """
    Args: Request from the frontend
    Extracts the auth header and jwt token to verify the user
    returns (token, user_info)
    """
    auth_header = request.headers.get("authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    token = auth_header.split(" ", 1)[1]

    user_info = supabase.auth.get_user(token)
    if not user_info or not user_info.user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


    return (token, user_info)
    


