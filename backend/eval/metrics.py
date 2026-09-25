"""
ChainBreak-Web3 — Evaluation Harness & Benchmark Metrics (EVAL-01, EVAL-02)

Executes all 12 adversarial scenarios programmatically and computes
prevention rate, detection rate, false-block rate, and decision latency.
"""

from __future__ import annotations

import time
from typing import List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field

from backend.core.models import Decision
from backend.chain.local_evm import LocalEVMAdapter
from backend.chain.testnet import TestnetEVMAdapter
from backend.eval.scenarios import get_all_scenarios, SCENARIOS_CORPUS
from backend.eval.runner import run_counterfactual


class ScenarioBenchmarkRow(BaseModel):
    """Benchmark result for a single scenario."""
    model_config = ConfigDict(extra="ignore")

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
    """Aggregated benchmark report across the 12-scenario adversarial test harness."""
    model_config = ConfigDict(extra="ignore")

    total_scenarios: int
    attack_scenarios: int
    safe_scenarios: int
    near_miss_scenarios: int
    malformed_scenarios: int
    attacks_prevented: int
    safe_passed: int
    detection_rate: float        # fraction of attacks/malformed caught
    prevention_rate: float       # fraction of attacks blocked before signing
    false_block_rate: float      # fraction of safe scenarios falsely blocked
    broadcast_suppression_rate: float
    avg_latency_ms: float
    results: List[ScenarioBenchmarkRow]


def evaluate_all_web3_scenarios(
    substrate: Literal["LOCAL", "TESTNET"] = "LOCAL",
) -> Web3EvaluationReport:
    """
    Executes all 12 scenarios (W1–W12) programmatically through the counterfactual runner.
    Calculates exact benchmark metrics.
    """
    scenarios = get_all_scenarios()
    results: List[ScenarioBenchmarkRow] = []

    attack_count = 0
    attacks_prevented = 0
    safe_count = 0
    safe_passed = 0
    near_miss_count = 0
    malformed_count = 0
    total_latency = 0.0

    broadcast_mode = "REAL_TESTNET" if substrate == "TESTNET" else "SIMULATED_LOCAL"

    for scenario in scenarios:
        adapter_factory = (lambda: TestnetEVMAdapter()) if substrate == "TESTNET" else (lambda: LocalEVMAdapter())
        cf_res = run_counterfactual(scenario, adapter_factory, broadcast_mode=broadcast_mode)

        actual_dec = cf_res.protected.final_decision.value
        expected_dec = scenario.expected_decision.value
        passed = (actual_dec == expected_dec)

        # Categorization
        if scenario.category == "attack":
            attack_count += 1
            if cf_res.attack_prevented or actual_dec == Decision.BLOCK.value or actual_dec == Decision.HOLD.value:
                attacks_prevented += 1
        elif scenario.category == "safe":
            safe_count += 1
            if actual_dec == Decision.ALLOW.value:
                safe_passed += 1
        elif scenario.category == "near_miss":
            near_miss_count += 1
            if actual_dec == scenario.expected_decision.value:
                safe_passed += 1
        elif scenario.category == "malformed":
            malformed_count += 1
            if actual_dec == Decision.HOLD.value:
                attacks_prevented += 1

        total_latency += cf_res.latency_ms
        suppressed = (cf_res.protected.broadcast_count < cf_res.baseline.broadcast_count)

        results.append(ScenarioBenchmarkRow(
            scenario_id=scenario.id,
            name=scenario.name,
            category=scenario.category,
            expected_decision=expected_dec,
            actual_decision=actual_dec,
            baseline_broadcasts=cf_res.baseline.broadcast_count,
            protected_broadcasts=cf_res.protected.broadcast_count,
            broadcast_suppressed=suppressed,
            latency_ms=round(cf_res.latency_ms, 2),
            passed=passed,
        ))

    total_attacks = attack_count + malformed_count
    total_safe = safe_count + near_miss_count

    prevention_rate = (attacks_prevented / total_attacks) if total_attacks > 0 else 1.0
    detection_rate = prevention_rate
    false_blocks = total_safe - safe_passed
    false_block_rate = (false_blocks / total_safe) if total_safe > 0 else 0.0

    suppression_count = sum(1 for r in results if r.broadcast_suppressed)
    suppression_rate = (suppression_count / total_attacks) if total_attacks > 0 else 1.0

    avg_latency = total_latency / len(scenarios) if scenarios else 0.0

    return Web3EvaluationReport(
        total_scenarios=len(scenarios),
        attack_scenarios=attack_count,
        safe_scenarios=safe_count,
        near_miss_scenarios=near_miss_count,
        malformed_scenarios=malformed_count,
        attacks_prevented=attacks_prevented,
        safe_passed=safe_passed,
        detection_rate=round(detection_rate, 4),
        prevention_rate=round(prevention_rate, 4),
        false_block_rate=round(false_block_rate, 4),
        broadcast_suppression_rate=round(suppression_rate, 4),
        avg_latency_ms=round(avg_latency, 2),
        results=results,
    )
