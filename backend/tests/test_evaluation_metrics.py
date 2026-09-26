"""
Unit & Integration Tests for Phase 9: Evaluation Suite & Benchmark Metrics (EVAL-01, EVAL-02)
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.eval.metrics import evaluate_all_web3_scenarios, Web3EvaluationReport

client = TestClient(app)


def test_eval01_and_eval02_evaluate_all_scenarios():
    """Verify EVAL-01 & EVAL-02: Full 15-scenario benchmark metrics across 5 attack families."""
    report = evaluate_all_web3_scenarios(substrate="LOCAL")

    assert isinstance(report, Web3EvaluationReport)
    assert report.total_scenarios == 15
    assert len(report.results) == 15

    # Verify 100% attack prevention
    assert report.prevention_rate == 1.0
    assert report.attacks_prevented == (report.attack_scenarios + report.malformed_scenarios)

    # Verify 0% false block rate
    assert report.false_block_rate == 0.0

    # Verify sub-100ms decision latency
    assert report.avg_latency_ms < 100.0

    # Verify 5 attack families are populated
    assert len(report.family_breakdown) == 5

    # Verify each scenario row
    for row in report.results:
        assert row.passed is True
        assert row.actual_decision == row.expected_decision


def test_eval02_api_evaluate_endpoint():
    """Verify EVAL-02: /api/v2/evaluate endpoint returns complete benchmark report."""
    res = client.get("/api/v2/evaluate")
    assert res.status_code == 200
    data = res.json()

    assert data["total_scenarios"] == 15
    assert data["prevention_rate"] == 1.0
    assert data["false_block_rate"] == 0.0
    assert len(data["results"]) == 15

    # Check that W04 (Trust-Then-Hijack) and W03 (Slow-Drip Drain) and W15 (Adaptive Kill Chain) are recorded
    w04_row = next(r for r in data["results"] if r["scenario_id"] == "W04")
    assert w04_row["expected_decision"] == "BLOCK"
    assert w04_row["actual_decision"] == "BLOCK"
    assert w04_row["broadcast_suppressed"] is True

    w15_row = next(r for r in data["results"] if r["scenario_id"] == "W15")
    assert w15_row["expected_decision"] == "BLOCK"
    assert w15_row["actual_decision"] == "BLOCK"
    assert w15_row["broadcast_suppressed"] is True
