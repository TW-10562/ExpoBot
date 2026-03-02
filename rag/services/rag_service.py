"""
RAG Lite - Simple vector search service
Replaces Advanced RAG's complex search pipeline with straightforward vector similarity
"""
from config.index import config
from core.logging import logger
from models.schemas import SearchRequest
from services.vector_search_service import vector_search_factory


def search_rag(req: SearchRequest):
    """
    Perform vector similarity search across collections.
    
    Args:
        req: SearchRequest containing collection_name(s), query, and top_k
        
    Returns:
        Dict with results list containing retrieved documents
    """
    try:
        logger.info(
            f"[RAG-Lite] Starting vector search: query='{req.query}', mode={req.mode}"
        )

        all_results = []

        # Handle both single collection and list of collections
        collections = req.collection_name if isinstance(req.collection_name, list) else [req.collection_name]

        logger.info(f"[RAG-Lite] Searching {len(collections)} collection(s)")

        for collection_name in collections:
            try:
                logger.info(f"[RAG-Lite] Searching collection: {collection_name}")
                engine = vector_search_factory.get(collection_name)
                results = engine.search(req.query, top_k=config.RAG.Retrieval.topKForEachCollection)
                
                if results:
                    all_results.extend(results)
                    logger.info(f"[RAG-Lite] Found {len(results)} results in '{collection_name}'")
                    
            except Exception as e:
                logger.warning(
                    f"[RAG-Lite] Error searching collection '{collection_name}': {e}"
                )
                continue

        if not all_results:
            logger.info("[RAG-Lite] No results found")
            return {"results": []}

        # Trim to top_k results
        results = all_results[:req.top_k]
        logger.info(f"[RAG-Lite] Returning {len(results)} results after trimming to top_k={req.top_k}")

        return {"results": results}

    except Exception as e:
        logger.error(f"[RAG-Lite] Search failed: {e}", exc_info=True)
        return {"results": [], "error": str(e)}

