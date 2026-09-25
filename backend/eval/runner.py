"""
ChainBreak-Web3 — Dual-Execution Counterfactual Proof Engine

Runs identical transaction proposal trajectories through:
1. Unprotected Baseline (unrestricted execution, broadcast occurs)
2. ChainBreak Protected (pre-signing invariant firewall)

Features:
- PROOF-01: Dual side-by-side execution.
- PROOF-02: Honest labeling (SIMULATED_LOCAL vs REAL_TESTNET).
- PROOF-03: Causal lineage recording trigger parameters, state hashes, and invariant.
"""

from __future__ import annotations

import time
from typing import Dict, Literal, Optional

from backend.core.models import (
    Decision,
    DecisionReceipt,
    TrajectoryState,
    TransactionProposal,
)
from backend.core.executor import (
    ChainBreakExecutor,
    ExecutionAdapter,
)
from backend.chain.decoder import decode_evm_transaction
from backend.eval.models import (
    CausalLineage,
    TrajectoryExecutionReport,
    Web3CounterfactualResult,
)
from backend.eval.scenarios import Web3Scenario


def run_baseline_trajectory(
    scenario: Web3Scenario,
    adapter: ExecutionAdapter,
    broadcast_mode: Literal["SIMULATED_LOCAL", "REAL_TESTNET"] = "SIMULATED_LOCAL",
    token_symbol_map: Optional[Dict[str, str]] = None,
) -> TrajectoryExecutionReport:
    """
    Executes scenario in BASELINE mode without pre-signing invariant verification.
    All proposals are dispatched to the execution adapter.
    """
    state = TrajectoryState(
        session_id=f"base_{scenario.id}",
        agent_id="agent_baseline",
        intent_id=scenario.intent.intent_id,
        cumulative_spend_per_asset={},
    )
    receipts: list[DecisionReceipt] = []

    for i, proposal in enumerate(scenario.proposals):
        # In baseline: proposals are broadcast directly
        tx_hash = adapter.sign_and_broadcast(proposal)
        
        # Decode for diagnostic telemetry
        decode_res = decode_evm_transaction(proposal, token_symbol_map)
        decoded_tx = decode_res.decoded

        state_before = state.state_hash
        state = state.record_step(
            proposal_hash=proposal.compute_hash(),
            asset=decoded_tx.asset if decoded_tx else None,
            amount=decoded_tx.amount if decoded_tx else None,
            nonce=proposal.nonce,
        )

        receipt = DecisionReceipt(
            decision=Decision.ALLOW,
            intent_id=scenario.intent.intent_id,
            violated_invariants=[],
            hold_reason=None,
            state_before_hash=state_before,
            state_after_hash=state.state_hash,
            proposal_hash=proposal.compute_hash(),
            decoded=decoded_tx,
            broadcast=True,
            transaction_hash=tx_hash,
            reason=f"Baseline mode: unconstrained execution ({broadcast_mode}).",
        )
        receipts.append(receipt)

    return TrajectoryExecutionReport(
        run_mode="BASELINE",
        broadcast_mode=broadcast_mode,
        receipts=receipts,
        final_decision=Decision.ALLOW,
        total_spend_per_asset=state.cumulative_spend_per_asset,
        broadcast_count=len(receipts),
        completed_steps=len(receipts),
        stopped_at_step=None,
    )


def run_protected_trajectory(
    scenario: Web3Scenario,
    adapter: ExecutionAdapter,
    broadcast_mode: Literal["SIMULATED_LOCAL", "REAL_TESTNET"] = "SIMULATED_LOCAL",
    token_symbol_map: Optional[Dict[str, str]] = None,
) -> TrajectoryExecutionReport:
    """
    Executes scenario in PROTECTED mode through the ChainBreak pre-signing firewall.
    Halts execution before signing at the first BLOCK or HOLD.
    """
    state = TrajectoryState(
        session_id=f"prot_{scenario.id}",
        agent_id="agent_protected",
        intent_id=scenario.intent.intent_id,
        cumulative_spend_per_asset={},
    )
    executor = ChainBreakExecutor(adapter=adapter, token_symbol_map=token_symbol_map)
    receipts: list[DecisionReceipt] = []
    final_decision = Decision.ALLOW
    stopped_at: Optional[int] = None
    broadcast_count = 0

    for i, proposal in enumerate(scenario.proposals):
        receipt, new_state = executor.process(
            intent=scenario.intent,
            trajectory=state,
            proposal=proposal,
        )
        receipts.append(receipt)

        if receipt.broadcast:
            broadcast_count += 1
            state = new_state

        if receipt.decision in (Decision.BLOCK, Decision.HOLD):
            final_decision = receipt.decision
            stopped_at = i
            break

    return TrajectoryExecutionReport(
        run_mode="PROTECTED",
        broadcast_mode=broadcast_mode,
        receipts=receipts,
        final_decision=final_decision,
        total_spend_per_asset=state.cumulative_spend_per_asset,
        broadcast_count=broadcast_count,
        completed_steps=len(receipts),
        stopped_at_step=stopped_at,
    )


