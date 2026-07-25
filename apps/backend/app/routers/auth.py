from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import timedelta, datetime
import logging
from ..models.models import UserSession
from ..core.security_compliance import resolve_ip_location, check_impossible_travel

from ..database import get_db
from ..models.models import User, AuditLog
from ..schemas.schemas import (
    UserCreate, UserResponse, Token, MfaEnrollResponse, 
    MfaVerifyRequest, OAuthLoginRequest, RefreshTokenRequest
)
from ..core.security import (
    get_password_hash, verify_password, create_access_token, 
    create_refresh_token, verify_token, generate_mfa_secret, 
    get_mfa_totp_uri, verify_mfa_code, verify_google_oauth, 
    verify_github_oauth, get_current_user
)
from ..core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).filter(User.email == user_in.email))
    existing_user = result.scalars().first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="A user with this email already exists."
        )
        
    hashed_pwd = get_password_hash(user_in.password)
    # Default first user to admin, others to user
    users_count_result = await db.execute(select(User))
    users_count = len(users_count_result.scalars().all())
    role = "admin" if users_count == 0 else "user"
    
    new_user = User(
        email=user_in.email,
        hashed_password=hashed_pwd,
        full_name=user_in.full_name,
        role=role
    )
    db.add(new_user)
    
    audit = AuditLog(
        action="USER_REGISTER",
        target=new_user.email,
        severity="low"
    )
    db.add(audit)
    
    await db.commit()
    await db.refresh(new_user)
    return new_user

async def register_user_session_and_check_travel(
    db: AsyncSession,
    user: User,
    request: Request
) -> float:
    """
    Tracks sequential user sessions and monitors travel velocity anomalies.
    """
    ip = request.client.host if request.client else "127.0.0.1"
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        ip = forwarded_for.split(",")[0].strip()
        
    ua = request.headers.get("user-agent", "")
    
    # Resolve geo lookup
    geo = resolve_ip_location(ip)
    
    # Get previous session
    stmt = (
        select(UserSession)
        .filter(UserSession.user_id == user.id)
        .order_by(UserSession.timestamp.desc())
        .limit(1)
    )
    res = await db.execute(stmt)
    prev = res.scalars().first()
    
    risk_score = 0.0
    is_anomaly = False
    
    if prev and prev.ip_address:
        is_anomaly, speed, dist = check_impossible_travel(
            prev_ip=prev.ip_address,
            prev_time=prev.timestamp,
            curr_ip=ip,
            curr_time=datetime.utcnow()
        )
        if is_anomaly:
            risk_score = 1.0
            travel_audit = AuditLog(
                user_id=user.id,
                organization_id=user.organization_id,
                action="SUSPICIOUS_LOGIN_IMPOSSIBLE_TRAVEL",
                target=f"Login speed: {speed:.1f} km/h, distance: {dist:.1f} km",
                severity="high",
                ip_address=ip
            )
            db.add(travel_audit)
            
    # Save session
    session = UserSession(
        user_id=user.id,
        ip_address=ip,
        user_agent=ua,
        risk_score=risk_score,
        city=geo["city"],
        latitude=geo["lat"],
        longitude=geo["lon"]
    )
    db.add(session)
    await db.flush()
    return risk_score

@router.post("/login")
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).filter(User.email == form_data.username))
    user = result.scalars().first()
    if not user or not user.hashed_password or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is inactive"
        )
        
    if user.mfa_enabled:
        # Require second factor step
        return {
            "status": "mfa_required",
            "email": user.email,
            "message": "Multi-factor authentication required"
        }
        
    # Return access token
    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    refresh_token = create_refresh_token(data={"sub": user.email})
    
    # Track session and analyze impossible travel
    risk_score = await register_user_session_and_check_travel(db, user, request)
    
    audit = AuditLog(
        user_id=user.id,
        organization_id=user.organization_id,
        action="USER_LOGIN",
        severity="medium" if risk_score > 0.5 else "low",
        ip_address=request.client.host if request.client else None
    )
    db.add(audit)
    await db.commit()
    
    return {
        "status": "success",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user,
        "session_risk_score": risk_score
    }

