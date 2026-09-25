# ChainBreak-Web3 — Hostile Product Review + Locked Execution Plan

**Status:** LOCKED
**Objective:** Maximize hackathon judge impact and technical credibility, not feature count.
**Source:** Existing ChainBreak repository audit + current 2026 Web3 agent-security landscape.

---

## 0. Executive Lock

### Final concept

> **ChainBreak-Web3 is a provider-agnostic deterministic intent-integrity firewall for autonomous EVM agents.**

It sits between an AI agent and the signing/broadcast path.

The agent may propose transactions, but ChainBreak does not trust the agent's interpretation of the task. It:

1. creates a strict user-intent envelope,
2. decodes the actual EVM transaction/calldata,
3. checks the transaction against agent capabilities and the accumulated session trajectory,
4. blocks unauthorized drift **before signing/broadcast**, and
5. produces a deterministic decision receipt plus counterfactual proof.

### Product law

```text
LLM proposes
    ↓
ChainBreak decodes
    ↓
ChainBreak enforces
    ↓
Wallet signs only after ALLOW
    ↓
Blockchain executes
```

### The hardened wedge

Do **not** sell this as:

- an AI wallet,
- a crypto risk score,
- a smart-contract scanner,
- a generic transaction simulator,
- a wallet policy dashboard.

Those surfaces are already crowded.

Sell it as:

> **Intent + transaction + trajectory integrity for autonomous onchain agents.**

---

# 1. Hostile Product Review — Try to Kill It

## 1.1 Is the problem real?

**YES, but the broad version is no longer differentiated.**

The risk that an AI agent can move assets without enough authority is real. Current agentic-wallet products already treat this as a security problem and provide controls such as spend limits, protocol allowlists, transaction simulation and threat scanning. MetaMask's 2026 Agent Wallet explicitly combines user-defined spend/protocol controls with pre-execution security checks; Coinbase's current agentic-wallet and Policy Engine documentation exposes spend limits and transaction-signing policies. citeturn673042search2turn846842search0turn846842search7

### Hostile conclusion

If ChainBreak-Web3 only does:

```text
max spend
+ allowlisted recipient
+ allowlisted contract
+ simulation
```

then the idea is vulnerable to the obvious judge attack:

> “Why isn't this just a wallet policy engine?”

### Smallest correction

Make the security boundary **agent intent and session trajectory**, not just transaction policy.

---

## 1.2 Is the problem painful enough?

**Potentially yes, but the pain must be made concrete.**

A developer shipping an autonomous payment/treasury agent does not primarily need another dashboard. They need confidence that a manipulated agent cannot turn a legitimate instruction into an unauthorized sequence of signed transactions.

The strongest pain statement is:

> “The agent was authorized to complete task X, but the actual transaction sequence drifted outside task X.”

### Smallest correction

Target one concrete ICP:

> **Developers/security engineers building autonomous EVM payment, treasury, or service agents that can sign onchain transactions.**

Not “all Web3 users.”

---

## 1.3 Is the target user specific enough?

**Current concept: NO.**

“AI agent developers,” “crypto users,” and “security teams” are too broad.

### Smallest correction

Primary user:

> **Agentic-app developers who already have a wallet/execution layer and need an independent pre-signing security boundary.**

Secondary user:

> Security engineers evaluating agent transaction behavior.

---

## 1.4 Does the product create a measurable outcome?

**YES, if it measures enforcement rather than vibes.**

Track:

- unauthorized proposals blocked,
- intent-mutation attacks caught,
- cumulative-budget violations blocked,
- disallowed broadcasts suppressed,
- false-block rate on safe scenarios,
- decision latency.

### Smallest correction

Do not claim “100% secure.”

Claim only:

> “In our defined adversarial test suite, ChainBreak blocked every seeded policy/intent-violation scenario and preserved every safe scenario.”

---

## 1.5 Why wouldn't users use an existing tool?

This is the **hardest question**.

Existing platforms already provide transaction policy and execution controls. OpenZeppelin's stack has transaction proposals, access control, relayer/execution infrastructure and monitoring; current wallet platforms also provide policy-like controls. citeturn673042search0turn673042search3turn673042search1turn846842search7

### The answer ChainBreak must earn

Existing controls typically govern:

```text
Is THIS transaction allowed?
```

ChainBreak's specialized layer governs:

```text
Was THIS transaction still authorized by the user's original intent,
agent capability and accumulated session trajectory?
```

The difference must be visible in the demo.

