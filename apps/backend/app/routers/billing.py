from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from pydantic import BaseModel
import logging

from ..database import get_db
from ..models.models import User, Organization, AuditLog
from ..core.security import get_current_user
from ..core.rbac import Permission, PermissionChecker

logger = logging.getLogger(__name__)
router = APIRouter()

class CheckoutRequest(BaseModel):
    tier: str # 'pro', 'enterprise'

class WebhookPayload(BaseModel):
    event_type: str
    organization_id: int
    tier: str
    stripe_subscription_id: str = "sub_mock123"
    stripe_customer_id: str = "cus_mock123"

@router.post("/checkout")
async def create_checkout_session(
    req: CheckoutRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker(Permission.BILLING_MANAGE))
):
    """
    Creates a simulated Stripe Checkout session.
    """
    if not current_user.organization_id:
        raise HTTPException(
            status_code=400,
            detail="You must belong to an organization to manage billing."
        )

    if req.tier.lower() not in ["pro", "enterprise"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid tier. Choose 'pro' or 'enterprise'."
        )

    # In production, this would call stripe.checkout.Session.create(...)
    mock_checkout_url = f"https://checkout.stripe.com/pay/mock_session_{current_user.organization_id}_{req.tier.lower()}"
    
    audit = AuditLog(
        user_id=current_user.id,
        organization_id=current_user.organization_id,
        action="BILLING_CHECKOUT_CREATED",
        target=req.tier.lower(),
        severity="low"
    )
    db.add(audit)
    await db.commit()

    return {
        "checkout_url": mock_checkout_url,
        "organization_id": current_user.organization_id,
        "tier": req.tier.lower()
    }

@router.post("/webhook")
async def stripe_webhook_callback(
    payload: WebhookPayload,
    db: AsyncSession = Depends(get_db)
):
    """
    Handles Stripe webhooks (simulated here) to update organization status.
    """
    stmt = select(Organization).filter(Organization.id == payload.organization_id)
    res = await db.execute(stmt)
    org = res.scalars().first()

    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    if payload.event_type == "checkout.session.completed":
        org.subscription_tier = payload.tier.lower()
        org.subscription_status = "active"
        org.stripe_subscription_id = payload.stripe_subscription_id
        org.stripe_customer_id = payload.stripe_customer_id
        
        # Set quotas based on subscription tier
        if org.subscription_tier == "pro":
            org.included_bytes_quota = 5 * 1024 * 1024 * 1024  # 5 GB
            org.max_users = 10
        elif org.subscription_tier == "enterprise":
            org.included_bytes_quota = 500 * 1024 * 1024 * 1024  # 500 GB
            org.max_users = 100

        audit = AuditLog(
            action="BILLING_SUBSCRIPTION_ACTIVE",
            target=org.name,
            severity="medium",
            organization_id=org.id
        )
        db.add(audit)
        await db.commit()
        logger.info(f"Webhook updated organization {org.id} to tier {payload.tier.lower()}")
        return {"status": "success", "message": f"Subscription activated for org {org.id}"}

    raise HTTPException(status_code=400, detail="Unhandled event type")

@router.get("/status")
async def get_billing_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker(Permission.DOCUMENT_VIEW))
):
    """
    Returns organization's subscription details, current active seats count, and usage.
    """
    if not current_user.organization_id:
        return {
            "tier": "free",
            "status": "active",
            "seats_used": 1,
            "max_users": 1,
            "bytes_used": 0,
            "bytes_quota": 52428800
        }

    # Fetch Organization
    stmt = select(Organization).filter(Organization.id == current_user.organization_id)
    res = await db.execute(stmt)
    org = res.scalars().first()

    # Get active users count
    count_stmt = select(func.count(User.id)).filter(User.organization_id == current_user.organization_id)
    count_res = await db.execute(count_stmt)
    seats_used = count_res.scalar()

    return {
        "organization_id": org.id,
        "name": org.name,
        "tier": org.subscription_tier,
        "status": org.subscription_status,
        "seats_used": seats_used,
        "max_users": org.max_users,
        "bytes_used": org.usage_bytes_scanned,
        "bytes_quota": org.included_bytes_quota,
        "stripe_subscription_id": org.stripe_subscription_id
    }
