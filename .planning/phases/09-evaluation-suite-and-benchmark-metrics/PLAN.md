# Phase 9 Plan: Evaluation Suite & Benchmark Metrics

## Goal
Implement a 12-scenario adversarial test harness measuring attack detection, prevention, false blocks, broadcast suppression, and execution latency, and integrate an interactive Evaluation Panel in the frontend.

## Requirements Covered
- `EVAL-01`: 12-scenario adversarial test harness (W1–W12: safe, mutations, budget breaches, wrong chain, wrong contract, unauthorized method, replay, near-miss, malformed).
- `EVAL-02`: Automated evaluation runner calculating detection rate, prevention rate, false-block rate, and decision latency.
- `EVAL-03`: `EvaluationPanel` in frontend displaying live evaluation metrics and scenario run matrix.

## Architecture & Design Decisions
1. **Module Location**:
   - `backend/eval/metrics.py`: Evaluator engine and benchmark metrics calculator.
   - `backend/main.py`: `POST /api/v2/evaluate` endpoint.
   - `frontend/src/components/EvaluationPanel.jsx`: Live benchmark visualizer.
2. **Benchmark Data Models**:
   ```python
   class ScenarioBenchmarkRow(BaseModel):
       scenario_id: str
       name: str
       category: str
       expected_decision: str
       actual_decision: str
       baseline_broadcasts: int
       protected_broadcasts: int
       broadcast_suppressed: bool
       latency_ms: float
       passed: bool

   class Web3EvaluationReport(BaseModel):
       total_scenarios: int
       attack_scenarios: int
       safe_scenarios: int
       near_miss_scenarios: int
       malformed_scenarios: int
       detection_rate: float        # Attacks detected (1.0 = 100%)
       prevention_rate: float       # Attacks blocked before signing (1.0 = 100%)
       false_block_rate: float      # Safe scenarios falsely blocked (0.0 = 0%)
       avg_latency_ms: float        # Mean pre-signing latency
       results: list[ScenarioBenchmarkRow]
   ```
3. **Frontend Integration**:
   - Add "Benchmark Matrix" tab to `frontend/src/App.jsx`.
   - Implement `EvaluationPanel.jsx` rendering metric cards (100% Prevention Rate, 0% False Blocks, Mean Latency) and tabular run matrix with live execution triggers.

## Implementation Steps
1. Create `backend/eval/metrics.py` implementing `evaluate_all_web3_scenarios()`.
2. Add `POST /api/v2/evaluate` endpoint in `backend/main.py`.
3. Create `backend/tests/test_evaluation_metrics.py`.
4. Create `frontend/src/components/EvaluationPanel.jsx` and wire it into `frontend/src/App.jsx`.
5. Run `pytest` and `npm run build` to verify.

## Verification
- Run `pytest backend/tests/test_evaluation_metrics.py` (verify 100% prevention rate, 0% false blocks, sub-50ms latency).
- Run `npm run build` in `frontend/`.
