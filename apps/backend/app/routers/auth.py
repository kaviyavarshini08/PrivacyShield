from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from datetime import timedelta, datetime
from typing import Optional
import logging

from ..database import get_db
from ..models.models import User, AuditLog
from ..schemas.schemas import (
    UserCreate, UserResponse, Token, MfaEnrollResponse, 
    MfaVerifyRequest, RefreshTokenRequest
)
from ..core.security import (
    get_password_hash, verify_password, create_access_token, 
    create_refresh_token, verify_token, get_current_user
)
from ..core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

import socket

DISPOSABLE_AND_GENERIC_DOMAINS = {
    "dummy.com", "tempmail.com", "10minutemail.com", "trashmail.com", "dispostable.com",
    "getnada.com", "guerrillamail.com", "sharklasers.com", "example.com", "test.com",
    "fake.com", "dummy.io", "mailinator.com", "yopmail.com", "throwawaymail.com",
    "company.com", "domain.com", "website.com", "site.com", "sample.com", "mycompany.com",
    "yourcompany.com", "email.com", "mail.com", "service.com", "corp.com", "test.io",
    "singh.com", "kumar.com", "smith.com", "john.com", "david.com", "user.com", "random.com",
    "abc.com", "xyz.com", "temp.com", "123.com"
}

COMMON_DOMAIN_TYPOS = {
    # Yahoo typos
    "yahho.com", "yaho.com", "yahooo.com", "yaho.co", "yaho.in", "yahoof.com", "yahoomail.co",
    # Gmail typos
    "gamil.com", "gmal.com", "gmaill.com", "gmeil.com", "gmai.com", "gmail.con", "gmail.cm", "gamil.co", "gmai.in",
    # Hotmail / Outlook typos
    "hotmial.com", "hotmai.com", "outlok.com", "outloo.com", "outlook.con", "hotmial.co",
    # iCloud typos
    "icld.com", "icloud.con", "icould.com"
}

GENERIC_EMAIL_PREFIXES = {
    "user", "test", "admin", "demo", "sample", "info", "mail", "name", "yourname", "username"
}

ALLOWED_EMAIL_DOMAINS = {
    'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.in', 'yahoo.co.in', 'yahoo.co.uk',
    'outlook.com', 'outlook.in', 'hotmail.com', 'hotmail.co.uk', 'live.com', 'msn.com',
    'icloud.com', 'me.com', 'mac.com', 'protonmail.com', 'proton.me', 'zoho.com', 'zoho.in',
    'aol.com', 'gmx.com', 'gmx.net', 'rediffmail.com', 'yandex.com', 'mail.ru', 'fastmail.com',
    'office365.com'
}

def validate_email_address(email: str) -> None:
    if not email:
        raise HTTPException(status_code=400, detail="Email address is required.")
        
    email_clean = email.strip().lower()
    import re
    email_regex = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    if not re.match(email_regex, email_clean):
        raise HTTPException(
            status_code=400,
            detail="Invalid email format. Please enter a valid email address (e.g. xxxxxxx@gmail.com)."
        )
        
    parts = email_clean.split("@")
    if len(parts) != 2:
        raise HTTPException(status_code=400, detail="Invalid email format.")
        
    prefix, domain = parts[0], parts[1]
    
    # Check typo domains
    if domain in COMMON_DOMAIN_TYPOS:
        suggestion = "yahoo.com" if "yah" in domain else "gmail.com" if "gm" in domain else "outlook.com" if ("out" in domain or "hot" in domain) else "icloud.com"
        raise HTTPException(
            status_code=400,
            detail=f"Invalid email domain '{domain}'. Did you mean {suggestion}? Typo email domains are not allowed."
        )

    # Enforce recognized legitimate email providers or edu/gov domains
    is_valid_provider = domain in ALLOWED_EMAIL_DOMAINS
    is_edu_or_gov = domain.endswith('.edu') or domain.endswith('.gov') or domain.endswith('.ac.in') or domain.endswith('.edu.in')
    
    if not is_valid_provider and not is_edu_or_gov:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid email domain '{domain}'. Please use a recognized valid email address (e.g. xxxxxxx@gmail.com, yahoo.com, outlook.com)."
        )

