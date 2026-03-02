"""
RAG Lite - Document Record Management
Simplified record operations for vector store management
"""
import numpy as np
from config.index import config
from core.logging import logger
from models.schemas import DeleteRequest, UpdateRequest
from repositories.chroma_repository import chroma_db
from services.embedder import embed_text, process_text


def delete_document(req: DeleteRequest):
    """Delete documents from collection by IDs."""
    try:
        logger.info(f"[RAG-Lite] Deleting {len(req.ids)} documents from '{req.collection_name}'")
        collection = chroma_db.get_collection(name=req.collection_name)
        collection.delete(ids=req.ids)
        logger.info(f"[RAG-Lite] Successfully deleted {len(req.ids)} documents")
        return {"status": "record deleted", "ids": req.ids}
    except Exception as e:
        logger.error(f"[RAG-Lite] Error deleting documents: {e}", exc_info=True)
        raise


def update_document(req: UpdateRequest):
    """Update documents in collection by IDs and new content."""
    try:
        logger.info(f"[RAG-Lite] Updating {len(req.ids)} documents in '{req.collection_name}'")
        collection = chroma_db.get_collection(name=req.collection_name)
        
        # Process and embed new documents
        clean_texts = [process_text(doc) for doc in req.documents]
        embeddings = [embed_text(text) for text in clean_texts]
        embeddings = np.array(embeddings, dtype=np.float32)
        
        # Delete old documents
        collection.delete(ids=req.ids)
        
        # Add updated documents
        collection.add(
            ids=req.ids,
            documents=clean_texts,
            embeddings=embeddings,
            metadatas=req.metadatas or [{"updated": True} for _ in req.ids]
        )
        
        logger.info(f"[RAG-Lite] Successfully updated {len(req.ids)} documents")
        return {
            "status": "updated",
            "collection": req.collection_name,
            "ids": req.ids
        }
    except Exception as e:
        logger.error(f"[RAG-Lite] Error updating documents: {e}", exc_info=True)
        raise