@router.post("/mfa/login-verify")
async def verify_mfa_login(
    req: MfaVerifyRequest,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).filter(User.email == req.email))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if not user.mfa_secret or not verify_mfa_code(user.mfa_secret, req.code):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid MFA code"
        )
        
    # Complete auth
    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    refresh_token = create_refresh_token(data={"sub": user.email})
    
    audit = AuditLog(
        user_id=user.id,
        action="USER_LOGIN_MFA",
        severity="low"
    )
    db.add(audit)
    await db.commit()
    
    return {
        "status": "success",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/refresh", response_model=Token)
async def refresh_tokens(req: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    payload = verify_token(req.refresh_token, "refresh")
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )
        
    email = payload.get("sub")
    result = await db.execute(select(User).filter(User.email == email))
    user = result.scalars().first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
        
    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    refresh_token = create_refresh_token(data={"sub": user.email})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/oauth")
async def oauth_login(req: OAuthLoginRequest, db: AsyncSession = Depends(get_db)):
    if req.provider == "google":
        oauth_data = await verify_google_oauth(req.token)
    elif req.provider == "github":
        oauth_data = await verify_github_oauth(req.token)
    else:
        raise HTTPException(status_code=400, detail="Unsupported OAuth provider")
        
    email = oauth_data["email"]
    result = await db.execute(select(User).filter(User.email == email))
    user = result.scalars().first()
    
    if not user:
        # Create user
        users_count_result = await db.execute(select(User))
        users_count = len(users_count_result.scalars().all())
        role = "admin" if users_count == 0 else "user"
        
        user = User(
            email=email,
            full_name=oauth_data["full_name"],
            oauth_provider=req.provider,
            oauth_id=oauth_data["id"],
            role=role,
            is_active=True
        )
        db.add(user)
        await db.flush()
        
        audit = AuditLog(
            user_id=user.id,
            action="USER_OAUTH_REGISTER",
            target=email,
            severity="low"
        )
        db.add(audit)
    else:
        # Update oauth info if empty
        if not user.oauth_provider:
            user.oauth_provider = req.provider
            user.oauth_id = oauth_data["id"]
            
        audit = AuditLog(
            user_id=user.id,
            action="USER_OAUTH_LOGIN",
            severity="low"
        )
        db.add(audit)

    await db.commit()
    await db.refresh(user)
    
    if user.mfa_enabled:
        return {
            "status": "mfa_required",
            "email": user.email,
            "message": "Multi-factor authentication required"
        }
        
    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    refresh_token = create_refresh_token(data={"sub": user.email})
    
    return {
        "status": "success",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/mfa/enroll", response_model=MfaEnrollResponse)
async def enroll_mfa(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    secret = generate_mfa_secret()
    qr_code_uri = get_mfa_totp_uri(secret, current_user.email)
    
    # Save the secret temporarily or set to user (won't enable MFA until verified)
    current_user.mfa_secret = secret
    db.add(current_user)
    await db.commit()
    
    return {
        "secret": secret,
        "qr_code_uri": qr_code_uri
    }

@router.post("/mfa/verify")
async def verify_mfa_setup(
    req: MfaVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not current_user.mfa_secret:
         raise HTTPException(status_code=400, detail="MFA setup has not been initiated.")
         
    if not verify_mfa_code(current_user.mfa_secret, req.code):
        raise HTTPException(status_code=400, detail="Invalid verification code")
        
    current_user.mfa_enabled = True
    db.add(current_user)
    
    audit = AuditLog(
        user_id=current_user.id,
        action="USER_MFA_ENABLED",
        severity="medium"
    )
    db.add(audit)
    await db.commit()
    
    return {"message": "MFA enabled successfully"}
