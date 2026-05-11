from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

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
    created_at: datetime
    owner_id: int

    class Config:
        from_attributes = True

# Queue Schemas
class ProcessingQueueResponse(BaseModel):
    id: int
    document_id: int
    status: str
    pii_found_count: Optional[int]
    processing_time_ms: Optional[float]
    queued_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
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
