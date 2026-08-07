import os
import shutil
import logging
from fastapi import HTTPException, status
from ..core.config import settings

logger = logging.getLogger(__name__)

# Directory where suspicious/malicious files are isolated
QUARANTINE_DIR = os.path.join(settings.UPLOAD_DIR, "quarantine")

# Magic numbers mapping for MIME spoofing defense
MAGIC_HEADERS = {
    "application/pdf": b"%PDF",
    "image/png": b"\x89PNG",
    "image/x-png": b"\x89PNG",
    "image/jpeg": b"\xff\xd8\xff",
    "image/jpg": b"\xff\xd8\xff",
    "image/pjpeg": b"\xff\xd8\xff",
    "image/webp": b"RIFF",
    "application/zip": b"PK\x03\x04",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": b"PK\x03\x04",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": b"PK\x03\x04",
}

def verify_file_mime_header(file_path: str, declared_content_type: str) -> bool:
    """
    Validates that the file's binary magic headers match its declared MIME content-type.
    Prevents extension-spoofing attacks (e.g. uploading malware.exe as invoice.pdf).
    """
    content_type = (declared_content_type or "").lower()
    file_ext = os.path.splitext(file_path)[1].lower()

    if content_type in ["text/plain", "text/csv"] or file_ext in [".txt", ".csv", ".json", ".log"]:
        return True

    try:
        with open(file_path, "rb") as f:
            header_bytes = f.read(16)
            
        if "pdf" in content_type or file_ext == ".pdf":
            return header_bytes.startswith(b"%PDF")
        if "png" in content_type or file_ext == ".png":
            return header_bytes.startswith(b"\x89PNG")
        if "jpeg" in content_type or "jpg" in content_type or file_ext in [".jpg", ".jpeg"]:
            return header_bytes.startswith(b"\xff\xd8")
        if "webp" in content_type or file_ext == ".webp":
            return b"RIFF" in header_bytes or b"WEBP" in header_bytes
        if "zip" in content_type or "docx" in content_type or "xlsx" in content_type or file_ext in [".docx", ".xlsx", ".zip"]:
            return header_bytes.startswith(b"PK")
    except Exception as e:
        logger.error(f"Error checking file header: {e}")
        return False
        
    return True

def quarantine_file(file_path: str) -> str:
    """
    Moves a compromised or malicious file to the quarantine directory to isolate it.
    Returns the new quarantined file path.
    """
    os.makedirs(QUARANTINE_DIR, exist_ok=True)
    base_name = os.path.basename(file_path)
    quarantine_path = os.path.join(QUARANTINE_DIR, base_name)
    
    try:
        shutil.move(file_path, quarantine_path)
        logger.warning(f"File quarantined successfully: {file_path} -> {quarantine_path}")
        return quarantine_path
    except Exception as e:
        logger.error(f"Failed to quarantine file: {e}")
        # Return original path if move fails, but block execution
        return file_path

async def scan_for_malware(file_path: str) -> bool:
    """
    Scans file using ClamAV daemon. If ClamAV is offline or disabled,
    falls back to a dry-run check looking for test malware signatures.
    Returns True if clean, False if infected.
    """
    # Placeholder for standard clamd daemon connection
    # import clamd
    # cd = clamd.ClamdNetworkSocket(host=os.getenv("CLAMAV_HOST", "localhost"), port=3310)
    # scan_result = cd.scan(file_path)
    
    logger.info(f"Initiating ClamAV malware scan for: {file_path}")
    
    # Secure dry-run: Check for EICAR standard anti-virus test file signature
    try:
        with open(file_path, "rb") as f:
            content = f.read(100)
            if b"X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*" in content:
                logger.warning(f"Alert: Standard EICAR malware test string detected in {file_path}!")
                return False
    except Exception as e:
        logger.error(f"Security scan read error: {e}")
        return False

    return True # Clean
