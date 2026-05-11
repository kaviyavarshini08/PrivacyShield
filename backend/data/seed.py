import sys
import os
import random
from datetime import datetime, timedelta
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.database import SessionLocal, engine, Base
from backend.models.models import User, Document, ProcessingQueue, DetectedEntity, RedactionLog
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def seed_db():
    print("Creating tables...")
    Base.metadata.drop_all(bind=engine) # Reset DB for clean demo
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    # 1. Create Demo Admin User
    print("Seeding admin user...")
    admin = User(
        email="admin@privacyshield.com",
        hashed_password=get_password_hash("admin123"),
        full_name="Admin User",
        role="admin"
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)

    # 2. Seed Mock Documents (Advanced Storylines)
    print("Seeding advanced demo storylines...")
    samples_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "samples"))
    
    storylines = [
        {
            "name": "employee_contract.pdf",
            "type": "HR Documents",
            "path": os.path.join(samples_dir, "employee_contract.pdf"),
            "status": "Completed",
            "redacted": True,
            "entities": [
                {"type": "PERSON", "text": "Priya Sharma", "conf": 0.95},
                {"type": "PHONE_NUMBER", "text": "+91 98765 43210", "conf": 0.88},
                {"type": "IN_AADHAAR", "text": "1234-5678-9012", "conf": 0.99},
                {"type": "IN_PAN", "text": "ABCDE1234F", "conf": 0.99}
            ]
        },
        {
            "name": "customer_kyc.pdf",
            "type": "Customer Data",
            "path": os.path.join(samples_dir, "customer_kyc.pdf"),
            "status": "Completed",
            "redacted": False, # High-Risk Alert: PII detected but not redacted yet
            "entities": [
                {"type": "EMAIL_ADDRESS", "text": "amit.singh@example.com", "conf": 0.92},
                {"type": "IN_AADHAAR", "text": "9876-5432-1098", "conf": 0.99}
            ]
        },
        {
            "name": "corrupted_financial_report.pdf",
            "type": "Finance",
            "path": "/mock/path/corrupted.pdf",
            "status": "Failed",
            "redacted": False,
            "error_msg": "File is corrupted or not a valid PDF.",
            "entities": []
        },
        {
            "name": "public_company_policy.pdf",
            "type": "Legal",
            "path": os.path.join(samples_dir, "public_company_policy.pdf"),
            "status": "Completed",
            "redacted": False,
            "entities": [] # No PII
        }
    ]

    for data in storylines:
        # Create Document
        doc = Document(
            owner_id=admin.id,
            filename=f"seeded_{data['name']}",
            original_name=data["name"],
            storage_path=data["path"],
            file_size=random.randint(1000000, 5000000),
            content_type=data["type"],
            created_at=datetime.utcnow() - timedelta(hours=random.randint(1, 48))
        )
        
        if data["redacted"]:
            doc.redacted_storage_path = data["path"] # For demo purposes, link to original or mock path
            
        db.add(doc)
        db.commit()
        db.refresh(doc)
        
        # Create Queue Entry
        queue = ProcessingQueue(
            document_id=doc.id,
            status=data["status"],
            pii_found_count=len(data["entities"]),
            error_message=data.get("error_msg")
        )
        if data["status"] == "Completed":
            queue.completed_at = doc.created_at + timedelta(minutes=2)
            
        db.add(queue)
        db.commit()
        
        # Create Entities
        for e_data in data["entities"]:
            entity = DetectedEntity(
                document_id=doc.id,
                entity_type=e_data["type"],
                text=e_data["text"],
                confidence=e_data["conf"],
                bbox='{"x0": 50, "y0": 100, "x1": 150, "y1": 120}',
                page_number=1,
                is_redacted=data["redacted"]
            )
            db.add(entity)
        db.commit()

    print("Database seeding completed successfully!")
    db.close()

if __name__ == "__main__":
    seed_db()
