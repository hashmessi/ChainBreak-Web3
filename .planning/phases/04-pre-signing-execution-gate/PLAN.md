# Phase 4 Plan: Pre-Signing Execution Gate (`ChainBreakExecutor`)

## Goal
Implement a single-owner execution boundary (`ChainBreakExecutor`) that coordinates deterministic decoding, invariant evaluation, and physical execution gating so that signing and broadcasting are structurally unreachable on `BLOCK` or `HOLD`.

## Requirements Covered
- `GATE-01`: `ChainBreakExecutor` acts as the sole owner of transaction signing and broadcast invocation.
- `GATE-02`: Physical execution gating: when decision is `BLOCK` or `HOLD`, signer and broadcaster methods are structurally unreachable. `DecisionReceipt.broadcast` is `False` and `DecisionReceipt.transaction_hash` is `None`. The gate treats BLOCK and HOLD identically regarding signing prevention.
- `GATE-03`: Execution path proceeds to signer/broadcaster ONLY when decision is `ALLOW`, returning verified `broadcast=True` and valid transaction hash.

## Architecture & Design Decisions
1. **Module Location**: `backend/core/executor.py`.
2. **ExecutionAdapter Interface**:
   ```python
   class ExecutionAdapter(Protocol):
       def sign_and_broadcast(self, proposal: TransactionProposal) -> str:
           """Signs and broadcasts transaction, returning transaction hash."""
           ...
   ```
3. **ChainBreakExecutor Flow**:
   ```python
   class ChainBreakExecutor:
       def __init__(self, adapter: ExecutionAdapter, token_symbol_map: dict[str, str] | None = None):
           self.adapter = adapter
           self.token_symbol_map = token_symbol_map

       def process(
           self,
           intent: IntentEnvelope,
           trajectory: TrajectoryState,
           proposal: TransactionProposal,
       ) -> tuple[DecisionReceipt, TrajectoryState]:
           # 1. Decode proposal
           decode_result = decode_evm_transaction(proposal, self.token_symbol_map)
           
           # 2. If decoding fails closed -> HOLD
           if not decode_result.parseable or decode_result.decoded is None:
               receipt = DecisionReceipt(
                   decision=Decision.HOLD,
                   intent_id=intent.intent_id,
                   violated_invariants=[],
                   hold_reason=decode_result.hold_reason or "DECODE_FAILED",
                   state_before_hash=trajectory.state_hash,
                   state_after_hash=trajectory.state_hash,
                   proposal_hash=proposal.compute_hash(),
                   decoded=None,
                   broadcast=False,
                   transaction_hash=None,
                   reason=f"Hold due to decode failure: {decode_result.hold_reason}",
               )
               return receipt, trajectory

           # 3. Evaluate invariants
           inv_result = evaluate_invariants(intent, trajectory, decode_result.decoded)
           
           if inv_result.decision == Decision.HOLD:
               receipt = DecisionReceipt(
                   decision=Decision.HOLD,
                   intent_id=intent.intent_id,
                   violated_invariants=[],
                   hold_reason=inv_result.hold_reason or "EVALUATION_HOLD",
                   state_before_hash=trajectory.state_hash,
                   state_after_hash=trajectory.state_hash,
                   proposal_hash=proposal.compute_hash(),
                   decoded=decode_result.decoded,
                   broadcast=False,
                   transaction_hash=None,
                   reason=inv_result.reason,
               )
               return receipt, trajectory

           if inv_result.decision == Decision.BLOCK:
               receipt = DecisionReceipt(
                   decision=Decision.BLOCK,
                   intent_id=intent.intent_id,
                   violated_invariants=inv_result.violated_invariants,
                   hold_reason=None,
                   state_before_hash=trajectory.state_hash,
                   state_after_hash=trajectory.state_hash,
                   proposal_hash=proposal.compute_hash(),
                   decoded=decode_result.decoded,
                   broadcast=False,
                   transaction_hash=None,
                   reason=inv_result.reason,
               )
               return receipt, trajectory

           # 4. Decision is ALLOW -> Invoke adapter.sign_and_broadcast
           tx_hash = self.adapter.sign_and_broadcast(proposal)
           
           # 5. Record trajectory step
           new_trajectory = trajectory.record_step(
               proposal_hash=proposal.compute_hash(),
               asset=decode_result.decoded.asset,
               amount=decode_result.decoded.amount,
               nonce=proposal.nonce,
           )

           # 6. Build ALLOW receipt
           receipt = DecisionReceipt(
               decision=Decision.ALLOW,
               intent_id=intent.intent_id,
               violated_invariants=[],
               hold_reason=None,
               state_before_hash=trajectory.state_hash,
               state_after_hash=new_trajectory.state_hash,
               proposal_hash=proposal.compute_hash(),
               decoded=decode_result.decoded,
               broadcast=True,
               transaction_hash=tx_hash,
               reason="All invariants satisfied; transaction signed and broadcast.",
           )
           return receipt, new_trajectory
   ```
4. **Physical Execution Guarantee**:
   The adapter's `sign_and_broadcast` method is only called if `inv_result.decision == Decision.ALLOW`.
   Mock adapters verify that call count is strictly 0 on BLOCK or HOLD.

## Implementation Steps
1. Create `backend/core/executor.py` implementing `ExecutionAdapter` protocol and `ChainBreakExecutor`.
2. Export `ChainBreakExecutor` and `ExecutionAdapter` in `backend/core/__init__.py`.
3. Create comprehensive test suite in `backend/tests/test_executor_gate.py`:
   - Verify `sign_and_broadcast` called exactly once on `ALLOW`, receipt has `broadcast=True` and `tx_hash`.
   - Verify `sign_and_broadcast` NEVER called on `BLOCK` (recipient mutation, budget breach), receipt has `broadcast=False` and `tx_hash=None`.
   - Verify `sign_and_broadcast` NEVER called on `HOLD` (malformed calldata, unknown selector), receipt has `broadcast=False` and `tx_hash=None`.
   - Verify trajectory state updates on `ALLOW` and remains unchanged on `BLOCK` or `HOLD`.

## Verification
- Run `pytest backend/tests/test_executor_gate.py`
- Verify 100% test pass rate and structural non-call verification.
