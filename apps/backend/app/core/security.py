from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
import pyotp
import httpx
import logging
from .config import settings
from fastapi import HTTPException, status, Depends, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from ..database import get_db
from ..models.models import User

logger = logging.getLogger(__name__)

import bcrypt

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login", auto_error=False)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plain password against its bcrypt hash.
    """
    try:
        return bcrypt.checkpw(
            plain_password.encode('utf-8'),
            hashed_password.encode('utf-8')
        )
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    """
    Hashes a password using native bcrypt.
    """
    salt = bcrypt.gensalt()
    hashed_bytes = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed_bytes.decode('utf-8')

# JWT helpers
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def verify_token(token: str, token_type: str = "access") -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != token_type:
            return None
        return payload
    except JWTError:
        return None

# MFA helpers
def generate_mfa_secret() -> str:
    return pyotp.random_base32()

def get_mfa_totp_uri(secret: str, email: str) -> str:
    return pyotp.totp.TOTP(secret).provisioning_uri(name=email, issuer_name="PrivacyShield")

def verify_mfa_code(secret: str, code: str) -> bool:
    totp = pyotp.totp.TOTP(secret)
    # Allows a grace period of 30 seconds before/after
    return totp.verify(code, valid_window=1)

# OAuth Integration Adapters
async def verify_google_oauth(token: str) -> Dict[str, Any]:
    """
    Verifies a Google OAuth access token and returns user details.
    """
    try:
        async with httpx.AsyncClient() as client:
            # We fetch info using google userinfo endpoint
            response = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {token}"}
            )
            if response.status_code != 200:
                logger.error(f"Google token verification failed: {response.text}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid Google OAuth token"
                )
            data = response.json()
            return {
                "email": data.get("email"),
                "full_name": data.get("name"),
                "id": data.get("sub")
            }
    except Exception as e:
        logger.exception("Google OAuth communication error")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Google Authentication failed: {str(e)}"
        )

async def verify_github_oauth(token: str) -> Dict[str, Any]:
    """
    Verifies a GitHub OAuth access token and returns user details.
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.github.com/user",
                headers={"Authorization": f"Bearer {token}"}
            )
            if response.status_code != 200:
                logger.error(f"GitHub token verification failed: {response.text}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid GitHub OAuth token"
                )
            user_data = response.json()
            
            # Fetch user email if not public
            email = user_data.get("email")
            if not email:
                email_response = await client.get(
                    "https://api.github.com/user/emails",
                    headers={"Authorization": f"Bearer {token}"}
                )
                if email_response.status_code == 200:
                    emails = email_response.json()
                    primary_emails = [e for e in emails if e.get("primary")]
                    if primary_emails:
                        email = primary_emails[0].get("email")
                    elif emails:
                        email = emails[0].get("email")
            
            if not email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Could not retrieve email from GitHub profile."
                )

            return {
                "email": email,
                "full_name": user_data.get("name") or user_data.get("login"),
                "id": str(user_data.get("id"))
            }
    except Exception as e:
        logger.exception("GitHub OAuth communication error")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"GitHub Authentication failed: {str(e)}"
        )

# Dependency to extract and check current user
async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    token_query: Optional[str] = Query(None, alias="token"),
    db: AsyncSession = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    active_token = token or token_query
    if not active_token:
        raise credentials_exception
        
    payload = verify_token(active_token, "access")
    if not payload:
        raise credentials_exception
        
    email: str = payload.get("sub")
    if email is None:
        raise credentials_exception
        
    result = await db.execute(select(User).filter(User.email == email))
    user = result.scalars().first()
    if user is None:
        raise credentials_exception
    return user

# RBAC helper
class RoleChecker:
    def __init__(self, allowed_roles: list):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource"
            )
        return current_user
