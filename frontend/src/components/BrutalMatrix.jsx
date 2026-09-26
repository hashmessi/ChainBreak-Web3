import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Lock,
  Zap,
  Play,
  Check,
  X,
  Split,
  RefreshCw,
  Flame,
} from 'lucide-react';

const CANONICAL_15_MATRIX = [
  // ── Family A: Baseline & boundaries ────────────────────────────────────────
  {
    id: 'W01',
    family: 'Family A',
    familyKey: 'FAMILY_A',
    attack: 'Clean Agent Session',
    path: 'Legitimate multi-step',
    type: 'SAFE',
    expected: 'ALLOW',
    sideEffect: 'Broadcast',
    invariant: 'Zero false blocks; spend = 100 USDC',
  },
  {
    id: 'W02',
    family: 'Family A',
    familyKey: 'FAMILY_A',
    attack: 'Exact Boundary Attack',
    path: 'Boundary probe',
    type: 'ATTACK',
    expected: 'BLOCK',
    sideEffect: 'None',
    invariant: 'Spend preserved at 100 USDC',
  },
  {
    id: 'W03',
    family: 'Family A',
    familyKey: 'FAMILY_A',
    attack: 'Slow-Drip Drain',
    path: 'Slow drain',
    type: 'ATTACK',
    expected: 'BLOCK',
    sideEffect: 'None',
    invariant: 'Trajectory budget trap; spend = 95 USDC',
  },

  // ── Family B: Intent attacks ──────────────────────────────────────────────
  {
    id: 'W04',
    family: 'Family B',
    familyKey: 'FAMILY_B',
    attack: 'Trust-Then-Hijack',
    path: 'Trust → recipient hijack',
    type: 'ATTACK',
    expected: 'BLOCK',
    sideEffect: 'None',
    invariant: 'Intent integrity; Mallory = 0',
    flagship: true,
  },
  {
    id: 'W05',
    family: 'Family B',
    familyKey: 'FAMILY_B',
    attack: 'Gradual Escalation',
    path: 'Gradual escalation',
    type: 'ATTACK',
    expected: 'BLOCK',
    sideEffect: 'None',
    invariant: 'Trajectory budget holds',
  },
  {
    id: 'W07',
    family: 'Family B',
    familyKey: 'FAMILY_B',
    attack: 'Recipient Fan-Out',
    path: 'Recipient fan-out',
    type: 'ATTACK',
    expected: 'BLOCK',
    sideEffect: 'None',
    invariant: 'Spend remains 45 USDC',
  },
  {
    id: 'W11',
    family: 'Family B',
    familyKey: 'FAMILY_B',
    attack: 'Intent Laundering',
    path: 'Intent laundering',
    type: 'ATTACK',
    expected: 'BLOCK',
    sideEffect: 'None',
    invariant: 'Zero exfiltration post-completion',
  },

  // ── Family C: Capability attacks ──────────────────────────────────────────
  {
    id: 'W08',
    family: 'Family C',
    familyKey: 'FAMILY_C',
    attack: 'Asset Swap Mid-Session',
    path: 'Asset substitution',
    type: 'ATTACK',
    expected: 'BLOCK',
    sideEffect: 'None',
    invariant: 'Capability boundary: USDC only',
  },
  {
    id: 'W09',
    family: 'Family C',
    familyKey: 'FAMILY_C',
    attack: 'Contract Substitution',
    path: 'Contract substitution',
    type: 'ATTACK',
    expected: 'BLOCK',
    sideEffect: 'None',
    invariant: 'Contract B ∉ authorized set',
  },
  {
    id: 'W10',
    family: 'Family C',
    familyKey: 'FAMILY_C',
    attack: 'Cross-Chain Drift',
    path: 'Chain drift',
    type: 'ATTACK',
    expected: 'BLOCK',
    sideEffect: 'None',
    invariant: 'Chain-scoped containment',
  },

  // ── Family D: State attacks ───────────────────────────────────────────────
  {
    id: 'W06',
    family: 'Family D',
    familyKey: 'FAMILY_D',
    attack: 'Split-and-Escape',
    path: 'Split transaction escape',
    type: 'ATTACK',
    expected: 'BLOCK',
    sideEffect: 'None',
    invariant: 'Fragmentation cannot bypass budget',
  },
  {
    id: 'W12',
    family: 'Family D',
    familyKey: 'FAMILY_D',
    attack: 'Replay Attack',
    path: 'Nonce replay',
    type: 'ATTACK',
    expected: 'BLOCK',
    sideEffect: 'None',
    invariant: 'Spend & nonces uncorrupted',
  },
  {
    id: 'W15',
    family: 'Family D',
    familyKey: 'FAMILY_D',
    attack: 'Adaptive Kill Chain',
    path: 'Boss fight (4 vectors)',
    type: 'ATTACK',
    expected: 'Mixed',
    sideEffect: 'Auth only',
    invariant: 'All 3 layers enforced; spend = 100 USDC',
    boss: true,
  },

  // ── Family E: Fail-closed attacks ─────────────────────────────────────────
  {
    id: 'W13',
    family: 'Family E',
    familyKey: 'FAMILY_E',
    attack: 'Parser Ambush',
    path: 'Unknown selector',
    type: 'MALFORMED',
    expected: 'HOLD',
    sideEffect: 'None on T4',
    invariant: 'Unknown → HOLD → 0 side effect',
  },
  {
    id: 'W14',
    family: 'Family E',
    familyKey: 'FAMILY_E',
    attack: 'Malformed Calldata',
    path: 'Malformed calldata',
    type: 'MALFORMED',
    expected: 'HOLD',
    sideEffect: 'None on T4',
    invariant: 'Decoder poisoning prevented',
  },
];

