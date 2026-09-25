# Executive Research Summary — ChainBreak-Web3

**Synthesized From:** `ChainBreak-Web3-plan.md` (Locked Product Strategy & Architecture Audit, September 2026)
**Target Milestone:** v2.0 ChainBreak-Web3

---

## 1. Competitive Reality & Positioning
Current 2026 products in the Web3 agent security ecosystem (MetaMask Agent Wallet, Coinbase Agentic Wallet / Policy Engine, OpenZeppelin Defender) provide wallet-level spend controls, protocol allowlists, and execution relayers.
- **The Pitfall:** Competing at the wallet layer or building another spend-limit dashboard causes immediate judge dismissal ("Why isn't this just a wallet policy?").
- **The Hardened Wedge:** ChainBreak does **not** compete as a wallet. It operates one layer higher as an **independent pre-signing intent-integrity firewall**.
- **Core Differentiation:** Verifying whether an autonomous agent's proposed transaction calldata still honors the user's initial natural-language intent and cumulative multi-step trajectory before the transaction is handed to the signer/broadcaster.

---

## 2. Core Invariants (P0)
1. **`INTENT_INTEGRITY`**: Binds raw decoded transaction fields (asset, recipient, value, calldata method) to the authorized `IntentEnvelope`. Catches agent parameter mutations and unauthorized redirection (e.g. Alice -> Mallory).
2. **`CAPABILITY_BOUNDARY`**: Restricts agent execution to explicitly permitted chain IDs, asset contracts, recipient addresses, and calldata function selectors.
3. **`TRAJECTORY_BUDGET`**: Accumulates financial and authorization state across sequential transactions in a session. Catches multi-step budget escalation attacks (e.g. 40 + 50 + 30 > 100).

---

## 3. Technology Stack & Integration Architecture
- **Language & Core:** Python 3.12, FastAPI, Pydantic v2.
- **Calldata Decoding:** Pure-Python deterministic EVM decoder for ETH value transfers and standard ERC-20 (`transfer(address,uint256)`). Zero LLM involvement in decoding or security checks.
- **AI Boundary:** LLM is restricted solely to compiling natural language instructions into typed `IntentEnvelope` schemas.
- **Execution Substrates:**
  - `LocalEVMAdapter`: Deterministic local fixture environment for guaranteed 100% reproducible hackathon attack replay without RPC/faucet flakiness.
  - `TestnetEVMAdapter`: Single-proof live testnet execution (Sepolia / Base Sepolia) demonstrating real transaction broadcast on ALLOW vs strict suppression on BLOCK.
- **Frontend Cockpit:** React 18 + Vite using the established Obsidian editorial dark theme (`index.css`), displaying Intent → Proposed Tx → Decoded Calldata → Invariant Verification → Trajectory State → Decision Receipt & Broadcast Proof.

---

## 4. Key Traps & Mitigation Protocols
1. **RPC Outage / Faucet Failure:** Testnet can fail live. *Mitigation:* Primary demo and evaluation harness run on deterministic local EVM adapter; testnet is supplementary proof.
2. **"Blocked" Simulation Accusation:** Judges may doubt if a blocked transaction was truly prevented. *Mitigation:* Single-owner execution gate (`ChainBreakExecutor`). The signing/broadcasting path is unreachable when decision is `BLOCK` or `HOLD` (`broadcast=false`, `tx_hash=null`).
3. **LLM Non-Determinism:** If LLM makes the ALLOW/BLOCK call, it can be jailbroken or hallucinate. *Mitigation:* LLM output is untrusted; invariant rules are 100% deterministic code.
4. **Scope Creep:** Multi-chain, complex DeFi swaps, or portfolio viewers dilute judge focus. *Mitigation:* Explicitly locked to ETH + ERC-20 transfers on EVM.
