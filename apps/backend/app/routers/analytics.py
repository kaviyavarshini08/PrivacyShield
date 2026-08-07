from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, delete
from typing import Dict, Any
from datetime import datetime, timedelta

from ..database import get_db
from ..models.models import Document, DetectedEntity, ProcessingQueue, User, AuditLog
from ..core.security import get_current_user

router = APIRouter()

@router.get("/dashboard")
async def get_analytics_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Returns live data analytics dashboard metrics based strictly on documents uploaded by the current user.
    """
    # 1. Query current user's documents and processing queue items
    doc_stmt = select(Document).filter(Document.owner_id == current_user.id).order_by(Document.created_at.asc())
    doc_res = await db.execute(doc_stmt)
    docs = doc_res.scalars().all()

    doc_ids = [d.id for d in docs]

    queue_stmt = (
        select(ProcessingQueue)
        .join(ProcessingQueue.document)
        .filter(Document.owner_id == current_user.id)
        .order_by(ProcessingQueue.queued_at.asc())
    )
    queue_res = await db.execute(queue_stmt)
    queue_items = queue_res.scalars().all()

    total_docs = len(docs)
    total_bytes = sum([d.file_size or 0 for d in docs])
    total_mb = round(total_bytes / (1024 * 1024), 2)

    # 2. Count detected entities for current user's documents
    if doc_ids:
        ent_stmt = (
            select(
                DetectedEntity.entity_type,
                func.count(DetectedEntity.id).label("count")
            )
            .filter(DetectedEntity.document_id.in_(doc_ids))
            .group_by(DetectedEntity.entity_type)
        )
        ent_res = await db.execute(ent_stmt)
        entity_counts = {row.entity_type: row.count for row in ent_res.all()}

        conf_stmt = select(func.avg(DetectedEntity.confidence)).filter(DetectedEntity.document_id.in_(doc_ids))
        conf_res = await db.execute(conf_stmt)
        avg_conf_raw = conf_res.scalar() or 0.0
        avg_confidence = round(avg_conf_raw * 100, 1) if avg_conf_raw <= 1.0 else round(avg_conf_raw, 1)
    else:
        entity_counts = {}
        avg_confidence = 0.0

    total_entities = sum(entity_counts.values())

    # 3. Processing Queue efficiency for current user
    completed_count = len([q for q in queue_items if q.status == "completed"])
    failed_count = len([q for q in queue_items if q.status == "failed"])
    pending_count = len([q for q in queue_items if q.status in ["queued", "processing"]])
    total_processed = completed_count + failed_count
    
    if total_processed > 0:
        success_rate = round((completed_count / total_processed) * 100, 1)
        failed_rate = round(100.0 - success_rate, 1)
    else:
        success_rate = 100.0 if total_docs > 0 else 0.0
        failed_rate = 0.0

    # 4. Per-document breakdown for document-level chart
    per_doc_data = []
    for doc in docs:
        ent_count_stmt = select(func.count(DetectedEntity.id)).filter(DetectedEntity.document_id == doc.id)
        ent_count_res = await db.execute(ent_count_stmt)
        ent_count = ent_count_res.scalar() or 0

        # Per-document entity type breakdown
        ent_type_stmt = (
            select(DetectedEntity.entity_type, func.count(DetectedEntity.id).label("count"))
            .filter(DetectedEntity.document_id == doc.id)
            .group_by(DetectedEntity.entity_type)
        )
        ent_type_res = await db.execute(ent_type_stmt)
        doc_entity_counts = {row.entity_type: row.count for row in ent_type_res.all()}

        short_name = doc.original_name if len(doc.original_name) <= 22 else doc.original_name[:20] + "…"
        per_doc_data.append({
            "id": doc.id,
            "name": short_name,
            "full_name": doc.original_name,
            "pii_count": ent_count,
            "entity_counts": doc_entity_counts,
            "size_kb": round((doc.file_size or 0) / 1024, 1),
            "date": doc.created_at.strftime("%Y-%m-%d") if doc.created_at else "",
            "status": "Redacted" if doc.redacted_storage_path else ("Completed" if doc.status == "completed" else "Uploaded")
        })

    # 5. Storage growth over time (cumulative)
    storage_growth = []
    cumulative_gb = 0.0
    for item in per_doc_data:
        cumulative_gb += (item["size_kb"] * 1024) / (1024 ** 3)
        storage_growth.append({
            "name": item["name"][:12],
            "gb": round(cumulative_gb, 4),
            "doc": item["name"][:15]
        })

    # 6. Entity type breakdown for main bar chart
    bar_chart = []
    for entity_type, count in sorted(entity_counts.items(), key=lambda x: -x[1]):
        bar_chart.append({
            "name": entity_type.replace("IN_", "").replace("_", " ").title(),
            "count": count
        })

    top_entity = max(entity_counts.items(), key=lambda x: x[1])[0] if entity_counts else "None"
    redacted_count = len([d for d in docs if d.redacted_storage_path])

    risk_breakdown = [
        {"name": "Documents Scanned", "value": total_docs, "color": "#06B6D4"},
        {"name": "PII Items Found", "value": total_entities, "color": "#EF4444"},
        {"name": "Documents Redacted", "value": redacted_count, "color": "#10B981"},
        {"name": "Processing Pending", "value": pending_count, "color": "#F59E0B"},
    ]

    return {
        "total_documents": total_docs,
        "total_entities_found": total_entities,
        "entity_counts": entity_counts,
        "total_storage_mb": total_mb,
        "bar_chart_data": bar_chart,
        "per_document_data": per_doc_data,
        "avg_confidence": avg_confidence,
        "top_entity": top_entity.replace("IN_", "").replace("_", " ").title(),
        "redacted_count": redacted_count,
        "redaction_efficiency": [
            {"name": "Success", "value": success_rate, "color": "#10B981"},
            {"name": "Failed", "value": failed_rate, "color": "#EF4444"},
            {"name": "False Positive", "value": 0.0, "color": "#F59E0B"}
        ],
        "risk_breakdown": risk_breakdown,
        "storage_growth": storage_growth,
        "department_data": per_doc_data
    }

@router.post("/reset")
async def reset_user_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Resets analytics for the user by clearing old uploaded documents and resetting metrics to 0 baseline.
    """
    doc_stmt = select(Document).filter(Document.owner_id == current_user.id)
    res = await db.execute(doc_stmt)
    user_docs = res.scalars().all()

    for doc in user_docs:
        # Delete associated entities & queue
        await db.execute(delete(DetectedEntity).filter(DetectedEntity.document_id == doc.id))
        await db.execute(delete(ProcessingQueue).filter(ProcessingQueue.document_id == doc.id))
        await db.delete(doc)

    await db.commit()
    return {"message": "Analytics dashboard reset to 0 baseline. Ready for new uploads!"}
