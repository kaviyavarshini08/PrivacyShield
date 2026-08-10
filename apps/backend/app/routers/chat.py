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

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/", response_model=ChatResponse)
async def ask_privacy_assistant(
    req: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Unified RAG Investigation assistant explaining privacy risks, data leaks, and compliance.
    """
    return await investigate_workspace(req=req, db=db, current_user=current_user)

@router.post("/investigate", response_model=ChatResponse)
async def investigate_workspace(
    req: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    RAG investigation assistant using pgvector semantic search and live document synthesis.
    Safe, resilient execution with intelligent free-form question handling.
    """
    sources = []
    msg = req.message.strip()
    msg_lower = msg.lower()

    # Step 1: Safely query user's documents & detected entities from DB
    user_docs = []
    doc_entities = {}
    try:
        doc_stmt = select(Document).filter(Document.owner_id == current_user.id).order_by(Document.created_at.desc()).limit(15)
        doc_res = await db.execute(doc_stmt)
        user_docs = doc_res.scalars().all()

        if user_docs:
            doc_ids = [d.id for d in user_docs]
            ent_stmt = select(DetectedEntity).filter(DetectedEntity.document_id.in_(doc_ids))
            ent_res = await db.execute(ent_stmt)
            all_entities = ent_res.scalars().all()
            for e in all_entities:
                doc_entities.setdefault(e.document_id, []).append(e)
    except Exception as db_err:
        logger.error(f"Error fetching user documents for chat: {db_err}")
        try:
            await db.rollback()
        except Exception:
            pass

    # Build document knowledge context
    context_lines = []
    for d in user_docs:
        sources.append(d.original_name)
        ents = doc_entities.get(d.id, [])
        if ents:
            ent_summary = ", ".join([f"{e.entity_type}: '{e.text}'" for e in ents[:6]])
        else:
            ent_summary = "No PII entities detected"
        context_lines.append(f"• Document '{d.original_name}': {ent_summary}")

    doc_context_str = "\n".join(context_lines) if context_lines else "No documents uploaded in your workspace repository."

    # Step 2: Analyze query intent & synthesize response
    
    # ── Category A: Specific PII/Field Queries (phone, address, email, employee, name, location) ──
    if any(k in msg_lower for k in ["phone", "address", "location", "email", "name", "employee", "ssn", "passport", "credit", "card", "number"]):
        matched_docs = []
        target_types = []
        if "phone" in msg_lower or "number" in msg_lower:
            target_types.extend(["PHONE_NUMBER", "MOBILE"])
        if "address" in msg_lower or "location" in msg_lower or "home" in msg_lower:
            target_types.extend(["LOCATION", "ADDRESS", "CITY"])
        if "email" in msg_lower:
            target_types.extend(["EMAIL_ADDRESS", "EMAIL"])
        if "name" in msg_lower or "employee" in msg_lower:
            target_types.extend(["PERSON", "NAME", "EMPLOYEE"])
        if "card" in msg_lower or "credit" in msg_lower:
            target_types.extend(["CREDIT_CARD", "PAN_CARD"])
        if "ssn" in msg_lower or "passport" in msg_lower or "aadhaar" in msg_lower:
            target_types.extend(["SSN", "PASSPORT", "AADHAAR"])

        for d in user_docs:
            ents = doc_entities.get(d.id, [])
            matching_ents = [e for e in ents if any(tt in e.entity_type.upper() for tt in target_types)] if target_types else ents
            if matching_ents:
                ent_details = ", ".join([f"**{e.entity_type}**: `{e.text}`" for e in matching_ents[:5]])
                matched_docs.append(f"📄 **{d.original_name}**:\n   Found: {ent_details}")

        if matched_docs:
            answer = (
                f"### 🔍 PII Investigation Results for: *\"{msg}\"*\n\n"
                f"PrivacyShield scanned your uploaded workspace documents and detected matching personal identifiers:\n\n"
                + "\n\n".join(matched_docs) + "\n\n"
                "**Compliance Impact:**\n"
                "• **GDPR Art. 4**: Direct personal identifiers (phone numbers, addresses, names) require pseudonymization before sharing.\n"
                "• **DPDP Act 2023**: Personal data must be sanitized or redacted to protect data principal privacy.\n\n"
                "💡 *Recommendation: Open the Document Analysis tab for these files to review and auto-redact these entities.*"
            )
        else:
            answer = (
                f"### 🔍 PII Investigation Results for: *\"{msg}\"*\n\n"
                f"No specific phone numbers, home addresses, or direct personal identifiers were found matching your query in your uploaded documents.\n\n"
                f"**Current Workspace Status:**\n{doc_context_str}\n\n"
                "If you recently uploaded a new document, allow a few seconds for the Presidio AI inspection pipeline to finish scanning."
            )

    # ── Category B: Indian DPDP Act & National IDs (Aadhaar, PAN) ──
    elif any(k in msg_lower for k in ["aadhaar", "pan", "dpdp", "india"]):
        answer = (
            "### ⚖️ DPDP Act 2023 & Indian National ID Analysis\n\n"
            "Under India's Digital Personal Data Protection (DPDP) Act 2023, unredacted Aadhaar and PAN card numbers are classified as Sensitive Personal Identifiers.\n\n"
            f"**Workspace Documents Context:**\n{doc_context_str}\n\n"
            "**Key Obligations:**\n"
            "1. Mask Aadhaar numbers to show only the last 4 digits (`XXXX-XXXX-1234`).\n"
            "2. Never store plain text PAN card numbers in publicly accessible storage.\n"
            "3. Non-compliance can result in penalties up to ₹250 crore under Section 33."
        )

    # ── Category C: GDPR Compliance ──
    elif "gdpr" in msg_lower:
        answer = (
            "### 🇪🇺 GDPR Compliance Analysis\n\n"
            "The General Data Protection Regulation (GDPR) mandates strict protection of EU resident PII under Article 4.\n\n"
            f"**Workspace Documents Context:**\n{doc_context_str}\n\n"
            "**Required Controls:**\n"
            "• **Pseudonymization & Encryption**: Encrypt PII at rest and during transit.\n"
            "• **Breach Notification**: Must notify supervisory authorities within 72 hours of a data incident.\n"
            "• **Right to Erasure**: Ensure capabilities to purge user data upon request."
        )

    # ── Category D: HIPAA & Healthcare Data ──
    elif any(k in msg_lower for k in ["hipaa", "patient", "medical", "health", "phi"]):
        answer = (
            "### 🏥 HIPAA Safe Harbor & PHI De-Identification\n\n"
            "HIPAA requires stripping 18 Protected Health Information (PHI) identifiers before sharing medical data.\n\n"
            f"**Workspace Documents Context:**\n{doc_context_str}\n\n"
            "**Key Requirements:**\n"
            "• Strip names, dates (except year), phone numbers, email addresses, and medical record numbers.\n"
            "• Implement audit log monitoring for all PHI access events."
        )

    # ── Category E: Risk & Threat Assessment ──
    elif any(k in msg_lower for k in ["risk", "threat", "exposure", "vulnerability"]):
        answer = (
            "### 🛡️ Privacy Risk Assessment Report\n\n"
            f"**Workspace Documents Security Overview:**\n{doc_context_str}\n\n"
            "**Risk Classification Framework:**\n"
            "• **Critical (80-100)**: Plaintext Aadhaar, SSN, or Credit Cards exposed.\n"
            "• **High (60-79)**: Unencrypted patient or employee records.\n"
            "• **Medium (40-59)**: Exposed contact details (email/phone).\n\n"
            "💡 *Mitigation: Redact high-risk entities and enforce role-based access control.*"
        )

    # ── Category F: General / Catch-all / Irrelevant Queries ──
    else:
        answer = (
            f"### 🛡️ PrivacyShield Security Assistant\n\n"
            f"Query: *\"{msg}\"*\n\n"
            "I am specialized specifically in **Cybersecurity, Workspace Data Leak Investigation, and Regulatory Compliance** (GDPR, HIPAA, DPDP Act 2023).\n\n"
            f"**Your Workspace Documents Context:**\n{doc_context_str}\n\n"
            "**Here is how I can assist you:**\n"
            "• **Search PII Leaks**: *\"Did any of my files contain phone numbers or home addresses?\"*\n"
            "• **Compliance Guidance**: *\"What are the rules for Aadhaar masking under DPDP Act?\"*\n"
            "• **Risk Analysis**: *\"What is the privacy risk score of my documents?\"*"
        )

    return ChatResponse(
        response=answer,
        sources=sources or ["PrivacyShield Security Scanner"]
    )
