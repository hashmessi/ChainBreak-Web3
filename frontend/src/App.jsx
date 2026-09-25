import React, { useState, useEffect, useRef } from 'react';
import {
  Compass, Play, AlertCircle, ArrowUpRight, BarChart2, Layers, Shield,
  GitCompare, Zap, CheckCircle2, AlertTriangle, Radio, RefreshCw, Cpu
} from 'lucide-react';
import IntentPanel from './components/IntentPanel';
import TransactionCard from './components/TransactionCard';
import TrajectoryTimeline from './components/TrajectoryTimeline';
import DecisionReceipt from './components/DecisionReceipt';
import CounterfactualProof from './components/CounterfactualProof';
import EvaluationPanel from './components/EvaluationPanel';

const TABS = [
  { key: 'pipeline', label: 'Operator Pipeline', icon: Layers },
  { key: 'counterfactual', label: 'Counterfactual Proof', icon: GitCompare },
  { key: 'benchmark', label: 'Adversarial Benchmarks (12)', icon: BarChart2 },
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
  const [activeTab, setActiveTab] = useState('pipeline');

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
            setScenarios(scenData.scenarios || []);
            // Default to W3 Flagship attack for immediate judge impact
            const initial = scenData.scenarios.find((s) => s.id === 'W3') || scenData.scenarios[0];
            setSelectedScenario(initial);
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
    } catch (err) {
      console.error('Counterfactual failed:', err);
      setRunError(err.message);
    } finally {
      setIsRunning(false);
    }
  };

  // Trigger run whenever selected scenario changes
  useEffect(() => {
    if (selectedScenario) {
      handleExecuteRun(selectedScenario, activeRunMode, activeSubstrate);
    }
  }, [selectedScenario?.id, activeRunMode, activeSubstrate]);

  const activeProposal = selectedScenario?.proposals?.[activeStepIndex] || selectedScenario?.proposals?.[0];
  const activeReceipt = runReport?.receipts?.[activeStepIndex] || runReport?.receipts?.[0];
  const isAttack = selectedScenario?.category === 'attack';

  return (
    <div className="app-canvas min-h-screen bg-obsidian text-chalk-soft font-sans">
      {/* Top Navigation Header */}
      <header className="sticky top-0 z-50 bg-carbon/95 backdrop-blur border-b border-graphite px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo & Tagline */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-compass-gold/10 border border-compass-gold/40 flex items-center justify-center text-compass-gold font-bold">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-heading-sm tracking-tight text-chalk">ChainBreak-Web3</span>
                <span className="text-meta font-mono px-2 py-0.5 rounded bg-compass-gold/15 text-compass-gold border border-compass-gold/30">
                  EVM Firewall v2.0
                </span>
              </div>
              <p className="text-meta text-ash">
                Provider-Agnostic Intent-Integrity Gateway for Autonomous EVM Agents
              </p>
            </div>
          </div>

          {/* Substrate & Controls */}
          <div className="flex items-center gap-3">
            {/* Substrate Selector */}
            <div className="flex items-center bg-obsidian border border-graphite rounded-lg p-0.5 text-caption font-mono">
              <button
                type="button"
                onClick={() => setActiveSubstrate('LOCAL')}
                className={`px-3 py-1 rounded font-medium transition-all ${
                  activeSubstrate === 'LOCAL'
                    ? 'bg-carbon text-chalk shadow-sm border border-graphite'
                    : 'text-smoke hover:text-chalk'
                }`}
              >
                Local EVM
              </button>
              <button
                type="button"
                onClick={() => setActiveSubstrate('TESTNET')}
                className={`px-3 py-1 rounded font-medium transition-all ${
                  activeSubstrate === 'TESTNET'
                    ? 'bg-carbon text-compass-gold shadow-sm border border-compass-gold/30'
                    : 'text-smoke hover:text-chalk'
                }`}
              >
                Sepolia Testnet
              </button>
            </div>

            {/* Run Mode Selector */}
            <div className="flex items-center bg-obsidian border border-graphite rounded-lg p-0.5 text-caption font-mono">
              <button
                type="button"
                onClick={() => setActiveRunMode('PROTECTED')}
                className={`px-3 py-1 rounded font-semibold transition-all ${
                  activeRunMode === 'PROTECTED'
                    ? 'bg-pulse-green/20 text-pulse-green border border-pulse-green/40'
                    : 'text-smoke hover:text-chalk'
                }`}
              >
                Protected (Gate Active)
              </button>
              <button
                type="button"
                onClick={() => setActiveRunMode('BASELINE')}
                className={`px-3 py-1 rounded font-semibold transition-all ${
                  activeRunMode === 'BASELINE'
                    ? 'bg-violation-red/20 text-violation-red border border-violation-red/40'
                    : 'text-smoke hover:text-chalk'
                }`}
              >
                Baseline (Unprotected)
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Quick Launchpad / Flagship Attack Bar */}
        <div className="bg-card-bg border border-graphite rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-compass-gold" />
            <span className="text-caption font-bold text-chalk uppercase tracking-wider font-mono">
              Flagship Benchmarks:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const s = scenarios.find((x) => x.id === 'W3');
                if (s) setSelectedScenario(s);
              }}
              className={`px-3 py-1.5 rounded-lg text-caption font-mono font-bold border transition-all ${
                selectedScenario?.id === 'W3'
                  ? 'bg-violation-red/20 border-violation-red text-violation-red ring-1 ring-violation-red'
                  : 'bg-carbon border-graphite text-smoke hover:text-chalk hover:border-iron'
              }`}
            >
              W3: Flagship Attack (Alice → Mallory)
            </button>

            <button
              type="button"
              onClick={() => {
                const s = scenarios.find((x) => x.id === 'W5');
                if (s) setSelectedScenario(s);
              }}
              className={`px-3 py-1.5 rounded-lg text-caption font-mono font-bold border transition-all ${
                selectedScenario?.id === 'W5'
                  ? 'bg-compass-gold/20 border-compass-gold text-compass-gold ring-1 ring-compass-gold'
                  : 'bg-carbon border-graphite text-smoke hover:text-chalk hover:border-iron'
              }`}
            >
              W5: Trajectory Budget Breach (40 + 50 + 30 &gt; 100)
            </button>

            <button
              type="button"
              onClick={() => {
                const s = scenarios.find((x) => x.id === 'W2');
                if (s) setSelectedScenario(s);
              }}
              className={`px-3 py-1.5 rounded-lg text-caption font-mono font-bold border transition-all ${
                selectedScenario?.id === 'W2'
                  ? 'bg-pulse-green/20 border-pulse-green text-pulse-green ring-1 ring-pulse-green'
                  : 'bg-carbon border-graphite text-smoke hover:text-chalk hover:border-iron'
              }`}
            >
              W2: Safe ERC-20 (Invoice INV-14)
            </button>

            {/* Scenario dropdown */}
            <select
              value={selectedScenario?.id || ''}
              onChange={(e) => {
                const s = scenarios.find((x) => x.id === e.target.value);
                if (s) setSelectedScenario(s);
              }}
              className="bg-carbon border border-graphite rounded-lg px-3 py-1.5 text-caption font-mono text-chalk focus:outline-none focus:border-compass-gold"
            >
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id}: {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isRunning}
              onClick={() => handleExecuteCounterfactual(selectedScenario, activeSubstrate)}
              className="flex items-center gap-1.5 bg-compass-gold hover:bg-compass-gold-dim text-obsidian font-bold px-4 py-2 rounded-lg text-caption transition-all shadow"
            >
              <GitCompare className="w-4 h-4" />
              <span>Run Counterfactual Proof</span>
            </button>
          </div>
        </div>

        {/* Tab Header */}
        <div className="flex items-center gap-4 border-b border-graphite pb-2">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-2 pb-2 text-caption font-semibold transition-all border-b-2 ${
                  isActive
                    ? 'border-compass-gold text-chalk'
                    : 'border-transparent text-ash hover:text-smoke'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-compass-gold' : 'text-ash'}`} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Error Banner if any */}
        {runError && (
          <div className="bg-violation-red/10 border border-violation-red/40 rounded-xl p-4 flex items-center gap-3 text-caption text-violation-red font-mono">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{runError}</span>
          </div>
        )}

        {/* Tab 1: Pipeline View */}
        {activeTab === 'pipeline' && (
          <div className="space-y-6">
            {/* Top: Intent Panel */}
            <IntentPanel
              intent={selectedScenario?.intent}
              fixtures={fixtures}
            />

            {/* Middle: Trajectory Timeline (if multi-step) */}
            {runReport?.receipts?.length > 1 && (
              <TrajectoryTimeline
                receipts={runReport.receipts}
                maxSessionValue={selectedScenario?.intent?.max_session_value_per_asset?.USDC || 100000000}
                activeStepIndex={activeStepIndex}
                onSelectStep={(idx) => setActiveStepIndex(idx)}
              />
            )}

            {/* Bottom Grid: Transaction Card & Decision Receipt */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <TransactionCard
                  proposal={activeProposal}
                  decoded={activeReceipt?.decoded}
                  stepIndex={activeStepIndex}
                  isAttacking={isAttack}
                />
              </div>

              <div>
                <DecisionReceipt
                  receipt={activeReceipt}
                  substrate={activeSubstrate}
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Counterfactual Proof View */}
        {activeTab === 'counterfactual' && (
          <div>
            <CounterfactualProof
              counterfactualResult={counterfactualResult}
              onRunFeatured={(id) => {
                const s = scenarios.find((x) => x.id === id);
                if (s) {
                  setSelectedScenario(s);
                  handleExecuteCounterfactual(s, activeSubstrate);
                }
              }}
            />
          </div>
        )}

        {/* Tab 3: Adversarial Benchmark Suite (EVAL-03) */}
        {activeTab === 'benchmark' && (
          <div>
            <EvaluationPanel
              substrate={activeSubstrate}
              onSelectScenario={(id) => {
                const s = scenarios.find((x) => x.id === id);
                if (s) {
                  setSelectedScenario(s);
                  setActiveTab('pipeline');
                }
              }}
              onRunCounterfactual={(id) => {
                const s = scenarios.find((x) => x.id === id);
                if (s) {
                  setSelectedScenario(s);
                  handleExecuteCounterfactual(s, activeSubstrate);
                }
              }}
            />
          </div>
        )}
      </main>
    </div>
  );
}
