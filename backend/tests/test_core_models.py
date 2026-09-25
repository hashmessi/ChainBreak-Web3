"""
Unit Tests for Phase 1: Core Web3 Data Models (CORE-01 to CORE-05)
"""

import pytest
from backend.core.models import (
    Decision,
    IntentEnvelope,
    TransactionProposal,
    DecodedEvmTransaction,
    TrajectoryState,
    DecisionReceipt,
    canonical_hash,
)


def test_intent_envelope_per_asset_limits():
    """Verify CORE-01: IntentEnvelope has per-asset maps and deterministic hashing."""
    intent = IntentEnvelope(
        intent_id="intent_123",
        user_goal="Pay Alice 50 USDC for invoice INV-14",
        chain_id=11155111,
        allowed_assets=["USDC", "ETH"],
        allowed_recipients=["0x000000000000000000000000000000000000aaaa"],
        allowed_contracts=["0x1c7d4b196cb0c7b01d743fbc6116a902379c7238"],
        allowed_methods=["transfer"],
        max_single_value_per_asset={"USDC": 50_000_000, "ETH": 10**18},
        max_session_value_per_asset={"USDC": 100_000_000, "ETH": 2 * 10**18},
        expected_reason="invoice INV-14",
    )

    assert intent.max_single_value_per_asset["USDC"] == 50_000_000
    assert intent.max_session_value_per_asset["USDC"] == 100_000_000
    assert intent.max_single_value_per_asset["ETH"] == 10**18
    
    h1 = intent.compute_hash()
    assert isinstance(h1, str)
    assert len(h1) == 64
    
    # Hash must be deterministic across calls
    assert intent.compute_hash() == h1


def test_transaction_proposal_hash():
    """Verify CORE-02: TransactionProposal hashing and property accessors."""
    tx1 = TransactionProposal(
        chain_id=11155111,
        to="0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
        value=0,
        data="0xa9059cbb000000000000000000000000000000000000000000000000000000000000aaaa0000000000000000000000000000000000000000000000000000000002faf080",
        nonce=5,
        gas_limit=100000,
    )
    
    # Check calldata alias
    assert tx1.calldata == tx1.data
    h1 = tx1.compute_hash()
    assert len(h1) == 64

    # Hex case-insensitivity on to address and calldata
    tx2 = TransactionProposal(
        chain_id=11155111,
        to="0x1c7d4b196cb0c7b01d743fbc6116a902379c7238",
        value=0,
        calldata="a9059cbb000000000000000000000000000000000000000000000000000000000000aaaa0000000000000000000000000000000000000000000000000000000002faf080",
        nonce=5,
        gas_limit=100000,
    )
    assert tx1.compute_hash() == tx2.compute_hash()


def test_decoded_evm_transaction():
    """Verify CORE-03: DecodedEvmTransaction fields and hash."""
    decoded = DecodedEvmTransaction(
        chain_id=11155111,
        asset="USDC",
        method="transfer",
        contract="0x1c7d4b196cb0c7b01d743fbc6116a902379c7238",
        recipient="0x000000000000000000000000000000000000aaaa",
        amount=50_000_000,
        raw_to="0x1c7d4b196cb0c7b01d743fbc6116a902379c7238",
        raw_value=0,
        calldata_hash="1234abcd" * 8,
    )
    assert decoded.asset == "USDC"
    assert decoded.amount == 50_000_000
    h = decoded.compute_hash()
    assert len(h) == 64


def test_trajectory_state_accumulation():
    """Verify CORE-04: TrajectoryState tracks spend per asset across multi-step session."""
    init_state = TrajectoryState(
        session_id="sess_1",
        agent_id="agent_1",
        intent_id="intent_1",
        cumulative_spend_per_asset={"USDC": 0, "ETH": 0},
    )
    assert init_state.cumulative_spend_per_asset["USDC"] == 0
    init_hash = init_state.state_hash

    # Step 1: Send 40 USDC
    state1 = init_state.record_step(
        proposal_hash="hash_tx1",
        asset="USDC",
        amount=40_000_000,
        nonce=0,
    )
    assert state1.cumulative_spend_per_asset["USDC"] == 40_000_000
    assert state1.cumulative_spend_per_asset["ETH"] == 0
    assert state1.step_count == 1
    assert state1.nonce_history == [0]
    assert state1.state_hash != init_hash

    # Step 2: Send 50 USDC
    state2 = state1.record_step(
        proposal_hash="hash_tx2",
        asset="USDC",
        amount=50_000_000,
        nonce=1,
    )
    assert state2.cumulative_spend_per_asset["USDC"] == 90_000_000
    assert state2.step_count == 2
    assert state2.nonce_history == [0, 1]


