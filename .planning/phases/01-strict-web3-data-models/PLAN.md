# Phase 1 Plan: Strict Web3 Data Models

## Goal
Implement typed, deterministically serializable core schemas for intent envelopes, transaction proposals, decoded EVM transactions, trajectory states, and decision receipts with strict Pydantic v2 validation and cryptographic hashing.

## Requirements Covered
- `CORE-01`: `IntentEnvelope` with per-asset value maps (`max_single_value_per_asset: dict[str, int]`, `max_session_value_per_asset: dict[str, int]`), allowed assets/recipients/contracts/methods, user goal, chain ID, and deterministic envelope hash.
- `CORE-02`: `TransactionProposal` with `chain_id`, `to`, `value`, `data` (hex calldata), `nonce`, `gas_limit`, and deterministic `proposal_hash`.
- `CORE-03`: `DecodedEvmTransaction` with `chain_id`, `asset`, `method`, `contract`, `recipient`, `amount`, `raw_to`, `raw_value`, and `calldata_hash`.
- `CORE-04`: `TrajectoryState` with `session_id`, `agent_id`, `cumulative_spend_per_asset: dict[str, int]`, `allowed_boundaries`, `nonce_history`, `proposal_history`, and deterministic `state_hash`.
- `CORE-05`: `DecisionReceipt` with `decision: Literal["ALLOW", "HOLD", "BLOCK"]`, `violated_invariants: list[str]`, `hold_reason: str | None`, `state_before_hash`, `proposal_hash`, `decoded`, `broadcast: bool`, `transaction_hash: str | None`, and `reason`.

## Architecture & Design Decisions
1. **Module Location**: `backend/core/models.py`.
2. **Pydantic v2 Compatibility**: Use `BaseModel` with standard config, field aliases for flexibility (e.g. `data` / `calldata`), and custom hash helpers that produce canonical JSON byte strings before SHA-256 hashing to ensure cross-platform invariance.
3. **Deterministic Separation of BLOCK vs HOLD**:
   - `BLOCK` requires non-empty `violated_invariants` and `hold_reason == None`.
   - `HOLD` requires empty `violated_invariants` and non-empty `hold_reason` (e.g. `"MALFORMED_CALLDATA"`, `"UNKNOWN_SELECTOR"`).
   - `ALLOW` requires empty `violated_invariants` and `hold_reason == None`.
4. **Per-Asset Budget Tracking**:
   - Asset keys normalized to uppercase (e.g. `"USDC"`, `"ETH"`, or checksummed contract addresses).
   - Amounts represented as base unit integers (wei, micro-USDC) to eliminate float rounding errors.

## Implementation Steps
1. Create `backend/core/__init__.py` and `backend/core/models.py`.
2. Implement helper utilities for canonical JSON serialization and SHA-256 hashing.
3. Implement `Decision`, `IntentEnvelope`, `TransactionProposal`, `DecodedEvmTransaction`, `TrajectoryState`, and `DecisionReceipt`.
4. Add model methods:
   - `IntentEnvelope.compute_hash()`
   - `TransactionProposal.compute_hash()`
   - `TrajectoryState.compute_hash()`
   - `TrajectoryState.record_execution(asset: str, amount: int, nonce: int | None, proposal_hash: str)`
5. Create comprehensive test suite in `backend/tests/test_core_models.py` testing serialization, schema validation, per-asset maps, hash stability, and receipt invariants.

## Verification
- Run `pytest backend/tests/test_core_models.py`
- Verify 100% test passing across all edge cases (missing fields, negative amounts, type errors, deterministic serialization).