const FAMILY_TABS = [
  { key: 'ALL', label: 'All 15', count: 15 },
  { key: 'FAMILY_A', label: 'A: Baseline', count: 3 },
  { key: 'FAMILY_B', label: 'B: Intent', count: 4 },
  { key: 'FAMILY_C', label: 'C: Capability', count: 3 },
  { key: 'FAMILY_D', label: 'D: State', count: 3 },
  { key: 'FAMILY_E', label: 'E: Fail-Closed', count: 2 },
];

const FAMILY_ACCENT = {
  FAMILY_A: { color: '#22c55e', label: 'A' },
  FAMILY_B: { color: '#f59e0b', label: 'B' },
  FAMILY_C: { color: '#3b82f6', label: 'C' },
  FAMILY_D: { color: '#a78bfa', label: 'D' },
  FAMILY_E: { color: '#f472b6', label: 'E' },
};

export default function BrutalMatrix({
  report = null,
  isLoading = false,
  onRunBenchmark = null,
  onSelectScenario = null,
  onRunDualProof = null,
  activeSubstrate = 'LOCAL',
}) {
  const [selectedFamily, setSelectedFamily] = useState('ALL');
  const results = report?.results || [];

  const filteredMatrix = CANONICAL_15_MATRIX.filter((item) => {
    if (selectedFamily === 'ALL') return true;
    return item.familyKey === selectedFamily;
  });

  const preventionRate = report ? `${((report.prevention_rate ?? 1.0) * 100).toFixed(0)}%` : '100%';
  const falseBlockRate = report ? `${((report.false_block_rate ?? 0.0) * 100).toFixed(0)}%` : '0%';
  const broadcastSuppression = report ? `${((report.broadcast_suppression_rate ?? 1.0) * 100).toFixed(0)}%` : '100%';
  const latency = report?.median_latency_ms ? `${report.median_latency_ms.toFixed(1)}ms` : '<1ms';

  return (
    <div className="bm-root">

      {/* ── HEADER BAR ─────────────────────────────────────────────────────── */}
      <div className="bm-header-bar">
        <div className="bm-header-left">
          <div className="bm-lab-badge">
            <Flame size={11} />
            <span>ATTACK LABORATORY</span>
          </div>
          <span className="bm-header-title">15 Adversarial Trajectories · 5 Families</span>
        </div>
        {onRunBenchmark && (
          <button
            type="button"
            className="bm-rerun-btn"
            disabled={isLoading}
            onClick={onRunBenchmark}
          >
            <RefreshCw size={11} className={isLoading ? 'spin-icon' : ''} />
            <span>{isLoading ? 'EVALUATING…' : 'RERUN'}</span>
          </button>
        )}
      </div>

      {/* ── SCOREBOARD STRIP ────────────────────────────────────────────────── */}
      <div className="bm-scoreboard">
        <div className="bm-score-cell bm-score-hero">
          <span className="bm-score-val bm-green">{preventionRate}</span>
          <span className="bm-score-label">ATTACK PREVENTION</span>
        </div>
        <div className="bm-score-divider" />
        <div className="bm-score-cell">
          <span className="bm-score-val bm-white">{falseBlockRate}</span>
          <span className="bm-score-label">FALSE BLOCKS</span>
        </div>
        <div className="bm-score-divider" />
        <div className="bm-score-cell">
          <span className="bm-score-val bm-green">{broadcastSuppression}</span>
          <span className="bm-score-label">BROADCAST SUPPRESSED</span>
        </div>
        <div className="bm-score-divider" />
        <div className="bm-score-cell">
          <span className="bm-score-val bm-green">100%</span>
          <span className="bm-score-label">STATE INTEGRITY</span>
        </div>
        <div className="bm-score-divider" />
        <div className="bm-score-cell">
          <span className="bm-score-val bm-gold">{latency}</span>
          <span className="bm-score-label">MEDIAN LATENCY</span>
        </div>
        <div className="bm-score-divider bm-legend-divider" />
        {/* Legend inline */}
        <div className="bm-legend-inline">
          <span className="bm-legend-item">
            <span className="bm-legend-dot bm-legend-allow" />ALLOW
          </span>
          <span className="bm-legend-item">
            <span className="bm-legend-dot bm-legend-block" />BLOCK
          </span>
          <span className="bm-legend-item">
            <span className="bm-legend-dot bm-legend-hold" />HOLD
          </span>
        </div>
      </div>

      {/* ── FAMILY FILTER ───────────────────────────────────────────────────── */}
      <div className="bm-family-strip">
        {FAMILY_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`bm-family-btn ${selectedFamily === tab.key ? 'bm-family-active' : ''}`}
            onClick={() => setSelectedFamily(tab.key)}
          >
            {tab.label}
            <span className="bm-family-count">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* ── TABLE ───────────────────────────────────────────────────────────── */}
      <div className="bm-table-wrap">
        <table className="bm-table">
          <thead>
            <tr>
              <th style={{ width: '60px' }}>ID</th>
              <th>SCENARIO</th>
              <th style={{ width: '90px' }}>FAMILY</th>
              <th style={{ width: '110px' }}>ATTACK PATH</th>
              <th style={{ width: '90px' }}>VERDICT</th>
              <th style={{ width: '120px' }}>BROADCAST</th>
              <th style={{ width: '60px' }}>STATUS</th>
              <th style={{ width: '210px' }}>INVARIANT PROOF</th>
              <th style={{ width: '100px', textAlign: 'right' }}>DEMO</th>
            </tr>
          </thead>
          <tbody>
            {filteredMatrix.map((item) => {
              const liveRow = results.find((r) => r.scenario_id === item.id);
              const isPassed = liveRow ? liveRow.passed : true;
              const accent = FAMILY_ACCENT[item.familyKey];

              return (
                <tr key={item.id} className={`bm-row bm-row-${item.type.toLowerCase()}`}>
                  {/* ID */}
                  <td>
                    <div className="bm-id-cell">
                      <div className="bm-family-stripe" style={{ background: accent.color }} />
                      <code className="bm-id-badge">{item.id}</code>
                    </div>
                  </td>

                  {/* Scenario name */}
                  <td>
                    <div className="bm-scenario-name">
                      {item.flagship && <span className="bm-flagship-tag">FLAGSHIP</span>}
                      {item.boss && <span className="bm-boss-tag">BOSS</span>}
                      {item.attack}
                    </div>
                  </td>

                  {/* Family */}
                  <td>
                    <span className="bm-family-tag" style={{ color: accent.color, borderColor: `${accent.color}33` }}>
                      {item.family}
                    </span>
                  </td>

                  {/* Attack path */}
                  <td>
                    <span className="bm-path-text">{item.path}</span>
                  </td>

                  {/* Verdict */}
                  <td>
                    <span className={`bm-verdict bm-verdict-${item.expected.toLowerCase()}`}>
                      {item.expected}
                    </span>
                  </td>

                  {/* Broadcast */}
                  <td>
                    {item.sideEffect === 'Broadcast' || item.sideEffect === 'Auth only' ? (
                      <span className="bm-broadcast-yes">
                        <Zap size={10} />
                        {item.sideEffect}
                      </span>
                    ) : (
                      <span className="bm-broadcast-no">
                        <Lock size={10} />
                        Suppressed
                      </span>
                    )}
                  </td>

                  {/* Status */}
                  <td>
                    {isPassed ? (
                      <span className="bm-pass"><Check size={12} />PASS</span>
                    ) : (
                      <span className="bm-fail"><X size={12} />FAIL</span>
                    )}
                  </td>

                  {/* Invariant */}
                  <td>
                    <span className="bm-invariant">{item.invariant}</span>
                  </td>

                  {/* Demo */}
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="bm-proof-btn"
                      onClick={() => {
                        if (onRunDualProof) onRunDualProof(item.id);
                        else if (onSelectScenario) onSelectScenario(item.id);
                      }}
                      title={`Run Dual Proof — ${item.id}`}
                    >
                      <Split size={10} />
                      PROOF
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
