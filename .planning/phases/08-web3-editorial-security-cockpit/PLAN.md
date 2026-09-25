# Phase 8 Plan: Web3 Editorial Security Cockpit

## Goal
Build a React + Vite interface in the Obsidian editorial dark design system displaying the full operator pipeline: Intent Envelope -> Raw Proposal -> Decoded EVM Transaction -> Invariant Check -> Trajectory State -> Decision Receipt & Counterfactual Proof.

## Requirements Covered
- `UI-01`: Obsidian editorial dark design system displaying end-to-end operator flow.
- `UI-02`: `IntentPanel` displaying user goal and authorized intent envelope boundaries (assets, recipients, budget limits).
- `UI-03`: `TransactionCard` displaying raw EVM proposal side-by-side with deterministically decoded fields.
- `UI-04`: `TrajectoryTimeline` displaying multi-step session history and accumulated financial budget consumption.
- `UI-05`: `DecisionReceipt` displaying cryptographic decision proof, violated invariants, and verified broadcast suppression (`broadcast=false`, `tx_hash=null`).
- `UI-06`: `CounterfactualProof` component visualizing side-by-side comparison between unprotected baseline broadcast and ChainBreak pre-signing block.

## Architecture & Design Decisions
1. **Component Hierarchy**:
   - `frontend/src/App.jsx`: Top-level cockpit layout with hero navigation, scenario selector (W1–W12, with quick 1-click toggles for W3 Flagship Attack and W5 Trajectory Breach), execution mode toggle (Protected vs Baseline, Local vs Testnet), and pipeline views.
   - `frontend/src/components/IntentPanel.jsx`: Displays intent envelope, authorized recipients, asset limits, and single/session caps.
   - `frontend/src/components/TransactionCard.jsx`: Side-by-side display of raw proposal hex and parsed EVM fields.
   - `frontend/src/components/TrajectoryTimeline.jsx`: Multi-step interactive timeline with cumulative budget progress bar.
   - `frontend/src/components/DecisionReceipt.jsx`: Holographic cryptographic receipt with ALLOW (green), BLOCK (crimson), and HOLD (amber) badges, lineage, and broadcast suppression indicators.
   - `frontend/src/components/CounterfactualProof.jsx`: Side-by-side visual comparison between Baseline and Protected runs with honest labeling and divergence step pinpointing.
2. **Design Language**:
   - Obsidian dark editorial theme: `#0c0d0e` canvas, `#141618` card backgrounds, `#1f2327` borders.
   - Typography: Clean monospace for hex, tabular numbers for amounts, refined sans-serif for UI labels.
   - Micro-animations: Smooth badge pulses, transition states, zero layout shifts.

## Implementation Steps
1. Create or update components in `frontend/src/components/`:
   - `IntentPanel.jsx`
   - `TransactionCard.jsx`
   - `TrajectoryTimeline.jsx`
   - `DecisionReceipt.jsx`
   - `CounterfactualProof.jsx`
2. Update `frontend/src/App.jsx` to assemble the complete operator cockpit.
3. Validate frontend build with `npm run build` in `frontend/`.

## Verification
- Test `npm run build` succeeds cleanly with zero errors.
- Verify all components render expected fields, handle ALLOW, BLOCK, and HOLD states gracefully.
