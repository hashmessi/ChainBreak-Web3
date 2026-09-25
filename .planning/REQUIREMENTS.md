# ChainBreak-Web3 — Requirements

## Milestone v2.0: ChainBreak-Web3

### Core Data Models & Schemas
- [ ] **CORE-01**: Define typed `IntentEnvelope` model (intent ID, user goal, chain ID, allowed assets, recipients, contracts, methods, max single value, max session value, reason).
- [ ] **CORE-02**: Define typed `TransactionProposal` model (chain ID, to address, value, calldata hex, nonce, gas limit).
- [ ] **CORE-03**: Define typed `DecodedEvmTransaction` model (chain ID, asset, method, contract, recipient, amount, raw to, raw value, calldata hash).
- [ ] **CORE-04**: Define typed `TrajectoryState` model (session ID, agent ID, cumulative spend per asset, allowed boundaries, nonce history, proposal history).
- [ ] **CORE-05**: Define typed `DecisionReceipt` model (decision `ALLOW`/`HOLD`/`BLOCK`, violated invariants, state hashes, decoded tx, broadcast status, tx hash, reason).

### Deterministic EVM Calldata Decoding
- [ ] **DEC-01**: Implement deterministic calldata decoder supporting native ETH transfers (empty calldata, value > 0).
- [ ] **DEC-02**: Implement deterministic ERC-20 `transfer(address,uint256)` calldata decoder parsing function selector `0xa9059cbb`, recipient, and amount.
- [ ] **DEC-03**: Enforce fail-closed handling for malformed hex calldata, unknown function selectors, or truncated arguments (returning unparseable flag leading to `HOLD`).
- [ ] **DEC-04**: Ensure decoder is 100% pure Python with zero reliance on external LLM calls.

### Invariant Engine
- [ ] **INV-01**: Implement `INTENT_INTEGRITY` invariant checking decoded recipient, asset, amount, and contract against the authorized `IntentEnvelope`.
- [ ] **INV-02**: Implement `CAPABILITY_BOUNDARY` invariant checking agent action permissions against allowed chain IDs, assets, recipients, contracts, and methods.
- [ ] **INV-03**: Implement `TRAJECTORY_BUDGET` invariant checking cumulative session spend against `max_session_value` across sequential transactions.
- [ ] **INV-04**: Enforce fail-closed evaluation: any unknown state, parsing ambiguity, or uncaught exception yields `HOLD` or `BLOCK`, never `ALLOW`.

### Pre-Signing Execution Gate
- [ ] **GATE-01**: Implement `ChainBreakExecutor` acting as the sole owner of transaction signing and broadcast invocation.
- [ ] **GATE-02**: Enforce physical execution gating: when decision is `BLOCK` or `HOLD`, signing/broadcast methods are unreachable, guaranteeing `broadcast=false` and `tx_hash=null`.
- [ ] **GATE-03**: Allow execution path to proceed to signer/broadcaster ONLY when decision is `ALLOW`, returning verified `broadcast=true` and transaction hash.

### Mutation & Trajectory Attacks
- [ ] **ATTACK-01**: Implement agent proposal generator for legitimate baseline transactions matching intent.
- [ ] **ATTACK-02**: Implement compromised agent parameter mutation attacks (recipient redirect to Mallory, inflated transfer value, wrong contract/token).
- [ ] **ATTACK-03**: Implement multi-step trajectory attack where individual transactions appear valid but cumulative spend breaches session budget (e.g. 40 + 50 + 30 > 100).
- [ ] **ATTACK-04**: Implement replay/nonce mutation scenario and unauthorized method call scenarios.

### Counterfactual Proof Engine
- [ ] **PROOF-01**: Implement dual-execution counterfactual runner running identical attack proposals through unprotected Baseline vs protected ChainBreak.
- [ ] **PROOF-02**: Generate side-by-side comparative evidence showing Baseline executes/broadcasts (`tx_hash` created) while ChainBreak blocks pre-signing (`tx_hash=null`).
- [ ] **PROOF-03**: Record causal lineage identifying exact violated invariant, trigger parameters, and state progression.

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
| CORE-01 | Phase 1 | Pending |
| CORE-02 | Phase 1 | Pending |
| CORE-03 | Phase 1 | Pending |
| CORE-04 | Phase 1 | Pending |
| CORE-05 | Phase 1 | Pending |
| DEC-01 | Phase 2 | Pending |
| DEC-02 | Phase 2 | Pending |
| DEC-03 | Phase 2 | Pending |
| DEC-04 | Phase 2 | Pending |
| INV-01 | Phase 3 | Pending |
| INV-02 | Phase 3 | Pending |
| INV-03 | Phase 3 | Pending |
| INV-04 | Phase 3 | Pending |
| GATE-01 | Phase 4 | Pending |
| GATE-02 | Phase 4 | Pending |
| GATE-03 | Phase 4 | Pending |
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