### Smallest correction

Make a transaction that passes a naive per-transaction rule but fails the **session intent envelope**.

Example:

```text
User intent:
"Pay Alice 50 USDC for invoice INV-14."

Tx 1:
50 USDC → Alice          ALLOW

Compromised agent:
50 USDC → Mallory        BLOCK

Alternative stronger attack:
40 USDC → Alice          ALLOW
50 USDC → Alice          ALLOW
30 USDC → Alice          BLOCK

because the task envelope was:
MAX TOTAL = 100 USDC
```

---

## 1.6 Is AI actually necessary?

**For security enforcement: NO.**

**For natural-language intent compilation: YES, optionally useful.**

The current ChainBreak architecture already has the right philosophy: the LLM extracts semantics; deterministic code makes the security decision.

For Web3 this becomes even more important because transaction semantics are encoded deterministically in calldata and transaction fields.

### Smallest correction

AI may produce:

```text
"Send 50 USDC to Alice on Sepolia for invoice INV-14."
        ↓
IntentEnvelope
```

AI must NOT decide:

```text
ALLOW / BLOCK
```

And AI must NOT be trusted as the source of truth for actual calldata.

---

## 1.7 Is the differentiation real?

**Only after narrowing.**

The following are weak differentiators:

- spend limits,
- recipient allowlists,
- contract allowlists,
- threat scoring,
- transaction simulation,
- generic agent monitoring.

The real differentiator is the combination:

```text
User Intent
     +
Actual Transaction
     +
Agent Capability
     +
Session Trajectory
     +
Deterministic Enforcement
     +
Counterfactual Proof
```

### Smallest correction

Make **intent drift across multiple agent actions** the flagship attack.

---

## 1.8 Is the MVP technically achievable?

**YES, if aggressively constrained.**

Achievable:

- EVM transaction schema,
- ERC-20 transfer decoding,
- deterministic policy engine,
- session state,
- one real testnet execution,
- local deterministic fallback,
- 10–12 attack fixtures,
- React cockpit.

Dangerous within the hackathon window:

- multi-chain,
- arbitrary DeFi protocols,
- generalized ABI analysis,
- browser-wallet integrations,
- production custody,
- autonomous treasury management.

### Smallest correction

Support only:

```text
EVM
+ ETH transfer
+ ERC-20 transfer
+ one testnet
+ local deterministic fallback
```

---

## 1.9 What can go wrong during the demo?

### Failure modes

1. Public RPC outage / latency.
2. Testnet faucet or balance failure.
3. ABI decoding edge case.
4. Nonce or gas failure.
5. Private-key/signing integration failure.
6. Frontend/backend race.
7. The judge cannot see that blocked means “not broadcast.”
8. The attack is not reproducible.
9. The demo looks like a static transaction dashboard.
10. The model produces an unexpected intent envelope.

### Smallest corrections

- Local deterministic EVM fixture is the primary demo path.
- Testnet is secondary proof.
- Freeze a known-good transaction fixture.
- Use deterministic addresses and token contract fixtures.
- Keep signing/broadcast behind one ChainBreak-owned execution adapter.
- Show `broadcast=false` and `tx_hash=null` on block.
- Keep AI optional in the recorded demo.

---

## 1.10 What will judges criticize?

### Likely attack #1

> “MetaMask/Coinbase already have spend limits.”

**Answer:**

> “Yes. ChainBreak is not another wallet limit. It validates whether the actual transaction still matches the agent's original intent and session capability, and proves the difference against a baseline attack.”

### Likely attack #2

> “Why not just use a smart contract with permissions?”

**Answer:**

> “Onchain permissions can constrain execution authority. ChainBreak operates one layer earlier: it verifies the agent's intent-to-transaction transition and session trajectory before the signing path.”

### Likely attack #3

> “Where is the AI?”

**Answer:**

> “AI compiles the user's natural-language instruction into an intent envelope. The security decision is deterministic because LLMs cannot be the final trust boundary.”

### Likely attack #4

> “Is this actually blockchain security?”

**Answer:**

Show the actual decoded calldata + execution gate + transaction hash for ALLOW and no transaction hash for BLOCK.

### Likely attack #5

> “Those are cherry-picked attacks.”

**Answer:**

Show the automated evaluation suite with both seeded attacks and safe near-misses.

---

## 1.11 What features are unnecessary?

Cut:

