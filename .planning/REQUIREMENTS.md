# ChainBreak-Web3 — Requirements

**Status: LOCKED** — 4 hardening changes applied 2026-09-25. This is the implementation spec.

## Decision Semantics (Non-Negotiable)

| Decision | Trigger | Sign/Broadcast |
|---|---|---|
| `ALLOW` | All invariants pass; calldata decoded; trajectory within budget | Permitted |
| `BLOCK` | Known deterministic policy or invariant violation (wrong recipient, wrong asset, budget exceeded, disallowed method) | Prohibited |
| `HOLD` | Cannot prove safety: malformed calldata, unknown selector, decoder exception, evaluator error, incomplete state | Prohibited |

> `HOLD` and `BLOCK` are both execution-terminal. Neither permits signing or broadcast. The difference is diagnostic only: BLOCK names the violated rule; HOLD names the uncertainty. The security guarantee is identical.

## Milestone v2.0: ChainBreak-Web3

### Core Data Models & Schemas
- [x] **CORE-01**: Define typed `IntentEnvelope` model (intent ID, user goal, chain ID, allowed assets, allowed recipients, allowed contracts, allowed methods, `max_single_value_per_asset: dict[str, int]`, `max_session_value_per_asset: dict[str, int]`, expected reason). Budget limits are **per-asset maps** (e.g. `{"USDC": 50, "ETH": 0}`) — never a single scalar threshold.
- [x] **CORE-02**: Define typed `TransactionProposal` model (chain ID, to address, value, calldata hex, nonce, gas limit).
- [x] **CORE-03**: Define typed `DecodedEvmTransaction` model (chain ID, asset, method, contract, recipient, amount, raw to, raw value, calldata hash).
- [x] **CORE-04**: Define typed `TrajectoryState` model (session ID, agent ID, `cumulative_spend_per_asset: dict[str, int]`, allowed boundaries, nonce history, proposal history). Spend accumulation is tracked per distinct asset contract address to match per-asset intent limits in `IntentEnvelope`.
- [x] **CORE-05**: Define typed `DecisionReceipt` model with decision `Literal["ALLOW", "HOLD", "BLOCK"]`, `violated_invariants: list[str]` (non-empty on BLOCK; empty on HOLD — HOLD carries `hold_reason` instead), `state_before_hash`, `proposal_hash`, decoded tx, `broadcast: bool`, `transaction_hash: str | None`, and `reason`. HOLD uses a distinct `hold_reason` field (e.g. `"MALFORMED_CALLDATA"`, `"UNKNOWN_SELECTOR"`, `"DECODER_EXCEPTION"`) — not a fake violated invariant name.

### Deterministic EVM Calldata Decoding
- [x] **DEC-01**: Implement deterministic calldata decoder for native ETH transfers. Detection rule: `calldata == b""` or `len(calldata) == 0`, with `tx.value > 0`. Asset is `"ETH"`, recipient is `tx.to`. **The raw EVM transaction fields are the sole authority — no LLM inference, no tool-name heuristics.**
- [x] **DEC-02**: Implement deterministic ERC-20 `transfer(address,uint256)` calldata decoder. Detection rule: `calldata[:4] == 0xa9059cbb`. Decode recipient from `calldata[4:36]` (right-padded address), and amount from `calldata[36:68]` (uint256 big-endian). Token contract address is `tx.to`. **Any other 4-byte selector is not ERC-20 transfer and must not be guessed.**
- [x] **DEC-03**: Enforce fail-closed handling for all decode failures. If calldata is malformed hex, selector is unrecognized, arguments are truncated, or an exception is raised: return `DecodeResult(parseable=False, hold_reason="<specific reason>")`. This output routes to a `HOLD` decision, not `BLOCK`. The decoder must never raise to callers — all errors are caught and returned as typed failure values.
- [x] **DEC-04**: Decoder is 100% pure Python. No LLM calls, no external RPC calls, no network I/O. All logic operates on the raw `bytes` of the calldata field and the `int` value of `tx.value`.

### Invariant Engine
- [x] **INV-01**: Implement `INTENT_INTEGRITY` invariant checking decoded recipient, asset, amount, and contract against the authorized `IntentEnvelope`.
- [x] **INV-02**: Implement `CAPABILITY_BOUNDARY` invariant checking agent action permissions against allowed chain IDs, assets, recipients, contracts, and methods.
- [x] **INV-03**: Implement `TRAJECTORY_BUDGET` invariant checking cumulative session spend **per asset** (`trajectory.cumulative_spend_per_asset[asset]`) against `intent.max_session_value_per_asset[asset]` and `intent.max_single_value_per_asset[asset]`. A transaction where the per-asset cumulative sum would exceed the asset's session limit must produce `BLOCK`. An asset not present in the intent's asset maps is implicitly disallowed and produces `BLOCK` via `CAPABILITY_BOUNDARY`.
- [x] **INV-04**: Enforce strict fail-closed evaluation semantics: (a) a decoded transaction that matches a known invariant rule violation → `BLOCK` with named invariant; (b) a transaction that cannot be evaluated due to parse failure, decoder exception, incomplete trajectory state, or evaluator error → `HOLD` with named reason code. The invariant engine must never convert uncertainty into `ALLOW`.

### Pre-Signing Execution Gate
- [x] **GATE-01**: Implement `ChainBreakExecutor` acting as the sole owner of transaction signing and broadcast invocation.
- [x] **GATE-02**: Enforce physical execution gating: when decision is `BLOCK` or `HOLD`, the signer and broadcaster methods are structurally unreachable — not bypassed by a runtime flag. `DecisionReceipt.broadcast` must be `False` and `DecisionReceipt.transaction_hash` must be `None`. The gate must not distinguish between BLOCK and HOLD from an execution perspective — both are identical at the signing boundary.
- [x] **GATE-03**: Allow execution path to proceed to signer/broadcaster ONLY when decision is `ALLOW`, returning verified `broadcast=true` and transaction hash.

