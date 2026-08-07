from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Float, BigInteger
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)
    full_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    
    # 3 Security Questions & Answers for Password Recovery
    sec_q1 = Column(String, nullable=True)
    sec_a1 = Column(String, nullable=True)
    sec_q2 = Column(String, nullable=True)
    sec_a2 = Column(String, nullable=True)
    sec_q3 = Column(String, nullable=True)
    sec_a3 = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    documents = relationship("Document", back_populates="owner")
    audit_logs = relationship("AuditLog", back_populates="user")

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True, nullable=False)
    original_name = Column(String, nullable=False)
    file_size = Column(BigInteger) # in bytes
    content_type = Column(String)
    storage_path = Column(String, nullable=False)
    redacted_storage_path = Column(String, nullable=True)
    status = Column(String, default="uploaded")
    is_encrypted = Column(Boolean, default=False)
    
    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="documents")
    
    queue_entry = relationship("ProcessingQueue", back_populates="document", uselist=False)
    entities = relationship("DetectedEntity", back_populates="document")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ProcessingQueue(Base):
    __tablename__ = "processing_queue"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), unique=True)
    status = Column(String, default="queued")
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
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String, nullable=False)
    target = Column(String, nullable=True)
    severity = Column(String, default="low")
    ip_address = Column(String, nullable=True)
    
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="audit_logs")

class DetectedEntity(Base):
    __tablename__ = "detected_entities"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"))
    entity_type = Column(String, index=True)
    text = Column(String)
    confidence = Column(Float)
    start_char = Column(Integer)
    end_char = Column(Integer)
    page_number = Column(Integer)
    bbox = Column(String)
    is_redacted = Column(Boolean, default=False)

    attribution = Column(String, default="ai")
    reason = Column(String, nullable=True)
    confidence_breakdown = Column(String, nullable=True)
    review_status = Column(String, default="pending")
    corrected_text = Column(String, nullable=True)

    document = relationship("Document", back_populates="entities")