- generic risk score,
- token scanner,
- portfolio view,
- wallet dashboard,
- multi-chain,
- giant DeFi integration,
- natural-language policy builder UI,
- custom blockchain,
- reputation database,
- onchain guard contract unless it becomes trivially reusable.

The current market already has substantial policy, access-control, monitoring and transaction-execution tooling, so duplicating those surfaces wastes the hackathon window. citeturn673042search1turn673042search3turn846842search7

---

## 1.12 What assumptions are dangerous?

### Dangerous assumption A

“Spend limits are novel.”

**False.** Current agentic-wallet products already expose spend controls. citeturn673042search2turn846842search0

### Dangerous assumption B

“An LLM can safely infer the transaction.”

**False.** The actual transaction must be decoded from deterministic fields/calldata.

### Dangerous assumption C

“100% prevention on 12 scenarios means secure.”

**False.** It means the engine passed the defined benchmark.

### Dangerous assumption D

“If the UI says BLOCK, the transaction was prevented.”

**False unless the signing/broadcast path is actually behind ChainBreak.**

### Dangerous assumption E

“A real public-chain transaction is required to prove everything.”

**False.** One real testnet execution plus deterministic local attack replay is the safer combination.

---

# 2. The Five Biggest Weaknesses

## Weakness 1 — Category collision with agentic wallets

### Problem

MetaMask and Coinbase already expose agentic-wallet controls including spending limits and transaction/security checks. citeturn673042search2turn846842search0turn846842search7

### Smallest correction

**Do not compete at the wallet layer.**

Position ChainBreak as an **independent authorization-verification layer above wallet/execution providers**.

### Proof feature

```text
same wallet
same signer
same transaction class

WITHOUT intent integrity:
agent drift succeeds

WITH ChainBreak:
drift blocked before signing
```

---

## Weakness 2 — Current ChainBreak's security semantics are synthetic

### Problem

The uploaded ChainBreak implementation relies on synthetic tool semantics and source inference from tool names.

Examples:

```python
_infer_source(event.tool)
```

and checks tied to names such as:

```text
send_external
send_external_summary
read_customer
```

That logic cannot become the Web3 security boundary.

### Smallest correction

Replace tool-name semantics with:

```text
raw EVM tx
   ↓
strict decoder
   ↓
normalized transaction object
   ↓
policy/invariant engine
```

---

## Weakness 3 — AI necessity can be attacked

### Problem

A judge can remove the LLM and ask:

> “Why can't the same thing be done with normal transaction policy?”

### Smallest correction

Make AI's only high-value job:

```text
natural language intent
        ↓
IntentEnvelope
```

Then deliberately demonstrate:

```text
AI intent = 50 USDC to Alice
ACTUAL calldata = 5000 USDC to Mallory
        ↓
Deterministic mismatch
        ↓
BLOCK
```

This turns AI from a weak add-on into the **untrusted proposer whose output is being protected**.

---

## Weakness 4 — Enforcement could be accused of being simulated

### Problem

A UI can claim “blocked” while the transaction was never actually connected to a signer/broadcaster.

### Smallest correction

Create exactly one owner of execution:

```text
ChainBreakExecutor
```

Only it can call:

```text
sign()
broadcast()
```

Protected path:

```text
ALLOW → executor.sign_and_broadcast()
BLOCK → executor never called
```

Record:

```text
broadcast = false
transaction_hash = null
```

for every blocked case.

---

## Weakness 5 — Counterfactual proof can look like a benchmark gimmick

### Problem

The existing counterfactual runner is excellent, but judges may say:

> “You created the attack and then created a policy that blocks it.”

### Smallest correction

Use the counterfactual proof as **causal evidence**, not the product itself.

Show:

```text
IDENTICAL PROPOSAL
        ↓
┌───────────────────┐
│ Baseline          │
│ executes          │
└───────────────────┘

┌───────────────────┐
│ ChainBreak        │
│ blocks pre-sign   │
└───────────────────┘
```

Then expose exact violated predicates and the actual broadcast state.

---

# 3. KEEP / CHANGE / CUT / ADD

## KEEP

From the original ChainBreak:

- deterministic invariant engine,
- trajectory state accumulation,
- fail-closed semantics,
- action/event contracts,
- pre-execution interception architecture,
- counterfactual replay,
- attack + safe + near-miss test methodology,
- evidence-first cockpit,
- causal `triggered_by` lineage,
- evaluation metrics.

These are the real ChainBreak DNA.

---

## CHANGE

### 1. Semantic layer

**Old:** tool names + LLM semantic classifier.

