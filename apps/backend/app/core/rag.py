import httpx
import logging
import json
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from .config import settings

logger = logging.getLogger(__name__)

class TextSplitter:
    """
    Sliding window character/word-based text splitter for document chunking.
    """
    def __init__(self, chunk_size: int = 500, chunk_overlap: int = 100):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def split_text(self, text: str) -> List[str]:
        if not text or not text.strip():
            return []

        chunks = []
        words = text.split()
        
        # If text is extremely short, just return as a single chunk
        if len(text) <= self.chunk_size:
            return [text.strip()]

        start_word_idx = 0
        while start_word_idx < len(words):
            # Form chunk based on words until character limit is met
            current_chunk_words = []
            current_char_count = 0
            
            for idx in range(start_word_idx, len(words)):
                word = words[idx]
                # +1 represents the space
                word_len = len(word) + 1
                if current_char_count + word_len > self.chunk_size and current_chunk_words:
                    break
                current_chunk_words.append(word)
                current_char_count += word_len
            
            chunk_text = " ".join(current_chunk_words).strip()
            if chunk_text:
                chunks.append(chunk_text)
                
            # Move index forward with overlap
            # Try to step back by about overlap characters (roughly overlap / 6 words)
            overlap_words = max(1, int(self.chunk_overlap / 6))
            step = len(current_chunk_words) - overlap_words
            if step <= 0:
                step = 1
                
            start_word_idx += step
            
        return chunks

async def generate_embedding(text_to_embed: str) -> List[float]:
    """
    Generates embedding vector for a given string.
    Supports OpenAI (if EMBEDDING_PROVIDER=openai) and local sentence-transformers (fallback).
    """
    if not text_to_embed.strip():
        # Default 384 dimensions empty list
        dim = 1536 if settings.EMBEDDING_PROVIDER == "openai" else 384
        return [0.0] * dim

    if settings.EMBEDDING_PROVIDER == "openai" and settings.OPENAI_API_KEY:
        try:
            logger.info("Generating embedding via OpenAI API...")
            headers = {
                "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                "Content-Type": "application/json"
            }
            payload = {
                "input": text_to_embed,
                "model": "text-embedding-3-small"
            }
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post("https://api.openai.com/v1/embeddings", headers=headers, json=payload)
                
            if res.status_code == 200:
                data = res.json()
                return data["data"][0]["embedding"]
            else:
                logger.error(f"OpenAI embedding failed: {res.status_code} - {res.text}. Falling back to local.")
        except Exception as e:
            logger.exception(f"OpenAI embedding generation failed: {e}. Falling back to local.")

    # Local sentence-transformers fallback
    try:
        logger.info(f"Generating local embedding via AI-Services endpoint: {settings.AI_SERVICE_URL}")
        payload = {"texts": [text_to_embed]}
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(f"{settings.AI_SERVICE_URL}/api/v1/embeddings", json=payload)
            
        if res.status_code == 200:
            data = res.json()
            return data["embeddings"][0]
        else:
            raise Exception(f"AI-Services returned status code {res.status_code}: {res.text}")
    except Exception as e:
        logger.exception(f"Local embedding generation failed: {e}")
        # Return fallback zero vector of dimension 384
        return [0.0] * 384

async def init_vector_extension(db: AsyncSession):
    """
    Initializes pgvector extension vector in PostgreSQL.
    """
    try:
        await db.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await db.commit()
        logger.info("PostgreSQL pgvector extension verified.")
    except Exception as e:
        logger.warning(f"Failed to initialize pgvector extension: {e}. Standard vectors will fall back to JSON/strings.")

async def query_similar_chunks(
    db: AsyncSession, 
    query_vector: List[float], 
    organization_id: int, 
    limit: int = 5
) -> List[Dict[str, Any]]:
    """
    Performs cosine similarity query on pgvector embeddings with strict tenant isolation.
    """
    # Initialize extension to ensure we can cast
    await init_vector_extension(db)

    # Format vector list into postgres array format, e.g. '[0.1, 0.2, ...]'
    vector_str = f"[{','.join(map(str, query_vector))}]"
    
    # Cosine distance operator <=>
    sql = text("""
        SELECT de.id, de.document_id, de.chunk_index, de.text_content, 
               (de.embedding::vector <=> :vec::vector) as distance,
               d.original_name as document_name
        FROM document_embeddings de
        JOIN documents d ON d.id = de.document_id
        WHERE d.organization_id = :org_id
        ORDER BY distance ASC
        LIMIT :limit
    """)
    
    try:
        result = await db.execute(sql, {"vec": vector_str, "org_id": organization_id, "limit": limit})
        rows = result.fetchall()
        
        chunks = []
        for r in rows:
            chunks.append({
                "id": r[0],
                "document_id": r[1],
                "chunk_index": r[2],
                "text_content": r[3],
                "distance": float(r[4]) if r[4] is not None else 0.0,
                "document_name": r[5]
            })
        return chunks
    except Exception as e:
        logger.error(f"Error querying similar vector chunks: {e}")
        # Return empty list in case pgvector <=> operator fails due to missing extension compile step
        return []
