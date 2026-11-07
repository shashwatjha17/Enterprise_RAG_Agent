import logging
from typing import List
from langchain_openai import OpenAIEmbeddings
import os
from app.core.config import openai_api_key
logger = logging.getLogger(__name__)


class EmbeddingService:
    """Service for generating embeddings"""

    def __init__(self, model: str = "text-embedding-3-large"):
        
        self.model = model
        self.embeddings = OpenAIEmbeddings(
            model=model,
            openai_api_key= openai_api_key
        )

    def embed_chunks(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for a list of text chunks.
        Args: texts: List of text strings to embed
        Returns: List of embedding vectors (each vector is a list of floats)
        """
        if not texts:
            logger.warning("Empty text list provided for embedding")
            return []

        try:
            embeddings = self.embeddings.embed_documents(texts)
            logger.info(f"Successfully generated {len(embeddings)} embeddings")
            return embeddings

        except Exception as e:
            logger.error(f"Error generating embeddings: {e}", exc_info=True)
            raise

    def embed_query(self, text: str) -> List[float]:
        """
        Generate embedding for a single query text.
        Args:text: Query text to embed
        Returns: Embedding vector as list of floats
        """
        try:
            embedding = self.embeddings.embed_query(text)
            return embedding

        except Exception as e:
            logger.error(f"Error generating query embedding: {e}", exc_info=True)
            raise