**New:** intent envelope + deterministic transaction decoder + optional AI compiler.

### 2. State layer

**Old:** sensitive-data / privilege state.

**New:**

```text
session_id
agent_id
intent_envelope
cumulative_spend
allowed_assets
allowed_recipients
allowed_contracts
allowed_methods
chain_id
nonce_history
proposal_history
```

### 3. Invariants

**Old:** data exfiltration boundaries.

**New:**

```text
INTENT_INTEGRITY
CAPABILITY_BOUNDARY
TRAJECTORY_BUDGET
```

### 4. Execution layer

**Old:** synthetic sandbox tool execution.

**New:**

```text
ChainBreakExecutor
    ↓
LocalEVMAdapter
or
TestnetEVMAdapter
```

### 5. Benchmark

**Old:** 20 generic agent security scenarios.

**New:** Web3 adversarial transaction scenarios with explicit expected decisions.

---

## CUT

Remove from the Web3 MVP:

- generic risk score,
- token intelligence database,
- arbitrary DeFi support,
- multi-chain,
- real-money production execution,
- browser-extension wallet integration,
- elaborate policy management UI,
- onchain guard contract unless implementation is already trivial and proven,
- excessive LLM explanation features.

---

## ADD

1. `IntentEnvelope`
2. `TransactionProposal`
3. `DecodedEvmTransaction`
4. `AgentCapability`
5. `TrajectoryState`
6. deterministic calldata decoder
7. ChainBreak-owned execution adapter
8. decision receipt
9. transaction/broadcast proof
10. Web3 attack harness
11. local deterministic EVM fallback
12. exact intent-mutation demo

---

# 4. Locked Feature Score

Scale: **1–10**.

```text
PRIORITY = VALUE + DIFFERENTIATION + DEMO IMPACT + TECHNICAL DEPTH - COST - RISK
```

| Feature | Value | Differentiation | Demo | Tech | Cost | Risk | Priority | Class |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Intent envelope | 10 | 10 | 10 | 9 | 3 | 3 | **33** | P0 |
| Deterministic EVM decoder | 9 | 10 | 10 | 10 | 5 | 4 | **30** | P0 |
| Intent-to-calldata binding | 10 | 10 | 10 | 10 | 5 | 5 | **30** | P0 |
| Capability boundary | 9 | 9 | 9 | 9 | 4 | 3 | **29** | P0 |
| Trajectory budget invariant | 10 | 9 | 10 | 9 | 4 | 3 | **31** | P0 |
| Pre-signing execution gate | 10 | 10 | 10 | 10 | 4 | 4 | **32** | P0 |
| Decision receipt | 8 | 9 | 8 | 9 | 3 | 2 | **29** | P0 |
| Counterfactual replay | 9 | 10 | 10 | 9 | 4 | 2 | **32** | P0 |
| Web3 attack harness | 9 | 10 | 10 | 10 | 5 | 3 | **31** | P0 |
| Local deterministic EVM | 8 | 8 | 9 | 9 | 4 | 3 | **27** | P1 |
| One real testnet execution | 10 | 8 | 10 | 8 | 6 | 7 | **23** | P1 |
| MCP interceptor | 8 | 10 | 8 | 9 | 6 | 5 | **24** | P1 |
| Signed/hash-linked receipt | 7 | 9 | 8 | 10 | 5 | 4 | **25** | P1 |
| Transaction simulation | 8 | 8 | 9 | 9 | 6 | 6 | **22** | P1 |
| DeFi swap integration | 8 | 8 | 10 | 9 | 8 | 8 | **19** | P2 |
| AI policy-authoring UI | 6 | 6 | 7 | 7 | 6 | 5 | **15** | P2 |
| Multi-chain | 6 | 6 | 8 | 8 | 9 | 8 | **11** | P2 |
| Generic risk score | 5 | 3 | 5 | 4 | 3 | 3 | **11** | P3 |
| Portfolio dashboard | 4 | 1 | 3 | 3 | 5 | 3 | **3** | P3 |
| Token scanner/reputation DB | 5 | 2 | 6 | 6 | 8 | 7 | **4** | P3 |

### Build rule

**P0 must work. P1 is added only after P0 is demonstrably stable. P2 is bonus. P3 is prohibited scope.**

---

# 5. Final Hardened Product Concept

## Product name

**ChainBreak-Web3**

## Tagline

> **Deterministic intent integrity for autonomous blockchain agents.**

## One-line pitch

