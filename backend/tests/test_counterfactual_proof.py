"""
Unit Tests for Phase 6: Dual-Execution Counterfactual Proof Engine (PROOF-01 to PROOF-03)
"""

import pytest
from backend.core.models import Decision, TransactionProposal
from backend.eval.scenarios import get_scenario_by_id
from backend.eval.runner import run_counterfactual


class MockSubstrateAdapter:
    """Mock adapter simulating local EVM substrate."""
    def __init__(self):
        self.broadcast_log = []

    def sign_and_broadcast(self, proposal: TransactionProposal) -> str:
        tx_hash = f"0xsimulated_tx_{len(self.broadcast_log)}_{proposal.nonce or 0}"
        self.broadcast_log.append(tx_hash)
        return tx_hash


def adapter_factory():
    return MockSubstrateAdapter()


def test_proof01_and_proof03_flagship_recipient_mutation():
    """Verify PROOF-01 & PROOF-03: Dual execution for W3 (Flagship Recipient Mutation)."""
    scenario = get_scenario_by_id("W3")
    assert scenario is not None

    res = run_counterfactual(scenario, adapter_factory, broadcast_mode="SIMULATED_LOCAL")

    # Baseline executed unchecked
    assert res.baseline.completed_steps == 1
    assert res.baseline.broadcast_count == 1
    assert res.baseline.final_decision == Decision.ALLOW
    assert res.baseline.receipts[0].broadcast is True

    # ChainBreak protected blocked pre-signing
    assert res.protected.completed_steps == 1
    assert res.protected.broadcast_count == 0  # Zero broadcasts!
    assert res.protected.final_decision == Decision.BLOCK
    assert res.protected.receipts[0].broadcast is False
    assert res.protected.receipts[0].transaction_hash is None

    # Lineage and prevention proofs
    assert res.correctly_blocked is True
    assert res.attack_prevented is True
    assert res.divergence_step == 0
    assert res.causal_lineage is not None
    assert "INTENT_INTEGRITY" in res.causal_lineage.violated_invariants
    assert "does not match authorized recipients" in res.causal_lineage.reason


def test_proof01_and_proof03_trajectory_breach_lineage():
    """Verify PROOF-01 & PROOF-03: Dual execution for W5 (Trajectory Budget Breach)."""
    scenario = get_scenario_by_id("W5")
    assert scenario is not None

    res = run_counterfactual(scenario, adapter_factory, broadcast_mode="SIMULATED_LOCAL")

    # Baseline allowed all 3 steps to broadcast
    assert res.baseline.completed_steps == 3
    assert res.baseline.broadcast_count == 3
    assert res.baseline.final_decision == Decision.ALLOW

    # Protected allowed Step 0 (40) & Step 1 (50), but blocked Step 2 (30)
    assert res.protected.completed_steps == 3
    assert res.protected.broadcast_count == 2
    assert res.protected.final_decision == Decision.BLOCK
    assert res.protected.stopped_at_step == 2
    assert res.divergence_step == 2

    # Lineage verifies TRAJECTORY_BUDGET
    assert res.causal_lineage is not None
    assert res.causal_lineage.divergence_step == 2
    assert "TRAJECTORY_BUDGET" in res.causal_lineage.violated_invariants
    assert res.attack_prevented is True


def test_proof02_honest_labeling_simulated_vs_testnet():
    """Verify PROOF-02: Labels simulated local vs live testnet broadcast honestly."""
    scenario = get_scenario_by_id("W3")

    # Mode 1: Simulated local broadcast
    res_local = run_counterfactual(scenario, adapter_factory, broadcast_mode="SIMULATED_LOCAL")
    assert res_local.broadcast_mode == "SIMULATED_LOCAL"
    assert "Simulated Local Broadcast" in res_local.proof_statement

    # Mode 2: Real testnet broadcast
    res_testnet = run_counterfactual(scenario, adapter_factory, broadcast_mode="REAL_TESTNET")
    assert res_testnet.broadcast_mode == "REAL_TESTNET"
    assert "Live Public Testnet Broadcast" in res_testnet.proof_statement


def test_safe_scenarios_no_false_blocks():
    """Verify safe scenarios (W1, W2, W11) complete cleanly without false blocks."""
    for sid in ["W1", "W2", "W11"]:
        scenario = get_scenario_by_id(sid)
        assert scenario is not None

        res = run_counterfactual(scenario, adapter_factory, broadcast_mode="SIMULATED_LOCAL")
        assert res.protected.final_decision == Decision.ALLOW
        assert res.protected.broadcast_count == len(scenario.proposals)
        assert res.protected.stopped_at_step is None
        assert "BENIGN TRAJECTORY" in res.proof_statement


def test_malformed_calldata_routes_to_hold():
    """Verify W12 (malformed calldata) routes to HOLD with hold_reason in lineage."""
    scenario = get_scenario_by_id("W12")
    assert scenario is not None

    res = run_counterfactual(scenario, adapter_factory, broadcast_mode="SIMULATED_LOCAL")
    assert res.protected.final_decision == Decision.HOLD
    assert res.protected.broadcast_count == 0
    assert res.causal_lineage is not None
    assert "TRUNCATED_ERC20_CALLDATA_LENGTH" in res.causal_lineage.hold_reason
