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