def validate_password_complexity(password: str) -> None:
    if not password or len(password.strip()) < 6:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 6 characters long."
        )

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    email_clean = user_in.email.strip().lower()
    
    validate_email_address(email_clean)
    validate_password_complexity(user_in.password)

    result = await db.execute(select(User).filter(func.trim(func.lower(User.email)) == email_clean))
    existing_user = result.scalars().first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account with this email already exists. Please sign in to continue."
        )
        
    hashed_pwd = get_password_hash(user_in.password)
    
    new_user = User(
        email=email_clean,
        hashed_password=hashed_pwd,
        full_name=user_in.full_name or email_clean.split('@')[0].capitalize(),
        sec_q1=user_in.sec_q1 or "What is your pet's name?",
        sec_a1=user_in.sec_a1.strip().lower() if user_in.sec_a1 else "fluffy",
        sec_q2=user_in.sec_q2 or "What is your mother's maiden name?",
        sec_a2=user_in.sec_a2.strip().lower() if user_in.sec_a2 else "smith",
        sec_q3=user_in.sec_q3 or "What city were you born in?",
        sec_a3=user_in.sec_a3.strip().lower() if user_in.sec_a3 else "new york",
        is_active=True
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

@router.post("/login")
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    email_clean = form_data.username.strip().lower()
    pwd_clean = form_data.password if form_data.password else ""

    validate_email_address(email_clean)

    result = await db.execute(select(User).filter(func.trim(func.lower(User.email)) == email_clean))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account does not exist. Please sign up to continue."
        )
        
    if not user.hashed_password or not verify_password(pwd_clean, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password."
        )

    if not user.is_active:
        user.is_active = True
        db.add(user)
        await db.commit()

    access_token = create_access_token(data={"sub": user.email})
    refresh_token = create_refresh_token(data={"sub": user.email})
    
    audit = AuditLog(
        user_id=user.id,
        action="USER_LOGIN",
        severity="low",
        ip_address=request.client.host if request.client else None
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
    result = await db.execute(select(User).filter(func.trim(func.lower(User.email)) == (email or "").strip().lower()))
    user = result.scalars().first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
        
    access_token = create_access_token(data={"sub": user.email})
    refresh_token = create_refresh_token(data={"sub": user.email})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user
    }

from pydantic import BaseModel
class ForgotPasswordRequest(BaseModel):
    email: str
    new_password: Optional[str] = None

class RequestResetLinkRequest(BaseModel):
    email: str

class ConfirmResetPasswordRequest(BaseModel):
    token: str
    new_password: str

@router.post("/request-reset-link")
async def request_reset_link(req: RequestResetLinkRequest, db: AsyncSession = Depends(get_db)):
    email_clean = req.email.strip().lower()
    result = await db.execute(select(User).filter(func.trim(func.lower(User.email)) == email_clean))
    user = result.scalars().first()
    
    if not user:
        # Create user account automatically if not yet in DB
        user = User(
            email=email_clean,
            hashed_password=get_password_hash("defaultPass123"),
            full_name=email_clean.split('@')[0].capitalize(),
            is_active=True
        )
        db.add(user)
        await db.flush()

    # Generate 15-minute signed token
    reset_token = create_access_token(
        data={"sub": user.email, "purpose": "reset_password"},
        expires_delta=timedelta(minutes=15)
    )
    
    reset_url = f"http://localhost:5173/reset-password?token={reset_token}"
    
    # Audit log & simulation log
    audit = AuditLog(
        user_id=user.id,
        action="USER_PASSWORD_RESET_LINK_REQUESTED",
        target=user.email,
        severity="low"
    )
    db.add(audit)
    await db.commit()
    
    from ..services.email import send_password_reset_email
    send_password_reset_email(user.email, reset_url)
    
    return {
        "status": "success",
        "message": f"Magic reset link generated & sent to {user.email}",
        "reset_link": reset_url,
        "token": reset_token
    }

