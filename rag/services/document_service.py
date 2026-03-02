from config.index import config
from core.logging import logger
from models.schemas import DeleteRequest, DeleteResponseModel
from repositories.chroma_repository import chroma_db


def delete_collection(req: DeleteRequest) -> DeleteResponseModel:
    """RAG Lite: Delete document collection - Vector search only"""
    
    # Reject unsupported old mode configurations
    if config.RAG.mode[0] == "splitByArticleWithHybridSearch":
        logger.error(
            f"[RAG-Lite] Unsupported mode: {config.RAG.mode[0]}. "
            "Article-based splitting with hybrid search is not available in RAG Lite. "
            "Please configure mode to 'splitByPage' only."
        )
        return DeleteResponseModel(
            status="failed",
            collection=req.collection_name,
            error="Article-based splitting is not available in RAG Lite. Use 'splitByPage' mode."
        )

    # RAG Lite: Simple ChromaDB collection deletion
    target = []
    for col in chroma_db.list_collections():
        meta = getattr(col, "metadata", None) or {}
        if meta.get("name") == req.collection_name:
            target.append(col.name)
    
    if not target:
        logger.warning(f"[RAG-Lite] No collection matching {req.collection_name}")
        return DeleteResponseModel(status="no match", collection=req.collection_name)

    for name in target:
        chroma_db.delete_collection(name=name)
        logger.info(f"[RAG-Lite] Deleted collection: {name}")
    
    return DeleteResponseModel(status="deleted", collection=req.collection_name)
