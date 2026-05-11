import os
import shutil
import uuid
from fastapi import UploadFile

# Use local storage for MVP development
LOCAL_STORAGE_DIR = "backend/storage/vault"

class StorageService:
    def __init__(self):
        # Ensure local storage directory exists
        os.makedirs(LOCAL_STORAGE_DIR, exist_ok=True)

    async def upload_file(self, file: UploadFile) -> str:
        """
        Saves a file locally and returns the path.
        For production, this will be swapped with the Firebase implementation below.
        """
        # Generate a unique filename to prevent collisions
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(LOCAL_STORAGE_DIR, unique_filename)

        # Save locally
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        return file_path

    async def upload_file_to_firebase(self, file: UploadFile) -> str:
        """
        Scaffolded Firebase Storage Integration for future cloud deployment.
        """
        # import firebase_admin
        # from firebase_admin import credentials, storage
        
        # if not firebase_admin._apps:
        #     cred = credentials.Certificate("path/to/firebase-credentials.json")
        #     firebase_admin.initialize_app(cred, {'storageBucket': 'your-project.appspot.com'})
            
        # bucket = storage.bucket()
        # unique_filename = f"{uuid.uuid4()}_{file.filename}"
        # blob = bucket.blob(f"vault/{unique_filename}")
        
        # contents = await file.read()
        # blob.upload_from_string(contents, content_type=file.content_type)
        
        # return blob.public_url # Or gs:// URL depending on privacy needs
        raise NotImplementedError("Firebase integration scaffolded but not initialized.")

storage_service = StorageService()
