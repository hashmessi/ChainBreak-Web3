"""
Unit Tests for Phase 7: Execution Substrates (CHAIN-01 & CHAIN-02)
"""

import pytest
from backend.core.models import Decision, TransactionProposal
from backend.core.executor import ChainBreakExecutor
from backend.chain.local_evm import LocalEVMAdapter
from backend.chain.testnet import TestnetEVMAdapter, get_explorer_url
from backend.chain.fixtures import (
    ALICE_ADDRESS,
    CHAIN_ID_SEPOLIA,
    MALLORY_ADDRESS,
    OPERATOR_AGENT_ADDRESS,
    SEPOLIA_USDC_CONTRACT,
)
from backend.chain.decoder import encode_erc20_transfer
from backend.eval.scenarios import build_w2_safe_erc20, build_w3_recipient_mutation


def test_chain01_local_evm_balance_transfer():
    """Verify CHAIN-01: LocalEVMAdapter simulates state balance transfers deterministically."""
    adapter = LocalEVMAdapter()
    initial_operator_usdc = adapter.get_balance(OPERATOR_AGENT_ADDRESS, "USDC")
    assert initial_operator_usdc == 10_000 * 10**6
    assert adapter.get_balance(ALICE_ADDRESS, "USDC") == 0

    # Execute safe 50 USDC transfer to Alice
    calldata = encode_erc20_transfer(ALICE_ADDRESS, 50_000_000)
    proposal = TransactionProposal(
        chain_id=CHAIN_ID_SEPOLIA,
        to=SEPOLIA_USDC_CONTRACT,
        value=0,
        data=calldata,
        nonce=0,
    )

    tx_hash = adapter.sign_and_broadcast(proposal)
    assert tx_hash.startswith("0x")
    assert len(tx_hash) == 66

    # Verify balance mutation
    assert adapter.get_balance(ALICE_ADDRESS, "USDC") == 50_000_000
    assert adapter.get_balance(OPERATOR_AGENT_ADDRESS, "USDC") == initial_operator_usdc - 50_000_000
    assert len(adapter.transaction_history) == 1


def test_chain01_local_evm_with_executor_gating():
    """Verify CHAIN-01: Local EVM balances do NOT change when attack is blocked."""
    adapter = LocalEVMAdapter()
    executor = ChainBreakExecutor(adapter=adapter)

    w3 = build_w3_recipient_mutation()  # Mallory attack
    init_traj = w3.intent.model_copy()

    from backend.core.models import TrajectoryState
    state = TrajectoryState(session_id="s1", agent_id="a1", intent_id=w3.intent.intent_id)

    receipt, _ = executor.process(w3.intent, state, w3.proposals[0])
    assert receipt.decision == Decision.BLOCK
    assert receipt.broadcast is False

    # Mallory received ZERO tokens
    assert adapter.get_balance(MALLORY_ADDRESS, "USDC") == 0
    assert len(adapter.transaction_history) == 0


def test_chain02_testnet_adapter_explorer_urls():
    """Verify CHAIN-02: TestnetEVMAdapter generates valid block explorer links."""
    adapter = TestnetEVMAdapter()
    proposal = TransactionProposal(
        chain_id=CHAIN_ID_SEPOLIA,
        to=SEPOLIA_USDC_CONTRACT,
        value=0,
        data=encode_erc20_transfer(ALICE_ADDRESS, 50_000_000),
        nonce=1,
    )
    tx_hash = adapter.sign_and_broadcast(proposal)
    assert tx_hash.startswith("0x")
    url = get_explorer_url(tx_hash, CHAIN_ID_SEPOLIA)
    assert url.startswith("https://sepolia.etherscan.io/tx/0x")


def test_chain02_testnet_adapter_zero_broadcast_on_block():
    """Verify CHAIN-02: Blocked transaction never touches testnet broadcast."""
    adapter = TestnetEVMAdapter()
    executor = ChainBreakExecutor(adapter=adapter)

    w3 = build_w3_recipient_mutation()
    from backend.core.models import TrajectoryState
    state = TrajectoryState(session_id="s_testnet", agent_id="a1", intent_id=w3.intent.intent_id)

    receipt, _ = executor.process(w3.intent, state, w3.proposals[0])
    assert receipt.decision == Decision.BLOCK
    assert receipt.broadcast is False
    assert len(adapter.broadcast_log) == 0  # 0 onchain calls!
