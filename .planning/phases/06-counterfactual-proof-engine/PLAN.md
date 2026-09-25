# Phase 6 Plan: Counterfactual Proof Engine

## Goal
Implement a dual-execution counterfactual proof engine running identical transaction proposals through unprotected Baseline vs ChainBreak-protected pipelines, with honest execution labeling and granular causal lineage.

## Requirements Covered
- `PROOF-01`: Dual-execution counterfactual runner running identical attack proposals through unprotected Baseline vs protected ChainBreak.
- `PROOF-02`: Side-by-side comparative evidence with honest labeling:
  - Local mode clearly labeled as `"SIMULATED_LOCAL"` (simulated broadcast without real chain).
  - Testnet mode clearly labeled as `"REAL_TESTNET"` (live testnet broadcast).
  - ChainBreak protected path produces `broadcast=False` and `transaction_hash=None` on attacks in both modes.
- `PROOF-03`: Causal lineage recording: exact violated invariant (on BLOCK) or hold reason (on HOLD), trigger parameters, divergence step index, and pre/post trajectory state hashes.

## Architecture & Design Decisions
1. **Module Location**: `backend/eval/runner.py` and `backend/eval/models.py`.
2. **Execution Contracts**:
   ```python
   class TrajectoryExecutionReport(BaseModel):
       run_mode: Literal["BASELINE", "PROTECTED"]
       broadcast_mode: Literal["SIMULATED_LOCAL", "REAL_TESTNET"]
       receipts: list[DecisionReceipt]
       final_decision: Decision
       total_spend_per_asset: dict[str, int]
       broadcast_count: int
       completed_steps: int
       stopped_at_step: int | None = None

   class CausalLineage(BaseModel):
       divergence_step: int | None
       violated_invariants: list[str] = []
       hold_reason: str | None = None
       trigger_proposal_hash: str
       trigger_parameters: dict[str, Any]
       state_before_hash: str
       state_after_hash: str | None

   class Web3CounterfactualResult(BaseModel):
       scenario_id: str
       scenario_name: str
       broadcast_mode: Literal["SIMULATED_LOCAL", "REAL_TESTNET"]
       baseline: TrajectoryExecutionReport
       protected: TrajectoryExecutionReport
       correctly_blocked: bool
       attack_prevented: bool
       divergence_step: int | None
       causal_lineage: CausalLineage | None
       proof_statement: str
       latency_ms: float
   ```
3. **Execution Semantics**:
   - Baseline pipeline: executes all proposals blindly without invariant gating. If adapter is local, simulates broadcast; if testnet, signs and broadcasts.
   - Protected pipeline: runs proposals through `ChainBreakExecutor`. Halts at the first BLOCK or HOLD.
   - Comparison: Evaluates divergence step (e.g. step 0 for immediate parameter mutation, step 2 for trajectory budget breach).

## Implementation Steps
1. Create `backend/eval/models.py` for counterfactual data structures.
2. Implement `run_counterfactual(scenario: Web3Scenario, adapter: ExecutionAdapter, broadcast_mode: str = "SIMULATED_LOCAL") -> Web3CounterfactualResult` in `backend/eval/runner.py`.
3. Create comprehensive test suite in `backend/tests/test_counterfactual_proof.py`.

## Verification
- Run `pytest backend/tests/test_counterfactual_proof.py`
- Verify honest labeling, causal lineage accuracy, divergence step detection, and 100% prevention on attacks.
