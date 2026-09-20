# ChainBreak ⚡

> **Deterministic Runtime Invariant Engine for Autonomous Agent Trajectories**  
> *Halting multi-step AI agent data exfiltration through stateful causal lineage tracking and mathematical boundary contracts.*

[![Python](https://img.shields.io/badge/Python-3.12-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF.svg)](https://vitejs.dev/)
[![Tests](https://img.shields.io/badge/Tests-44%2F44%20Passed-brightgreen.svg)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 1. Product Overview
**ChainBreak** is a lightweight, deterministic runtime security engine designed for autonomous AI agents. Unlike traditional AI guardrails that inspect actions in isolation at the network perimeter, ChainBreak constructs an evolving causal lineage graph across the entire agent lifecycle, enforcing mathematical invariants in code before network sockets open.

---

## 2. The Problem
Modern perimeter guardrails evaluate tool invocations in isolation:
* **Step 1**: `read_public_data` ──▶ **ALLOW** (Harmless public read)
* **Step 2**: `read_customer_context` ──▶ **ALLOW** (Authorized internal CRM query)
* **Step 3**: `generate_content` ──▶ **ALLOW** (Local synthesis)
* **Step 4**: `send_external_summary` ──▶ **ALLOW** (Legitimate communication tool)

Every single action passes standard RBAC and perimeter firewall checks. However, when chained by an autonomous agent, the **accumulated state** results in confidential customer PII being exfiltrated to an external webhook. Perimeter firewalls have **zero cross-step memory** and are fundamentally blind to multi-step trajectory escalation.

---

## 3. The Solution
ChainBreak treats an agent's execution not as isolated calls, but as an evolving causal trajectory:
1. **Lineage Tracking**: Tracks causal antecedents (`triggered_by: [1, 2, 3]`), sensitivity, and target destinations across steps.
2. **Deterministic Enforcement**: Replaces slow, probabilistic LLM prompts with pure Python mathematical invariant contracts.
3. **Zero-Egress Interception**: Execution is severed at the exact step of escalation, dropping payloads before any bytes reach the socket.

---

## 4. Key Features
* **Dual-Track Counterfactual Proof**: Runs simultaneous side-by-side executions—**Baseline** (unprotected breach) vs. **Protected** (ChainBreak severance)—verifying the exact point of divergence.
* **Sub-Millisecond Overhead**: Evaluates pure Python invariant checks in `< 0.2ms` mean latency.
* **Fail-Closed Security Posture**: Unknown tools, corrupted schemas, or model timeouts strictly resolve to `HOLD` (never failing open).
* **Automated 20-Scenario Benchmark Suite**: Built-in verification testing across 6 Attacks, 5 Safe tasks, 4 Near-Miss workflows, 3 Failure modes, and 2 Unknown tools (100% attack interception, 0% false blocks).
* **Editorial Security Cockpit**: React-based obsidian interface providing real-time trajectory streaming, step parameter inspection, and counterfactual proof graphs.
* **Operational AI Telemetry Drawer**: Live explanations of triggered invariants, causal antecedents, and remediation impact.

---

## 5. Architecture

```
                  ┌─────────────────────────────────────────┐
                  │      Autonomous AI Agent Trajectory     │
                  └────────────────────┬────────────────────┘
                                       │ Tool Dispatch Loop
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │        @agent.on_tool_call Hook         │
                  └────────────────────┬────────────────────┘
                                       │
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │    LLM Semantic Metadata Extractor      │
                  │ (OpenRouter / Liquid-LFM or Local Cache)│
                  │  Extracts: Intent, Sensitivity, Dest    │
                  └────────────────────┬────────────────────┘
                                       │ Structured Metadata
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │      Cumulative State Manager           │
                  │ (Tracks Causal DAG, Antecedents, Memory)│
                  └────────────────────┬────────────────────┘
                                       │ Evolving State Vector
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │    Deterministic Invariant Engine       │
                  │   (Pure Python Mathematical Contracts)  │
                  └────────────────────┬────────────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    │                                     │
             [ALLOW]│                                     │[BLOCK / HOLD]
                    ▼                                     ▼
        ┌───────────────────────┐             ┌───────────────────────┐
        │  Dispatch to Sandbox  │             │ Sever Socket Adapter  │
        │   & Record Telemetry  │             │ Zero Bytes Exfiltrated│
        └───────────────────────┘             └───────────────────────┘
```

---

## 6. Tech Stack
* **Backend**: Python 3.12, FastAPI, Uvicorn, Pydantic v2, HTTPX
* **Frontend**: React 18, Vite 5, Tailwind CSS, Lucide React
* **Testing**: Pytest, Pytest-Asyncio, HTTPX TestClient (44 automated tests)
* **Cloud & Containerization**: Docker, Render Blueprint (`render.yaml`), Vercel (`vercel.json`)

---

## 7. AI Architecture
ChainBreak implements a strict separation of concerns between semantic interpretation and deterministic enforcement:
* **Semantic Classifier** (`backend/engine/classifier.py`): Converts raw tool names and arguments into structured security tags (`data_sensitivity`, `destination`, `data_classes`, `contains_secret`) via OpenRouter (`liquid/lfm-2.5-2.6b:free`).
* **Zero Decision Authority for LLMs**: The model **never** decides whether to allow or block. It only extracts structured tags.
* **Deterministic Fallback & Local Cache**: If external LLM calls fail, time out, or hit rate limits (429), the classifier automatically engages `_deterministic_fallback`, maintaining 100% uptime with zero external dependencies.

---

## 8. Database
* **In-Memory Causal State**: ChainBreak intentionally operates with **zero external database dependencies**.
* **Design Rationale**: Trajectories are scoped to live agent execution lifecycles. Eliminating database I/O guarantees `< 0.2ms` evaluation latency and ensures sensitive or exfiltrated payloads are never persisted to disk.

---

## 9. API & Integrations

### Core REST API Endpoints (`backend/main.py`)
| Method | Route | Description |
|---|---|---|
| `GET` | `/api/health` | Engine liveness and model provider connectivity |
| `GET` | `/api/scenarios` | Catalog of all 20 benchmark test scenarios |
| `GET` | `/api/scenarios/{id}` | Step-by-step definition and expected outcome of a scenario |
| `POST` | `/api/run` | Execute a single run in `PROTECTED` or `BASELINE` mode |
| `POST` | `/api/run-counterfactual` | Dual-track simultaneous execution returning divergence proof |
| `POST` | `/api/benchmark` | Evaluates all 20 scenarios, computing aggregate accuracy metrics |

### 6-Line Drop-In SDK Integration
```python
from chainbreak import ChainBreakRuntime, InvariantBreach

runtime = ChainBreakRuntime(policy="strict")

# Universal interceptor wrapping agent tool dispatch loops
@agent.on_tool_call
async def intercept(tool_call, context):
    decision = await runtime.evaluate_trajectory(tool_call, context)
    if decision.status == "BLOCK":
        # Trajectory severed before socket transmission: zero network egress
        raise InvariantBreach(decision.violation, lineage=decision.antecedents)
    return await tool_call.execute()
```

---

## 10. Local Setup

### Prerequisites
- Python 3.10+ (Python 3.12 recommended)
- Node.js 18+ and npm

### 1. Backend Setup
```bash
git clone https://github.com/hashmessi/ChainBreak.git
cd ChainBreak

# Setup virtual environment
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run FastAPI backend
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
API server runs at `http://127.0.0.1:8000` (Interactive docs available at `/docs`).

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Access the cockpit interface at `http://localhost:5173/`.

---

## 11. Environment Variables

Create a `.env` file in the project root (see `.env.example`):
```bash
# Optional: OpenRouter API Key for live LLM semantic classification
# (If omitted, engine runs reliably using local deterministic fallback)
OPENROUTER_API_KEY=your_openrouter_key_here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=liquid/lfm-2.5-2.6b:free

# Server Configuration
ENVIRONMENT=development
PORT=8000
LOG_LEVEL=INFO
```

---

## 12. Deployment

* **Live Demo**: Hosted on Render (`https://chainbreak.onrender.com`).
* **Render Unified Service** (`render.yaml`): Builds the React frontend and packages it directly with the FastAPI backend into a single service:
  ```yaml
  buildCommand: "npm --prefix frontend install && npm --prefix frontend run build && pip install -r requirements.txt"
  startCommand: "uvicorn backend.main:app --host 0.0.0.0 --port $PORT"
  ```
* **Docker Deployment**:
  ```bash
  docker compose up --build
  ```

---

## 13. Testing
ChainBreak includes a comprehensive automated test suite verifying invariants, counterfactual divergence, and fail-closed handling:

```bash
python -m pytest backend/tests/ -v
```

* **Test Breakdown (44/44 Passed in < 0.7s)**:
  - `test_api.py` (11 tests): Endpoints, error handling, and counterfactual runners
  - `test_invariants.py` (7 tests): Mathematical boundary contracts and fail-closed resolution
  - `test_sandbox.py` (10 tests): Isolated tool execution and unknown tool containment
  - `test_scenarios.py` (15 tests): 20-scenario benchmark verification, sequence ablation, and session isolation
  - `test_live_openrouter.py` (1 test): External LLM classifier integration check

---

## 14. Known Limitations
1. **In-Memory Trajectory State**: Trajectory graphs are currently maintained in memory per runtime instance. Multi-agent swarms operating across distributed nodes require external state persistence (e.g., Redis) for cross-node causal synchronization.
2. **Synchronous Tool Dispatch**: Tool calls are evaluated in sequential sequence order; concurrent tool calls dispatched in the same agent turn are evaluated sequentially by sequence index.
3. **Simulated Sandbox Tools**: Benchmark scenarios execute within a controlled internal mock tool sandbox for deterministic, reproducible evaluation rather than firing live unauthenticated webhooks.

---

## 15. Future Improvements
1. **Distributed Causal State Sync**: Implementing Redis / Dragonfly backends for cross-instance state synchronization in multi-agent swarms (CrewAI / AutoGen).
2. **Kernel-Level Socket Termination (eBPF)**: Intercepting and terminating unauthorized outgoing network packets directly at the Linux kernel level for defense-in-depth.
3. **Automated Policy Generation**: Automatically parsing OpenAPI schemas and corporate RBAC configurations to synthesize custom trajectory invariants.

---

## License
MIT License. Designed and engineered for runtime AI agent security.
