"""
Integration Tests for Web3 V2 API Endpoints
Updated for Phase 13: 15 Brutal Scenarios & W16 Fuzz Campaign
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_api_v2_scenarios():
    """Verify GET /api/v2/scenarios returns all 15 scenarios across 5 families."""
    res = client.get("/api/v2/scenarios")
    assert res.status_code == 200
    data = res.json()
    assert "scenarios" in data
    assert len(data["scenarios"]) == 15
    ids = [s["id"] for s in data["scenarios"]]
    assert "W01" in ids
    assert "W04" in ids
    assert "W15" in ids

    # Check that family and trajectory metadata are populated
    w15 = next(s for s in data["scenarios"] if s["id"] == "W15")
    assert "Family D" in w15["attack_family"]
    assert w15["attack_path"] == "Adaptive kill chain"
    assert len(w15["expected_step_decisions"]) == 8


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
    """Verify POST /api/v2/run correctly blocks W04 Flagship attack on step 4."""
    res = client.post(
        "/api/v2/run",
        json={"scenario_id": "W04", "run_mode": "PROTECTED", "substrate": "LOCAL"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["run_mode"] == "PROTECTED"
    assert data["final_decision"] == "BLOCK"
    assert data["broadcast_count"] == 4  # Steps 0-3 allowed, Step 4 blocked
    assert len(data["receipts"]) == 5
    assert data["receipts"][4]["broadcast"] is False
    assert data["receipts"][4]["transaction_hash"] is None


def test_api_v2_run_baseline_allowed():
    """Verify POST /api/v2/run allows all proposals in BASELINE mode."""
    res = client.post(
        "/api/v2/run",
        json={"scenario_id": "W04", "run_mode": "BASELINE", "substrate": "LOCAL"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["run_mode"] == "BASELINE"
    assert data["final_decision"] == "ALLOW"
    assert data["broadcast_count"] == 5
    assert data["receipts"][4]["broadcast"] is True


def test_api_v2_counterfactual():
    """Verify POST /api/v2/counterfactual returns dual-execution proof."""
    res = client.post(
        "/api/v2/counterfactual",
        json={"scenario_id": "W04", "substrate": "LOCAL"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["scenario_id"] == "W04"
    assert data["correctly_blocked"] is True
    assert data["attack_prevented"] is True
    assert data["baseline"]["broadcast_count"] == 5
    assert data["protected"]["broadcast_count"] == 4
    assert data["causal_lineage"] is not None
    assert "INTENT_INTEGRITY" in data["causal_lineage"]["violated_invariants"]


def test_api_v2_fuzz_endpoint():
    """Verify GET /api/v2/fuzz executes W16 campaign and returns 0 false allows."""
    res = client.get("/api/v2/fuzz?limit=25")
    assert res.status_code == 200
    data = res.json()
    assert data["total_mutations"] == 25
    assert data["false_allows"] == 0
    assert data["unhandled_exceptions"] == 0
    assert data["all_invariants_held"] is True