> ChainBreak-Web3 sits between an AI agent and blockchain execution, decoding the actual transaction, comparing it to the user's authorized intent and session trajectory, and blocking unauthorized drift before signing.

## Core trust model

```text
AI is the proposer.
ChainBreak is the verifier.
Wallet is the signer.
Blockchain is the executor.
```

## What makes it technically interesting

The key security problem is not merely:

```text
bad transaction
```

It is:

```text
legitimate task
      ↓
autonomous agent
      ↓
multiple tool/action steps
      ↓
context or parameters drift
      ↓
actual transaction no longer matches authorization
```

ChainBreak proves and blocks that transition.

---

# 6. Locked P0 Security Model

## P0 Invariant A — INTENT_INTEGRITY

```text
Decoded transaction must remain inside the user's authorized intent envelope.
```

Example:

```text
Intent:
asset = USDC
recipient = Alice
max_single = 50
max_total = 100
reason = INV-14

Actual:
asset = USDC
recipient = Mallory
amount = 5000
```

Result:

```text
BLOCK
```

---

## P0 Invariant B — CAPABILITY_BOUNDARY

The agent receives explicit capabilities.

```json
{
  "chain_ids": [11155111],
  "assets": ["USDC"],
  "recipients": ["0xALICE"],
  "contracts": ["0xUSDC"],
  "methods": ["transfer"]
}
```

Anything outside the capability set:

```text
BLOCK
```

---

## P0 Invariant C — TRAJECTORY_BUDGET

Security state accumulates across the session.

```text
40 USDC → ALLOW
50 USDC → ALLOW
30 USDC → BLOCK
```

because:

```text
40 + 50 + 30 = 120 > 100
```

This is the direct Web3 evolution of the original ChainBreak trajectory concept.

---

# 7. Killer Demo

## Act 1 — The legitimate request

```text
USER
"Pay Alice 50 USDC for invoice INV-14."
```

AI generates an intent envelope.

ChainBreak verifies a legitimate transaction.

```text
INTENT        ✓
CAPABILITY    ✓
TRAJECTORY    ✓
CALldata      ✓

ALLOW
```

The execution adapter signs/broadcasts.

Show:

```text
TX HASH: 0x...
```

---

## Act 2 — Agent compromise / mutation

The agent changes the proposal:

```text
50 USDC → Mallory
```

Decoder sees the real calldata.

ChainBreak shows:

```text
EXPECTED RECIPIENT
Alice

ACTUAL RECIPIENT
Mallory

INTENT_INTEGRITY
VIOLATED

████ BLOCKED ████
```

Then show:

```text
broadcast: false
transaction_hash: null
```

---

## Act 3 — Trajectory attack

```text
40 USDC → Alice      ALLOW
50 USDC → Alice      ALLOW
30 USDC → Alice      BLOCK
```

The individual action is valid.

The **session state** is invalid.

This is the most important conceptual carryover from the original ChainBreak.

---

## Act 4 — Counterfactual proof

```text
                 IDENTICAL ATTACK
                        ↓
        ┌───────────────┴───────────────┐
        ↓                               ↓
   BASELINE                         CHAINBREAK
        ↓                               ↓
  transaction                       transaction
   broadcast                        rejected
        ↓                               ↓
 TX HASH EXISTS                    NO TX HASH
        ↓                               ↓
  attacker wins                    state preserved
```

This is the proof moment.

---

## Act 5 — Evaluation harness

Minimum 12 scenarios:

```text
W1  safe ETH transfer
W2  safe ERC20 transfer
W3  recipient mutation
W4  amount mutation
W5  cumulative budget breach
W6  wrong chain
W7  wrong token
W8  wrong contract
W9  unauthorized method
W10 replay / nonce violation
W11 safe near-miss trajectory
W12 malformed/unknown transaction → HOLD
```

Show:

```text
Scenario count
Attack catches
False blocks
Broadcast suppression
Latency
```

---

# 8. Architectural Migration — Existing ChainBreak → ChainBreak-Web3

## 8.1 Migration principle

Do **not** fork the old repo and slowly mutate it.

Create a clean repository:

```text
github.com/hashmessi/ChainBreak-Web3
```

Keep the existing ChainBreak repository untouched.

The old project is the conceptual ancestor and test-methodology reference.

---

## 8.2 Source-to-target mapping

