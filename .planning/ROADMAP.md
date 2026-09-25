# ChainBreak-Web3 — Roadmap

## Milestone v2.0: ChainBreak-Web3 (Hackathon Build)
**Target:** September 2026
**Vision:** Provider-agnostic deterministic intent-integrity firewall for autonomous EVM agents. Sits between AI agents and transaction signing/broadcast, blocking intent drift and cumulative trajectory budget breaches before irreversible onchain execution.

---

### Phase 1 — Strict Web3 Data Models
**Goal:** Implement typed, deterministically serializable core schemas for intent, transaction proposals, decoded transactions, trajectory state, and decision receipts.
**Requirements:** `CORE-01`, `CORE-02`, `CORE-03`, `CORE-04`, `CORE-05`
**Success Criteria:**
1. `IntentEnvelope`, `TransactionProposal`, `DecodedEvmTransaction`, `TrajectoryState`, and `DecisionReceipt` models validate and serialize deterministically with Pydantic v2.
2. Model tests verify hashing and serialization invariance across platforms.
3. Zero missing fields or runtime schema ambiguity.

---

### Phase 2 — Deterministic EVM Calldata Decoder
**Goal:** Build zero-LLM deterministic calldata decoder for native ETH transfers and standard ERC-20 transfers with fail-closed error handling.
**Requirements:** `DEC-01`, `DEC-02`, `DEC-03`, `DEC-04`
**Success Criteria:**
1. Native ETH transfer transactions (value > 0, empty calldata) decode recipient and amount correctly.
2. Standard ERC-20 `transfer(address,uint256)` transactions decode token contract, method selector `0xa9059cbb`, recipient address, and token amount accurately.
3. Malformed hex, unrecognized selector, or truncated calldata safely fails closed to an unparseable state triggering `HOLD`.
4. 100% pure Python implementation with 0 external LLM latency or non-determinism.

---

### Phase 3 — Invariant Engine
**Goal:** Implement pure-Python deterministic security invariants covering intent binding, capability boundaries, and multi-step trajectory budgets.
**Requirements:** `INV-01`, `INV-02`, `INV-03`, `INV-04`
**Success Criteria:**
1. `INTENT_INTEGRITY` flags any recipient mutation (Alice -> Mallory) or amount mismatch as `BLOCK`.
2. `CAPABILITY_BOUNDARY` flags any disallowed chain ID, contract, or method selector as `BLOCK`.
3. `TRAJECTORY_BUDGET` accumulates sequential transaction value and triggers `BLOCK` on cumulative budget breach (e.g. 40 + 50 + 30 > 100).
4. All invariants fail closed on uncertainty or schema error (`HOLD`/`BLOCK`, never `ALLOW`).

---

### Phase 4 — Pre-Signing Execution Gate (`ChainBreakExecutor`)
**Goal:** Create a single-owner execution boundary where transactions can only reach sign/broadcast functions if explicitly cleared with `ALLOW`.
**Requirements:** `GATE-01`, `GATE-02`, `GATE-03`
**Success Criteria:**
1. `ChainBreakExecutor` wraps signer and broadcast dispatchers so they are physically unreachable on `BLOCK` or `HOLD`.
2. Any blocked proposal records `broadcast=false` and `transaction_hash=null` in its `DecisionReceipt`.
3. Allowed proposals invoke signer/broadcaster and return `broadcast=true` with valid transaction hash.

---

### Phase 5 — Agent Simulator & Mutation Attacks
**Goal:** Build realistic agent transaction proposal pipelines and automated attack mutators to simulate autonomous agent drift.
**Requirements:** `ATTACK-01`, `ATTACK-02`, `ATTACK-03`, `ATTACK-04`
**Success Criteria:**
1. Legitimate agent generator creates valid EVM proposals matching authorized intent.
2. Parameter mutator modifies proposal fields (redirect recipient, inflate amount, swap token address) to simulate compromised agent drift.
3. Trajectory mutator executes multi-step sequences that appear safe individually but exceed total session allocation.
4. Nonce/replay and unauthorized method attack fixtures generated consistently.

---

### Phase 6 — Counterfactual Proof Engine
**Goal:** Port and adapt the dual-execution proof engine to run identical proposals through unprotected Baseline vs ChainBreak-protected pipelines.
**Requirements:** `PROOF-01`, `PROOF-02`, `PROOF-03`
**Success Criteria:**
1. Side-by-side run executes identical attack fixture: Baseline broadcasts to chain while ChainBreak blocks pre-signing.
2. Causal lineage output clearly pinpoints the exact violated invariant and divergent step.
3. Proof artifact provides undeniable visual and programmatic evidence of threat prevention.

