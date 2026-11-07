from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from httpcore import request
from pydantic import BaseModel, Field
import tempfile
from app.middleware.auth import get_current_user
from app.core.config import supabase_url, supabase_anon_key
from app.services.main_agent import MainAgent
from app.services.task_tracker import TaskTracker
import logging
from app.services.document_service import DocumentService

logger = logging.getLogger(__name__)

router = APIRouter()

class GenerateRequest(BaseModel):
    query: str = Field(..., description="User's question")


class GenerateResponse(BaseModel):
    query: str
    answer: str
    
document_service=DocumentService(supabase_url, supabase_anon_key)

@router.post("/generate")
async def generate(
    request: GenerateRequest,
    user_details=Depends(get_current_user)
):
    """
    Non-streaming endpoint (backward compatibility)
    Returns only the final answer, no task updates
    """
    with tempfile.TemporaryDirectory() as temp_dir:
        try:
            token=user_details[0]
            # Get SQLite files metadata
            sqlite_dbs=document_service.get_sqlite_files_metadata(user_details[1].user.id, token)

            # Download SQLite files if any exist
            if len(sqlite_dbs["names"]):
                files=document_service.list_sqlite_files(user_details[1].user.id, token)
                document_service.download_sqlite_files(files, user_details[1].user.id, temp_dir, token)

            # Initialize MainAgent
            agent= MainAgent(supabase_url, supabase_anon_key, token, sqlite_dbs, temp_dir )

            # Consume async generator to get final answer
            # IMPORTANT: Use 'async for' because agent() is async generator
            final_response = None
            async for event in agent(request.query):
                if event.get("type") == "final_response":
                    final_response = event["answer"]
                    break

            return {"query": request.query, "answer": final_response}

        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
 


@router.post("/generate-events")
async def generate_events(
    request: GenerateRequest,
    user_details=Depends(get_current_user)
):
    """
    Takes in the user's query
    Calls the rag_system
    streams back the response as events 
    """
    with tempfile.TemporaryDirectory() as temp_dir:
        try:
            token=user_details[0]
            # make a call and get all the sqlite files
            sqlite_dbs=document_service.get_sqlite_files_metadata(user_details[1].user.id, token)
            
            # get descriptions 
            if len(sqlite_dbs["names"]):
             
                files=document_service.list_sqlite_files(user_details[1].user.id, token)
                
                document_service.download_sqlite_files(files, user_details[1].user.id, temp_dir, token)     
            

            agent= MainAgent(supabase_url, supabase_anon_key, token, sqlite_dbs, temp_dir )
            task_tracker_wrapper=TaskTracker(agent)
            async def event_generator():
                async for response in task_tracker_wrapper.execute_query(request.query):
                    yield response
            
            return StreamingResponse(event_generator(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "connection": "keep-alive"})
        
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))





