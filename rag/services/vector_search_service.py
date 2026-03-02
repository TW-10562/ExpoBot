"""
RAG Lite - Simple Vector Search Service
Replaces Advanced RAG's HybridRAGEngineFactory with simplified vector-only search.
"""
from __future__ import annotations

import threading
from pathlib import Path
from typing import Dict, List, Optional

from config.index import config
from core.logging import logger
from langchain_chroma import Chroma
from models.schemas import SearchRequest
from services.embedder import embeddings


class VectorSearchEngine:
    """Simple vector similarity search engine using ChromaDB."""

    def __init__(self, *, collection_name: str, embedding_function):
        self.collection_name = collection_name
        self.embeddings = embedding_function

        logger.info(
            f"[RAG-Lite] Initializing Chroma vectorstore for collection '{collection_name}'"
        )
        self.vectorstore = Chroma(
            collection_name=collection_name,
            embedding_function=self.embeddings,
            persist_directory=config.RAG.VectorStore.path,
        )

    def search(self, query: str, top_k: int = 10) -> List:
        """
        Perform vector similarity search.
        
        Args:
            query: The search query string
            top_k: Number of top results to return
            
        Returns:
            List of retrieved documents
        """
        logger.info(f"[RAG-Lite] Vector search: '{query}', top_k={top_k}")
        try:
            retriever = self.vectorstore.as_retriever(
                search_kwargs={"k": top_k}
            )
            retrieved_docs = retriever.invoke(query)
            logger.info(f"[RAG-Lite] Retrieved {len(retrieved_docs)} documents")
            return retrieved_docs
        except Exception as e:
            logger.error(f"[RAG-Lite] Vector search failed: {e}", exc_info=True)
            raise Exception(f"Vector search failed: {str(e)}") from e


class VectorSearchEngineFactory:
    """Factory for creating VectorSearchEngine instances with caching."""

    def __init__(self, embeddings):
        self._embeddings = embeddings
        self._cache: Dict[str, VectorSearchEngine] = {}
        self._lock = threading.Lock()

    def get(self, collection_name: str) -> VectorSearchEngine:
        """Get or create a VectorSearchEngine for a collection."""
        if not collection_name:
            raise ValueError("collection_name must be a non-empty string")
        
        with self._lock:
            engine = self._cache.get(collection_name)
            if engine is not None:
                logger.info(
                    f"[RAG-Lite] Factory cache hit for collection '{collection_name}'"
                )
                return engine
            
            logger.info(
                f"[RAG-Lite] Factory creating engine for collection '{collection_name}'"
            )
            engine = VectorSearchEngine(
                collection_name=collection_name,
                embedding_function=self._embeddings,
            )
            self._cache[collection_name] = engine
            return engine

    def clear(self, collection_name: str) -> None:
        """Clear cache for a specific collection."""
        with self._lock:
            if collection_name in self._cache:
                logger.info(
                    f"[RAG-Lite] Factory clearing engine for collection '{collection_name}'"
                )
                self._cache.pop(collection_name, None)

    def clear_all(self) -> None:
        """Clear all cached engines."""
        with self._lock:
            logger.info("[RAG-Lite] Factory clearing all cached engines")
            self._cache.clear()


# Global factory instance
vector_search_factory = VectorSearchEngineFactory(embeddings=embeddings)
