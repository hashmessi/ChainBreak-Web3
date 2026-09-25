"""
ChainBreak-Web3 — Core Data Models

Defines typed, deterministically serializable core schemas for:
- IntentEnvelope (User goal, capabilities, per-asset budget maps)
- TransactionProposal (Raw EVM candidate proposal from autonomous agent)
- DecodedEvmTransaction (Deterministically parsed EVM fields)
- TrajectoryState (Multi-step cumulative financial & proposal trajectory)
- DecisionReceipt (Cryptographic authorization receipt with BLOCK/HOLD separation)
"""

from __future__ import annotations

import hashlib
import json
import time
import uuid
from enum import Enum
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator


def canonical_json_bytes(data: Any) -> bytes:
    """
    Serializes a dict or primitive structure to canonical deterministic JSON bytes.
    Keys are sorted, separators are compact (no whitespace), and encoding is utf-8.
    """
    if isinstance(data, BaseModel):
        data = data.model_dump(mode="json")
    return json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def canonical_hash(data: Any) -> str:
    """Computes SHA-256 hash over canonical JSON representation."""
    return hashlib.sha256(canonical_json_bytes(data)).hexdigest()


class Decision(str, Enum):
    """
    Deterministic security decision.
    - ALLOW: Invariants verified, proposal matches authorized intent and session budget.
    - HOLD: Cannot prove safety (malformed calldata, unknown selector, incomplete state). Execution prohibited.
    - BLOCK: Known deterministic policy or invariant violation. Execution prohibited.
    """
    ALLOW = "ALLOW"
    HOLD = "HOLD"
    BLOCK = "BLOCK"


class IntentEnvelope(BaseModel):
    """
    Authorized user intent boundary.
    Budget limits are defined strictly as per-asset maps (CORE-01).
    """
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    intent_id: str = Field(default_factory=lambda: f"intent_{uuid.uuid4().hex[:8]}")
    user_goal: str
    chain_id: int
    allowed_assets: List[str] = Field(default_factory=list)
    allowed_recipients: List[str] = Field(default_factory=list)
    allowed_contracts: List[str] = Field(default_factory=list)
    allowed_methods: List[str] = Field(default_factory=list)
    max_single_value_per_asset: Dict[str, int] = Field(default_factory=dict)
    max_session_value_per_asset: Dict[str, int] = Field(default_factory=dict)
    expected_reason: Optional[str] = None
    created_at: float = Field(default_factory=time.time)

    def compute_hash(self) -> str:
        """Deterministic hash of the intent envelope."""
        payload = {
            "intent_id": self.intent_id,
            "user_goal": self.user_goal,
            "chain_id": self.chain_id,
            "allowed_assets": sorted(self.allowed_assets),
            "allowed_recipients": [r.lower() for r in self.allowed_recipients],
            "allowed_contracts": [c.lower() for c in self.allowed_contracts],
            "allowed_methods": sorted(self.allowed_methods),
            "max_single_value_per_asset": {k.upper(): v for k, v in self.max_single_value_per_asset.items()},
            "max_session_value_per_asset": {k.upper(): v for k, v in self.max_session_value_per_asset.items()},
            "expected_reason": self.expected_reason,
        }
        return canonical_hash(payload)


class TransactionProposal(BaseModel):
    """
    Raw EVM transaction proposed by an autonomous agent (CORE-02).
    """
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    chain_id: int
    to: str
    value: int = 0
    data: str = Field(default="", alias="calldata")
    nonce: Optional[int] = None
    gas_limit: Optional[int] = None

    @property
    def calldata(self) -> str:
        return self.data

    def compute_hash(self) -> str:
        """Deterministic hash of the raw proposal."""
        normalized_data = self.data.lower()
        if normalized_data.startswith("0x"):
            normalized_data = normalized_data[2:]
        payload = {
            "chain_id": self.chain_id,
            "to": self.to.lower(),
            "value": self.value,
            "data": normalized_data,
            "nonce": self.nonce,
            "gas_limit": self.gas_limit,
        }
        return canonical_hash(payload)


class DecodedEvmTransaction(BaseModel):
    """
    Deterministically parsed EVM transaction (CORE-03).
    """
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    chain_id: int
    asset: str
    method: str
    contract: str
    recipient: Optional[str] = None
    amount: Optional[int] = None
    raw_to: str
    raw_value: int
    calldata_hash: str

    def compute_hash(self) -> str:
        payload = {
            "chain_id": self.chain_id,
            "asset": self.asset.upper(),
            "method": self.method,
            "contract": self.contract.lower(),
            "recipient": self.recipient.lower() if self.recipient else None,
            "amount": self.amount,
            "raw_to": self.raw_to.lower(),
            "raw_value": self.raw_value,
            "calldata_hash": self.calldata_hash,
        }
        return canonical_hash(payload)


