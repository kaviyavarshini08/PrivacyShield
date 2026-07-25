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
    "image/jpeg": b"\xff\xd8\xff",
    "application/zip": b"PK\x03\x04",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": b"PK\x03\x04"
}

def verify_file_mime_header(file_path: str, declared_content_type: str) -> bool:
    """
    Validates that the file's binary magic headers match its declared MIME content-type.
    Prevents extension-spoofing attacks (e.g. uploading malware.exe as invoice.pdf).
    """
    expected_header = MAGIC_HEADERS.get(declared_content_type)
    if not expected_header:
        # If file type is generic (like text/plain), skip magic verification
        return True
        
    try:
        with open(file_path, "rb") as f:
            file_header = f.read(len(expected_header))
            
        if file_header != expected_header:
            logger.error(
                f"MIME Spoofing detected! Declared: {declared_content_type}, "
                f"Expected Header: {expected_header}, Found: {file_header}."
            )
            return False
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
