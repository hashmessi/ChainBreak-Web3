"""
Integration Tests for Web3 V2 API Endpoints
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_api_v2_scenarios():
    """Verify GET /api/v2/scenarios returns all 12 scenarios."""
    res = client.get("/api/v2/scenarios")
    assert res.status_code == 200
    data = res.json()
    assert "scenarios" in data
    assert len(data["scenarios"]) == 12
    ids = [s["id"] for s in data["scenarios"]]
    assert "W1" in ids
    assert "W3" in ids
    assert "W5" in ids


def test_api_v2_fixtures():
    """Verify GET /api/v2/fixtures returns network details."""
    res = client.get("/api/v2/fixtures")
    assert res.status_code == 200
    data = res.json()
    assert data["chain_id"] == 11155111
    assert "operator" in data
    assert "alice" in data
    assert "mallory" in data


def test_api_v2_run_protected_blocked():
    """Verify POST /api/v2/run correctly blocks W3 Flagship attack."""
    res = client.post(
        "/api/v2/run",
        json={"scenario_id": "W3", "run_mode": "PROTECTED", "substrate": "LOCAL"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["run_mode"] == "PROTECTED"
    assert data["final_decision"] == "BLOCK"
    assert data["broadcast_count"] == 0
    assert len(data["receipts"]) == 1
    assert data["receipts"][0]["broadcast"] is False


def test_api_v2_run_baseline_allowed():
    """Verify POST /api/v2/run allows attack through in BASELINE mode."""
    res = client.post(
        "/api/v2/run",
        json={"scenario_id": "W3", "run_mode": "BASELINE", "substrate": "LOCAL"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["run_mode"] == "BASELINE"
    assert data["final_decision"] == "ALLOW"
    assert data["broadcast_count"] == 1
    assert data["receipts"][0]["broadcast"] is True


def test_api_v2_counterfactual():
    """Verify POST /api/v2/counterfactual returns dual-execution proof."""
    res = client.post(
        "/api/v2/counterfactual",
        json={"scenario_id": "W3", "substrate": "LOCAL"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["scenario_id"] == "W3"
    assert data["correctly_blocked"] is True
    assert data["attack_prevented"] is True
    assert data["baseline"]["broadcast_count"] == 1
    assert data["protected"]["broadcast_count"] == 0
    assert data["causal_lineage"] is not None
    assert "INTENT_INTEGRITY" in data["causal_lineage"]["violated_invariants"]
