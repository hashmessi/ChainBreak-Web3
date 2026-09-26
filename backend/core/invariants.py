"""
ChainBreak-Web3 — Deterministic Invariant Engine

Pure-Python deterministic security invariants covering:
- INTENT_INTEGRITY (INV-01): Recipient, asset, amount, contract match IntentEnvelope.
- CAPABILITY_BOUNDARY (INV-02): Chain ID, asset, method, contract within allowed capabilities.
- TRAJECTORY_BUDGET (INV-03): Per-asset cumulative session spend and single-tx limits.
- Fail-Closed Semantics (INV-04): Uncertainty/error -> HOLD; violations -> BLOCK; never ALLOW on uncertainty.
"""

from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

from backend.core.models import (
    Decision,
    DecodedEvmTransaction,
    IntentEnvelope,
    TrajectoryState,
    TransactionProposal,
)
from backend.chain.decoder import DecodeResult


class InvariantId:
    INTENT_INTEGRITY = "INTENT_INTEGRITY"
    CAPABILITY_BOUNDARY = "CAPABILITY_BOUNDARY"
    TRAJECTORY_BUDGET = "TRAJECTORY_BUDGET"
    REPLAY_PROTECTION = "REPLAY_PROTECTION"


class InvariantResult(BaseModel):
    """
    Structured outcome of invariant evaluation.
    """
    model_config = ConfigDict(extra="ignore")

    decision: Decision
    violated_invariants: List[str] = Field(default_factory=list)
    hold_reason: Optional[str] = None
    reason: str = ""


