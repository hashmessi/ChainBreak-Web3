"""
Unit Tests for Phase 3: Web3 Invariant Engine (INV-01 to INV-04)
"""

import pytest
from backend.core.models import (
    Decision,
    DecodedEvmTransaction,
    IntentEnvelope,
    TrajectoryState,
)
from backend.core.invariants import (
    InvariantId,
    evaluate_invariants,
)
from backend.chain.decoder import DecodeResult
from backend.chain.fixtures import (
    CHAIN_ID_SEPOLIA,
    SEPOLIA_USDC_CONTRACT,
    ALICE_ADDRESS,
    BOB_ADDRESS,
    MALLORY_ADDRESS,
)


@pytest.fixture
def sample_intent():
    return IntentEnvelope(
        intent_id="intent_test_1",
        user_goal="Pay Alice 50 USDC for invoice INV-14",
        chain_id=CHAIN_ID_SEPOLIA,
        allowed_assets=["USDC", "ETH"],
        allowed_recipients=[ALICE_ADDRESS],
        allowed_contracts=[SEPOLIA_USDC_CONTRACT],
        allowed_methods=["transfer"],
        max_single_value_per_asset={"USDC": 50_000_000, "ETH": 10**18},
        max_session_value_per_asset={"USDC": 100_000_000, "ETH": 2 * 10**18},
        expected_reason="invoice INV-14",
    )


@pytest.fixture
def empty_trajectory():
    return TrajectoryState(
        session_id="session_1",
        agent_id="agent_1",
        intent_id="intent_test_1",
        cumulative_spend_per_asset={"USDC": 0, "ETH": 0},
    )


def test_safe_transaction_passes_all_invariants(sample_intent, empty_trajectory):
    """Safe transaction matching authorized intent returns ALLOW."""
    decoded = DecodedEvmTransaction(
        chain_id=CHAIN_ID_SEPOLIA,
        asset="USDC",
        method="transfer",
        contract=SEPOLIA_USDC_CONTRACT,
        recipient=ALICE_ADDRESS,
        amount=50_000_000,
        raw_to=SEPOLIA_USDC_CONTRACT,
        raw_value=0,
        calldata_hash="dummy_hash",
    )
    res = evaluate_invariants(sample_intent, empty_trajectory, decoded)
    assert res.decision == Decision.ALLOW
    assert res.violated_invariants == []
    assert res.hold_reason is None


def test_inv01_recipient_mutation_blocked(sample_intent, empty_trajectory):
    """Verify INV-01: Recipient redirection (Alice -> Mallory) triggers BLOCK."""
    decoded = DecodedEvmTransaction(
        chain_id=CHAIN_ID_SEPOLIA,
        asset="USDC",
        method="transfer",
        contract=SEPOLIA_USDC_CONTRACT,
        recipient=MALLORY_ADDRESS,  # Mutated to attacker
        amount=50_000_000,
        raw_to=SEPOLIA_USDC_CONTRACT,
        raw_value=0,
        calldata_hash="dummy_hash",
    )
    res = evaluate_invariants(sample_intent, empty_trajectory, decoded)
    assert res.decision == Decision.BLOCK
    assert InvariantId.INTENT_INTEGRITY in res.violated_invariants
    assert "does not match authorized recipients" in res.reason


def test_inv01_single_amount_exceeded_blocked(sample_intent, empty_trajectory):
    """Verify INV-01: Single-transaction amount above limit triggers BLOCK."""
    decoded = DecodedEvmTransaction(
        chain_id=CHAIN_ID_SEPOLIA,
        asset="USDC",
        method="transfer",
        contract=SEPOLIA_USDC_CONTRACT,
        recipient=ALICE_ADDRESS,
        amount=75_000_000,  # 75 > 50 max_single
        raw_to=SEPOLIA_USDC_CONTRACT,
        raw_value=0,
        calldata_hash="dummy_hash",
    )
    res = evaluate_invariants(sample_intent, empty_trajectory, decoded)
    assert res.decision == Decision.BLOCK
    assert InvariantId.INTENT_INTEGRITY in res.violated_invariants
    assert "exceeds single transaction limit" in res.reason


def test_inv02_wrong_chain_blocked(sample_intent, empty_trajectory):
    """Verify INV-02: Disallowed chain ID triggers BLOCK."""
    decoded = DecodedEvmTransaction(
        chain_id=1,  # Mainnet instead of Sepolia
        asset="USDC",
        method="transfer",
        contract=SEPOLIA_USDC_CONTRACT,
        recipient=ALICE_ADDRESS,
        amount=50_000_000,
        raw_to=SEPOLIA_USDC_CONTRACT,
        raw_value=0,
        calldata_hash="dummy_hash",
    )
    res = evaluate_invariants(sample_intent, empty_trajectory, decoded)
    assert res.decision == Decision.BLOCK
    assert InvariantId.CAPABILITY_BOUNDARY in res.violated_invariants
    assert "Chain ID" in res.reason


