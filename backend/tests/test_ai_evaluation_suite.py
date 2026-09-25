"""
Pytest integration for the 54-case AI Evaluation Suite (backend/eval/ai_eval_harness.py)
Validates all 8 operational slices:
- normal, difficult, ambiguous, adversarial, empty, invalid, long, unexpected
"""

import pytest
from backend.eval.ai_eval_harness import create_evaluation_dataset, run_evaluation_suite


@pytest.mark.asyncio
async def test_full_ai_evaluation_suite_100_percent():
    """Verify that all 54 evaluation test cases pass with zero crashes."""
    report = await run_evaluation_suite()

    # 1. Zero unhandled crashes
    assert report["summary"]["crashed"] == 0, f"AI system crashed on {report['summary']['crashed']} test cases"

    # 2. Overall pass rate must be 100%
    assert report["summary"]["overall_pass_rate"] == 1.0, (
        f"Expected 100% pass rate, got {report['summary']['overall_pass_rate']*100:.1f}%. "
        f"Failed test cases: {[f['id'] for s in report['slice_metrics'].values() for f in s['failures']]}"
    )

    # 3. Verify each slice independently
    expected_slices = ["normal", "difficult", "ambiguous", "adversarial", "empty", "invalid", "long", "unexpected"]
    for s in expected_slices:
        assert s in report["slice_metrics"]
        assert report["slice_metrics"][s]["pass_rate"] == 1.0
        assert report["slice_metrics"][s]["crashed"] == 0
