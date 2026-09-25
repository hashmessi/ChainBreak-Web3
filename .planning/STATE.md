# ChainBreak — Project State

## Current Position

Phase: 03-invariant-engine
Plan: 01
Status: Phase 1 (Strict Web3 Models) and Phase 2 (Deterministic EVM Decoder) verified & completed. Ready for Phase 3.
Last activity: 2026-09-25 — Phase 1 & 2 executed, 62/62 tests passing.

## Current Milestone: v2.0 ChainBreak-Web3
- **Goal:** Provider-agnostic deterministic intent-integrity firewall for autonomous EVM agents.
- **Phase Numbering:** Reset to Phase 1 (aligned with the 11-phase locked execution plan in `ChainBreak-Web3-plan.md`).

## Accumulated Context (from v1.0)
- Preserved original Web2 invariant engine and tests under archive (`.planning/milestones/v1.0-phases/`).
- Proven architectural patterns carried forward:
  - Deterministic invariant evaluation in pure Python (zero LLM in security decision)
  - Pre-execution interception lifecycle (intercept before sign/broadcast)
  - Trajectory state accumulation across multi-step action sequences
  - Dual counterfactual execution (Baseline broadcast vs ChainBreak blocked pre-signing)
  - Fail-closed semantics (uncertainty/error → HOLD/BLOCK, never ALLOW)
  - Obsidian editorial design system (React + Vite, Vanilla CSS)

## Key Architectural Shift (Web2 → Web3)
- Tool-name semantics replaced by strict raw EVM calldata decoding.
- Data-leak boundaries replaced by `INTENT_INTEGRITY`, `CAPABILITY_BOUNDARY`, and `TRAJECTORY_BUDGET`.
- Synthetic sandbox tools replaced by `ChainBreakExecutor` driving local deterministic EVM adapter or live testnet adapter.
