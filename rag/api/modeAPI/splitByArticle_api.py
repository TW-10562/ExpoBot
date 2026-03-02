"""
RAG Lite - Simplified Upload API
Note: Article-based splitting is disabled in RAG Lite. Use splitByPage instead.
Kept for API compatibility only.
"""
from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.post("/upload/split-by-article")
async def upload_file_split_by_article(**kwargs):
    """
    RAG Lite: Article-based splitting is not supported.
    Use /upload endpoint with splitByPage mode instead.
    This endpoint is kept for backward compatibility.
    """
    raise HTTPException(
        status_code=400,
        detail="Article-based splitting is not available in RAG Lite. "
               "Please use the /upload endpoint with splitByPage mode instead."
    )
