from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Float, BigInteger
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base

class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    max_bytes = Column(BigInteger, default=524288000) # Default 500MB
    max_users = Column(Integer, default=10)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Billing and Subscription Fields
    subscription_tier = Column(String, default="free") # 'free', 'pro', 'enterprise', 'custom'
    subscription_status = Column(String, default="active") # 'active', 'past_due', 'canceled'
    stripe_customer_id = Column(String, nullable=True)
    stripe_subscription_id = Column(String, nullable=True)
    usage_bytes_scanned = Column(BigInteger, default=0)
    included_bytes_quota = Column(BigInteger, default=52428800) # 50MB for free tier

    users = relationship("User", back_populates="organization")
    documents = relationship("Document", back_populates="organization")
    audit_logs = relationship("AuditLog", back_populates="organization")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)
    full_name = Column(String, nullable=True)
    role = Column(String, default="user") # 'admin', 'user', 'manager', 'analyst'
    is_active = Column(Boolean, default=True)
    
    mfa_secret = Column(String, nullable=True)
    mfa_enabled = Column(Boolean, default=False)
    
    oauth_provider = Column(String, nullable=True)
    oauth_id = Column(String, nullable=True)
    
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True)
    organization = relationship("Organization", back_populates="users")
    
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
    
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True)
    organization = relationship("Organization", back_populates="documents")
    
    queue_entry = relationship("ProcessingQueue", back_populates="document", uselist=False)
    entities = relationship("DetectedEntity", back_populates="document")
    redaction_logs = relationship("RedactionLog", back_populates="document")
    
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
    
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True)
    organization = relationship("Organization", back_populates="audit_logs")
    
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

    # Explainability and Review Fields
    attribution = Column(String, default="ai") # 'regex', 'ai', 'user_corrected'
    reason = Column(String, nullable=True)
    confidence_breakdown = Column(String, nullable=True)
    review_status = Column(String, default="pending") # 'pending', 'approved', 'rejected'
    corrected_text = Column(String, nullable=True)

    document = relationship("Document", back_populates="entities")
    redaction_logs = relationship("RedactionLog", back_populates="entity")

class RedactionLog(Base):
    __tablename__ = "redaction_logs"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"))
    entity_id = Column(Integer, ForeignKey("detected_entities.id"))
    status = Column(String)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    document = relationship("Document", back_populates="redaction_logs")
    entity = relationship("DetectedEntity", back_populates="redaction_logs")

# pgvector embeddings table configuration for RAG Search
class DocumentEmbedding(Base):
    __tablename__ = "document_embeddings"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"))
    chunk_index = Column(Integer, nullable=False)
    text_content = Column(String, nullable=False)
    
    # We store embeddings as JSON Array of Floats.
    # In PostgreSQL, we can use the pgvector extension 'vector' column directly.
    # Using dynamic column mapping: if using pgvector extension, we map to Column(Vector(1536)).
    # To maintain pure compatibility with all postgres providers without strict native compilation steps:
    # We will declare it as a raw string or JSON which maps to Vector in Postgres!
    embedding = Column(String, nullable=False) # JSON-serialized float array representing vector coordinates
    embedding_version = Column(String, default="v1")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class WorkspaceInvitation(Base):
    __tablename__ = "workspace_invitations"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True, nullable=False)
    token = Column(String, unique=True, index=True, nullable=False)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    role = Column(String, default="user") # 'user', 'analyst', 'manager', 'admin'
    status = Column(String, default="pending") # 'pending', 'accepted', 'expired'
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    risk_score = Column(Float, default=0.0)
    
    # Location and IP Intelligence Fields
    city = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

# New CompliancePolicy table
class CompliancePolicy(Base):
    __tablename__ = "compliance_policies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False) # e.g. "GDPR", "HIPAA", "PCI-DSS"
    clause = Column(String, nullable=False) # e.g. "Article 32"
    text_content = Column(String, nullable=False)
    embedding = Column(String, nullable=False) # JSON-serialized float array representing vector coordinates
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# New FalsePositiveLog table
class FalsePositiveLog(Base):
    __tablename__ = "false_positive_logs"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    entity_type = Column(String, nullable=False)
    text = Column(String, nullable=False)
    context_words = Column(String, nullable=True)
    corrected_type = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
