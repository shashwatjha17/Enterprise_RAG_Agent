import logging
from typing import List, Dict
from langchain_text_splitters import CharacterTextSplitter


logger = logging.getLogger(__name__)


class ChunkingService:
    """Service for chunking text documents"""

    def __init__(self, chunk_size: int = 500, chunk_overlap: int = 80):
        
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

        self.text_splitter = CharacterTextSplitter.from_tiktoken_encoder(
            encoding_name="cl100k_base", chunk_size=self.chunk_size, chunk_overlap=self.chunk_overlap
        )


    def chunk_text(self, text: str, metadata: Dict = None) -> List[Dict]:
        """
        Chunk text into smaller pieces.

        Args:
            text: The text to chunk
            metadata: Optional metadata to attach to each chunk

        Returns:
            List of dictionaries with 'text', 'index', and 'metadata' keys
        """
        if not text or not text.strip():
            logger.warning("Empty text provided for chunking")
            return []

        try:
            chunks = self.text_splitter.split_text(text)
            logger.info(f"Split text into {len(chunks)} chunks")

            result = []
            for i, chunk_text in enumerate(chunks):
                chunk_data = {
                    "text": chunk_text,
                    "index": i,
                    "metadata": metadata or {}
                }
                result.append(chunk_data)

            logger.info(f"Created {len(result)} chunk objects")
            return result

        except Exception as e:
            logger.error(f"Error chunking text: {e}", exc_info=True)
            raise
