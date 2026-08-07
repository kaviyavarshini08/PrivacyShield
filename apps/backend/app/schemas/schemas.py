from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str
    sec_q1: Optional[str] = None
    sec_a1: Optional[str] = None
    sec_q2: Optional[str] = None
    sec_a2: Optional[str] = None
    sec_q3: Optional[str] = None
    sec_a3: Optional[str] = None

class UserResponse(UserBase):
    id: int
    is_active: bool
    sec_q1: Optional[str] = None
    sec_q2: Optional[str] = None
    sec_q3: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Token Schemas
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    user: UserResponse

class TokenData(BaseModel):
    email: Optional[str] = None

class RefreshTokenRequest(BaseModel):
    refresh_token: str

# MFA Schemas
class MfaEnrollResponse(BaseModel):
    secret: str
    qr_code_uri: str

class MfaVerifyRequest(BaseModel):
    email: str
    code: str

# OAuth Schemas
class OAuthLoginRequest(BaseModel):
    provider: str # 'google' or 'github'
    token: str

# Document Schemas
class DocumentBase(BaseModel):
    original_name: str
    file_size: int
    content_type: str

class DocumentResponse(DocumentBase):
    id: int
    filename: str
    status: str
    is_encrypted: bool
    redacted_storage_path: Optional[str] = None
    created_at: datetime
    owner_id: int

    class Config:
        from_attributes = True

# Queue Schemas
class ProcessingQueueResponse(BaseModel):
    id: int
    document_id: int
    status: str
    pii_found_count: Optional[int] = None
    processing_time_ms: Optional[float] = None
    error_message: Optional[str] = None
    queued_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    document: DocumentResponse

    class Config:
        from_attributes = True

# AI Processing Schemas
class DetectedEntityResponse(BaseModel):
    id: int
    entity_type: str
    text: str
    confidence: float
    start_char: int
    end_char: int
    page_number: int
    bbox: str
    is_redacted: bool

    class Config:
        from_attributes = True

class DocumentAnalysisResponse(BaseModel):
    document: DocumentResponse
    entities: List[DetectedEntityResponse]

class RedactRequest(BaseModel):
    entity_ids: List[int]

# Compliance Schemas
class ComplianceSection(BaseModel):
    status: str # 'Compliant', 'Non-Compliant', 'Action Required'
    score: int
    findings: List[str]
    recommendations: List[str]

class ComplianceReportResponse(BaseModel):
    document_id: int
    filename: str
    overall_risk_score: float # 0 to 100
    gdpr: ComplianceSection
    hipaa: ComplianceSection
    dpdp: ComplianceSection

# Chat Schemas
class ChatRequest(BaseModel):
    message: str
    document_id: Optional[int] = None

class ChatResponse(BaseModel):
    response: str
    sources: List[str]
