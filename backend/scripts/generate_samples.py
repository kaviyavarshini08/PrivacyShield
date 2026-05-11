import os
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.colors import black
import random

# Fictional PII Data
NAMES = ["Rajesh Kumar", "Priya Sharma", "Amit Singh", "Sneha Patel"]
PHONES = ["+91 98765 43210", "+91 87654 32109", "+91 99887 76655"]
EMAILS = ["rajesh.k@example.com", "priya.s@example.com", "amit.singh@example.com"]
AADHAARS = ["1234-5678-9012", "9876-5432-1098", "4567-8901-2345"]
PANS = ["ABCDE1234F", "FGHIJ5678K", "KLMNO9012P"]

def create_sample_pdf(filename, title, content_lines):
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    c = canvas.Canvas(filename, pagesize=letter)
    width, height = letter
    
    # Title
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, height - 50, title)
    
    # Content
    c.setFont("Helvetica", 12)
    y = height - 100
    for line in content_lines:
        c.drawString(50, y, line)
        y -= 20
        if y < 50:
            c.showPage()
            c.setFont("Helvetica", 12)
            y = height - 50
            
    c.save()
    print(f"Generated: {filename}")

def generate_all_samples():
    output_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "samples")
    
    # 1. Employee Contract
    create_sample_pdf(
        os.path.join(output_dir, "employee_contract.pdf"),
        "EMPLOYMENT CONTRACT",
        [
            "This contract is made between the Company and the Employee.",
            f"Name: {random.choice(NAMES)}",
            f"Personal Phone: {random.choice(PHONES)}",
            f"Personal Email: {random.choice(EMAILS)}",
            f"Aadhaar Number: {random.choice(AADHAARS)}",
            f"PAN Number: {random.choice(PANS)}",
            "",
            "The employee agrees to the terms of confidentiality.",
            "Salary details are attached in the annexure."
        ]
    )

    # 2. Customer KYC Form
    create_sample_pdf(
        os.path.join(output_dir, "customer_kyc.pdf"),
        "KNOW YOUR CUSTOMER (KYC) FORM",
        [
            "Customer Verification Details:",
            f"Full Name: {random.choice(NAMES)}",
            f"Contact Number: {random.choice(PHONES)}",
            f"Email Address: {random.choice(EMAILS)}",
            "Identity Verification:",
            f"Aadhaar No.: {random.choice(AADHAARS)}",
            f"Permanent Account Number (PAN): {random.choice(PANS)}",
            "",
            "Declaration: I hereby declare that the details furnished above are true."
        ]
    )

    # 3. Clean Document (No PII)
    create_sample_pdf(
        os.path.join(output_dir, "public_company_policy.pdf"),
        "COMPANY PUBLIC POLICY",
        [
            "Welcome to the company.",
            "Our core values are Integrity, Innovation, and Excellence.",
            "Working hours are from 9 AM to 5 PM.",
            "Please refer to the employee handbook for more generic rules."
        ]
    )

if __name__ == "__main__":
    generate_all_samples()
