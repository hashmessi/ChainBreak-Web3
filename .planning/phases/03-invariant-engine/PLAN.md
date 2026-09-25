# Phase 3 Plan: Invariant Engine

## Goal
Implement pure-Python deterministic security invariants covering intent binding, capability boundaries, and multi-step trajectory budgets, with strict fail-closed evaluation semantics.

## Requirements Covered
- `INV-01`: `INTENT_INTEGRITY` invariant checking decoded recipient, asset, amount, and contract against authorized `IntentEnvelope`.
- `INV-02`: `CAPABILITY_BOUNDARY` invariant checking agent action permissions against allowed chain IDs, assets, recipients, contracts, and methods.
- `INV-03`: `TRAJECTORY_BUDGET` invariant checking cumulative session spend per asset (`trajectory.cumulative_spend_per_asset[asset]`) against `intent.max_session_value_per_asset[asset]` and `intent.max_single_value_per_asset[asset]`.
- `INV-04`: Strict fail-closed evaluation semantics:
  (a) Known invariant violation -> `BLOCK` with non-empty `violated_invariants`;
  (b) Parse failure, decoder exception, incomplete state -> `HOLD` with specific `hold_reason`;
  (c) Never convert uncertainty or error into `ALLOW`.

## Architecture & Design Decisions
1. **Module Location**: `backend/core/invariants.py`.
2. **Invariant Evaluator Contract**:
   ```python
   class InvariantResult(BaseModel):
       decision: Decision  # ALLOW, HOLD, BLOCK
       violated_invariants: list[str] = []
       hold_reason: str | None = None
       reason: str = ""

   def evaluate_invariants(
       intent: IntentEnvelope,
       trajectory: TrajectoryState,
       decoded: DecodedEvmTransaction | None,
       decode_result: DecodeResult | None = None,
   ) -> InvariantResult:
       ...
   ```
3. **Specific Invariant IDs**:
   - `INTENT_INTEGRITY`: Fires on recipient mutation (e.g. Alice -> Mallory), unexpected contract, or single-tx amount exceeding intent limit.
   - `CAPABILITY_BOUNDARY`: Fires on disallowed chain ID, disallowed method selector, or unpermitted asset.
   - `TRAJECTORY_BUDGET`: Fires when `cumulative_spend[asset] + tx.amount > max_session_value[asset]`.
4. **Deterministic Normalization**:
   - Address comparisons case-insensitive (`addr.lower()`).
   - Asset symbols normalized to uppercase (`asset.upper()`).
   - Big-endian uint256 integers compared directly (no floating point imprecision).

## Implementation Steps
1. Create `backend/core/invariants.py` with `evaluate_invariants` and individual invariant checking routines.
2. Export `evaluate_invariants` and invariant constants in `backend/core/__init__.py`.
3. Create comprehensive test suite in `backend/tests/test_web3_invariants.py`:
   - Valid safe ETH and ERC-20 transfers -> `ALLOW`.
   - Recipient mutation (Alice -> Mallory) -> `BLOCK` with `INTENT_INTEGRITY`.
   - Single amount exceeding limit -> `BLOCK` with `INTENT_INTEGRITY`.
   - Disallowed chain ID -> `BLOCK` with `CAPABILITY_BOUNDARY`.
   - Disallowed method -> `BLOCK` with `CAPABILITY_BOUNDARY`.
   - Cumulative budget breach (40 + 50 + 30 > 100) -> 1st ALLOW, 2nd ALLOW, 3rd `BLOCK` with `TRAJECTORY_BUDGET`.
   - Unrecognized asset -> `BLOCK` with `CAPABILITY_BOUNDARY`.
   - Failed decode / missing fields -> `HOLD` with `hold_reason`.

## Verification
- Run `pytest backend/tests/test_web3_invariants.py`
- Verify 100% test pass rate across all security boundaries.
