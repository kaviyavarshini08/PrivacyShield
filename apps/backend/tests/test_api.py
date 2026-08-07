from fastapi.testclient import TestClient
import pytest
from app.main import app

client = TestClient(app)

def test_read_root():
    """
    Test that the root endpoint is reachable and returns the welcome message.
    """
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "PrivacyShield Enterprise API is running" in data["message"]
    assert data["docs_path"] == "/docs"

def test_health_check():
    """
    Test that the health endpoint returns a healthy status.
    """
    response = client.get("/health/liveness")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "alive"

from unittest.mock import AsyncMock, MagicMock
from app.database import get_db

def test_forgot_password_unknown_email():
    """
    Test that forgot-password returns 404 for unregistered email.
    """
    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars().first.return_value = None
    mock_db.execute.return_value = mock_result

    app.dependency_overrides[get_db] = lambda: mock_db
    try:
        response = client.post("/api/v1/auth/forgot-password", json={"email": "nonexistent_user_xyz@test.com"})
        assert response.status_code == 404
    finally:
        app.dependency_overrides.clear()

def test_forgot_password_success():
    """
    Test that forgot-password successfully updates user password and returns success status.
    """
    mock_user = MagicMock()
    mock_user.email = "test@example.com"
    mock_user.id = 1
    mock_user.organization_id = 1
    mock_user.full_name = "Test User"
    
    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars().first.return_value = mock_user
    mock_db.execute.return_value = mock_result

    app.dependency_overrides[get_db] = lambda: mock_db
    try:
        response = client.post("/api/v1/auth/forgot-password", json={"email": "test@example.com", "new_password": "newsecretpassword123"})
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["updated_password"] == "newsecretpassword123"
    finally:
        app.dependency_overrides.clear()



