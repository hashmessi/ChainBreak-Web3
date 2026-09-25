"""
ChainBreak-Web3 Evaluation, Attack Suite & Counterfactual Proof Engine
"""

from .scenarios import (
    Web3Scenario,
    get_scenario_by_id,
    get_all_scenarios,
    create_legitimate_eth_proposal,
    create_legitimate_erc20_proposal,
    mutate_recipient,
    mutate_amount,
    mutate_contract,
    mutate_method,
    mutate_chain,
    mutate_nonce,
    create_trajectory_attack,
    SCENARIOS_CORPUS,
)
from .models import (
    TrajectoryExecutionReport,
    CausalLineage,
    Web3CounterfactualResult,
)
from .runner import (
    run_baseline_trajectory,
    run_protected_trajectory,
    run_counterfactual,
)
from .metrics import (
    ScenarioBenchmarkRow,
    Web3EvaluationReport,
    evaluate_all_web3_scenarios,
)

__all__ = [
    "Web3Scenario",
    "get_scenario_by_id",
    "get_all_scenarios",
    "create_legitimate_eth_proposal",
    "create_legitimate_erc20_proposal",
    "mutate_recipient",
    "mutate_amount",
    "mutate_contract",
    "mutate_method",
    "mutate_chain",
    "mutate_nonce",
    "create_trajectory_attack",
    "SCENARIOS_CORPUS",
    "TrajectoryExecutionReport",
    "CausalLineage",
    "Web3CounterfactualResult",
    "run_baseline_trajectory",
    "run_protected_trajectory",
    "run_counterfactual",
    "ScenarioBenchmarkRow",
    "Web3EvaluationReport",
    "evaluate_all_web3_scenarios",
]