@router.post("/reset-password-confirm")
async def confirm_reset_password(req: ConfirmResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    if not req.new_password or len(req.new_password.strip()) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters long.")
        
    try:
        from jose import jwt
        from ..core.config import settings
        payload = jwt.decode(req.token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        purpose: str = payload.get("purpose")
        
        if not email or purpose != "reset_password":
            raise HTTPException(status_code=400, detail="Invalid or expired reset token.")
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid or expired password reset link.")

    result = await db.execute(select(User).filter(func.trim(func.lower(User.email)) == email.strip().lower()))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")

    new_pass = req.new_password.strip()
    user.hashed_password = get_password_hash(new_pass)
    db.add(user)
    
    audit = AuditLog(
        user_id=user.id,
        action="USER_PASSWORD_RESET_COMPLETED",
        target=user.email,
        severity="medium"
    )
    db.add(audit)
    await db.commit()
    
    return {
        "status": "success",
        "message": f"Password for {user.email} updated in database successfully!",
        "email": user.email
    }

@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    email_clean = req.email.strip().lower()
    new_pass = req.new_password.strip() if req.new_password else "defaultPass123"
    
    result = await db.execute(select(User).filter(func.trim(func.lower(User.email)) == email_clean))
    user = result.scalars().first()
    
    if not user:
        user = User(
            email=email_clean,
            hashed_password=get_password_hash(new_pass),
            full_name=email_clean.split('@')[0].capitalize(),
            is_active=True
        )
        db.add(user)
        await db.flush()
        action_msg = f"Account registered & password saved in database!"
    else:
        user.hashed_password = get_password_hash(new_pass)
        db.add(user)
        action_msg = f"Password for {email_clean} updated in database successfully!"
        
    audit = AuditLog(
        user_id=user.id,
        action="USER_PASSWORD_RESET_SUCCESS",
        target=user.email,
        severity="medium"
    )
    db.add(audit)
    await db.commit()
    
    return {
        "status": "success",
        "message": action_msg,
        "updated_password": new_pass
    }


class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None

@router.get("/me", response_model=UserResponse)
async def get_my_profile(current_user: User = Depends(get_current_user)):
    """
    Returns authenticated user's profile details.
    """
    return current_user

@router.put("/profile", response_model=UserResponse)
async def update_my_profile(
    req: ProfileUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Updates full name for the authenticated user in database.
    """
    if req.full_name and req.full_name.strip():
        current_user.full_name = req.full_name.strip()
        db.add(current_user)
        
        audit = AuditLog(
            user_id=current_user.id,
            action="USER_PROFILE_NAME_UPDATED",
            target=f"Name: {current_user.full_name}",
            severity="low"
        )
        db.add(audit)
        await db.commit()
        await db.refresh(current_user)
    return current_user

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

@router.post("/change-password")
async def change_password(
    req: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Changes password for authenticated user.
    Step 1: Verify current_password matches the hashed_password in DB.
    Step 2: Validate new_password complexity.
    Step 3: Hash and commit new password to DB.
    """
    # Step 1: Verify current password against the hashed password in DB
    if not current_user.hashed_password or not verify_password(req.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect. Please try again."
        )

    # Step 2: Validate new password length
    if not req.new_password or len(req.new_password.strip()) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters long.")

    # Step 3: Prevent reusing the same password
    if verify_password(req.new_password.strip(), current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from your current password."
        )

    # Step 4: Hash and save the new password
    new_pass = req.new_password.strip()
    current_user.hashed_password = get_password_hash(new_pass)
    db.add(current_user)
    
    audit = AuditLog(
        user_id=current_user.id,
        action="USER_PASSWORD_CHANGE_SUCCESS",
        target=current_user.email,
        severity="medium"
    )
    db.add(audit)
    await db.commit()
    await db.refresh(current_user)
    
    return {
        "status": "success",
        "message": f"Password for {current_user.email} updated in database successfully!"
    }


class FetchQuestionsRequest(BaseModel):
    email: str

@router.post("/get-security-questions")
async def get_security_questions(req: FetchQuestionsRequest, db: AsyncSession = Depends(get_db)):
    email_clean = req.email.strip().lower()
    result = await db.execute(select(User).filter(func.trim(func.lower(User.email)) == email_clean))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account with this email address does not exist. Please sign up to continue."
        )
        
    q1 = user.sec_q1 or "What is your pet's name?"
    q2 = user.sec_q2 or "What is your mother's maiden name?"
    q3 = user.sec_q3 or "What city were you born in?"
    
    return {
        "status": "success",
        "email": email_clean,
        "q1": q1,
        "q2": q2,
        "q3": q3
    }

class VerifyQuestionsResetPasswordRequest(BaseModel):
    email: str
    a1: str
    a2: str
    a3: str
    new_password: str

@router.post("/reset-password-with-questions")
async def reset_password_with_questions(req: VerifyQuestionsResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    email_clean = req.email.strip().lower()
    validate_password_complexity(req.new_password)
        
    result = await db.execute(select(User).filter(func.trim(func.lower(User.email)) == email_clean))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account with this email address does not exist."
        )

    # Verify 3 Security Answers against sec_a1, sec_a2, sec_a3 stored in users table
    ans1_input = req.a1.strip().lower()
    ans2_input = req.a2.strip().lower()
    ans3_input = req.a3.strip().lower()

    db_ans1 = (user.sec_a1 or "").strip().lower()
    db_ans2 = (user.sec_a2 or "").strip().lower()
    db_ans3 = (user.sec_a3 or "").strip().lower()

    if db_ans1 and ans1_input != db_ans1:
        raise HTTPException(status_code=400, detail="Answer 1 for security question is incorrect.")
    if db_ans2 and ans2_input != db_ans2:
        raise HTTPException(status_code=400, detail="Answer 2 for security question is incorrect.")
    if db_ans3 and ans3_input != db_ans3:
        raise HTTPException(status_code=400, detail="Answer 3 for security question is incorrect.")
        
    user.hashed_password = get_password_hash(req.new_password.strip())
    db.add(user)

    audit = AuditLog(
        user_id=user.id,
        action="USER_SECURITY_QUESTIONS_PASSWORD_RESET_SUCCESS",
        target=user.email,
        severity="medium"
    )
    db.add(audit)
    await db.commit()
    
    return {
        "status": "success",
        "message": f"Security answers verified! Password for {user.email} updated in database successfully!"
    }

