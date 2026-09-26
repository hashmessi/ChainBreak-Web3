"""
Unit & Adversarial Tests for W16 Mutation-Fuzz Campaign

Verifies:
- 100+ parameter and calldata mutations evaluated
- 0 False Allows
- 0 Unhandled Crashes
- Strict 3-way classification: SAFE → ALLOW, KNOWN BAD → BLOCK, UNPARSEABLE → HOLD
"""

import pytest
from backend.eval.fuzzer import (
    run_mutation_fuzz_campaign,
    generate_fuzz_mutations,
    create_fuzz_intent,
    FuzzCampaignReport,
)


def test_fuzzer_generates_over_100_mutations():
    """Verify that mutation corpus exceeds 100 variations across 8 parameter vectors."""
    mutations = generate_fuzz_mutations()
    assert len(mutations) >= 100

    mutation_types = {m[0] for m in mutations}
    assert "safe_baseline" in mutation_types
    assert "recipient_mutation" in mutation_types
    assert "amount_inflation" in mutation_types
    assert "contract_mutation" in mutation_types
    assert "chain_drift" in mutation_types
    assert "method_selector" in mutation_types
    assert "calldata_truncation" in mutation_types
    assert "encoding_corruption" in mutation_types


def test_mutation_fuzz_campaign_execution():
    """Execute complete W16 fuzz campaign and assert zero security invariants broken."""
    report = run_mutation_fuzz_campaign()

    assert isinstance(report, FuzzCampaignReport)
    assert report.total_mutations >= 100
    assert report.safe_allowed > 0
    assert report.known_bad_blocked > 0
    assert report.unparseable_held > 0

    # Critical security guarantees:
    assert report.false_allows == 0, f"Critical security breach: {report.false_allows} mutations were falsely allowed!"
    assert report.unhandled_exceptions == 0, f"Parser crash: {report.unhandled_exceptions} unhandled exceptions!"
    assert report.all_invariants_held is True
