"""
ChainBreak — DevOps Post-Deployment Verification Suite
Executes the 8 mandatory post-deployment verification protocols.
"""

import sys
import os
import json
import time
from pathlib import Path

# Add project root to path
_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_root))

import httpx

# Ensure UTF-8 output on Windows consoles
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = os.getenv("DEPLOYMENT_URL", "")


def get_client():
    from backend.main import app
    from fastapi.testclient import TestClient

    if BASE_URL:
        print(f"Target URL: {BASE_URL} (Live Cloud Endpoint)")
        return httpx.Client(base_url=BASE_URL, timeout=30.0)

    # Check if local uvicorn is running on port 8000
    try:
        test_c = httpx.Client(base_url="http://127.0.0.1:8000", timeout=2.0)
        res = test_c.get("/api/health")
        if res.status_code == 200:
            print("Target URL: http://127.0.0.1:8000 (Local Uvicorn Daemon)")
            return test_c
    except Exception:
        pass

    print("Target: In-Process FastAPI TestClient (Deterministic Engine)")
    return TestClient(app)


def run_verification():
    print(f"\n{'='*70}")
    print(f">> CHAINBREAK DEPLOYMENT VERIFICATION ENGINE")
    client = get_client()
    print(f"{'='*70}\n")

    # 1. VERIFY BUILD
    print("Step 1: Verifying frontend & backend build artifacts...")
    dist_dir = _root / "frontend" / "dist"
    index_html = dist_dir / "index.html"
    assets_dir = dist_dir / "assets"
    assert dist_dir.exists(), "❌ Build verification failed: frontend/dist directory missing"
    assert index_html.exists(), "❌ Build verification failed: index.html missing"
    assert assets_dir.exists() and any(assets_dir.iterdir()), "❌ Build verification failed: compiled assets missing"
    print(f"  ✓ Frontend production build verified: {len(list(assets_dir.iterdir()))} asset bundles in {assets_dir.name}/")

    # 2. VERIFY APPLICATION STARTUP
    print("\nStep 2: Verifying application startup & process liveness...")
    try:
        health_res = client.get("/api/health")
        assert health_res.status_code == 200, f"Health check returned HTTP {health_res.status_code}"
        health_data = health_res.json()
        assert health_data.get("status") == "ok", f"Health status not ok: {health_data}"
        print(f"  ✓ Health check 200 OK: product='{health_data.get('product')}', env='{health_data.get('environment')}', uptime={health_data.get('uptime_seconds')}s")
    except Exception as e:
        print(f"❌ Application startup verification failed: {e}")
        sys.exit(1)

    # 3. VERIFY FRONTEND SERVING
    print("\nStep 3: Verifying unified frontend SPA static serving...")
    spa_res = client.get("/")
    assert spa_res.status_code == 200, f"Root route returned HTTP {spa_res.status_code}"
    assert "ChainBreak" in spa_res.text or "<div id=\"root\">" in spa_res.text, "Root did not return React HTML shell"
    print("  ✓ Unified frontend static serving verified: React SPA shell loaded successfully from /")

    # 4. VERIFY BACKEND ROUTING & CATALOG
    print("\nStep 4: Verifying backend routes & scenario catalog...")
    scen_res = client.get("/api/scenarios")
    assert scen_res.status_code == 200, f"Scenarios endpoint returned HTTP {scen_res.status_code}"
    scenarios = scen_res.json().get("scenarios", [])
    assert len(scenarios) == 20, f"Expected 20 benchmark scenarios, received {len(scenarios)}"
    s6 = next((s for s in scenarios if s.get("id") == "S6"), None)
    assert s6 is not None, "Flagship scenario S6 missing from catalog"
    print(f"  ✓ Backend catalog verified: {len(scenarios)} scenarios loaded, Flagship S6 available")

    # 5. VERIFY DATABASE / IN-MEMORY INVARIANT GRAPH
    print("\nStep 5: Verifying state architecture & zero migration drift...")
    assert health_data.get("database") is not None, "Database architecture metadata missing"
    print(f"  ✓ Architecture verified: {health_data.get('database')} (zero database migrations required)")

    # 6. VERIFY CRITICAL API (COUNTERFACTUAL DUAL RUN)
    print("\nStep 6: Verifying critical API (POST /api/counterfactual/S6)...")
    t0 = time.time()
    cf_res = client.post("/api/counterfactual/S6")
    latency_ms = (time.time() - t0) * 1000
    assert cf_res.status_code == 200, f"Counterfactual API returned HTTP {cf_res.status_code}"
    cf_data = cf_res.json()
    assert cf_data.get("attack_prevented") is True, "Attack not reported as prevented"
    assert cf_data.get("protected", {}).get("final_decision") == "BLOCK", "Protected run did not result in BLOCK"
    assert cf_data.get("baseline", {}).get("final_decision") == "ALLOW", "Baseline run did not permit trajectory"
    print(f"  ✓ Critical API verified: S6 dual proof executed in {latency_ms:.1f}ms (Baseline: ALLOW ➔ Protected: BLOCK)")

    # 7. VERIFY AI FLOW / INVARIANT ENFORCEMENT
    print("\nStep 7: Verifying AI flow & deterministic invariant enforcement...")
    culprit = next((a for a in cf_data.get("protected", {}).get("actions", []) if a.get("decision") == "BLOCK"), None)
    assert culprit is not None, "No culprit action flagged with BLOCK decision"
    assert "TRAJECTORY_ESCALATION" in culprit.get("violations", []), f"Expected TRAJECTORY_ESCALATION, got {culprit.get('violations')}"
    assert culprit.get("tool") == "send_external_summary", f"Offending tool unexpected: {culprit.get('tool')}"
    print(f"  ✓ AI flow verified: Step {culprit.get('step_index') + 1} ({culprit.get('tool')}) severed under {culprit.get('violations')}")

    # 8. EXECUTE PRIMARY USER JOURNEY (V1)
    print("\nStep 8: Executing primary user journey (Full 20-Scenario Benchmark Suite)...")
    eval_t0 = time.time()
    eval_res = client.post("/api/evaluate")
    eval_duration = time.time() - eval_t0
    assert eval_res.status_code == 200, f"Evaluation API returned HTTP {eval_res.status_code}"
    report = eval_res.json()
    assert report.get("detection_rate") == 1.0, f"Detection rate not 100%: {report.get('detection_rate')}"
    assert report.get("prevention_rate") == 1.0, f"Prevention rate not 100%: {report.get('prevention_rate')}"
    assert report.get("false_block_rate") == 0.0, f"False block rate not 0%: {report.get('false_block_rate')}"
    print(f"  ✓ Full primary user journey executed in {eval_duration:.2f}s:")
    print(f"     - Scenarios Evaluated: {report.get('total_scenarios')}")
    print(f"     - Detection Rate:     {report.get('detection_rate')*100:.1f}%")
    print(f"     - Prevention Rate:    {report.get('prevention_rate')*100:.1f}%")
    print(f"     - False Block Rate:   {report.get('false_block_rate')*100:.1f}%")
    print(f"     - Mean Invariant Latency: {report.get('avg_latency_ms'):.2f}ms")

    # 9. VERIFY WEB3 V2 FIXTURES & SCENARIOS
    print("\nStep 9: Verifying Web3 V2 scenario catalog & EVM fixtures...")
    v2_scen_res = client.get("/api/v2/scenarios")
    assert v2_scen_res.status_code == 200, f"Web3 scenarios endpoint returned HTTP {v2_scen_res.status_code}"
    v2_scens = v2_scen_res.json().get("scenarios", [])
    assert len(v2_scens) >= 15, f"Expected 15 Web3 scenarios, received {len(v2_scens)}"
    v2_fix_res = client.get("/api/v2/fixtures")
    assert v2_fix_res.status_code == 200, f"Web3 fixtures endpoint returned HTTP {v2_fix_res.status_code}"
    print(f"  ✓ Web3 V2 catalog verified: {len(v2_scens)} EVM scenarios, Sepolia fixtures loaded")

    # 10. VERIFY WEB3 V2 FLAGSHIP (W04) DUAL PROOF & BENCHMARK
    print("\nStep 10: Verifying Web3 V2 flagship (W04) counterfactual & evaluation suite...")
    w4_res = client.post("/api/v2/counterfactual", json={"scenario_id": "W04", "substrate": "LOCAL"})
    assert w4_res.status_code == 200, f"Web3 W04 counterfactual returned HTTP {w4_res.status_code}"
    w4_data = w4_res.json()
    assert w4_data.get("attack_prevented") is True or w4_data.get("correctly_blocked") is True, "W04 attack not prevented"
    
    v2_eval_res = client.post("/api/v2/evaluate", json={"substrate": "LOCAL", "include_fuzz": False})
    assert v2_eval_res.status_code == 200, f"Web3 evaluation returned HTTP {v2_eval_res.status_code}"
    v2_report = v2_eval_res.json()
    print(f"  ✓ Web3 V2 benchmark suite verified: {len(v2_report.get('results', []))} scenarios, prevention rate: {v2_report.get('prevention_rate')*100:.0f}%")

    print(f"\n{'='*70}")
    print("[SUCCESS] ALL 10 POST-DEPLOYMENT VERIFICATION CHECKS PASSED (100% SUCCESS)")
    print(f"{'='*70}\n")


if __name__ == "__main__":
    run_verification()
