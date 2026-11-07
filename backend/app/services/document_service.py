import logging
from typing import List, Dict, Optional
import requests
from supabase import Client
from fastapi import HTTPException
logger = logging.getLogger(__name__)


class DocumentService:
    """Service for managing documents and chunks in Supabase."""

    def __init__(self, supabase_url: str, supabase_anon_key: str):
        """
        Document service to save the chunks and documents to database
        """
        self.supabase_url = supabase_url
        self.supabase_anon_key = supabase_anon_key



    def get_doc_id(self, doc_name: str, token: str)-> int: 
        "Takes in the doc_name and token and returns the doc_id of that document"
        url = f"{self.supabase_url}/rest/v1/documents"
        headers = {
            "apikey": self.supabase_anon_key,
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        params = {
            "select": "id",
            "filename": f"eq.{doc_name}"
        }

        try:
            resp = requests.get(url, params=params, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            if data: 
                doc_id= data[0]['id']
                return doc_id
            else: 
                logger.warning(f"{doc_name} not found")
                return None
            

        except requests.RequestException as e:
            logger.error(f"Failed to save document: {e}")
            raise Exception(f"Failed to save document: {str(e)}")


    def save_document(self, user_id: str, filename: str, content: str, token: str) -> Dict:
        """
        Save a document to the documents table.

        Args:
            user_id: User ID
            filename: Name of the file
            content: Full text content of the document
            token: User authentication token

        Returns:
            Document record with id
        """
        url = f"{self.supabase_url}/rest/v1/documents"
        headers = {
            "apikey": self.supabase_anon_key,
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        data = {
            "user_id": user_id,
            "filename": filename,
            "content": content
        }

        try:
            resp = requests.post(url, json=data, headers=headers)
            resp.raise_for_status()
            resp_data = resp.json()

            if not resp_data or not isinstance(resp_data, list) or len(resp_data) == 0:
                raise Exception("Invalid response from database")

            document = resp_data[0]
            logger.info(f"Document saved successfully with id: {document['id']}")
            return document

        except requests.RequestException as e:
            logger.error(f"Failed to save document: {e}")
            raise Exception(f"Failed to save document: {str(e)}")
        
    def get_documents(self, token: str): 
        """
        returns all the documents for a user
        """
        url = f"{self.supabase_url}/rest/v1/documents"
        headers = {
            "apikey": self.supabase_anon_key,
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        params = {
            "select": "*"
        }

        try:
            resp = requests.get(url, params=params, headers=headers)
            resp.raise_for_status()
            documents = resp.json()
            filenames=[document['filename'] for document in documents]

            logger.info(f"Retrived {len(filenames)} for user with token: {token}")
            return filenames

        except requests.RequestException as e:
            logger.error(f"Failed to save document: {e}")
            raise Exception(f"Failed to save document: {str(e)}")
        

        
    def delete_document(self, doc_id: int, token:str):
        """
        Deletes a specific document row by its 'id',
        scoped to the user identified by the token.
        """
    
        url = f"{self.supabase_url}/rest/v1/documents"
    
        headers = {
        "apikey": self.supabase_anon_key,
        "Authorization": f"Bearer {token}",
        }
        
        params = {
            "id": f"eq.{doc_id}"
        }

        try:
            resp = requests.delete(url, headers=headers, params=params)
            resp.raise_for_status()
            
            if resp.status_code == 204:
                logger.info(f"Successfully deleted document with id: {doc_id}")
            else:
                logger.warning(f"Document with id {doc_id} was not found or not deleted.")

        except requests.RequestException as e:
            logger.error(f"Failed to delete document {doc_id}: {e}")
            if e.response:
                logger.error(f"Error details: {e.response.text}")
            raise Exception(f"Failed to delete document: {str(e)}")

    def save_chunks(
        self,
        document_id: str,
        user_id: str,
        chunks: List[Dict],
        embeddings: List[List[float]],
        token: str
    ) -> int:
        """
        Save chunks with embeddings to the chunks table.

        Args:
            document_id: ID of the parent document
            user_id: User ID
            chunks: List of chunk dictionaries with 'text', 'index', 'metadata'
            embeddings: List of embedding vectors
            token: User authentication token

        Returns:
            Number of chunks saved
        """
        if len(chunks) != len(embeddings):
            raise ValueError(f"Chunks count ({len(chunks)}) doesn't match embeddings count ({len(embeddings)})")

        url = f"{self.supabase_url}/rest/v1/chunks"
        headers = {
            "apikey": self.supabase_anon_key,
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }

        # Prepare bulk insert data
        chunk_records = []
        for chunk, embedding in zip(chunks, embeddings):
            chunk_records.append({
                "document_id": document_id,
                "user_id": user_id,
                "chunk_text": chunk["text"],
                "chunk_index": chunk["index"],
                "embedding": embedding,
                "metadata": chunk.get("metadata", {})
            })

        try:
            resp = requests.post(url, json=chunk_records, headers=headers)

            # Log detailed error info before raising
            if resp.status_code != 201:
                logger.error(f"Supabase error status: {resp.status_code}")
                logger.error(f"Supabase error response: {resp.text}")
                logger.error(f"Sample chunk record (first one): {chunk_records[0] if chunk_records else 'No chunks'}")

            resp.raise_for_status()
            resp_data = resp.json()

            if not resp_data or not isinstance(resp_data, list):
                raise Exception("Invalid response from database")

            saved_count = len(resp_data)
            logger.info(f"Successfully saved {saved_count} chunks")
            return saved_count

        except requests.RequestException as e:
            logger.error(f"Failed to save chunks: {e}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Response body: {e.response.text}")
            raise Exception(f"Failed to save chunks: {str(e)}")

    def delete_document_chunks(self, document_id: str, token: str) -> None:
        """
        Delete all chunks associated with a document.

        Args:
            document_id: ID of the document
            token: User authentication token
        """
        url = f"{self.supabase_url}/rest/v1/chunks?document_id=eq.{document_id}"
        headers = {
            "apikey": self.supabase_anon_key,
            "Authorization": f"Bearer {token}",
        }

        try:
            logger.info(f"Deleting chunks for document {document_id}")
            resp = requests.delete(url, headers=headers)
            resp.raise_for_status()

        except requests.RequestException as e:
            logger.error(f"Failed to delete chunks: {e}")
            raise Exception(f"Failed to delete chunks: {str(e)}")

    def retrieve_chunks(
        self,
        query_embedding: List[float],
        user_id: str,
        token: str,
        top_k: int = 5,
        document_id: Optional[int] = None,
        similarity_threshold: float = 0.0
    ) -> List[Dict]:
        """
        Retrieve most relevant chunks using vector similarity search.

        Args:
            query_embedding: The query embedding vector
            user_id: User ID for filtering (ensures RLS)
            token: User authentication token
            top_k: Number of chunks to retrieve (default: 5)
            document_id: Optional document ID to filter by specific document
            similarity_threshold: Minimum similarity score (default: 0.0)

        Returns:
            List of chunks with similarity scores and metadata

        Note:
            For advanced features, consider:
            - Hybrid search: Combine with full-text search (tsvector)
            - Reranking: Use cross-encoder for better precision
            - MMR: Diversify results to avoid redundancy
        """
        #Supabase RPC function for vector similarity search
        url = f"{self.supabase_url}/rest/v1/rpc/match_chunks"
        headers = {
            "apikey": self.supabase_anon_key,
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        payload = {
            "query_embedding": query_embedding,
            #"match_threshold": 1 - similarity_threshold,
            "match_count": top_k
        }

        # Add optional document filter
        if document_id is not None:
            payload["filter_document_id"] = document_id


        try:
            #logger.info(f"Calling match_chunks RPC with top_k={top_k}, user_id={user_id}")
            resp = requests.post(url, json=payload, headers=headers)

            
            if resp.status_code != 200:
                logger.error(f"RPC error response: {resp.text}")

            resp.raise_for_status()
            chunks = resp.json()

            logger.info(f"Retrieved {len(chunks)} chunks for user {user_id}")


            return chunks

        except requests.RequestException as e:
            logger.error(f"Failed to retrieve chunks: {e}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Response body: {e.response.text}")
            raise Exception(f"Failed to retrieve chunks: {str(e)}")



# SQLITE FUNCTIONS

    def save_sqlite_file(self, file_content:bytes , file_name:str, file_des: str,user_id:str, token:str):
        """
        saves the sqlite file uploaded by the user in the supabase bucket
        also adds a row in the sqlite_files table with file_name, description, user_id

        """

        # adding to supabase storage
        url = f"{self.supabase_url}/storage/v1/object/sqlite_files/{user_id}/{file_name}"
        headers = {
            "apikey": self.supabase_anon_key,
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/vnd.sqlite3"
        }

        response = requests.post(url, headers=headers, data=file_content)

        # adding to sqlite_files table
        url = f"{self.supabase_url}/rest/v1/sqlite_files"
        headers = {
            "apikey": self.supabase_anon_key,
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        data = {
            "user_id": user_id,
            "filename": file_name,
            "content": file_des
        }


        resp = requests.post(url, json=data, headers=headers)
        resp.raise_for_status()

        return {"status_storage": response.status_code, "status_table": resp.status_code}
    
    

    def list_sqlite_files(self, user_id: str, token: str):
        """
        returns a list of file objects(of all files belonging to the user)
        uses the supabase storage list api
        """
    
        url = f"{self.supabase_url}/storage/v1/object/list/sqlite_files"

        headers = {
            "apikey": self.supabase_anon_key,
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }


        payload = {
            "prefix": f"{user_id}/", 
            "limit": 100,
            "sortBy": {
                "column": "name", 
                "order": "desc"
            }
        }

     
        response = requests.post(url, headers=headers, json=payload)

        if response.status_code == 200:
            return response.json() # Returns a list of file objects
        else:
            raise HTTPException(status_code=response.status_code, detail=response.text)



    def download_sqlite_files(self, files: list, user_id:str, temp_dir: str, token: str):
        """
        accepts the list of file objects for a user and the temp_dir path,
        downloads those files locally in the temp_dir
        uses the supabase storage download api
        """
        for file in files:
            file_name = file['name']
            local_save_path=f"{temp_dir}/{file_name}"
            
            download_url = f"{self.supabase_url}/storage/v1/object/sqlite_files/{user_id}/{file_name}"
            
            download_headers = {
                "apikey": self.supabase_anon_key,
                "Authorization": f"Bearer {token}"
            }

            with requests.get(download_url, headers=download_headers, stream=True) as r:
                r.raise_for_status()
                with open(local_save_path, 'wb') as f:
                    for chunk in r.iter_content(chunk_size=8192): 
                        f.write(chunk)
        
        print(f"Database downloaded to {local_save_path}")
    

    
    def get_sqlite_files_metadata(self, user_id: str, token: str):
        
        """
        returns all the documents for a user
        """
        url = f"{self.supabase_url}/rest/v1/sqlite_files"
        headers = {
            "apikey": self.supabase_anon_key,
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        params = {
            "select": "*"
        }

        try:
            resp = requests.get(url, params=params, headers=headers)
            resp.raise_for_status()
            sqlite_files = resp.json()
            # following lines need to be changed
            filenames=[file['filename'] for file in sqlite_files]
            descriptions=[file['description'] for file in sqlite_files]

            logger.info(f"Retrived {len(filenames)} sqlite files")
            return {
                "names": filenames,
                "descriptions": descriptions
            }

        except requests.RequestException as e:
            logger.error(f"Failed to retrieve sqlfiles: {e}")
            raise Exception(f"Failed to retrieve sqlfiles: {str(e)}")
        

    def delete_sqlite_file(self, filename: str, user_id: str, token: str):
      """
      Delete SQLite file from both storage bucket and sqlite_files table.
      Will attempt both deletions even if one fails (partial success).

      Args:
          filename: Name of the SQLite file
          user_id: User ID
          token: User authentication token

      Returns:
          Success message string
      """
      storage_deleted = False
      table_deleted = False

      # Step 1: Delete from storage bucket
      storage_url = f"{self.supabase_url}/storage/v1/object/sqlite_files/{user_id}/{filename}"
      storage_headers = {
          "apikey": self.supabase_anon_key,
          "Authorization": f"Bearer {token}"
      }

      try:
          storage_resp = requests.delete(storage_url, headers=storage_headers)
          storage_resp.raise_for_status()
          storage_deleted = True
          logger.info(f"Successfully deleted {filename} from storage bucket")
      except requests.RequestException as e:
          logger.error(f"Failed to delete {filename} from storage: {e}")

      # Step 2: Delete from sqlite_files table
      table_url = f"{self.supabase_url}/rest/v1/sqlite_files"
      table_headers = {
          "apikey": self.supabase_anon_key,
          "Authorization": f"Bearer {token}"
      }
      table_params = {
          "filename": f"eq.{filename}"
      }

      try:
          table_resp = requests.delete(table_url, headers=table_headers, params=table_params)
          table_resp.raise_for_status()
          table_deleted = True
          logger.info(f"Successfully deleted {filename} from sqlite_files table")
      except requests.RequestException as e:
          logger.error(f"Failed to delete {filename} from table: {e}")

      # Step 3: Return appropriate message
      if storage_deleted and table_deleted:
          return f"Successfully deleted {filename} from storage and database"
      elif storage_deleted and not table_deleted:
          return f"Deleted {filename} from storage but failed to delete from database"
      elif not storage_deleted and table_deleted:
          return f"Deleted {filename} from database but failed to delete from storage"
      else:
          return f"Failed to delete {filename} from both storage and database"