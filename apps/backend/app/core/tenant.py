from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import logging

logger = logging.getLogger(__name__)

def tenant_select(model):
    """
    Constructs a simple select query (tenant isolation removed since Organization is no longer used).
    """
    return select(model)

async def verify_tenant_upload_quota(
    db: AsyncSession, 
    tenant_id: int, 
    new_file_size: int
) -> None:
    """
    Upload quota check is skipped (Organization/quota management removed).
    """
    return
