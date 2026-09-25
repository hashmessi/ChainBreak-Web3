"""
ChainBreak-Web3 Core Module
Typed schemas, models, invariants, trajectory tracking, and pre-signing execution gate.
"""

from .models import (
    Decision,
    IntentEnvelope,
    TransactionProposal,
    DecodedEvmTransaction,
    TrajectoryState,
    DecisionReceipt,
    canonical_hash,
)
from .invariants import (
    InvariantId,
    InvariantResult,
    evaluate_invariants,
)
from .executor import (
    ExecutionAdapter,
    ChainBreakExecutor,
)

__all__ = [
    "Decision",
    "IntentEnvelope",
    "TransactionProposal",
    "DecodedEvmTransaction",
    "TrajectoryState",
    "DecisionReceipt",
    "canonical_hash",
    "InvariantId",
    "InvariantResult",
    "evaluate_invariants",
    "ExecutionAdapter",
    "ChainBreakExecutor",
]
