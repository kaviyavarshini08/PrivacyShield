from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
import uuid
import logging

from ..database import get_db
from ..models.models import User, Organization, WorkspaceInvitation, AuditLog
from ..core.security import get_current_user, get_password_hash
from ..core.rbac import Permission, PermissionChecker

logger = logging.getLogger(__name__)
router = APIRouter()

class InviteRequest(BaseModel):
    email: EmailStr
    role: str # 'user', 'analyst', 'manager', 'admin'

class AcceptInviteRequest(BaseModel):
    token: str
    password: str
    full_name: str

@router.post("/invite", status_code=status.HTTP_201_CREATED)
async def invite_team_member(
    req: InviteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker(Permission.TEAM_INVITE))
):
    """
    Creates a unique invitation token to add a user to the current organization.
    """
    if not current_user.organization_id:
        raise HTTPException(
            status_code=400,
            detail="You must belong to an organization to invite team members."
        )

    # Validate role input
    allowed_roles = ["user", "analyst", "manager", "admin"]
    if req.role.lower() not in allowed_roles:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role. Allowed roles: {', '.join(allowed_roles)}"
        )

    # Check if user already exists
    exist_stmt = select(User).filter(User.email == req.email)
    exist_res = await db.execute(exist_stmt)
    if exist_res.scalars().first():
        raise HTTPException(
            status_code=400,
            detail="A user with this email is already registered."
        )

    # Clean existing pending invites for this email
    cleanup_stmt = select(WorkspaceInvitation).filter(
        WorkspaceInvitation.email == req.email,
        WorkspaceInvitation.organization_id == current_user.organization_id
    )
    cleanup_res = await db.execute(cleanup_stmt)
    for old_invite in cleanup_res.scalars().all():
        await db.delete(old_invite)

    # Generate token
    token = str(uuid.uuid4())
    expires_at = datetime.utcnow() + timedelta(days=7)

    invitation = WorkspaceInvitation(
        email=req.email,
        token=token,
        organization_id=current_user.organization_id,
        role=req.role.lower(),
        expires_at=expires_at
    )
    db.add(invitation)
    
    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        organization_id=current_user.organization_id,
        action="TEAM_MEMBER_INVITED",
        target=req.email,
        severity="low"
    )
    db.add(audit)
    
    await db.commit()
    
    # In production: send invitation email using SMTP services
    logger.info(f"Team invitation created: {req.email} -> Token: {token}")
    return {
        "message": "Invitation created successfully",
        "token": token,
        "expires_at": expires_at
    }

@router.post("/accept")
async def accept_team_invitation(
    req: AcceptInviteRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Accepts a workspace invitation token, creating a new user within the organization.
    """
    stmt = select(WorkspaceInvitation).filter(
        WorkspaceInvitation.token == req.token,
        WorkspaceInvitation.status == "pending"
    )
    res = await db.execute(stmt)
    inv = res.scalars().first()
    
    if not inv:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired invitation token."
        )
        
    if inv.expires_at < datetime.utcnow():
        inv.status = "expired"
        db.add(inv)
        await db.commit()
        raise HTTPException(
            status_code=400,
            detail="This invitation token has expired."
        )

    # Create new user associated with organization
    hashed_pwd = get_password_hash(req.password)
    new_user = User(
        email=inv.email,
        hashed_password=hashed_pwd,
        full_name=req.full_name,
        role=inv.role,
        organization_id=inv.organization_id,
        is_active=True
    )
    db.add(new_user)
    
    # Update invitation status
    inv.status = "accepted"
    db.add(inv)
    
    await db.flush() # Populate new_user.id
    
    # Audit log
    audit = AuditLog(
        user_id=new_user.id,
        organization_id=new_user.organization_id,
        action="TEAM_INVITATION_ACCEPTED",
        target=new_user.email,
        severity="low"
    )
    db.add(audit)
    await db.commit()
    
    return {
        "message": "Account created successfully. You can now log in.",
        "email": new_user.email,
        "organization_id": new_user.organization_id
    }

@router.get("/members")
async def list_team_members(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker(Permission.DOCUMENT_VIEW))
):
    """
    Lists all user members belonging to the current organization.
    """
    if not current_user.organization_id:
        return [current_user]

    stmt = select(User).filter(User.organization_id == current_user.organization_id)
    res = await db.execute(stmt)
    members = res.scalars().all()
    return members

@router.delete("/members/{member_id}")
async def remove_team_member(
    member_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker(Permission.ORGANIZATION_ADMIN))
):
    """
    Removes a member from the organization.
    """
    stmt = select(User).filter(
        User.id == member_id,
        User.organization_id == current_user.organization_id
    )
    res = await db.execute(stmt)
    member = res.scalars().first()
    
    if not member:
        raise HTTPException(
            status_code=404,
            detail="Team member not found or belongs to another organization."
        )
        
    if member.id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot remove yourself from the organization workspace."
        )

    # Dissociate or delete member
    member.organization_id = None
    db.add(member)
    
    audit = AuditLog(
        user_id=current_user.id,
        organization_id=current_user.organization_id,
        action="TEAM_MEMBER_REMOVED",
        target=member.email,
        severity="medium"
    )
    db.add(audit)
    
    await db.commit()
    return {"message": "Team member successfully removed from workspace."}
