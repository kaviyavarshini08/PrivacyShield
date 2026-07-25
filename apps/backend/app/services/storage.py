import os
import shutil
import uuid
from fastapi import UploadFile
from ..core.config import settings

class StorageService:
    def __init__(self):
        # Ensure local storage directory exists
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    async def upload_file(self, file: UploadFile) -> str:
        """
        Saves a file locally and returns the relative path.
        Can be easily extended to store files on AWS S3 or Google Cloud Storage.
        """
        # Generate a unique filename to prevent collisions
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)

        # Save locally
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Return absolute path or relative path
        return os.path.abspath(file_path)

    async def upload_to_s3(self, file: UploadFile) -> str:
        # S3 adapter snippet placeholder for production configurations
        raise NotImplementedError("S3 storage adapter is not initialized. Toggle local volume storage in environment config.")

storage_service = StorageService()
