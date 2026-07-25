from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional
import httpx
import logging

from ..database import get_db
from ..models.models import Document, DetectedEntity, User
from ..schemas.schemas import ChatRequest, ChatResponse
from ..core.security import get_current_user
from ..core.config import settings
from ..core.tenant import tenant_select
from ..core.rag import generate_embedding, query_similar_chunks

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/", response_model=ChatResponse)
async def ask_privacy_assistant(
    req: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    RAG-ready Chat Assistant explaining privacy risks, leakage items, and compliance.
    """
    context = ""
    doc_name = "None"
    entities_summary = "No documents referenced."
    
    if req.document_id:
        # Fetch document context
        doc_stmt = tenant_select(Document).filter(Document.id == req.document_id)
        doc_result = await db.execute(doc_stmt)
        doc = doc_result.scalars().first()
        
        if doc:
            if current_user.role not in ["admin", "manager", "analyst"] and doc.owner_id != current_user.id:
                raise HTTPException(status_code=403, detail="Not authorized to access this document context")
            
            doc_name = doc.original_name
            # Fetch entities
            ent_stmt = select(DetectedEntity).filter(DetectedEntity.document_id == req.document_id)
            ent_result = await db.execute(ent_stmt)
            entities = ent_result.scalars().all()
            
            summary_dict = {}
            for e in entities:
                summary_dict[e.entity_type] = summary_dict.get(e.entity_type, 0) + 1
                
            entities_summary = ", ".join([f"{k} ({v} found)" for k, v in summary_dict.items()]) if summary_dict else "No PII detected."
            
            context = f"Document Name: {doc_name}\nDetected PII elements: {entities_summary}\n"

    # Define system instructions
    system_prompt = (
        "You are the PrivacyShield AI Cybersecurity and Compliance Assistant.\n"
        "Your task is to help users understand their personal data leaks, privacy risks, and "
        "remediation steps under GDPR (Europe), HIPAA (US Healthcare), and DPDP Act (India).\n"
        "Always be precise, informative, and professional.\n\n"
        f"Current User Context:\nEmail: {current_user.email}\nRole: {current_user.role}\n"
        f"Active Document Context:\n{context}"
    )

    if settings.OPENAI_API_KEY:
        try:
            # Query OpenAI Chat Completions API
            async with httpx.AsyncClient() as client:
                headers = {
                    "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": "gpt-4o-mini",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": req.message}
                    ],
                    "temperature": 0.7
                }
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=30.0
                )
                
            if response.status_code == 200:
                data = response.json()
                answer = data["choices"][0]["message"]["content"]
                return ChatResponse(
                    response=answer,
                    sources=[f"Document: {doc_name}"] if req.document_id else []
                )
            else:
                logger.error(f"OpenAI API returned error: {response.text}")
                # Fallback to local response if OpenAI fails
        except Exception as e:
            logger.exception("Failed to contact OpenAI API")

    # Local Rule-based Cybersecurity response engine if OpenAI is not configured/offline
    msg_lower = req.message.lower()
    answer = ""
    
    if "aadhaar" in msg_lower or "pan" in msg_lower or "dpdp" in msg_lower:
        answer = (
            "Regarding Indian Personal Data (Aadhaar & PAN cards):\n"
            "Under the Digital Personal Data Protection (DPDP) Act 2023, publishing or exposing "
            "unredacted national identifiers without explicit user consent constitutes non-compliance. "
            "Exposed Aadhaar numbers must be masked, displaying only the last 4 digits. "
            f"Currently, your document '{doc_name}' has detected leaks: {entities_summary}. "
            "I recommend initiating full redaction on these bounding boxes immediately."
        )
    elif "gdpr" in msg_lower or "email" in msg_lower or "address" in msg_lower:
        answer = (
            "Regarding GDPR (Europe):\n"
            "Under GDPR Art. 4, names, emails, and phone numbers are classified as direct personal identifiers. "
            "Exposing these elements creates high exposure risk. You should apply pseudonymization "
            "and restrict access rights. Ensure your audit logs are secured in the Vault."
        )
    elif "hipaa" in msg_lower or "patient" in msg_lower or "medical" in msg_lower:
        answer = (
            "Regarding HIPAA (Healthcare compliance):\n"
            "HIPAA mandates the 'Safe Harbor' standard for de-identifying records. This requires "
            "stripping 18 specific identifiers, including names, dates, phone numbers, and geographic data. "
            "Exposing these violates patient confidentiality rules. Apply immediate redacts before sharing."
        )
    else:
        answer = (
            "Hello! I am the PrivacyShield AI Assistant. I can analyze compliance concerns or help "
            "remediate sensitive leaks in your files.\n"
            f"Currently, referencing '{doc_name}' with identified leaks: {entities_summary}.\n"
            "Ask me specific questions about GDPR, HIPAA, or India's DPDP Act to receive guidance."
        )

    return ChatResponse(
        response=answer,
        sources=[f"Local Rules Engine - Document: {doc_name}"] if req.document_id else ["Local Rules Engine"]
    )

@router.post("/investigate", response_model=ChatResponse)
async def investigate_workspace(
    req: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    RAG investigation assistant using pgvector semantic search over all organization files.
    """
    if not current_user.organization_id:
        raise HTTPException(status_code=400, detail="User must belong to an organization for RAG search.")

    # 1. Generate query embedding vector
    query_vector = await generate_embedding(req.message)

    # 2. Search pgvector for similar chunks (tenant-isolated)
    chunks = await query_similar_chunks(
        db=db,
        query_vector=query_vector,
        organization_id=current_user.organization_id,
        limit=5
    )

    # 3. Compile context from retrieved chunks
    context_str = ""
    sources = []
    seen_docs = set()
    
    for idx, c in enumerate(chunks):
        doc_ref = f"{c['document_name']} (Chunk #{c['chunk_index']})"
        sources.append(doc_ref)
        context_str += f"--- Source {idx+1}: {doc_ref} ---\n{c['text_content']}\n\n"
        seen_docs.add(c['document_name'])

    if not context_str:
        context_str = "No relevant document matches found in your organization workspace."

    # 4. Form system prompt
    system_prompt = (
        "You are the PrivacyShield Enterprise AI Investigation Assistant.\n"
        "Your goal is to answer the user's threat intelligence, policy, or data exposure query "
        "using the retrieved document chunks from their workspace organization.\n"
        "Always cite your sources and state if a fact is not mentioned in the context.\n\n"
        "Retrieved Context:\n"
        f"{context_str}"
    )

    # 5. Call LLM (OpenAI) or use fallback
    if settings.OPENAI_API_KEY:
        try:
            async with httpx.AsyncClient() as client:
                headers = {
                    "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": "gpt-4o-mini",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": req.message}
                    ],
                    "temperature": 0.5
                }
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=30.0
                )
                
            if response.status_code == 200:
                data = response.json()
                answer = data["choices"][0]["message"]["content"]
                return ChatResponse(
                    response=answer,
                    sources=sources
                )
            else:
                logger.error(f"OpenAI RAG API returned error: {response.text}")
        except Exception as e:
            logger.exception("Failed to contact OpenAI API during RAG search")

    # Local Fallback
    answer = (
        "Here is the local semantic summary of files found matching your inquiry:\n\n"
        f"{context_str}\n"
        "Configure OPENAI_API_KEY to activate full natural language synthesis."
    )
    return ChatResponse(
        response=answer,
        sources=sources
    )