class TrajectoryState(BaseModel):
    """
    Tracks cumulative financial and proposal state across a session (CORE-04).
    Cumulative spend is tracked per distinct asset.
    """
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    session_id: str
    agent_id: str
    intent_id: str
    cumulative_spend_per_asset: Dict[str, int] = Field(default_factory=dict)
    allowed_boundaries: Dict[str, Any] = Field(default_factory=dict)
    nonce_history: List[int] = Field(default_factory=list)
    proposal_history: List[str] = Field(default_factory=list)
    step_count: int = 0
    state_hash: str = ""

    def __init__(self, **data: Any):
        super().__init__(**data)
        if not self.state_hash:
            self.state_hash = self.compute_hash()

    def compute_hash(self) -> str:
        """Deterministic hash of current trajectory state."""
        payload = {
            "session_id": self.session_id,
            "agent_id": self.agent_id,
            "intent_id": self.intent_id,
            "cumulative_spend_per_asset": {
                k.upper(): v for k, v in sorted(self.cumulative_spend_per_asset.items())
            },
            "nonce_history": self.nonce_history,
            "proposal_history": self.proposal_history,
            "step_count": self.step_count,
        }
        return canonical_hash(payload)

    def record_step(
        self,
        proposal_hash: str,
        asset: Optional[str] = None,
        amount: Optional[int] = None,
        nonce: Optional[int] = None,
    ) -> "TrajectoryState":
        """
        Returns a new TrajectoryState with updated cumulative spend, nonce history, and proposal history.
        """
        new_spend = dict(self.cumulative_spend_per_asset)
        if asset and amount and amount > 0:
            norm_asset = asset.upper()
            new_spend[norm_asset] = new_spend.get(norm_asset, 0) + amount

        new_nonces = list(self.nonce_history)
        if nonce is not None:
            new_nonces.append(nonce)

        new_proposals = list(self.proposal_history)
        new_proposals.append(proposal_hash)

        new_state = TrajectoryState(
            session_id=self.session_id,
            agent_id=self.agent_id,
            intent_id=self.intent_id,
            cumulative_spend_per_asset=new_spend,
            allowed_boundaries=self.allowed_boundaries,
            nonce_history=new_nonces,
            proposal_history=new_proposals,
            step_count=self.step_count + 1,
        )
        new_state.state_hash = new_state.compute_hash()
        return new_state


class DecisionReceipt(BaseModel):
    """
    Immutable cryptographic authorization receipt emitted by ChainBreak (CORE-05).
    Strictly separates BLOCK (known invariant violation) from HOLD (uncertainty / parse failure).
    """
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    decision: Decision
    intent_id: str
    violated_invariants: List[str] = Field(default_factory=list)
    hold_reason: Optional[str] = None
    state_before_hash: str
    state_after_hash: Optional[str] = None
    proposal_hash: str
    decoded: Optional[DecodedEvmTransaction] = None
    broadcast: bool = False
    transaction_hash: Optional[str] = None
    reason: str = ""
    timestamp: float = Field(default_factory=time.time)

    @model_validator(mode="after")
    def validate_semantics(self) -> "DecisionReceipt":
        """
        Enforce non-negotiable decision semantics:
        1. BLOCK requires violated_invariants to be non-empty and hold_reason to be None.
        2. HOLD requires violated_invariants to be empty and hold_reason to be set.
        3. Neither BLOCK nor HOLD can have broadcast=True or transaction_hash set.
        4. ALLOW requires violated_invariants to be empty and hold_reason to be None.
        """
        if self.decision == Decision.BLOCK:
            if not self.violated_invariants:
                raise ValueError("Decision BLOCK must specify at least one violated invariant.")
            if self.hold_reason is not None:
                raise ValueError("Decision BLOCK must not set hold_reason; use violated_invariants.")
            if self.broadcast:
                raise ValueError("Decision BLOCK must have broadcast=False.")
            if self.transaction_hash is not None:
                raise ValueError("Decision BLOCK must have transaction_hash=None.")

        elif self.decision == Decision.HOLD:
            if self.violated_invariants:
                raise ValueError("Decision HOLD must not have violated_invariants; use hold_reason.")
            if not self.hold_reason:
                raise ValueError("Decision HOLD must specify a hold_reason.")
            if self.broadcast:
                raise ValueError("Decision HOLD must have broadcast=False.")
            if self.transaction_hash is not None:
                raise ValueError("Decision HOLD must have transaction_hash=None.")

        elif self.decision == Decision.ALLOW:
            if self.violated_invariants:
                raise ValueError("Decision ALLOW cannot have violated_invariants.")
            if self.hold_reason is not None:
                raise ValueError("Decision ALLOW cannot have hold_reason.")

        return self

    def compute_hash(self) -> str:
        payload = {
            "decision": self.decision.value,
            "intent_id": self.intent_id,
            "violated_invariants": sorted(self.violated_invariants),
            "hold_reason": self.hold_reason,
            "state_before_hash": self.state_before_hash,
            "state_after_hash": self.state_after_hash,
            "proposal_hash": self.proposal_hash,
            "decoded_hash": self.decoded.compute_hash() if self.decoded else None,
            "broadcast": self.broadcast,
            "transaction_hash": self.transaction_hash,
            "reason": self.reason,
        }
        return canonical_hash(payload)
