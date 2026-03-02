"""
RAG Lite - Split by Page Upload API
Simple vector search based file upload using ChromaDB
"""
import uuid
from time import time
from typing import Literal

import numpy as np
from chromadb.base_types import Metadata
from config.index import config
from core.logging import logger
from fastapi import APIRouter, Form, HTTPException, UploadFile, File
from pydantic import BaseModel
from repositories.chroma_repository import chroma_db
from services.embedder import embed_text, embed_text_batch, process_text
from utils.text_extraction import extract_text_from_file
from utils.text_splitter import split_text

router = APIRouter()


class UploadFileResult(BaseModel):
    status: Literal["uploaded", "failed"]
    count: int
    time_taken: int  # in ms


@router.post("/upload", response_model=UploadFileResult)
async def upload_file_split_by_page(
    collection_name: str = Form(...),
    file: UploadFile = File(...)
):
    """
    Upload and split file by pages/chunks into vector store.
    RAG Lite uses ChromaDB for simple vector storage.
    """
    start_time = time()
    try:
        if not file.filename:
            raise HTTPException(status_code=400, detail="ファイル名が提供されていません。")

        logger.info(f"[RAG-Lite] Uploading file: {file.filename} to collection: {collection_name}")
        
        content = await file.read()
        text = extract_text_from_file(file.filename, content)

        if not text:
            raise HTTPException(status_code=400, detail="テキストが抽出できませんでした。")

        # Split text into chunks
        chunks = split_text(
            text,
            separator=config.RAG.PreProcess.PDF.splitByPage.separator
            if hasattr(config.RAG.PreProcess.PDF, "splitByPage")
            else "\n\n",
            chunk_size=config.RAG.PreProcess.PDF.splitByPage.chunkSize
            if hasattr(config.RAG.PreProcess.PDF, "splitByPage")
            else 512,
            overlap=config.RAG.PreProcess.PDF.splitByPage.overlap
            if hasattr(config.RAG.PreProcess.PDF, "splitByPage")
            else 128,
        )
        
        chunks = [chunk for chunk in chunks if chunk and chunk.strip()]
        
        if not chunks:
            raise HTTPException(status_code=400, detail="テキストチャンクが生成されませんでした。")

        logger.info(f"[RAG-Lite] Generated {len(chunks)} chunks from file")

        # Process and embed chunks
        clean_chunks = [process_text(chunk) for chunk in chunks]
        embeddings_list = [embed_text(chunk) for chunk in clean_chunks]
        embeddings = np.array(embeddings_list, dtype=np.float32)

        # Create metadata for each chunk
        metadatas: list[Metadata] = [
            {
                "source": file.filename,
                "chunk_index": i,
                "file_size": len(content),
                "upload_mode": "splitByPage"
            }
            for i in range(len(chunks))
        ]

        # Create IDs
        ids = [str(uuid.uuid4()) for _ in chunks]

        # Get or create collection and add documents
        collection = chroma_db.get_or_create_collection(name=collection_name)
        collection.add(
            documents=clean_chunks,
            metadatas=metadatas,
            ids=ids,
            embeddings=embeddings
        )

        elapsed_ms = int((time() - start_time) * 1000)
        logger.info(f"[RAG-Lite] Successfully uploaded {len(chunks)} chunks in {elapsed_ms}ms")

        return UploadFileResult(
            status="uploaded",
            count=len(chunks),
            time_taken=elapsed_ms
        )

    except Exception as e:
        logger.error(f"[RAG-Lite] Upload failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/check_embedding_model")
async def check_embedding_model():
    """Check if embedding model is working."""
    try:
        logger.info("[RAG-Lite] Checking embedding model...")
        test_text = "キーワード抽出のテスト"
        embedding = embed_text(test_text)
        logger.info("[RAG-Lite] Embedding model is working correctly")
        return {"message": "Embedding model is working correctly", "embedding_dim": len(embedding)}
    except Exception as e:
        logger.error(f"[RAG-Lite] Embedding model check failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