| Existing ChainBreak | ChainBreak-Web3 | Action |
|---|---|---|
| `backend/engine/models.py` | `backend/core/models.py` | Rewrite models for intent + tx + trajectory |
| `classifier.py` | `backend/intent/compiler.py` | Reduce to optional intent compiler |
| `state_manager.py` | `backend/core/trajectory.py` | Rewrite as financial/authorization state |
| `invariants.py` | `backend/core/invariants.py` | Rewrite predicates for Web3 |
| `runner.py` | `backend/core/interceptor.py` | Preserve lifecycle, change execution substrate |
| `sandbox.py` | `backend/chain/adapter.py` | Replace synthetic tool execution |
| `scenarios.py` | `backend/eval/scenarios.py` | Rewrite as Web3 attack corpus |
| `test_invariants.py` | `tests/test_invariants.py` | Preserve test style, replace semantics |
| `test_scenarios.py` | `tests/test_attack_suite.py` | Preserve benchmark discipline |
| `test_api.py` | `tests/test_api.py` | Adapt endpoints |
| `CounterfactualProof.jsx` | `CounterfactualProof.jsx` | Reuse visual pattern |
| `RunTimeline.jsx` | `TrajectoryTimeline.jsx` | Reuse interaction pattern |
| `ViolationPanel.jsx` | `DecisionReceipt.jsx` | Reuse evidence-first pattern |
| `BenchmarkModal.jsx` | `EvaluationPanel.jsx` | Reuse benchmark surface |
| `ActionCard.jsx` | `TransactionCard.jsx` | Rewrite around tx data |
| `App.jsx` | `App.jsx` | New Web3 security cockpit |
| `index.css` | `index.css` | Reuse design tokens selectively |
| Render/Vercel configs | deployment | Copy after core works |

---

# 9. Target Repository Architecture

```text
ChainBreak-Web3/
│
├── backend/
│   ├── core/
│   │   ├── models.py
│   │   ├── intent.py
│   │   ├── trajectory.py
│   │   ├── policy.py
│   │   ├── invariants.py
│   │   ├── decisions.py
│   │   └── interceptor.py
│   │
│   ├── chain/
│   │   ├── decoder.py
│   │   ├── adapter.py
│   │   ├── local_evm.py
│   │   ├── testnet.py
│   │   └── fixtures.py
│   │
│   ├── eval/
│   │   ├── scenarios.py
│   │   ├── runner.py
│   │   └── metrics.py
│   │
│   ├── api/
│   │   └── main.py
│   │
│   └── tests/
│
├── frontend/
│   └── src/
│       ├── App.jsx
│       ├── components/
│       │   ├── IntentPanel.jsx
│       │   ├── TransactionCard.jsx
│       │   ├── TrajectoryTimeline.jsx
│       │   ├── DecisionReceipt.jsx
│       │   ├── CounterfactualProof.jsx
│       │   └── EvaluationPanel.jsx
│       └── index.css
│
├── contracts/
│   └── optional/
│
├── fixtures/
├── README.md
└── plan.md
```

---

# 10. Core Data Contracts

## IntentEnvelope

```python
class IntentEnvelope(BaseModel):
    intent_id: str
    user_goal: str
    chain_id: int
    allowed_assets: list[str]
    allowed_recipients: list[str]
    allowed_contracts: list[str]
    allowed_methods: list[str]
    max_single_value: int
    max_session_value: int
    expected_reason: str | None
```

## TransactionProposal

```python
class TransactionProposal(BaseModel):
    chain_id: int
    to: str
    value: int
    data: str
    nonce: int | None = None
    gas_limit: int | None = None
```

## DecodedEvmTransaction

```python
class DecodedEvmTransaction(BaseModel):
    chain_id: int
    asset: str
    method: str
    contract: str
    recipient: str | None
    amount: int | None
    raw_to: str
    raw_value: int
    calldata_hash: str
```

## DecisionReceipt

```python
class DecisionReceipt(BaseModel):
    decision: Literal["ALLOW", "HOLD", "BLOCK"]
    intent_id: str
    violated_invariants: list[str]
    state_before_hash: str
    proposal_hash: str
    decoded: DecodedEvmTransaction
    broadcast: bool
    transaction_hash: str | None
    reason: str
```

---

# 11. Build Order

## Phase 0 — Freeze the ancestor

**Time:** 0–1h

- create new repo,
- copy no runtime code yet,
- preserve original ChainBreak.

**Checkpoint:** clean repo with README + plan.

---

## Phase 1 — Strict Web3 models

**Time:** 1–3h

Implement:

