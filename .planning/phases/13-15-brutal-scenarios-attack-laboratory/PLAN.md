# Phase 13 Plan: 15 Brutal Scenarios Attack Laboratory

## Goal
Transform the evaluation suite into a true multi-step attack laboratory with 15 Brutal Scenarios (W01–W15) organized into 5 attack families, where every scenario contains a realistic autonomous agent trajectory (not a single-variable transaction), validating cumulative state accumulation, zero side effects on blocks/holds, and resilience against adaptive multi-vector compromise (W15 Boss Fight) + automated fuzzing campaign (W16).

## Requirements Covered
- `BRUTAL-01`: 15 Full Trajectory Scenarios (W01–W15) answering user authorization, agent history, accumulated state, attacker adaptation, ChainBreak prevention, and zero side effects.
- `BRUTAL-02`: 5 Attack Families:
  - Family A — Baseline & boundaries: W01 Clean Agent Session, W02 Exact Boundary Attack, W03 Slow-Drip Drain
  - Family B — Intent attacks: W04 Trust-Then-Hijack, W05 Gradual Amount Escalation, W07 Recipient Fan-Out, W11 Intent Laundering
  - Family C — Capability attacks: W08 Asset Swap, W09 Contract Substitution, W10 Cross-Chain Drift
  - Family D — State attacks: W06 Split-and-Escape, W12 Replay, W15 Adaptive Kill Chain
  - Family E — Fail-closed attacks: W13 Parser Ambush, W14 Malformed-Calldata Poisoning
- `BRUTAL-03`: Invariant State Guarantees:
  - Blocked/held proposals leave cumulative spend, nonces, and broadcast state strictly unchanged.
  - In W13/W14, fail-closed HOLD on proposal T4 leaves engine unpoisoned so proposal T5 executes cleanly.
  - In W15 (Adaptive Kill Chain), agent attempts recipient hijack, asset swap, chain drift, unknown selector, then quiet valid transfer; ChainBreak deterministically blocks/holds attacks and executes valid txs to exact 100 budget.
- `BRUTAL-04`: Bonus W16 Mutation-Fuzz Campaign running automated mutations (recipient, amount, contract, chain, nonce, selector, calldata length) with 100% deterministic classification.
- `BRUTAL-05`: 90-Second Demo Sequence in UI:
  1. W01 Legitimate multi-step workflow -> ALLOW
  2. W04 4 legitimate steps -> agent hijacks recipient -> BLOCK
  3. W03 Slow-drip sequence -> cumulative budget breach -> BLOCK
  4. W13 Unknown calldata -> HOLD
  5. W15 Adaptive kill chain -> multiple attack modes -> mixed BLOCK/HOLD/ALLOW
  6. Counterfactual same attack: baseline -> broadcasts, ChainBreak -> never reaches signer
- `BRUTAL-06`: Developer-Grade UI updates to `BrutalMatrix.jsx`, `PitchSequenceBar.jsx`, `ScenarioSelector.jsx`, and `EvaluationPanel.jsx`.

## Execution Waves
- **Wave 1 (Backend Core & Corpus)**:
  - Update `backend/eval/scenarios.py` with W01–W15 scenarios, trajectory generators, 5 attack families, and step-by-step expected decisions.
  - Implement `backend/eval/fuzzer.py` for W16 Mutation-Fuzz Campaign.
  - Update `backend/eval/runner.py` and `backend/eval/metrics.py` to record step-by-step verification, trajectory state invariant proofs, and family metrics.
  - Update `backend/main.py` API routes (`/api/v2/scenarios`, `/api/v2/evaluate`, `/api/v2/fuzz`).
- **Wave 2 (Backend Test Verification)**:
  - Write `backend/tests/test_15_brutal_scenarios.py` testing all 15 scenarios, step assertions, zero side-effect proofs.
  - Write `backend/tests/test_fuzzer_campaign.py` validating 100+ mutation fuzz runs.
  - Verify existing tests continue passing.
- **Wave 3 (Frontend Cockpit & Attack Laboratory)**:
  - Update `BrutalMatrix.jsx` to render the 5 attack families and 15 scenarios with attack paths, decisions, side effects, and state invariants.
  - Update `PitchSequenceBar.jsx` to the locked 6-step 90-second demo sequence.
  - Update `ScenarioSelector.jsx` with family filtering and step visualization.
  - Update `EvaluationPanel.jsx` with full 15-scenario matrix and W16 fuzz campaign trigger.
  - Update `AiSummaryBot.jsx` context.
- **Wave 4 (End-to-End Verification & Browser Validation)**:
  - Run all backend pytests.
  - Run `npm run build` in `frontend/`.
  - Validate browser UI rendering.

## Acceptance Criteria
- 15/15 trajectory scenarios execute with 100% expected step-by-step decisions.
- Trajectory state invariants verified (cumulative spend preserved, nonces preserved, 0 unapproved broadcasts).
- 0 false blocks on safe paths.
- Frontend displays all 15 scenarios with crisp Obsidian aesthetic, zero emojis, and interactive 6-step pitch bar.
