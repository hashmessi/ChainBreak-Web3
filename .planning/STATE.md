# ChainBreak — Project State

## Current Position

Phase: 13-15-brutal-scenarios-attack-laboratory
Plan: 01
Status: Complete — 15 Brutal Scenarios Trajectory Attack Laboratory fully implemented and verified across 5 attack families + W16 mutation-fuzz campaign.
Last activity: 2026-09-26 — Verified 15 full trajectory scenarios, state invariant preservation, W15 boss fight, W16 fuzzer, and live frontend cockpit in browser.

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

### Roadmap Evolution
- Phase 12 added: Editorial Web3 Cockpit Polish and Interactive AI Summary Bot (restore v1 Obsidian aesthetic, remove AI slop/emojis, connect live AI Summary Bot to Web3 execution).

## Key Architectural Shift (Web2 → Web3)
- Tool-name semantics replaced by strict raw EVM calldata decoding.
- Data-leak boundaries replaced by `INTENT_INTEGRITY`, `CAPABILITY_BOUNDARY`, and `TRAJECTORY_BUDGET`.
- Synthetic sandbox tools replaced by `ChainBreakExecutor` driving local deterministic EVM adapter or live testnet adapter.