- `IntentEnvelope`,
- `TransactionProposal`,
- `DecodedEvmTransaction`,
- `TrajectoryState`,
- `DecisionReceipt`.

**Checkpoint:** all objects validate and serialize deterministically.

---

## Phase 2 — Deterministic decoder

**Time:** 3–7h

Support only:

```text
ETH transfer
ERC20 transfer
```

Decode:

```text
chain
contract
method
recipient
amount
```

**Checkpoint:** known fixture calldata always decodes identically.

---

## Phase 3 — Invariant engine

**Time:** 7–11h

Implement:

```text
INTENT_INTEGRITY
CAPABILITY_BOUNDARY
TRAJECTORY_BUDGET
```

**Checkpoint:** attack fixture matrix returns exact expected decisions.

---

## Phase 4 — Real execution boundary

**Time:** 11–15h

Implement:

```text
ChainBreakExecutor
```

Rules:

```text
ALLOW → signing path available
BLOCK → signer/broadcast functions unreachable
HOLD → signer/broadcast functions unreachable
```

**Checkpoint:** blocked fixture records zero broadcasts.

---

## Phase 5 — Agent simulator + mutations

**Time:** 15–18h

Create:

```text
legitimate agent
compromised agent
parameter mutator
trajectory mutator
```

**Checkpoint:** one click transforms safe intent into malicious proposal and ChainBreak blocks it.

---

## Phase 6 — Counterfactual evaluation

**Time:** 18–21h

Port the existing proof architecture.

Output:

```text
baseline
protected
divergence step
violated invariant
broadcast comparison
```

**Checkpoint:** identical scenario, two execution outcomes.

---

## Phase 7 — Testnet proof

**Time:** 21–24h

One real EVM testnet transfer.

Show:

```text
ALLOW
→ tx hash
```

Then one blocked mutation:

```text
BLOCK
→ no tx hash
```

**Checkpoint:** public explorer proof exists for the allowed transaction.

---

## Phase 8 — Security cockpit

**Time:** 24–28h

One-screen flow:

```text
Intent
  ↓
Agent Proposal
  ↓
Decoded Tx
  ↓
Policy Checks
  ↓
Trajectory State
  ↓
ALLOW / BLOCK
  ↓
Broadcast Proof
```

Do not turn this into an analytics dashboard.

---

## Phase 9 — Evaluation suite

**Time:** 28–31h

Minimum:

```text
12 core scenarios
+ safe near-misses
+ malformed cases
+ replay case
```

Mutation testing:

```text
recipient
amount
asset
chain
contract
method
budget
intent
nonce
```

**Checkpoint:** critical seeded mutations all caught.

---

## Phase 10 — Submission package

**Time:** 31–36h

Create:

- README,
- architecture diagram,
- 6-slide deck,
- 90–120 sec demo,
- benchmark screenshot,
- one real transaction hash,
- Devpost write-up.

---

## Phase 11 — Final hardening

**Time:** final 2–3h

Do only:

- fix bugs,
- rerun tests,
- rerun demo,
- verify clean repo,
- verify no secrets,
- record final video,
- submit.

**No new features.**

---

# 12. Acceptance Criteria — P0 Definition of Done

## Security

- [ ] Actual EVM transaction is decoded deterministically.
- [ ] LLM cannot directly return ALLOW/BLOCK.
- [ ] Intent mismatch produces BLOCK.
- [ ] Capability violation produces BLOCK.
- [ ] Cumulative budget violation produces BLOCK.
- [ ] HOLD is fail-closed.
- [ ] BLOCK prevents signer/broadcast invocation.
- [ ] Every decision has a receipt.

## Proof

- [ ] Baseline can complete seeded attack trajectory.
- [ ] Protected path stops before signing/broadcast.
- [ ] Blocked case has `broadcast=false`.
- [ ] Blocked case has `transaction_hash=null`.
- [ ] Safe case produces a real testnet hash.
- [ ] Evaluation suite is reproducible.

## UX

- [ ] Judge can understand the attack in under 20 seconds.
- [ ] Judge can see the actual transaction fields.
- [ ] Judge can see the exact invariant that fired.
- [ ] Judge can see whether a broadcast occurred.
- [ ] Counterfactual proof is one click away.

---

# 13. Demo Script — Locked

## 0:00–0:15 — Problem

> “The problem isn't only whether an agent can make a transaction. It's whether the transaction still matches what the user authorized after the agent acts autonomously.”

## 0:15–0:35 — Safe execution

```text
50 USDC → Alice
```

Show:

