from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from .database import engine, Base
from .routers import auth, upload, queue, analysis

# Create DB Tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="PrivacyShield API", version="1.0.0")

# Configure CORS for React frontend
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(upload.router, prefix="/api/v1/documents/upload", tags=["Documents"])
app.include_router(queue.router, prefix="/api/v1/queue", tags=["Processing Queue"])
app.include_router(analysis.router, prefix="/api/v1/analysis", tags=["Analysis"])
@app.get("/")
def read_root():
    return {"message": "PrivacyShield API is running"}

@app.get("/api/v1/health")
def health_check():
    return {"status": "healthy", "version": "1.0.0"}