def test_decision_receipt_block_semantics():
    """Verify CORE-05: BLOCK requires violated_invariants and zero broadcast."""
    # Valid BLOCK receipt
    receipt = DecisionReceipt(
        decision=Decision.BLOCK,
        intent_id="intent_1",
        violated_invariants=["INTENT_INTEGRITY"],
        state_before_hash="state_hash_0",
        proposal_hash="prop_hash_1",
        reason="Recipient mismatch: expected Alice, got Mallory",
    )
    assert receipt.decision == Decision.BLOCK
    assert receipt.broadcast is False
    assert receipt.transaction_hash is None
    assert receipt.hold_reason is None

    # Invalid: BLOCK without violated_invariants must raise
    with pytest.raises(ValueError, match="BLOCK must specify at least one violated invariant"):
        DecisionReceipt(
            decision=Decision.BLOCK,
            intent_id="intent_1",
            violated_invariants=[],
            state_before_hash="state_hash_0",
            proposal_hash="prop_hash_1",
        )

    # Invalid: BLOCK with broadcast=True must raise
    with pytest.raises(ValueError, match="BLOCK must have broadcast=False"):
        DecisionReceipt(
            decision=Decision.BLOCK,
            intent_id="intent_1",
            violated_invariants=["INTENT_INTEGRITY"],
            state_before_hash="state_hash_0",
            proposal_hash="prop_hash_1",
            broadcast=True,
        )


def test_decision_receipt_hold_semantics():
    """Verify CORE-05: HOLD requires hold_reason, no violated_invariants, and zero broadcast."""
    # Valid HOLD receipt
    receipt = DecisionReceipt(
        decision=Decision.HOLD,
        intent_id="intent_1",
        hold_reason="MALFORMED_CALLDATA",
        state_before_hash="state_hash_0",
        proposal_hash="prop_hash_1",
        reason="Calldata hex string contains non-hex characters",
    )
    assert receipt.decision == Decision.HOLD
    assert receipt.violated_invariants == []
    assert receipt.hold_reason == "MALFORMED_CALLDATA"
    assert receipt.broadcast is False
    assert receipt.transaction_hash is None

    # Invalid: HOLD with violated_invariants must raise
    with pytest.raises(ValueError, match="HOLD must not have violated_invariants"):
        DecisionReceipt(
            decision=Decision.HOLD,
            intent_id="intent_1",
            violated_invariants=["INTENT_INTEGRITY"],
            hold_reason="MALFORMED_CALLDATA",
            state_before_hash="state_hash_0",
            proposal_hash="prop_hash_1",
        )

    # Invalid: HOLD without hold_reason must raise
    with pytest.raises(ValueError, match="HOLD must specify a hold_reason"):
        DecisionReceipt(
            decision=Decision.HOLD,
            intent_id="intent_1",
            hold_reason=None,
            state_before_hash="state_hash_0",
            proposal_hash="prop_hash_1",
        )


def test_decision_receipt_allow_semantics():
    """Verify CORE-05: ALLOW permits broadcast and tx_hash after execution."""
    receipt = DecisionReceipt(
        decision=Decision.ALLOW,
        intent_id="intent_1",
        state_before_hash="state_hash_0",
        state_after_hash="state_hash_1",
        proposal_hash="prop_hash_1",
        broadcast=True,
        transaction_hash="0xabcdef1234567890",
        reason="All invariants satisfied",
    )
    assert receipt.decision == Decision.ALLOW
    assert receipt.broadcast is True
    assert receipt.transaction_hash == "0xabcdef1234567890"

    # ALLOW with violated invariants must fail
    with pytest.raises(ValueError, match="ALLOW cannot have violated_invariants"):
        DecisionReceipt(
            decision=Decision.ALLOW,
            intent_id="intent_1",
            violated_invariants=["INTENT_INTEGRITY"],
            state_before_hash="state_hash_0",
            proposal_hash="prop_hash_1",
        )