```text
Intent ✓
Capability ✓
Transaction ✓
ALLOW
TX HASH
```

## 0:35–1:00 — Mutation attack

```text
50 USDC → Mallory
```

Show:

```text
ACTUAL ≠ INTENT
BLOCK
NO BROADCAST
```

## 1:00–1:25 — Trajectory attack

```text
40 + 50 + 30 > 100
```

Show:

```text
first two allowed
third blocked
```

## 1:25–1:45 — Counterfactual proof

```text
Baseline → transaction exists
ChainBreak → transaction never broadcast
```

## 1:45–2:00 — Evaluation

```text
12 scenarios
attack catch rate
safe-path behavior
latency
```

Final line:

> **“LLMs can propose actions. ChainBreak verifies whether those actions are still authorized before blockchain execution.”**

---

# 14. Strategic Judge Positioning

## Do not claim

> “Nobody else has transaction policies.”

That would be easy to falsify.

## Claim

> “Existing wallet and execution layers can enforce transaction-level controls. ChainBreak specializes in verifying the relationship between the user's intent, the agent's proposed transaction, and the agent's cumulative trajectory before the execution layer signs.”

This makes ChainBreak complementary rather than pretending the entire market does not exist.

---

# 15. Final Product Boundary

### The product boundary is exactly here

```text
                    USER
                     │
                     ▼
               INTENT ENVELOPE
                     │
                     ▼
                AI AGENT
                     │
             proposed transaction
                     │
                     ▼
          ┌────────────────────────┐
          │     CHAINBREAK-WEB3    │
          │                        │
          │ Decode                 │
          │ Bind to intent        │
          │ Check capabilities    │
          │ Update trajectory     │
          │ Evaluate invariants   │
          │ Emit receipt          │
          └───────────┬────────────┘
                      │
              ┌───────┴───────┐
              ▼               ▼
            BLOCK           ALLOW
              │               │
              ×               ▼
                      WALLET / SIGNER
                              │
                              ▼
                          BLOCKCHAIN
```

---

# 16. Final Lock — What Wins This Hackathon

The winning version is **not** the one with the most Web3 integrations.

It is the one where the judge can immediately observe:

```text
1. A real user intent.
2. An autonomous agent proposal.
3. The exact raw transaction.
4. The exact decoded transaction.
5. A deterministic invariant violation.
6. A real pre-signing/pre-broadcast block.
7. A baseline where the same attack succeeds.
8. An automated test suite proving repeatability.
```

The whole product can be understood through one attack:

```text
AUTHORIZED INTENT
       ↓
AGENT DRIFTS
       ↓
ACTUAL CALldata CHANGES
       ↓
CHAINBREAK CATCHES DRIFT
       ↓
NO SIGN
       ↓
NO BROADCAST
```

### Locked sentence

> **ChainBreak-Web3 is the deterministic trust boundary between autonomous agent intent and irreversible blockchain execution.**

That is the product. Everything that does not strengthen that sentence is secondary.

---

# 17. Competitive Reality Notes (September 2026)

Current products in the agentic-wallet/security category already expose portions of the surface area ChainBreak must avoid duplicating:

- MetaMask Agent Wallet: spend limits, protocol allowlists, transaction simulation, threat scanning and execution controls. citeturn673042search2
- Coinbase Agentic Wallet: per-call and per-session spending limits; current Coinbase Policy Engine can govern signing behavior. citeturn846842search0turn846842search7
- OpenZeppelin Defender: transaction proposals, access control, relayers, monitoring and execution workflows. citeturn673042search1turn673042search3turn673042search0

Therefore the hardened design intentionally moves the differentiation upward:

```text
Wallet-level policy
        ↓
      useful
        but
        not enough

Agent-level intent integrity
        +
Session trajectory enforcement
        +
Counterfactual security proof
        ↓
ChainBreak-Web3
```

---

# 18. Non-Negotiable Strategic Rules

1. **Do not edit the original ChainBreak repo.**
2. **Create a new `ChainBreak-Web3` repo.**
3. **Do not build a generic wallet/security dashboard.**
4. **Do not let an LLM make the security decision.**
5. **Do not claim novelty for generic spend limits/allowlists.**
6. **Do not claim a block unless the signer/broadcast path is actually gated.**
7. **Use deterministic local fixtures as the reliability anchor.**
8. **Use one real testnet transaction as external proof.**
9. **Make the intent-mutation attack the flagship demo.**
10. **Stop building when P0 is demonstrably correct.**
