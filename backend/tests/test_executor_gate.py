"""
Unit Tests for Phase 4: Pre-Signing Execution Gate (GATE-01 to GATE-03)
"""

import pytest
from typing import List
from backend.core.models import (
    Decision,
    IntentEnvelope,
    TrajectoryState,
    TransactionProposal,
)
from backend.core.executor import (
    ChainBreakExecutor,
    ExecutionAdapter,
)
from backend.chain.decoder import encode_erc20_transfer
from backend.chain.fixtures import (
    CHAIN_ID_SEPOLIA,
    SEPOLIA_USDC_CONTRACT,
    ALICE_ADDRESS,
    BOB_ADDRESS,
    MALLORY_ADDRESS,
)


class MockExecutionAdapter:
    """Mock adapter that tracks physical call dispatch."""
    def __init__(self):
        self.call_count: int = 0
        self.dispatched_proposals: List[TransactionProposal] = []

    def sign_and_broadcast(self, proposal: TransactionProposal) -> str:
        self.call_count += 1
        self.dispatched_proposals.append(proposal)
        return f"0xmock_tx_hash_{self.call_count}_{proposal.nonce or 0}"


@pytest.fixture
def mock_adapter():
    return MockExecutionAdapter()


@pytest.fixture
def sample_intent():
    return IntentEnvelope(
        intent_id="intent_gate_test",
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
def initial_trajectory():
    return TrajectoryState(
        session_id="session_gate_1",
        agent_id="agent_1",
        intent_id="intent_gate_test",
        cumulative_spend_per_asset={"USDC": 0, "ETH": 0},
    )


def test_gate01_and_gate03_safe_proposal_broadcasts(mock_adapter, sample_intent, initial_trajectory):
    """Verify GATE-01 & GATE-03: ALLOW decision invokes signer/broadcaster and records broadcast=True."""
    executor = ChainBreakExecutor(adapter=mock_adapter)

    # Authorized 50 USDC transfer to Alice
    calldata = encode_erc20_transfer(ALICE_ADDRESS, 50_000_000)
    proposal = TransactionProposal(
        chain_id=CHAIN_ID_SEPOLIA,
        to=SEPOLIA_USDC_CONTRACT,
        value=0,
        data=calldata,
        nonce=1,
    )

    receipt, new_trajectory = executor.process(sample_intent, initial_trajectory, proposal)

    # Signer called exactly once
    assert mock_adapter.call_count == 1
    assert len(mock_adapter.dispatched_proposals) == 1

    # Receipt validation
    assert receipt.decision == Decision.ALLOW
    assert receipt.broadcast is True
    assert receipt.transaction_hash is not None
    assert receipt.transaction_hash.startswith("0xmock_tx_hash_")
    assert receipt.hold_reason is None
    assert receipt.violated_invariants == []

    # State accumulation
    assert new_trajectory.cumulative_spend_per_asset["USDC"] == 50_000_000
    assert new_trajectory.step_count == 1


def test_gate02_blocked_proposal_signer_unreachable(mock_adapter, sample_intent, initial_trajectory):
    """Verify GATE-02: BLOCK decision leaves signer/broadcaster structurally uncalled."""
    executor = ChainBreakExecutor(adapter=mock_adapter)

    # Attack: Recipient mutated to Mallory
    calldata = encode_erc20_transfer(MALLORY_ADDRESS, 50_000_000)
    proposal = TransactionProposal(
        chain_id=CHAIN_ID_SEPOLIA,
        to=SEPOLIA_USDC_CONTRACT,
        value=0,
        data=calldata,
        nonce=2,
    )

    receipt, trajectory = executor.process(sample_intent, initial_trajectory, proposal)

    # PHYSICAL GATE GUARANTEE: Signer was never invoked
    assert mock_adapter.call_count == 0
    assert len(mock_adapter.dispatched_proposals) == 0

    # Receipt verification
    assert receipt.decision == Decision.BLOCK
    assert receipt.broadcast is False
    assert receipt.transaction_hash is None
    assert "INTENT_INTEGRITY" in receipt.violated_invariants

    # Trajectory state unchanged
    assert trajectory.cumulative_spend_per_asset["USDC"] == 0
    assert trajectory.step_count == 0


def test_gate02_hold_proposal_signer_unreachable(mock_adapter, sample_intent, initial_trajectory):
    """Verify GATE-02: HOLD decision leaves signer/broadcaster structurally uncalled."""
    executor = ChainBreakExecutor(adapter=mock_adapter)

    # Malformed calldata
    proposal = TransactionProposal(
        chain_id=CHAIN_ID_SEPOLIA,
        to=SEPOLIA_USDC_CONTRACT,
        value=0,
        data="0xa9059cbb1",  # Malformed odd length
        nonce=3,
    )

    receipt, trajectory = executor.process(sample_intent, initial_trajectory, proposal)

    # PHYSICAL GATE GUARANTEE: Signer was never invoked
    assert mock_adapter.call_count == 0
    assert len(mock_adapter.dispatched_proposals) == 0

    # Receipt verification
    assert receipt.decision == Decision.HOLD
    assert receipt.broadcast is False
    assert receipt.transaction_hash is None
    assert receipt.hold_reason == "MALFORMED_HEX_ODD_LENGTH"
    assert receipt.violated_invariants == []

    # Trajectory state unchanged
    assert trajectory.cumulative_spend_per_asset["USDC"] == 0


def test_trajectory_attack_gating_sequence(mock_adapter, sample_intent, initial_trajectory):
    """Verify GATE-02 & GATE-03 across multi-step trajectory attack: 40 + 50 + 30 > 100."""
    executor = ChainBreakExecutor(adapter=mock_adapter)

    # Step 1: 40 USDC to Alice -> ALLOW
    p1 = TransactionProposal(
        chain_id=CHAIN_ID_SEPOLIA,
        to=SEPOLIA_USDC_CONTRACT,
        value=0,
        data=encode_erc20_transfer(ALICE_ADDRESS, 40_000_000),
        nonce=0,
    )
    r1, t1 = executor.process(sample_intent, initial_trajectory, p1)
    assert r1.decision == Decision.ALLOW
    assert r1.broadcast is True
    assert mock_adapter.call_count == 1
    assert t1.cumulative_spend_per_asset["USDC"] == 40_000_000

    # Step 2: 50 USDC to Alice -> ALLOW
    p2 = TransactionProposal(
        chain_id=CHAIN_ID_SEPOLIA,
        to=SEPOLIA_USDC_CONTRACT,
        value=0,
        data=encode_erc20_transfer(ALICE_ADDRESS, 50_000_000),
        nonce=1,
    )
    r2, t2 = executor.process(sample_intent, t1, p2)
    assert r2.decision == Decision.ALLOW
    assert r2.broadcast is True
    assert mock_adapter.call_count == 2
    assert t2.cumulative_spend_per_asset["USDC"] == 90_000_000

    # Step 3: 30 USDC to Alice -> BLOCK (cumulative 90 + 30 = 120 > 100)
    p3 = TransactionProposal(
        chain_id=CHAIN_ID_SEPOLIA,
        to=SEPOLIA_USDC_CONTRACT,
        value=0,
        data=encode_erc20_transfer(ALICE_ADDRESS, 30_000_000),
        nonce=2,
    )
    r3, t3 = executor.process(sample_intent, t2, p3)
    assert r3.decision == Decision.BLOCK
    assert r3.broadcast is False
    assert r3.transaction_hash is None
    assert "TRAJECTORY_BUDGET" in r3.violated_invariants
    # Call count MUST remain 2 — third transaction was blocked before signing!
    assert mock_adapter.call_count == 2
    # Cumulative spend remains at 90 USDC
    assert t3.cumulative_spend_per_asset["USDC"] == 90_000_000
