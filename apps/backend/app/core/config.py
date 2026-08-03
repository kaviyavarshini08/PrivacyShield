import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "PrivacyShield"
    API_V1_STR: str = "/api/v1"
    
    # Security & Auth
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-super-secret-production-key-change-me")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # PostgreSQL Connection
    POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", "localhost")
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "postgres")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "privacyshield")
    
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        db_url = os.getenv("DATABASE_URL")
        if db_url:
            if db_url.startswith("postgres://"):
                return db_url.replace("postgres://", "postgresql+asyncpg://", 1)
            elif db_url.startswith("postgresql://"):
                return db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
            return db_url
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}/{self.POSTGRES_DB}"
    
    @property
    def SYNC_DATABASE_URI(self) -> str:
        db_url = os.getenv("DATABASE_URL")
        if db_url:
            if db_url.startswith("postgres://"):
                return db_url.replace("postgres://", "postgresql://", 1)
            return db_url
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}/{self.POSTGRES_DB}"

    # Redis Connection
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # Storage
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./backend_storage")
    
    # OAuth
    GOOGLE_CLIENT_ID: Optional[str] = os.getenv("GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET: Optional[str] = os.getenv("GOOGLE_CLIENT_SECRET")
    GITHUB_CLIENT_ID: Optional[str] = os.getenv("GITHUB_CLIENT_ID")
    GITHUB_CLIENT_SECRET: Optional[str] = os.getenv("GITHUB_CLIENT_SECRET")
    
    # RAG Chat
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY")
    
    # AI Services URL (Microservice)
    AI_SERVICE_URL: str = os.getenv("AI_SERVICE_URL", "http://localhost:8002")
    
    # AI & Embeddings Configurations
    EMBEDDING_PROVIDER: str = os.getenv("EMBEDDING_PROVIDER", "local") # 'local' or 'openai'
    ENABLE_GPU_INFERENCE: bool = os.getenv("ENABLE_GPU_INFERENCE", "false").lower() == "true"
    LOCAL_MODEL_DEVICE: str = os.getenv("LOCAL_MODEL_DEVICE", "cpu")

    def __init__(self, **values):
        super().__init__(**values)
        if not self.AI_SERVICE_URL.startswith("http://") and not self.AI_SERVICE_URL.startswith("https://"):
            self.AI_SERVICE_URL = f"http://{self.AI_SERVICE_URL}"

    class Config:
        case_sensitive = True

settings = Settings()
