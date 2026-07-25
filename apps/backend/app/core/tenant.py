from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
import logging

from ..middleware.audit import current_tenant_id_ctx
from ..models.models import Document, Organization

logger = logging.getLogger(__name__)

def tenant_select(model):
    """
    Constructs a select query scoped automatically by the current request's tenant ContextVar.
    """
    stmt = select(model)
    tenant_id = current_tenant_id_ctx.get()
    
    # Apply row-level filter if organization_id exists on the target model and tenant context is set
    if tenant_id is not None and hasattr(model, "organization_id"):
        stmt = stmt.filter(model.organization_id == tenant_id)
        
    return stmt

async def verify_tenant_upload_quota(
    db: AsyncSession, 
    tenant_id: int, 
    new_file_size: int
) -> None:
    """
    Verifies that the tenant has not exceeded their storage capacity quota.
    """
    if not tenant_id:
        return
        
    # Get organization quota setting
    org_stmt = select(Organization).filter(Organization.id == tenant_id)
    org_result = await db.execute(org_stmt)
    org = org_result.scalars().first()
    
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
        
    if not org.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organization account is suspended."
        )

    # Calculate current usage
    usage_stmt = (
        select(func.sum(Document.file_size))
        .filter(Document.organization_id == tenant_id)
    )
    usage_result = await db.execute(usage_stmt)
    current_bytes = usage_result.scalar() or 0
    
    if current_bytes + new_file_size > org.max_bytes:
        logger.warning(
            f"Tenant {tenant_id} upload rejected: quota exceeded. "
            f"Current: {current_bytes} bytes, Attempted: {new_file_size} bytes, Max: {org.max_bytes} bytes."
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Upload blocked. Tenant storage quota exceeded. (Limit: {org.max_bytes / (1024*1024):.1f} MB)"
        )