def test_inv02_unauthorized_method_blocked(sample_intent, empty_trajectory):
    """Verify INV-02: Disallowed method triggers BLOCK."""
    decoded = DecodedEvmTransaction(
        chain_id=CHAIN_ID_SEPOLIA,
        asset="USDC",
        method="approve",  # Not in allowed_methods ["transfer"]
        contract=SEPOLIA_USDC_CONTRACT,
        recipient=ALICE_ADDRESS,
        amount=50_000_000,
        raw_to=SEPOLIA_USDC_CONTRACT,
        raw_value=0,
        calldata_hash="dummy_hash",
    )
    res = evaluate_invariants(sample_intent, empty_trajectory, decoded)
    assert res.decision == Decision.BLOCK
    assert InvariantId.CAPABILITY_BOUNDARY in res.violated_invariants


def test_inv02_disallowed_asset_blocked(sample_intent, empty_trajectory):
    """Verify INV-02: Asset outside intent capability triggers BLOCK."""
    decoded = DecodedEvmTransaction(
        chain_id=CHAIN_ID_SEPOLIA,
        asset="DAI",  # Not in allowed_assets ["USDC", "ETH"]
        method="transfer",
        contract="0x6b175474e89094c44da98b954eedeac495271d0f",
        recipient=ALICE_ADDRESS,
        amount=50_000_000,
        raw_to="0x6b175474e89094c44da98b954eedeac495271d0f",
        raw_value=0,
        calldata_hash="dummy_hash",
    )
    res = evaluate_invariants(sample_intent, empty_trajectory, decoded)
    assert res.decision == Decision.BLOCK
    assert InvariantId.CAPABILITY_BOUNDARY in res.violated_invariants


def test_inv03_trajectory_budget_accumulated_breach(sample_intent):
    """Verify INV-03: Multi-step cumulative spend breach triggers BLOCK."""
    # Step 1: 40 USDC (current spend = 40 <= 100) -> ALLOW
    traj_step1 = TrajectoryState(
        session_id="session_1",
        agent_id="agent_1",
        intent_id=sample_intent.intent_id,
        cumulative_spend_per_asset={"USDC": 40_000_000},
    )
    # Step 2: 50 USDC (40 + 50 = 90 <= 100) -> ALLOW
    tx2 = DecodedEvmTransaction(
        chain_id=CHAIN_ID_SEPOLIA,
        asset="USDC",
        method="transfer",
        contract=SEPOLIA_USDC_CONTRACT,
        recipient=ALICE_ADDRESS,
        amount=50_000_000,
        raw_to=SEPOLIA_USDC_CONTRACT,
        raw_value=0,
        calldata_hash="dummy_hash",
    )
    res2 = evaluate_invariants(sample_intent, traj_step1, tx2)
    assert res2.decision == Decision.ALLOW

    # Update state after step 2: total cumulative spend is now 90 USDC
    traj_step2 = traj_step1.record_step("hash2", asset="USDC", amount=50_000_000)
    assert traj_step2.cumulative_spend_per_asset["USDC"] == 90_000_000

    # Step 3: 30 USDC (90 + 30 = 120 > 100 max_session) -> BLOCK!
    tx3 = DecodedEvmTransaction(
        chain_id=CHAIN_ID_SEPOLIA,
        asset="USDC",
        method="transfer",
        contract=SEPOLIA_USDC_CONTRACT,
        recipient=ALICE_ADDRESS,
        amount=30_000_000,
        raw_to=SEPOLIA_USDC_CONTRACT,
        raw_value=0,
        calldata_hash="dummy_hash",
    )
    res3 = evaluate_invariants(sample_intent, traj_step2, tx3)
    assert res3.decision == Decision.BLOCK
    assert InvariantId.TRAJECTORY_BUDGET in res3.violated_invariants
    assert "exceeds session budget" in res3.reason


def test_inv04_fail_closed_on_decode_failure(sample_intent, empty_trajectory):
    """Verify INV-04: Failed decode cleanly routes to HOLD without error."""
    decode_fail = DecodeResult(
        parseable=False,
        decoded=None,
        hold_reason="UNKNOWN_SELECTOR:0xdeadbeef",
    )
    res = evaluate_invariants(sample_intent, empty_trajectory, None, decode_result=decode_fail)
    assert res.decision == Decision.HOLD
    assert res.hold_reason == "UNKNOWN_SELECTOR:0xdeadbeef"
    assert res.violated_invariants == []


def test_inv04_fail_closed_on_missing_decoded(sample_intent, empty_trajectory):
    """Verify INV-04: Missing decoded object routes to HOLD."""
    res = evaluate_invariants(sample_intent, empty_trajectory, None)
    assert res.decision == Decision.HOLD
    assert res.hold_reason == "MISSING_DECODED_TRANSACTION"
