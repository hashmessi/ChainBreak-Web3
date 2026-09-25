# ChainBreak — Project Context

## Project Identity
- **Name:** ChainBreak-Web3
- **Classification:** Provider-agnostic deterministic intent-integrity firewall for autonomous EVM agents
- **Hackathon:** Web3 AI Agent Security Track / Hackathon 2026
- **Build Window:** September 2026
- **Status:** IN PROGRESS (Milestone v2.0)

## Core Thesis
Runtime deterministic intent-to-transaction verification for autonomous EVM agents.

Autonomous agents propose transactions, but the agent's interpretation of the task cannot be trusted as a final security boundary. ChainBreak sits between the agent and the signing/broadcast path:
1. Compiles or validates a strict user-intent envelope.
2. Deterministically decodes the actual EVM transaction/calldata (ETH & ERC-20 transfers).
3. Evaluates transaction semantics against agent capabilities and the cumulative session trajectory.
4. Blocks unauthorized intent drift and budget escalation **before transaction signing/broadcast**.
5. Emits a deterministic decision receipt and counterfactual proof.

## Product Law
```text
LLM proposes
    ↓
ChainBreak decodes
    ↓
ChainBreak enforces
    ↓
Wallet signs ONLY after ALLOW
    ↓
Blockchain executes
```

## Positioning & The Hardened Wedge
> **ChainBreak-Web3 is the deterministic trust boundary between autonomous agent intent and irreversible blockchain execution.**

**What it is NOT:**
- An AI wallet (does not compete with MetaMask Agent Wallet or Coinbase Agentic Wallet)
- A generic crypto risk score or threat scanner
- A smart-contract vulnerability auditor
- A wallet policy dashboard (it governs intent + trajectory, not just static rules)

## Technology Stack
- **Backend:** Python 3.12 + FastAPI + web3.py / eth-abi (or deterministic pure-Python EVM decoders) + httpx + python-dotenv
- **Frontend:** React + Vite (Editorial Obsidian design system, Vanilla CSS)
- **Execution Substrates:** Local deterministic EVM fixture adapter (100% reproducible demo) + live testnet execution adapter (Sepolia/Base Sepolia)
- **AI Role:** Intent compilation only (natural language → `IntentEnvelope`); LLM is strictly prohibited from making ALLOW/HOLD/BLOCK decisions or decoding calldata.

## Current Milestone: v2.0 ChainBreak-Web3

**Goal:** Build a complete, working, tested, provider-agnostic pre-signing security boundary that intercepts autonomous EVM agent proposals, decodes calldata, enforces 3 deterministic invariants over session trajectories, and physically prevents signing/broadcast on violations.

**Target Features:**
1. **Core EVM Data Contracts:** `IntentEnvelope`, `TransactionProposal`, `DecodedEvmTransaction`, `DecisionReceipt`
2. **Deterministic Calldata Decoder:** Strict zero-LLM parsing for raw EVM calldata (ETH transfers + ERC-20 transfers)
3. **P0 Invariant Engine:**
   - `INTENT_INTEGRITY`: Decoded tx calldata bound to user's authorized intent
   - `CAPABILITY_BOUNDARY`: Enforces explicit allowlists for chains, assets, recipients, contracts, methods
   - `TRAJECTORY_BUDGET`: Cumulative session value tracking preventing multi-step budget drain
4. **Pre-Signing Execution Gate (`ChainBreakExecutor`):** Physical boundary where `ALLOW` unlocks signing/broadcast, while `HOLD`/`BLOCK` strictly prevents execution (`broadcast=false`, `tx_hash=null`)
5. **Flagship Mutation & Trajectory Attacks:** Automated simulation of agent parameter drift and session budget escalation
6. **Counterfactual Proof Engine:** Side-by-side verification proving identical attacks execute in baseline but are prevented in ChainBreak
7. **Dual-Environment Execution:** Local deterministic EVM fallback for 100% reliable attack replay + 1 live public testnet proof
8. **Editorial Web3 Cockpit (React + Vite):** One-screen operator flow displaying Intent → Proposal → Decoded Calldata → Invariants → Trajectory State → Decision Receipt & Broadcast Proof
9. **Automated Evaluation Suite:** 12+ scenario matrix measuring attack detection, prevention, false blocks, and decision latency

## Invariants (P0)
1. `INTENT_INTEGRITY` — Decoded transaction recipient, asset, value, and method must match user authorized intent.
2. `CAPABILITY_BOUNDARY` — Transaction parameters must remain within explicit agent capability set.
3. `TRAJECTORY_BUDGET` — Cumulative session spend across multiple sequential transactions must not exceed session budget limit.

## Evaluation Scenarios (12 Minimum Matrix)
| ID | Category | Scenario Name | Expected Decision |
|---|---|---|---|
| W1 | Safe | Safe ETH transfer | ALLOW |
| W2 | Safe | Safe ERC-20 transfer | ALLOW |
| W3 | Attack | Recipient mutation (Alice -> Mallory) | BLOCK |
| W4 | Attack | Amount mutation (50 USDC -> 5000 USDC) | BLOCK |
| W5 | Attack | Cumulative trajectory budget breach (40 + 50 + 30 > 100) | BLOCK |
| W6 | Attack | Wrong chain ID violation | BLOCK |
| W7 | Attack | Wrong token contract | BLOCK |
| W8 | Attack | Disallowed destination contract | BLOCK |
| W9 | Attack | Unauthorized method invocation | BLOCK |
| W10 | Attack | Nonce replay / invalid sequence | BLOCK |
| W11 | Near-Miss | Safe near-miss trajectory (budget exactly met) | ALLOW |
| W12 | Failure | Malformed / unknown calldata | HOLD |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-09-25 — Milestone v2.0 started*
