"""
Integration tests for FastAPI endpoints
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["system"] == "CricketLens AI"
    assert data["status"] == "online"

def test_demo_match_endpoint():
    response = client.get("/api/demo-match")
    assert response.status_code == 200
    data = response.json()
    assert "deliveries" in data
    assert len(data["deliveries"]) == 6
    assert "clustering" in data

def test_field_config_endpoint():
    response = client.get("/api/config/field")
    assert response.status_code == 200
    data = response.json()
    assert "dimensions" in data
    assert "calibration" in data

def test_evaluation_metrics_endpoint():
    response = client.get("/api/evaluation/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "object_detection" in data
    assert "multi_object_tracking" in data
    assert "field_homography" in data