### Mutation & Trajectory Attacks
- [ ] **ATTACK-01**: Implement agent proposal generator for legitimate baseline transactions matching intent.
- [ ] **ATTACK-02**: Implement compromised agent parameter mutation attacks (recipient redirect to Mallory, inflated transfer value, wrong contract/token).
- [ ] **ATTACK-03**: Implement multi-step trajectory attack where individual transactions appear valid but cumulative spend breaches session budget (e.g. 40 + 50 + 30 > 100).
- [ ] **ATTACK-04**: Implement replay/nonce mutation scenario and unauthorized method call scenarios.

### Counterfactual Proof Engine
- [ ] **PROOF-01**: Implement dual-execution counterfactual runner running identical attack proposals through unprotected Baseline vs protected ChainBreak.
- [ ] **PROOF-02**: Generate side-by-side comparative evidence. **Honest labeling required:** On the local `LocalEVMAdapter`, the Baseline path completes a **simulated broadcast** (deterministic local state update, no real chain). On `TestnetEVMAdapter`, the Baseline path is a **real broadcast** to a public testnet. The proof output must clearly label which mode is active. ChainBreak's protected path produces `broadcast=false`, `tx_hash=null` in both modes.
- [ ] **PROOF-03**: Record causal lineage identifying exact violated invariant (on BLOCK) or hold reason code (on HOLD), trigger parameters, step index, and pre/post trajectory state hash.

### Execution Substrates
- [ ] **CHAIN-01**: Implement `LocalEVMAdapter` with deterministic address fixtures and local state tracking for 100% reliable offline/hackathon attack replay.
- [ ] **CHAIN-02**: Implement `TestnetEVMAdapter` supporting real broadcast on public EVM testnet (Sepolia/Base Sepolia) for allowed transactions.

### Web3 Editorial Security Cockpit
- [ ] **UI-01**: Develop React + Vite UI using Obsidian editorial dark design system displaying end-to-end operator flow.
- [ ] **UI-02**: Implement `IntentPanel` displaying user goal and authorized intent envelope boundaries.
- [ ] **UI-03**: Implement `TransactionCard` displaying raw EVM proposal side-by-side with deterministically decoded fields.
- [ ] **UI-04**: Implement `TrajectoryTimeline` displaying multi-step session history and accumulated financial budget consumption.
- [ ] **UI-05**: Implement `DecisionReceipt` displaying cryptographic decision proof, violated invariants, and verified broadcast suppression (`broadcast=false`, `tx_hash=null`).
- [ ] **UI-06**: Implement `CounterfactualProof` component visualizing side-by-side comparison between unprotected baseline broadcast and ChainBreak pre-signing block.

### Evaluation Suite & Metrics
- [ ] **EVAL-01**: Implement 12-scenario adversarial test harness (W1–W12: safe, mutations, budget breaches, wrong chain, wrong contract, unauthorized method, replay, near-miss, malformed).
- [ ] **EVAL-02**: Expose automated evaluation runner calculating detection rate, prevention rate, false-block rate, and decision latency.
- [ ] **EVAL-03**: Implement `EvaluationPanel` in frontend displaying live evaluation metrics and scenario run matrix.

---

## Future Requirements (Deferred)
- Generalized ABI parser for arbitrary DeFi protocols (Uniswap, Aave).
- Multi-chain support (Solana, Bitcoin, Cosmos).
- Account Abstraction (ERC-4337) userOp bundler pre-simulation.
- Onchain cryptographic receipt verification via smart contract guard.

---

## Out of Scope (Explicit Exclusions)
- AI wallet implementation (do not compete with MetaMask Agent Wallet / Coinbase Agentic Wallet).
- Generic crypto token scanner / portfolio view / market risk scores.
- Smart contract static code vulnerability auditing.
- Storing production private keys or real-money mainnet execution.

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CORE-01 | Phase 1 | Complete |
| CORE-02 | Phase 1 | Complete |
| CORE-03 | Phase 1 | Complete |
| CORE-04 | Phase 1 | Complete |
| CORE-05 | Phase 1 | Complete |
| DEC-01 | Phase 2 | Complete |
| DEC-02 | Phase 2 | Complete |
| DEC-03 | Phase 2 | Complete |
| DEC-04 | Phase 2 | Complete |
| INV-01 | Phase 3 | Complete |
| INV-02 | Phase 3 | Complete |
| INV-03 | Phase 3 | Complete |
| INV-04 | Phase 3 | Complete |
| GATE-01 | Phase 4 | Complete |
| GATE-02 | Phase 4 | Complete |
| GATE-03 | Phase 4 | Complete |
| ATTACK-01 | Phase 5 | Pending |
| ATTACK-02 | Phase 5 | Pending |
| ATTACK-03 | Phase 5 | Pending |
| ATTACK-04 | Phase 5 | Pending |
| PROOF-01 | Phase 6 | Pending |
| PROOF-02 | Phase 6 | Pending |
| PROOF-03 | Phase 6 | Pending |
| CHAIN-01 | Phase 7 | Pending |
| CHAIN-02 | Phase 7 | Pending |
| UI-01 | Phase 8 | Pending |
| UI-02 | Phase 8 | Pending |
| UI-03 | Phase 8 | Pending |
| UI-04 | Phase 8 | Pending |
| UI-05 | Phase 8 | Pending |
| UI-06 | Phase 8 | Pending |
| EVAL-01 | Phase 9 | Pending |
| EVAL-02 | Phase 9 | Pending |
| EVAL-03 | Phase 9 | Pending |