def run_counterfactual(
    scenario: Web3Scenario,
    adapter_factory,
    broadcast_mode: Literal["SIMULATED_LOCAL", "REAL_TESTNET"] = "SIMULATED_LOCAL",
    token_symbol_map: Optional[Dict[str, str]] = None,
) -> Web3CounterfactualResult:
    """
    Executes identical proposal sequence through both Baseline and Protected pipelines.
    Computes divergence step, causal lineage, and proof statement.
    """
    t0 = time.time()

    # Fresh adapters for each run to isolate state
    baseline_adapter = adapter_factory()
    protected_adapter = adapter_factory()

    # Execute both pipelines
    protected_report = run_protected_trajectory(
        scenario, protected_adapter, broadcast_mode, token_symbol_map
    )
    baseline_report = run_baseline_trajectory(
        scenario, baseline_adapter, broadcast_mode, token_symbol_map
    )

    latency_ms = (time.time() - t0) * 1000

    # Divergence analysis
    divergence_step = protected_report.stopped_at_step
    is_attack_scenario = scenario.expected_decision in (Decision.BLOCK, Decision.HOLD)
    
    correctly_blocked = (
        is_attack_scenario
        and protected_report.final_decision == scenario.expected_decision
        and baseline_report.final_decision == Decision.ALLOW
    )
    attack_prevented = correctly_blocked

    # Build Causal Lineage (PROOF-03)
    causal_lineage: Optional[CausalLineage] = None
    if divergence_step is not None and divergence_step < len(protected_report.receipts):
        halt_receipt = protected_report.receipts[divergence_step]
        halt_proposal = scenario.proposals[divergence_step]
        
        causal_lineage = CausalLineage(
            divergence_step=divergence_step,
            violated_invariants=halt_receipt.violated_invariants,
            hold_reason=halt_receipt.hold_reason,
            trigger_proposal_hash=halt_receipt.proposal_hash,
            trigger_parameters={
                "to": halt_proposal.to,
                "value": halt_proposal.value,
                "data_preview": halt_proposal.data[:66] if halt_proposal.data else "",
                "nonce": halt_proposal.nonce,
                "chain_id": halt_proposal.chain_id,
            },
            state_before_hash=halt_receipt.state_before_hash,
            state_after_hash=halt_receipt.state_after_hash,
            reason=halt_receipt.reason,
        )

    # Construct Proof Statement (PROOF-02)
    mode_label = "Simulated Local Broadcast" if broadcast_mode == "SIMULATED_LOCAL" else "Live Public Testnet Broadcast"
    if correctly_blocked:
        inv_str = ", ".join(causal_lineage.violated_invariants) if (causal_lineage and causal_lineage.violated_invariants) else (causal_lineage.hold_reason if causal_lineage else "POLICY")
        proof_statement = (
            f"BASELINE EXECUTED: All {baseline_report.completed_steps} transactions broadcast ({mode_label}). "
            f"CHAINBREAK BLOCKED: Execution severed at Step {divergence_step} before signing ({inv_str}). "
            f"Protected broadcast count: {protected_report.broadcast_count} vs Baseline: {baseline_report.broadcast_count}."
        )
    elif protected_report.final_decision == Decision.ALLOW:
        proof_statement = (
            f"BENIGN TRAJECTORY: All {protected_report.completed_steps} steps authorized and broadcast cleanly "
            f"without false blocks ({mode_label})."
        )
    else:
        proof_statement = (
            f"TRAJECTORY HALTED: Step {divergence_step} held under fail-closed security invariants ({mode_label})."
        )

    return Web3CounterfactualResult(
        scenario_id=scenario.id,
        scenario_name=scenario.name,
        broadcast_mode=broadcast_mode,
        baseline=baseline_report,
        protected=protected_report,
        correctly_blocked=correctly_blocked,
        attack_prevented=attack_prevented,
        divergence_step=divergence_step,
        causal_lineage=causal_lineage,
        proof_statement=proof_statement,
        latency_ms=latency_ms,
    )
