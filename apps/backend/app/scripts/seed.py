import sys
import os

# Inject backend path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.database import SyncSessionLocal
from app.models.models import Organization, User
from app.core.security import get_password_hash

def seed_db():
    db = SyncSessionLocal()
    try:
        print("Starting database seeding...")
        
        # 1. Ensure Default SaaS Org exists
        org = db.query(Organization).filter(Organization.name == "Cybersecurity Corp").first()
        if not org:
            org = Organization(
                name="Cybersecurity Corp",
                max_bytes=524288000, # 500MB
                max_users=20,
                is_active=True
            )
            db.add(org)
            db.flush()
            print(f"Created default organization: {org.name}")
        else:
            print("Default organization already exists.")
            
        # 2. Provision Admin Users
        admin_company = db.query(User).filter(User.email == "admin@company.com").first()
        if not admin_company:
            admin_company = User(
                email="admin@company.com",
                hashed_password=get_password_hash("adminpassword123"),
                full_name="Global Systems Admin",
                role="admin",
                organization_id=org.id,
                is_active=True
            )
            db.add(admin_company)
            print(f"Provisioned Admin user: {admin_company.email} (pass: adminpassword123)")
            
        admin_simple = db.query(User).filter(User.email == "admin@privacyshield.com").first()
        if not admin_simple:
            admin_simple = User(
                email="admin@privacyshield.com",
                hashed_password=get_password_hash("admin"),
                full_name="Demo Administrator",
                role="admin",
                organization_id=org.id,
                is_active=True
            )
            db.add(admin_simple)
            print(f"Provisioned Admin user: {admin_simple.email} (pass: admin)")
            
        # 3. Provision Security Analyst Users
        analyst_company = db.query(User).filter(User.email == "analyst@company.com").first()
        if not analyst_company:
            analyst_company = User(
                email="analyst@company.com",
                hashed_password=get_password_hash("analystpassword123"),
                full_name="Threat Security Analyst",
                role="analyst",
                organization_id=org.id,
                is_active=True
            )
            db.add(analyst_company)
            print(f"Provisioned Security Analyst user: {analyst_company.email} (pass: analystpassword123)")
            
        analyst_simple = db.query(User).filter(User.email == "analyst@privacyshield.com").first()
        if not analyst_simple:
            analyst_simple = User(
                email="analyst@privacyshield.com",
                hashed_password=get_password_hash("analyst"),
                full_name="Demo Analyst",
                role="analyst",
                organization_id=org.id,
                is_active=True
            )
            db.add(analyst_simple)
            print(f"Provisioned Security Analyst user: {analyst_simple.email} (pass: analyst)")

        # 4. Provision Standard User
        user_simple = db.query(User).filter(User.email == "user@privacyshield.com").first()
        if not user_simple:
            user_simple = User(
                email="user@privacyshield.com",
                hashed_password=get_password_hash("user"),
                full_name="Demo User",
                role="user",
                organization_id=org.id,
                is_active=True
            )
            db.add(user_simple)
            print(f"Provisioned User: {user_simple.email} (pass: user)")
            
        db.commit()
        print("Database seeding completed successfully.")
        
    except Exception as e:
        print(f"Database seeding failed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