def evaluate_invariants(
    intent: IntentEnvelope,
    trajectory: TrajectoryState,
    decoded: Optional[DecodedEvmTransaction],
    decode_result: Optional[DecodeResult] = None,
    proposal: Optional[TransactionProposal] = None,
) -> InvariantResult:
    """
    Evaluates security invariants against a proposed transaction.
    Pure Python, deterministic, fail-closed.
    """
    try:
        # ── Fail Closed: Decode failure or missing decoded transaction ───────
        if decode_result is not None and not decode_result.parseable:
            return InvariantResult(
                decision=Decision.HOLD,
                hold_reason=decode_result.hold_reason or "DECODE_FAILURE",
                reason=f"Transaction could not be deterministically decoded: {decode_result.hold_reason}",
            )

        if decoded is None:
            return InvariantResult(
                decision=Decision.HOLD,
                hold_reason="MISSING_DECODED_TRANSACTION",
                reason="Decoded transaction payload is missing or empty.",
            )

        violations: List[str] = []
        violation_reasons: List[str] = []

        # Normalization
        tx_asset = decoded.asset.upper()
        tx_recipient = decoded.recipient.lower() if decoded.recipient else None
        tx_contract = decoded.contract.lower() if decoded.contract else ""
        tx_method = decoded.method.lower()
        tx_chain = decoded.chain_id
        tx_amount = decoded.amount if decoded.amount is not None else 0

        allowed_recipients_norm = {r.lower() for r in intent.allowed_recipients}
        allowed_contracts_norm = {c.lower() for c in intent.allowed_contracts}
        allowed_methods_norm = {m.lower() for m in intent.allowed_methods}
        allowed_assets_norm = {a.upper() for a in intent.allowed_assets}

        # ── INV-02: CAPABILITY_BOUNDARY ───────────────────────────────────────
        # 1. Chain ID
        if tx_chain != intent.chain_id:
            violations.append(InvariantId.CAPABILITY_BOUNDARY)
            violation_reasons.append(
                f"Chain ID {tx_chain} outside authorized capability (expected {intent.chain_id})."
            )

        # 2. Method
        if allowed_methods_norm and tx_method not in allowed_methods_norm:
            violations.append(InvariantId.CAPABILITY_BOUNDARY)
            violation_reasons.append(
                f"Method '{decoded.method}' not in authorized methods: {intent.allowed_methods}."
            )

        # 3. Asset capability
        if allowed_assets_norm and tx_asset not in allowed_assets_norm:
            violations.append(InvariantId.CAPABILITY_BOUNDARY)
            violation_reasons.append(
                f"Asset '{decoded.asset}' not in authorized assets: {intent.allowed_assets}."
            )

        # 4. Contract capability (for non-native contract calls)
        if (
            allowed_contracts_norm
            and tx_contract != "native"
            and tx_contract not in allowed_contracts_norm
        ):
            violations.append(InvariantId.CAPABILITY_BOUNDARY)
            violation_reasons.append(
                f"Contract '{decoded.contract}' not in authorized contracts: {intent.allowed_contracts}."
            )

        # ── INV-01: INTENT_INTEGRITY ──────────────────────────────────────────
        # 1. Recipient check
        if tx_recipient is None:
            violations.append(InvariantId.INTENT_INTEGRITY)
            violation_reasons.append("Decoded transaction has no valid recipient address.")
        elif allowed_recipients_norm and tx_recipient not in allowed_recipients_norm:
            violations.append(InvariantId.INTENT_INTEGRITY)
            violations.append(InvariantId.CAPABILITY_BOUNDARY)
            violation_reasons.append(
                f"Recipient '{decoded.recipient}' does not match authorized recipients: {intent.allowed_recipients}."
            )

        # 2. Single-transaction amount limit per asset
        max_single = intent.max_single_value_per_asset.get(tx_asset)
        if max_single is not None:
            if tx_amount > max_single:
                violations.append(InvariantId.INTENT_INTEGRITY)
                violation_reasons.append(
                    f"Amount {tx_amount} for asset {tx_asset} exceeds single transaction limit {max_single}."
                )

        # ── INV-03: TRAJECTORY_BUDGET ─────────────────────────────────────────
        # Cumulative session spend per asset
        max_session = intent.max_session_value_per_asset.get(tx_asset)
        current_cumulative = trajectory.cumulative_spend_per_asset.get(tx_asset, 0)
        projected_spend = current_cumulative + tx_amount

        if max_session is not None:
            if projected_spend > max_session:
                violations.append(InvariantId.TRAJECTORY_BUDGET)
                violation_reasons.append(
                    f"Cumulative spend {projected_spend} for asset {tx_asset} exceeds session budget {max_session} "
                    f"(current spend: {current_cumulative}, proposed: {tx_amount})."
                )

        # ── INV-05: REPLAY_PROTECTION ─────────────────────────────────────────
        if proposal is not None:
            if proposal.nonce is not None and proposal.nonce in trajectory.nonce_history:
                violations.append(InvariantId.REPLAY_PROTECTION)
                violation_reasons.append(
                    f"Nonce {proposal.nonce} already executed in session trajectory (REPLAY / NONCE VIOLATION)."
                )
            elif proposal.compute_hash() in trajectory.proposal_history:
                violations.append(InvariantId.REPLAY_PROTECTION)
                violation_reasons.append(
                    f"Identical proposal hash {proposal.compute_hash()[:12]} already executed in trajectory (REPLAY / NONCE VIOLATION)."
                )

        # ── Resolution: INV-04 Fail-Closed Semantics ──────────────────────────
        if violations:
            # Deduplicate violations while preserving order
            unique_violations = list(dict.fromkeys(violations))
            full_reason = " | ".join(violation_reasons)
            return InvariantResult(
                decision=Decision.BLOCK,
                violated_invariants=unique_violations,
                hold_reason=None,
                reason=full_reason,
            )

        return InvariantResult(
            decision=Decision.ALLOW,
            violated_invariants=[],
            hold_reason=None,
            reason="All security invariants satisfied.",
        )

    except Exception as exc:
        # Evaluator exception safely fails closed to HOLD
        return InvariantResult(
            decision=Decision.HOLD,
            violated_invariants=[],
            hold_reason=f"EVALUATOR_EXCEPTION: {type(exc).__name__}: {str(exc)}",
            reason=f"Invariant evaluation threw unexpected error: {exc}",
        )
