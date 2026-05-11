# PrivacyShield

PrivacyShield is an AI-powered document privacy and redaction system designed to detect, classify, and protect Personally Identifiable Information (PII) from sensitive documents such as PDFs and images.

The system automatically scans uploaded files, identifies confidential information, and performs secure redaction to prevent privacy leaks and unauthorized data exposure.

---

## Features

- Secure User Authentication
- PDF Upload and Preview
- AI-Based PII Detection
- Automatic Text Redaction
- OCR Support for Scanned Documents
- Downloadable Redacted PDFs
- Responsive Frontend UI
- REST API Integration
- Real-Time Processing
- Secure Backend Architecture

---

## Problem Statement

Organizations frequently share documents containing sensitive personal information such as:

- Aadhaar Numbers
- PAN Numbers
- Phone Numbers
- Email Addresses
- Bank Details
- Addresses

Manual redaction is time-consuming, error-prone, and insecure.

PrivacyShield solves this problem using AI-powered automated detection and redaction techniques.

---

## Research Gap

Existing redaction tools:
- require manual selection,
- fail on scanned documents,
- lack intelligent contextual detection,
- or are not suitable for scalable deployment.

PrivacyShield addresses these limitations through:
- automated AI-based detection,
- OCR-enabled processing,
- scalable backend services,
- and secure API-driven workflows.

---

## Tech Stack

### Frontend
- React.js
- Vite
- Tailwind CSS

### Backend
- FastAPI
- Python

### AI / Processing
- Transformers
- OCR
- PyMuPDF
- PDFPlumber

### Database
- SQLite / PostgreSQL

---

## Project Structure

```bash
PrivacyShield/
│
├── backend/
│   ├── main.py
│   ├── analysis.py
│   ├── routes/
│   ├── models/
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── README.md
└── .gitignore
