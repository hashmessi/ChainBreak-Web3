"""
ChainBreak-Web3 — Counterfactual Models & Lineage Contracts

Defines typed reports for dual-execution counterfactual runs, honest labeling, and causal lineage.
"""

from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field

from backend.core.models import Decision, DecisionReceipt


class TrajectoryExecutionReport(BaseModel):
    """
    Execution outcome for a single trajectory run (BASELINE or PROTECTED).
    """
    model_config = ConfigDict(extra="ignore")

    run_mode: Literal["BASELINE", "PROTECTED"]
    broadcast_mode: Literal["SIMULATED_LOCAL", "REAL_TESTNET"]
    receipts: List[DecisionReceipt]
    final_decision: Decision
    total_spend_per_asset: Dict[str, int] = Field(default_factory=dict)
    broadcast_count: int = 0
    completed_steps: int = 0
    stopped_at_step: Optional[int] = None


class CausalLineage(BaseModel):
    """
    Detailed causal lineage identifying the precise mechanism of divergence (PROOF-03).
    """
    model_config = ConfigDict(extra="ignore")

    divergence_step: Optional[int] = None
    violated_invariants: List[str] = Field(default_factory=list)
    hold_reason: Optional[str] = None
    trigger_proposal_hash: str = ""
    trigger_parameters: Dict[str, Any] = Field(default_factory=dict)
    state_before_hash: str = ""
    state_after_hash: Optional[str] = None
    reason: str = ""


class Web3CounterfactualResult(BaseModel):
    """
    Side-by-side counterfactual comparative evidence (PROOF-01, PROOF-02, PROOF-03).
    """
    model_config = ConfigDict(extra="ignore")

    scenario_id: str
    scenario_name: str
    broadcast_mode: Literal["SIMULATED_LOCAL", "REAL_TESTNET"]
    baseline: TrajectoryExecutionReport
    protected: TrajectoryExecutionReport
    correctly_blocked: bool
    attack_prevented: bool
    divergence_step: Optional[int] = None
    causal_lineage: Optional[CausalLineage] = None
    proof_statement: str = ""
    latency_ms: float = 0.0
