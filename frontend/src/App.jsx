import React, { useState, useEffect, useRef } from 'react';
import {
  Shield, Layers, GitCompare, BarChart3,
  AlertCircle, Play
} from 'lucide-react';
import ScenarioSelector from './components/ScenarioSelector';
import ArchitectureBrief from './components/ArchitectureBrief';
import AiSummaryBot from './components/AiSummaryBot';
import BenchmarkModal from './components/BenchmarkModal';
import RunTimeline from './components/RunTimeline';
import CounterfactualProof from './components/CounterfactualProof';
import PitchSequenceBar from './components/PitchSequenceBar';
import BrutalMatrix from './components/BrutalMatrix';

const TABS = [
  { key: 'scenarios', label: '15 Scenarios', icon: Shield, badgeKey: 'scenariosCount' },
  { key: 'pipeline', label: 'Interception', icon: Layers, badgeKey: 'stepCount' },
  { key: 'counterfactual', label: 'Dual Proof', icon: GitCompare, badgeKey: 'proofReady' },
  { key: 'matrix', label: 'Brutal Matrix', icon: BarChart3, badgeKey: 'matrixCount' },
];

export default function App() {
  const [health, setHealth] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [fixtures, setFixtures] = useState(null);
  const [loading, setLoading] = useState(true);

  // Guard against redundant auto-runs when handleRunProof runs
  const isRunningProofRef = useRef(false);

  // Active Selection
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [activeSubstrate, setActiveSubstrate] = useState('LOCAL'); // LOCAL | TESTNET
  const [activeRunMode, setActiveRunMode] = useState('PROTECTED');  // PROTECTED | BASELINE
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  // Execution Results
  const [runReport, setRunReport] = useState(null);
  const [counterfactualResult, setCounterfactualResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runError, setRunError] = useState(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState('scenarios');

  // Benchmark Modal State
  const [isBenchmarkModalOpen, setIsBenchmarkModalOpen] = useState(false);
  const [benchmarkReport, setBenchmarkReport] = useState(null);
  const [isBenchmarkLoading, setIsBenchmarkLoading] = useState(false);

  // AI Summary Bot Drawer Open State
  const [isAiBotOpen, setIsAiBotOpen] = useState(false);

  // Load scenarios & fixtures on mount
  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        const [scenRes, fixRes, healthRes] = await Promise.all([
          fetch('/api/v2/scenarios'),
          fetch('/api/v2/fixtures'),
          fetch('/api/health'),
        ]);

        if (scenRes.ok) {
          const scenData = await scenRes.json();
          if (mounted) {
            const scens = scenData.scenarios || [];
            setScenarios(scens);
            // Default to W04 Trust-Then-Hijack flagship attack
            const initial = scens.find((s) => s.id === 'W04') || scens.find((s) => s.id === 'W4') || scens[0];
            setSelectedScenario(initial);

            // Pre-load counterfactual proof for default flagship so Proof tab is primed
            if (initial) {
              fetch('/api/v2/counterfactual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scenario_id: initial.id, substrate: 'LOCAL' }),
              })
                .then((r) => (r.ok ? r.json() : null))
                .then((proof) => {
                  if (mounted && proof) setCounterfactualResult(proof);
                })
                .catch(() => {});
            }
          }
        }

        if (fixRes.ok) {
          const fixData = await fixRes.json();
          if (mounted) setFixtures(fixData);
        }

        if (healthRes.ok) {
          const healthData = await healthRes.json();
          if (mounted) setHealth(healthData);
        }
      } catch (err) {
        console.error('Failed to load initial data:', err);
        if (mounted) setRunError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();
    return () => { mounted = false; };
  }, []);

  // Fetch benchmark evaluation report for modal & matrix tab
  const fetchBenchmarkReport = async () => {
    setIsBenchmarkLoading(true);
    try {
      const res = await fetch('/api/v2/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ substrate: activeSubstrate, include_fuzz: true }),
      });
      if (res.ok) {
        const data = await res.json();
        setBenchmarkReport(data);
      }
    } catch (err) {
      console.error('Benchmark fetch failed:', err);
    } finally {
      setIsBenchmarkLoading(false);
    }
  };

  // Auto-fetch benchmark evaluation when Matrix tab is selected
  useEffect(() => {
    if (activeTab === 'matrix' && !benchmarkReport && !isBenchmarkLoading) {
      fetchBenchmarkReport();
    }
  }, [activeTab]);

  const handleOpenBenchmarkModal = () => {
    setIsBenchmarkModalOpen(true);
    if (!benchmarkReport) {
      fetchBenchmarkReport();
    }
  };

  // Safe scenario selector helper
  const handleSelectScenario = (scenario) => {
    if (!scenario) return;
    setActiveStepIndex(0);
    setRunReport(null);
    setSelectedScenario(scenario);
  };

  // Low-level counterfactual fetch — does NOT change tabs (used by handleRunProof)
  const fetchCounterfactualRaw = async (scenarioToRun, substrate) => {
    if (!scenarioToRun) return null;
    const res = await fetch('/api/v2/counterfactual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenario_id: scenarioToRun.id,
        substrate: substrate,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Counterfactual run failed');
    }
    return res.json();
  };

  // Run Proof Flow — Strictly Enforces ChainBreak v1 Demo Sequence:
  // Step 1: User clicks "RUN PROOF"
  // Step 2: Navigate to Inspect (Pipeline/Interception) tab immediately.
  //         User inspects the scenario: which step is allowed, which step is attacked/blocked.
  // Step 3: Counterfactual proof is primed and marked PROVED. User proceeds to Proof tab via tab bar or "VIEW DUAL PROOF →" CTA.
  const handleRunProof = async (scen) => {
    if (!scen) return;
    isRunningProofRef.current = true;
    setSelectedScenario(scen);
    setIsRunning(true);
    setRunError(null);
    setActiveStepIndex(0);

    // Step 2: Switch to Inspect (Pipeline / Interception) tab IMMEDIATELY
    setActiveTab('pipeline');

    try {
      // Concurrently run single execution (populates pipeline) & fetch counterfactual proof
      const [runRes, proof] = await Promise.all([
        fetch('/api/v2/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scenario_id: scen.id,
            run_mode: activeRunMode,
            substrate: activeSubstrate,
          }),
        }),
        fetchCounterfactualRaw(scen, activeSubstrate),
      ]);

      if (runRes.ok) {
        const runData = await runRes.json();
        setRunReport(runData);
      }
      if (proof) {
        setCounterfactualResult(proof);
      }

      // CRITICAL: DO NOT call setActiveTab('counterfactual') or open AI bot!
      // The user remains on the Inspect tab to see:
      // 1. Run Proof initiated
      // 2. Inspect: examine allowed vs blocked steps
      // 3. Proof: user proceeds to Dual Proof tab when ready
    } catch (err) {
      console.error('Run proof failed:', err);
      setRunError(err.message);
    } finally {
      setIsRunning(false);
      isRunningProofRef.current = false;
    }
  };

  // Handler for pitch bar (now just a label — no interactive steps)
  const handlePitchStepSelect = () => {};

  // Execute single run (used by useEffect auto-run on scenario change)
  const handleExecuteRun = async (scenarioToRun = selectedScenario, mode = activeRunMode, substrate = activeSubstrate) => {
    if (!scenarioToRun) return;
    setIsRunning(true);
    setRunError(null);

    try {
      const res = await fetch('/api/v2/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario_id: scenarioToRun.id,
          run_mode: mode,
          substrate: substrate,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Execution failed');
      }

      const report = await res.json();
      setRunReport(report);
      setActiveStepIndex(0);
    } catch (err) {
      console.error('Run failed:', err);
      setRunError(err.message);
    } finally {
      setIsRunning(false);
    }
  };

  // Execute counterfactual proof — used by standalone Proof tab "RUN AGAIN" CTA
  const handleExecuteCounterfactual = async (scenarioToRun = selectedScenario, substrate = activeSubstrate) => {
    if (!scenarioToRun) return;
    setIsRunning(true);
    setRunError(null);

    try {
      const proof = await fetchCounterfactualRaw(scenarioToRun, substrate);
      if (proof) {
        setCounterfactualResult(proof);
      }
    } catch (err) {
      console.error('Counterfactual failed:', err);
      setRunError(err.message);
    } finally {
      setIsRunning(false);
    }
  };

  // Trigger run whenever selected scenario, run mode, or substrate changes
  useEffect(() => {
    if (selectedScenario && !isRunningProofRef.current) {
      handleExecuteRun(selectedScenario, activeRunMode, activeSubstrate);
    }
  }, [selectedScenario?.id, activeRunMode, activeSubstrate]);

  const flagshipScenario = scenarios.find((s) => s.id === 'W04') || scenarios.find((s) => s.id === 'W4') || scenarios.find((s) => s.id === 'W02') || scenarios[0];
  const stepCount = selectedScenario?.proposals?.length || selectedScenario?.actions?.length || 1;

  return (
    <div className="app-canvas min-h-screen bg-obsidian text-chalk-soft font-sans">
      {/* ====================================================================
          Top Navigation Header — Unified Master Cockpit Bar
          ==================================================================== */}
      <header className="top-nav">
        <div className="cockpit-container top-nav-inner">
          {/* Brand Cluster */}
          <div className="brand-cluster">
            <div className="brand-mark" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('scenarios')}>
              <div className="brand-symbol">
                {/* Clean SVG brand symbol (ChainBreak shield/hexagon) */}
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L3 7V13C3 18.5 7 21.6 12 22.8C17 21.6 21 18.5 21 13V7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M12 7V17M7 12H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
                </svg>
              </div>
              <span>ChainBreak<span style={{ color: 'var(--color-compass-gold)', fontWeight: 800 }}>-Web3</span></span>
            </div>
            <div className="brand-subtitle">
              RUNTIME SECURITY INVARIANT ENGINE
            </div>
          </div>

          {/* Right Header Navigation & Actions */}
          <div className="nav-actions">
            {/* Substrate Selector: LOCAL EVM / SEPOLIA TESTNET */}
            <div className="substrate-toggle-group" title="Select EVM Execution Substrate">
              <button
                type="button"
                className={`substrate-toggle-btn ${activeSubstrate === 'LOCAL' ? 'active-local' : ''}`}
                onClick={() => setActiveSubstrate('LOCAL')}
                id="btn-substrate-local"
              >
                <span className="substrate-dot local" />
                <span>LOCAL EVM</span>
              </button>
              <button
                type="button"
                className={`substrate-toggle-btn ${activeSubstrate === 'TESTNET' ? 'active-testnet' : ''}`}
                onClick={() => setActiveSubstrate('TESTNET')}
                id="btn-substrate-testnet"
              >
                <span className="substrate-dot testnet" />
                <span>SEPOLIA RPC</span>
              </button>
            </div>

            {/* Live Engine Status Pill */}
            <div className="badge-pill" title="Deterministic Invariant Engine Status">
              <span className={`pulse-dot ${health?.status === 'ok' ? '' : 'error'}`} />
              <span>{health?.status === 'ok' ? 'ENGINE LIVE · 8000' : 'ENGINE OFFLINE'}</span>
            </div>

            {/* AI Summary Assistant Robot Button */}
            <AiSummaryBot
              runReport={runReport}
              counterfactualResult={counterfactualResult}
              selectedScenario={selectedScenario}
              isOpen={isAiBotOpen}
              onToggle={setIsAiBotOpen}
              onRunFeatured={(id) => {
                const s = scenarios.find((x) => x.id === id);
                if (s) {
                  handleSelectScenario(s);
                  handleExecuteCounterfactual(s, activeSubstrate);
                }
              }}
            />

            {/* Benchmark Modal Trigger (Pure Signal White Pill CTA) */}
            <button
              type="button"
              className="btn-pill-primary"
              onClick={handleOpenBenchmarkModal}
              id="btn-open-benchmark"
            >
              <span>BENCHMARK ↗</span>
            </button>
          </div>
        </div>
      </header>

      {/* ====================================================================
          Tab Bar Navigation — Sticky Under Header
          ==================================================================== */}
      <nav className="tab-bar">
        <div className="cockpit-container tab-bar-inner">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`tab-btn ${isActive ? 'active' : ''}`}
                id={`tab-${tab.key}`}
              >
                <Icon size={14} style={{ color: isActive ? 'var(--color-chalk)' : 'inherit' }} />
                <span>{tab.label}</span>
                {tab.badgeKey === 'scenariosCount' && (
                  <span className="tab-badge">{scenarios.length || 15}</span>
                )}
                {tab.badgeKey === 'stepCount' && (
                  <span className="tab-badge">{stepCount}</span>
                )}
                {tab.badgeKey === 'proofReady' && (
                  <span className="tab-badge proof-ready">
                    {counterfactualResult ? 'PROVED' : 'READY'}
                  </span>
                )}
                {tab.badgeKey === 'matrixCount' && (
                  <span className="tab-badge">15/15</span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ====================================================================
          Main Cockpit Container
          ==================================================================== */}
      <main className="view-content">
        <div className="cockpit-container">
          {/* Global Error Banner */}
          {runError && (
            <div className="run-error-banner flex items-center gap-3">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{runError}</span>
            </div>
          )}

          {/* Autonomous Attack Laboratory tagline bar */}
          <PitchSequenceBar />

          {/* ──────────────────────────────────────────────────────────────────
              TAB 1: SCENARIOS (The Home Cockpit View matching v1 screenshot)
              ────────────────────────────────────────────────────────────────── */}
          {activeTab === 'scenarios' && (
            <div>
              {/* Compact Editorial Hero */}
              <div className="compact-hero">
                <h1>Runtime security invariants for autonomous agents.</h1>
                <p>
                  Select a scenario to run side-by-side counterfactual execution — Baseline vs Protected.
                </p>
              </div>

              {/* Flagship Demo Hero Card */}
              {flagshipScenario && (
                <div className="flagship-demo-banner" id="flagship-hero-banner">
                  <div className="flagship-badge-group">
                    <span className="flagship-pill">FLAGSHIP DEMO</span>
                    <span className="flagship-tag">{flagshipScenario.id}</span>
                  </div>

                  <div className="flagship-content">
                    <div className="flagship-info">
                      <h3 className="flagship-title">
                        {flagshipScenario.name}
                      </h3>
                      <p className="flagship-description">
                        {flagshipScenario.description ||
                          'Compromised agent mutates recipient in raw calldata from Alice to Mallory. Single-action perimeter firewalls permit the transaction. ChainBreak decodes raw EVM calldata and halts pre-signing.'}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="btn-flagship-launch"
                      disabled={isRunning}
                      onClick={() => {
                        handleRunProof(flagshipScenario);
                      }}
                      id="btn-run-flagship-proof"
                    >
                      <Play size={12} fill="currentColor" />
                      <span>RUN {flagshipScenario.id} DUAL PROOF</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Architectural Specification & Comparison Matrix */}
              <ArchitectureBrief />

              {/* Full Scenario Deck Grid with Category Filtering */}
              <ScenarioSelector
                scenarios={scenarios}
                selectedScenario={selectedScenario}
                onSelectScenario={handleSelectScenario}
                onInspectScenario={(scen) => {
                  handleSelectScenario(scen);
                  setActiveTab('pipeline');
                }}
                onRunCounterfactual={(id) => {
                  const s = scenarios.find((x) => x.id === id);
                  if (s) handleRunProof(s);
                }}
                isLoading={isRunning}
              />
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────────────
              TAB 2: INTERCEPTION (Operator Timeline matching Screenshots 1 & 2)
              ────────────────────────────────────────────────────────────────── */}
          {activeTab === 'pipeline' && (
            <div>
              <RunTimeline
                chainState={runReport}
                scenario={selectedScenario}
                scenarioId={selectedScenario?.id || ''}
                runMode={activeRunMode}
                onModeToggle={(mode) => setActiveRunMode(mode)}
                isCounterfactualAvailable={!!counterfactualResult}
                divergenceStep={counterfactualResult?.divergence_step}
                onRunFeatured={(id) => {
                  const s = scenarios.find((x) => x.id === id);
                  if (s) handleRunProof(s);
                }}
                onViewProof={() => setActiveTab('counterfactual')}
              />
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────────────
              TAB 3: PROOF (Counterfactual Divergence matching Screenshot 3)
              ────────────────────────────────────────────────────────────────── */}
          {activeTab === 'counterfactual' && (
            <div>
              <CounterfactualProof
                counterfactualResult={counterfactualResult}
                selectedScenario={selectedScenario}
                onRunAgain={(id) => {
                  const s = scenarios.find((x) => x.id === id) || selectedScenario;
                  if (s) handleExecuteCounterfactual(s, activeSubstrate);
                }}
                onRunFeatured={(id) => {
                  const s = scenarios.find((x) => x.id === id);
                  if (s) handleRunProof(s);
                }}
              />
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────────────
              TAB 4: BRUTAL MATRIX (12 Attempts to Break Autonomous Agent)
              ────────────────────────────────────────────────────────────────── */}
          {activeTab === 'matrix' && (
            <div>
              <BrutalMatrix
                report={benchmarkReport}
                isLoading={isBenchmarkLoading}
                onRunBenchmark={fetchBenchmarkReport}
                onSelectScenario={(scenId) => {
                  const s = scenarios.find((x) => x.id === scenId);
                  if (s) {
                    handleSelectScenario(s);
                    setActiveTab('pipeline');
                  }
                }}
                onRunDualProof={(scenId) => {
                  const s = scenarios.find((x) => x.id === scenId);
                  if (s) handleRunProof(s);
                }}
                activeSubstrate={activeSubstrate}
              />
            </div>
          )}
        </div>
      </main>

      {/* ====================================================================
          Benchmark Report Modal — Triggered from Top Bar "BENCHMARK ↗"
          ==================================================================== */}
      <BenchmarkModal
        isOpen={isBenchmarkModalOpen}
        onClose={() => setIsBenchmarkModalOpen(false)}
        report={benchmarkReport}
        isLoading={isBenchmarkLoading}
        onRunBenchmark={fetchBenchmarkReport}
      />
    </div>
  );
}
