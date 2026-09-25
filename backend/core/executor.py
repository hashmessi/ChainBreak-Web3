"""
ChainBreak-Web3 — Pre-Signing Execution Gate (`ChainBreakExecutor`)

Enforces the physical security boundary between autonomous AI proposals
and onchain signing/broadcasting.

Key Guarantees:
1. GATE-01: ChainBreakExecutor is the sole owner of signing & broadcasting dispatch.
2. GATE-02: Signing and broadcasting functions are structurally unreachable on BLOCK or HOLD.
3. GATE-03: Only ALLOW decisions reach sign_and_broadcast, returning verified broadcast receipts.
"""

from __future__ import annotations

from typing import Dict, Optional, Protocol, Tuple, runtime_checkable

from backend.core.models import (
    Decision,
    DecisionReceipt,
    IntentEnvelope,
    TrajectoryState,
    TransactionProposal,
)
from backend.chain.decoder import decode_evm_transaction
from backend.core.invariants import evaluate_invariants


@runtime_checkable
class ExecutionAdapter(Protocol):
    """
    Protocol for onchain or local EVM execution substrates.
    """
    def sign_and_broadcast(self, proposal: TransactionProposal) -> str:
        """
        Signs the transaction with the wallet/signer key and broadcasts to the EVM network.
        Returns the transaction hash string.
        """
        ...


class ChainBreakExecutor:
    """
    Pre-signing security firewall gateway.
    Interposes between AI agent proposals and wallet signing.
    """

    def __init__(
        self,
        adapter: ExecutionAdapter,
        token_symbol_map: Optional[Dict[str, str]] = None,
    ):
        self.adapter = adapter
        self.token_symbol_map = token_symbol_map

    def process(
        self,
        intent: IntentEnvelope,
        trajectory: TrajectoryState,
        proposal: TransactionProposal,
    ) -> Tuple[DecisionReceipt, TrajectoryState]:
        """
        Processes a candidate transaction proposal through the complete firewall pipeline:
        Deterministic Calldata Decode -> Invariant Engine -> Pre-Signing Gate.
        """
        proposal_hash = proposal.compute_hash()
        state_before_hash = trajectory.state_hash

        # ── Step 1: Deterministic EVM Calldata Decoding ───────────────────────
        decode_result = decode_evm_transaction(proposal, token_symbol_map=self.token_symbol_map)

        # ── Step 2: Invariant Evaluation ──────────────────────────────────────
        inv_result = evaluate_invariants(
            intent=intent,
            trajectory=trajectory,
            decoded=decode_result.decoded,
            decode_result=decode_result,
        )

        # ── Step 3: Enforce Execution Boundary (GATE-02) ───────────────────────
        if inv_result.decision == Decision.HOLD:
            # Signer/broadcaster is NOT CALLED
            receipt = DecisionReceipt(
                decision=Decision.HOLD,
                intent_id=intent.intent_id,
                violated_invariants=[],
                hold_reason=inv_result.hold_reason or decode_result.hold_reason or "UNKNOWN_HOLD",
                state_before_hash=state_before_hash,
                state_after_hash=state_before_hash,
                proposal_hash=proposal_hash,
                decoded=decode_result.decoded,
                broadcast=False,
                transaction_hash=None,
                reason=inv_result.reason,
            )
            return receipt, trajectory

        if inv_result.decision == Decision.BLOCK:
            # Signer/broadcaster is NOT CALLED
            receipt = DecisionReceipt(
                decision=Decision.BLOCK,
                intent_id=intent.intent_id,
                violated_invariants=inv_result.violated_invariants,
                hold_reason=None,
                state_before_hash=state_before_hash,
                state_after_hash=state_before_hash,
                proposal_hash=proposal_hash,
                decoded=decode_result.decoded,
                broadcast=False,
                transaction_hash=None,
                reason=inv_result.reason,
            )
            return receipt, trajectory

        # ── Step 4: Gated Execution on ALLOW (GATE-03) ────────────────────────
        # Signer/broadcaster physically reachable ONLY when decision == ALLOW
        tx_hash = self.adapter.sign_and_broadcast(proposal)

        # Update cumulative trajectory state
        decoded_tx = decode_result.decoded
        new_trajectory = trajectory.record_step(
            proposal_hash=proposal_hash,
            asset=decoded_tx.asset if decoded_tx else None,
            amount=decoded_tx.amount if decoded_tx else None,
            nonce=proposal.nonce,
        )

        receipt = DecisionReceipt(
            decision=Decision.ALLOW,
            intent_id=intent.intent_id,
            violated_invariants=[],
            hold_reason=None,
            state_before_hash=state_before_hash,
            state_after_hash=new_trajectory.state_hash,
            proposal_hash=proposal_hash,
            decoded=decoded_tx,
            broadcast=True,
            transaction_hash=tx_hash,
            reason="All invariants satisfied; transaction signed and broadcast.",
        )
        return receipt, new_trajectory