---

### Phase 7 — Execution Substrates (Local EVM + Live Testnet)
**Goal:** Deploy dual execution adapters: deterministic local fixture runner for 100% bulletproof demo replay and live testnet adapter for public explorer proof.
**Requirements:** `CHAIN-01`, `CHAIN-02`
**Success Criteria:**
1. `LocalEVMAdapter` executes state changes deterministically without public internet or faucet dependencies.
2. `TestnetEVMAdapter` successfully broadcasts allowed transaction to public EVM testnet (Sepolia/Base Sepolia) returning live explorer URL.
3. Blocked testnet proposal executes 0 transactions onchain, preserving wallet funds.

---

### Phase 8 — Web3 Editorial Security Cockpit
**Goal:** Build a state-of-the-art React + Vite interface using the Obsidian editorial dark design system displaying the full operator pipeline.
**Requirements:** `UI-01`, `UI-02`, `UI-03`, `UI-04`, `UI-05`, `UI-06`
**Success Criteria:**
1. UI clearly displays Operator flow: Intent → Proposal → Decoded Tx → Invariant Engine → Trajectory State → Decision Receipt.
2. Interactive toggle runs Flagship Attack (Alice -> Mallory) and Trajectory Breach in 1 click.
3. Counterfactual comparison view highlights `broadcast=false` vs `tx_hash` created.
4. Smooth animations, responsive layout, and zero console errors or hydration bugs.

---

### Phase 9 — Evaluation Suite & Benchmark Metrics
**Goal:** Implement 12-scenario adversarial test harness measuring attack detection, prevention, false blocks, and execution latency.
**Requirements:** `EVAL-01`, `EVAL-02`, `EVAL-03`
**Success Criteria:**
1. 12 distinct scenarios executed programmatically (W1–W12: safe, mutations, trajectory breaches, near-misses, malformed).
2. Evaluation reports 100% prevention on attacks, 0% false blocks on safe paths, and sub-100ms decision latency.
3. Frontend Evaluation Panel visualizes benchmark matrix and performance metrics live.

---

### Phase 10 — Submission Package & Hackathon Assets
**Goal:** Assemble complete hackathon deliverables including architecture diagrams, demo script walkthrough, deck outline, and Devpost submission text.
**Success Criteria:**
1. Architecture diagram clearly communicating "LLM Proposes → ChainBreak Decodes → ChainBreak Enforces → Wallet Signs".
2. 3-minute hackathon demo script walking through problem, safe execution, mutation attack, trajectory attack, and counterfactual proof.
3. Clean README and Devpost narrative highlighting technical differentiation against wallet policies.

---

### Phase 11 — Final Hardening & Verification
**Goal:** End-to-end verification, type checks, linting, regression testing, secret sanitization, and production build validation.
**Success Criteria:**
1. All pytest test suites passing cleanly with zero warnings or deprecation errors.
2. Frontend production build passes with `npm run build` in under 3 seconds.
3. Repository verified free of private keys, API secrets, or test credentials.
4. Demo replay verified 100% operational offline and online.

---

## Progress Overview

| Phase | Description | Status | Requirements |
|---|---|---|---|
| Phase 1 | Strict Web3 Data Models | Next | `CORE-01` to `CORE-05` |
| Phase 2 | Deterministic EVM Calldata Decoder | Pending | `DEC-01` to `DEC-04` |
| Phase 3 | Invariant Engine | Pending | `INV-01` to `INV-04` |
| Phase 4 | Pre-Signing Execution Gate | Pending | `GATE-01` to `GATE-03` |
| Phase 5 | Agent Simulator & Mutation Attacks | Pending | `ATTACK-01` to `ATTACK-04` |
| Phase 6 | Counterfactual Proof Engine | Pending | `PROOF-01` to `PROOF-03` |
| Phase 7 | Execution Substrates (Local + Testnet) | Pending | `CHAIN-01`, `CHAIN-02` |
| Phase 8 | Web3 Editorial Security Cockpit | Pending | `UI-01` to `UI-06` |
| Phase 9 | Evaluation Suite & Benchmark Metrics | Pending | `EVAL-01` to `EVAL-03` |
| Phase 10 | Submission Package & Hackathon Assets | Pending | Hackathon Deliverables |
| Phase 11 | Final Hardening & Verification | Pending | Production Verification |
