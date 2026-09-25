# ChainBreak-Web3 — 3-Minute Hackathon Judging & Demo Script

**Target Audience**: Hackathon Judges, Web3 Security Engineers, AI Agent Builders  
**Duration**: 2.5 – 3.0 minutes  
**Flagship Scenarios**:  
1. **Scenario W3**: Recipient Mutation Attack (Alice → Mallory)  
2. **Scenario W5**: Multi-Step Trajectory Budget Breach (40 + 50 + 30 > 100 USDC)  

---

## Act 1: The Problem (0:00 – 0:45) — "The Agent Autonomy Vulnerability"

**Visual**: Home Page / Operator Pipeline Tab (`http://localhost:5173/` or `http://127.0.0.1:8000/`). Point to the top navigation and Intent Envelope.

> **Spoken Script**:  
> *"Judges, autonomous AI agents are rapidly gaining the ability to sign and execute onchain transactions. But here is the critical vulnerability: **The problem isn't whether an agent can craft a transaction. The problem is whether the transaction still matches what the user authorized after the agent acts autonomously.**
>  
> *When an agent encounters prompt injection, adversarial drift, or complex multi-step reasoning, it can mutate parameters—such as swapping a vendor's address for an attacker's—or split transfers into smaller transactions that individually look benign but cumulatively drain a wallet.*  
>  
> *Once a transaction is broadcast to the mempool, blockchain execution is final and irreversible.*  
>  
> *Meet **ChainBreak-Web3**: a provider-agnostic, deterministic intent-integrity gateway that sits between autonomous AI agents and wallet signing, mathematically blocking intent drift and cumulative trajectory budget breaches **before** private keys are ever touched."*

---

## Act 2: The Golden Path Demo — Flagship Scenario W3 (0:45 – 1:30)

**Visual**: Point to the **Authorized Intent Envelope**, then click `[W3: Flagship Attack (Alice → Mallory)]` on the Flagship Benchmarks bar.

> **Spoken Script**:  
> *"Let's see this live. Here is our Authorized Intent Envelope: The user authorized the agent to pay **Alice 50 USDC** on Sepolia for Invoice INV-14.*  
>  
> *(Point to Transaction Card)*  
> *Look at what the agent actually generated in Step 01: The agent proposed an ERC-20 transfer, but calldata inspection reveals the recipient was mutated to **Mallory**—an attacker address.*  
>  
> *(Point to Decision Receipt)*  
> *Notice what ChainBreak did: Without relying on slow, non-deterministic LLMs, our zero-dependency pure-Python invariant engine deterministically evaluated `INTENT_INTEGRITY`. It caught the mismatch immediately.*  
>  
> *The Decision Receipt shows **BLOCK**. Look at the broadcast status: **BROADCAST SUPPRESSED (PRE-SIGNING BLOCK)**. The transaction hash is `null`. The private key was never accessed, and zero bytes were broadcast to the network."*

---

## Act 3: Trajectory Attacks — Scenario W5 (1:30 – 2:10)

**Visual**: Click `[W5: Trajectory Budget Breach (40 + 50 + 30 > 100)]` on the Flagship Benchmarks bar. Point to the **Trajectory Budget & Step Timeline**.

> **Spoken Script**:  
> *"Now let's examine what happens when an attack cannot be detected in a single transaction. Click Scenario W5.*  
>  
> *Here the user set a cumulative session budget cap of **100 USDC**. The agent attempts three sequential transactions:  
> - **Step 1**: 40 USDC to Alice. Permitted. (Cumulative: 40/100)  
> - **Step 2**: 50 USDC to Alice. Permitted. (Cumulative: 90/100)  
> - **Step 3**: 30 USDC to Alice. (Cumulative: 120/100)*  
>  
> *Every single transaction is individually below the 50 USDC single-transaction limit. Traditional point-in-time RPC filters allow all three!*  
>  
> *ChainBreak maintains a stateful causal trajectory vector across the session. At Step 3, the `TRAJECTORY_BUDGET` invariant triggered instantly. Steps 1 and 2 broadcast successfully, but Step 3 was severed before signing. Total funds preserved."*

---

## Act 4: Counterfactual Proof & Causal Lineage (2:10 – 2:40)

**Visual**: Click `[Run Counterfactual Proof]` button or navigate to the `Counterfactual Proof` tab.

> **Spoken Script**:  
> *(Pointing to Side-by-Side Track)*  
> *"To prove this mathematically, ChainBreak provides a dual-track Counterfactual Proof engine:  
> - On the left: **Unprotected Baseline** where an unchecked agent broadcasts the attack to the network.  
> - On the right: **ChainBreak Protected** where execution is severed pre-signing.*  
>  
> *(Pointing to Causal Lineage panel)*  
> *Look at our Causal Lineage telemetry: Steps 1 and 2 are concordant, but at Step 3, the trajectories diverge completely. ChainBreak isolates the trigger parameters, the violated invariant, and produces an immutable cryptographic proof receipt."*

---

## Act 5: Quantitative Verification & Benchmarks (2:40 – 3:00)

**Visual**: Click the `Adversarial Benchmarks (12)` tab.

> **Spoken Script**:  
> *"Finally, this isn't a cherry-picked script. ChainBreak runs against an adversarial test suite of 12 comprehensive scenarios:  
> - Unauthorized recipient mutations, amount inflations, and trajectory budget breaches.  
> - Wrong chain IDs, untrusted token contracts, and unapproved ERC-20 methods.  
> - Malformed calldata fail-closed holding.*  
>  
> *Across all 12 scenarios: **100% Threat Prevention**, **0% False Blocks** on legitimate transactions, and an average evaluation latency of **less than 1 millisecond**.*  
>  
> *Autonomous agents can propose transactions; ChainBreak guarantees they remain authorized before blockchain execution. Thank you."*

---

## Quick Demo Checklist Before Hitting Record
- [ ] Backend running on `http://127.0.0.1:8000` (`python -m uvicorn backend.main:app --port 8000`)
- [ ] Frontend running on `http://localhost:5173/` (`npm run dev`) or accessed directly through FastAPI port 8000
- [ ] Substrate set to `Local EVM` for deterministic instant replay
- [ ] Browser zoom set to 100% for crisp display typography
