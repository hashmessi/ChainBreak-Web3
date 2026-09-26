import React, { useState, useEffect } from 'react';
import {
  Shield, Layers, GitCompare,
  AlertCircle, Play
} from 'lucide-react';
import ScenarioSelector from './components/ScenarioSelector';
import ArchitectureBrief from './components/ArchitectureBrief';
import AiSummaryBot from './components/AiSummaryBot';
import BenchmarkModal from './components/BenchmarkModal';
import RunTimeline from './components/RunTimeline';
import CounterfactualProof from './components/CounterfactualProof';

const TABS = [
  { key: 'scenarios', label: 'Scenarios', icon: Shield, badgeKey: 'scenariosCount' },
  { key: 'pipeline', label: 'Interception', icon: Layers, badgeKey: 'stepCount' },
  { key: 'counterfactual', label: 'Proof', icon: GitCompare, badgeKey: 'proofReady' },
];

export default function App() {
  const [health, setHealth] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [fixtures, setFixtures] = useState(null);
  const [loading, setLoading] = useState(true);

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
            // Default to W3 Flagship attack
            const initial = scens.find((s) => s.id === 'W3') || scens[0];
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

  // Fetch benchmark evaluation report for modal
  const fetchBenchmarkReport = async () => {
    setIsBenchmarkLoading(true);
    try {
      const res = await fetch('/api/v2/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ substrate: activeSubstrate }),
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

  // Execute single run
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

  // Execute counterfactual proof
  const handleExecuteCounterfactual = async (scenarioToRun = selectedScenario, substrate = activeSubstrate) => {
    if (!scenarioToRun) return;
    setIsRunning(true);
    setRunError(null);

    try {
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

      const proof = await res.json();
      setCounterfactualResult(proof);
      setActiveTab('counterfactual');
      setIsAiBotOpen(true); // Open AI summary drawer automatically upon proof run
    } catch (err) {
      console.error('Counterfactual failed:', err);
      setRunError(err.message);
    } finally {
      setIsRunning(false);
    }
  };

  // Trigger run whenever selected scenario, run mode, or substrate changes
  useEffect(() => {
    if (selectedScenario) {
      handleExecuteRun(selectedScenario, activeRunMode, activeSubstrate);
    }
  }, [selectedScenario?.id, activeRunMode, activeSubstrate]);

  const flagshipScenario = scenarios.find((s) => s.id === 'W3') || scenarios[0];
  const stepCount = selectedScenario?.proposals?.length || selectedScenario?.actions?.length || 1;

  return (
    <div className="app-canvas min-h-screen bg-obsidian text-chalk-soft font-sans">
      {/* ====================================================================
          Top Navigation Header — Exactly Matching Reference Screenshots 1, 2, 3
          Clean, uncluttered, no redundant mode toggles in master header
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
              <span>ChainBreak</span>
            </div>
            <div className="brand-subtitle">
              RUNTIME SECURITY INVARIANT ENGINE
            </div>
          </div>

          {/* Right Header Navigation & Actions */}
          <div className="nav-actions">
            {/* Live Engine Status Pill */}
            <div className="badge-pill" title="Deterministic Invariant Engine Status">
              <span className={`pulse-dot ${health?.status === 'ok' ? '' : 'error'}`} />
              <span>{health?.status === 'ok' ? 'ENGINE LIVE / 8000' : 'ENGINE OFFLINE'}</span>
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
                  <span className="tab-badge">{scenarios.length || 12}</span>
                )}
                {tab.badgeKey === 'stepCount' && (
                  <span className="tab-badge">{stepCount}</span>
                )}
                {tab.badgeKey === 'proofReady' && (
                  <span className="tab-badge proof-ready">
                    {counterfactualResult ? 'PROVED' : 'READY'}
                  </span>
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
                        handleSelectScenario(flagshipScenario);
                        handleExecuteCounterfactual(flagshipScenario, activeSubstrate);
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
                  if (s) {
                    handleSelectScenario(s);
                    handleExecuteCounterfactual(s, activeSubstrate);
                  }
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
                  if (s) {
                    handleSelectScenario(s);
                    handleExecuteCounterfactual(s, activeSubstrate);
                  }
                }}
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
                  if (s) {
                    handleSelectScenario(s);
                    handleExecuteCounterfactual(s, activeSubstrate);
                  }
                }}
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
