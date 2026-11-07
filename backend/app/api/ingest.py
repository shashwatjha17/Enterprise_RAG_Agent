from fastapi import APIRouter, UploadFile, File, Request, HTTPException, Query, Depends
from dotenv import load_dotenv
from app.core.config import supabase_url, supabase_anon_key, supabase_service_key
import logging
from supabase import create_client
from app.utils.file_reader import read_file_content
from app.services.chunking_service import ChunkingService
from app.services.embedding_service import EmbeddingService
from app.services.document_service import DocumentService
from pydantic import BaseModel, Field
from typing import List
from app.middleware.auth import get_current_user

logger = logging.getLogger(__name__)


supabase = create_client(supabase_url, supabase_service_key)


chunking_service = ChunkingService(chunk_size=600, chunk_overlap=400)
embedding_service = EmbeddingService(model="text-embedding-3-small")
document_service = DocumentService( supabase_url, supabase_anon_key)

class get_docs_response(BaseModel):
    filenames: List[str]=Field(description="list of all filenames belong to a user")

    

router = APIRouter()


@router.post("/ingest")
async def ingest(
    request: Request,
    file: UploadFile = File(...),
    mode: str = Query(default="fast", regex="^(fast|comprehensive)$"),
    user_details=Depends(get_current_user)
):
    """Upload and ingest a file into the vector DB with chunking and embeddings.

    Args:
        file: File to upload
        mode: Extraction mode - 'fast' (default) or 'comprehensive' (includes OCR)
        user_details-> (token, user_info)
    """
    logger.info(f"Ingesting file: {file.filename}, mode: {mode}")

    # Read file content
    content = await file.read()
    logger.info("Extracting text from file")
    # Extract text from file
    try:
        text = read_file_content(file.filename, content, mode=mode)
        if not text:
            raise HTTPException(status_code=400, detail="Extracted text is empty, please try advanced mode")
    except Exception as e:
        logger.error(f"Error during extraction: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"File extraction failed: {str(e)}")

    
    auth_token = user_details[0]

    user_info = user_details[1]
    if not user_info or not user_info.user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = user_info.user.id
    email = user_info.user.email
    filename = file.filename.lower()

    # Save document to database
    logger.info("Saving document to database")
    try:
        document = document_service.save_document(user_id, filename, text, auth_token)
        document_id = document["id"]
        logger.info(f"Document saved with ID: {document_id}")
    except Exception as e:
        logger.error(f"Failed to save document: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save document: {str(e)}")

    #  Chunk the text   
    logger.info("Chunking text")
    try:
        chunks = chunking_service.chunk_text(text, metadata={"filename": filename})

        if not chunks:
            raise HTTPException(status_code=500, detail="Chunking failed: no chunks created")
    except Exception as e:
        logger.error(f"Chunking failed: {e}")
        raise HTTPException(status_code=500, detail=f"Chunking failed: {str(e)}")

    #  Generate embeddings for chunks
    logger.info("Generating embeddings for chunks")
    try:
        chunk_texts = [chunk["text"] for chunk in chunks]
        embeddings = embedding_service.embed_chunks(chunk_texts)
        logger.info(f"Generated {len(embeddings)} embeddings")
    except Exception as e:
        logger.error(f"Embedding generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Embedding generation failed: {str(e)}")

    #  Save chunks with embeddings to database
    logger.info("Saving chunks to database")
    try:
        saved_count = document_service.save_chunks(document_id, user_id, chunks, embeddings, auth_token)
        logger.info(f"Saved {saved_count} chunks to database")
    except Exception as e:
        logger.error(f"Failed to save chunks: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save chunks: {str(e)}")

    return {
        "message": f"{filename} processed successfully for {email}",
        "document_id": document_id,
        "chunks_created": len(chunks)
    }



@router.get("/documents")
async def get_documents(user_info=Depends(get_current_user)):
    """
    Extracts the user_id from the authorization header and returns all the documents for that user_id
    """
    logger.info("Fetching documents for user")
    token=user_info[0]

    filenames= document_service.get_documents(token)

    return get_docs_response(filenames=filenames)


@router.delete("/documents")
async def del_documents(doc_name: str, user_info=Depends(get_current_user)):
    '''
    Takes in the doc_name and deletes that document and respective chunks for that document
    '''    
    logger.info(f"Deleting document: {doc_name}")
    token=user_info[0]
    doc_id=document_service.get_doc_id(doc_name, token)

    document_service.delete_document(doc_id, token)

    document_service.delete_document_chunks(doc_id, token)
    
    return {"message": f"{doc_name} deleted successfully"}


# add an endpoint to store the uploaded file

@router.post("/sqlite_file")
async def save_sqlite(file: UploadFile=File(...), file_description:str ="",user_info=Depends(get_current_user)):
    '''
    accepts the file along with description(optional) given by the user
    saves the sqlite file in the supabase storage and the metadata in the sqlite_files table
    '''
    
    file_content= await file.read()
    token=user_info[0]
    user_id=user_info[1].user.id
    status=document_service.save_sqlite_file(file_content,file.filename, file_description, user_id, token )

    return {"message": f"{file.filename} saved successfully "}


@router.get("/sqlite_files")
async def list_files(user_info=Depends(get_current_user)):
    '''
    returns thee names of all the files belonging to the user
    '''
    user_id=user_info[1].user.id
    token=user_info[0]
    files=document_service.sqllite_files_metadata( user_id, token)

    return files


@router.delete("/sqlite_file")
async def delete_sqlite_file(file_name: str, user_info=Depends(get_current_user)):
    '''
    deletes the sqlite file from the storage and the metadata from the sqlite_files table
    '''
    user_id=user_info[1].user.id
    token=user_info[0]

    document_service.delete_sqlite_file(file_name, user_id, token)

    return {"message": f"{file_name} deleted successfully "}    

