from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    role = Column(String, default="user") # 'admin', 'user', 'manager'
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    documents = relationship("Document", back_populates="owner")
    audit_logs = relationship("AuditLog", back_populates="user")

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True, nullable=False)
    original_name = Column(String, nullable=False)
    file_size = Column(Integer) # in bytes
    content_type = Column(String)
    storage_path = Column(String, nullable=False)
    redacted_storage_path = Column(String, nullable=True)
    status = Column(String, default="uploaded") # uploaded, processing, completed, failed
    is_encrypted = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="documents")
    
    queue_entry = relationship("ProcessingQueue", back_populates="document", uselist=False)
    entities = relationship("DetectedEntity", back_populates="document")
    redaction_logs = relationship("RedactionLog", back_populates="document")

class ProcessingQueue(Base):
    __tablename__ = "processing_queue"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), unique=True)
    status = Column(String, default="queued") # queued, processing, completed, failed
    pii_found_count = Column(Integer, nullable=True)
    processing_time_ms = Column(Float, nullable=True)
    error_message = Column(String, nullable=True)
    
    queued_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    document = relationship("Document", back_populates="queue_entry")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # nullable for system actions
    action = Column(String, nullable=False) # e.g. "DOCUMENT_UPLOAD", "LOGIN"
    target = Column(String, nullable=True) # e.g. document filename
    severity = Column(String, default="low") # low, medium, high
    ip_address = Column(String, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="audit_logs")

class DetectedEntity(Base):
    __tablename__ = "detected_entities"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"))
    entity_type = Column(String, index=True) # Aadhaar, PAN, PHONE_NUMBER, EMAIL_ADDRESS, etc.
    text = Column(String) # The actual text snippet
    confidence = Column(Float)
    start_char = Column(Integer)
    end_char = Column(Integer)
    page_number = Column(Integer)
    bbox = Column(String) # JSON string representing bounding box coordinates
    is_redacted = Column(Boolean, default=False)

    document = relationship("Document", back_populates="entities")
    redaction_logs = relationship("RedactionLog", back_populates="entity")

class RedactionLog(Base):
    __tablename__ = "redaction_logs"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"))
    entity_id = Column(Integer, ForeignKey("detected_entities.id"))
    status = Column(String) # redacted, unredacted
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    document = relationship("Document", back_populates="redaction_logs")
    entity = relationship("DetectedEntity", back_populates="redaction_logs")
