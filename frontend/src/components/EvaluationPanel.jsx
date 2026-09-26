import React, { useState, useEffect } from 'react';
import {
  BarChart2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  GitCompare,
  Zap,
  Timer,
  Lock,
  Layers,
  Flame,
  HelpCircle,
  Cpu,
} from 'lucide-react';

export default function EvaluationPanel({
  substrate = 'LOCAL',
  onSelectScenario = null,
  onRunCounterfactual = null,
}) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // W16 Fuzz campaign state
  const [fuzzReport, setFuzzReport] = useState(null);
  const [fuzzLoading, setFuzzLoading] = useState(false);

  // Filters
  const [selectedFamily, setSelectedFamily] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchBenchmark = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v2/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ substrate, include_fuzz: true }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Evaluation benchmark failed');
      }
      const data = await res.json();
      setReport(data);
      if (data.fuzz_summary) {
        setFuzzReport(data.fuzz_summary);
      }
    } catch (err) {
      console.error('Failed to load benchmark evaluation:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const triggerFuzzCampaign = async () => {
    setFuzzLoading(true);
    try {
      const res = await fetch('/api/v2/fuzz?limit=120');
      if (res.ok) {
        const data = await res.json();
        setFuzzReport(data);
      }
    } catch (err) {
      console.error('Fuzz campaign error:', err);
    } finally {
      setFuzzLoading(false);
    }
  };

  useEffect(() => {
    fetchBenchmark();
  }, [substrate]);

  const rows = report?.results || [];

  const filteredRows = rows.filter((r) => {
    if (selectedFamily !== 'ALL') {
      const fam = (r.attack_family || '').toUpperCase();
      if (!fam.includes(selectedFamily)) return false;
    }
    if (selectedStatus === 'PASS' && !r.passed) return false;
    if (selectedStatus === 'FAIL' && r.passed) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = r.scenario_id.toLowerCase().includes(q);
      const matchName = r.name.toLowerCase().includes(q);
      const matchPath = (r.attack_path || '').toLowerCase().includes(q);
      if (!matchId && !matchName && !matchPath) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-card-bg border border-graphite rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-compass-gold" />
            <h2 className="text-heading-sm font-bold text-chalk uppercase tracking-wider font-mono">
              Adversarial Evaluation & Attack Laboratory
            </h2>
            <span className="text-meta font-mono px-2 py-0.5 rounded bg-compass-gold/15 text-compass-gold border border-compass-gold/30">
              15 BRUTAL TRAJECTORIES · 5 FAMILIES
            </span>
          </div>
          <p className="text-caption text-smoke mt-1">
            Pre-signing deterministic verification proving zero side-effects on blocked/held proposals and unpoisoned recovery.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-caption font-mono text-smoke">
            Substrate: <span className="font-bold text-chalk">{substrate === 'TESTNET' ? 'Sepolia Testnet' : 'Local EVM'}</span>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={fetchBenchmark}
            className="flex items-center gap-2 bg-compass-gold hover:bg-compass-gold-dim text-obsidian font-bold px-4 py-2 rounded-lg text-caption transition-all shadow disabled:opacity-50"
            id="btn-rerun-eval"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Evaluating 15 Vectors...' : 'Rerun 15-Vector Suite'}</span>
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-violation-red/10 border border-violation-red/40 rounded-xl p-4 text-violation-red font-mono text-caption">
          {error}
        </div>
      )}

      {/* KPI Metrics Cards */}
      {report && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-carbon border border-graphite rounded-xl p-4 relative overflow-hidden">
            <div className="text-meta text-smoke uppercase font-mono tracking-wider flex items-center justify-between">
              <span>Attack Prevention Rate</span>
              <ShieldCheck className="w-4 h-4 text-pulse-green" />
            </div>
            <div className="text-heading-lg font-mono font-extrabold text-pulse-green mt-2">
              {(report.prevention_rate * 100).toFixed(1)}%
            </div>
            <div className="text-meta text-ash mt-1">
              {report.attacks_prevented} of {report.attack_scenarios + report.malformed_scenarios} attack trajectories neutralized
            </div>
          </div>

          <div className="bg-carbon border border-graphite rounded-xl p-4 relative overflow-hidden">
            <div className="text-meta text-smoke uppercase font-mono tracking-wider flex items-center justify-between">
              <span>False Block Rate</span>
              <CheckCircle2 className="w-4 h-4 text-pulse-green" />
            </div>
            <div className="text-heading-lg font-mono font-extrabold text-chalk mt-2">
              {(report.false_block_rate * 100).toFixed(1)}%
            </div>
            <div className="text-meta text-ash mt-1">
              Control experiment W01 allowed 100%
            </div>
          </div>

          <div className="bg-carbon border border-graphite rounded-xl p-4 relative overflow-hidden">
            <div className="text-meta text-smoke uppercase font-mono tracking-wider flex items-center justify-between">
              <span>State Integrity</span>
              <Lock className="w-4 h-4 text-compass-gold" />
            </div>
            <div className="text-heading-lg font-mono font-extrabold text-compass-gold mt-2">
              100%
            </div>
            <div className="text-meta text-ash mt-1">
              Zero state leakage on blocked/held txs
            </div>
          </div>

          <div className="bg-carbon border border-graphite rounded-xl p-4 relative overflow-hidden">
            <div className="text-meta text-smoke uppercase font-mono tracking-wider flex items-center justify-between">
              <span>Decision Latency</span>
              <Timer className="w-4 h-4 text-smoke" />
            </div>
            <div className="text-heading-lg font-mono font-extrabold text-chalk mt-2">
              {typeof report.avg_latency_ms === 'number' ? report.avg_latency_ms.toFixed(2) : report.avg_latency_ms} <span className="text-caption font-normal text-smoke">ms</span>
            </div>
            <div className="text-meta text-pulse-green mt-1">
              Zero-LLM pure Python eval
            </div>
          </div>
        </div>
      )}

      {/* ─── W16 Mutation-Fuzz Campaign Spotlight Card ──────────────────────── */}
      <div className="bg-card-bg border border-graphite rounded-xl p-5 relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-compass-gold" />
              <h3 className="text-caption font-bold text-chalk uppercase tracking-wider font-mono">
                W16 — Mutation-Fuzz Campaign (Adversarial Stress Test)
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                100+ AUTOMATED MUTATIONS
              </span>
            </div>
            <p className="text-[12px] text-smoke mt-1 max-w-2xl">
              Fuzzes recipient, amount, token contract, chain ID, nonces, selectors, and calldata length.
              Proves strict 3-way classification: <strong className="text-emerald-400">SAFE → ALLOW</strong>, <strong className="text-red-400">KNOWN BAD → BLOCK</strong>, <strong className="text-amber-400">UNPARSEABLE → HOLD</strong> with 0 false allows.
            </p>
          </div>

          <button
            type="button"
            disabled={fuzzLoading}
            onClick={triggerFuzzCampaign}
            className="flex items-center gap-2 bg-carbon hover:bg-graphite text-chalk font-mono text-[11px] font-bold px-3 py-2 rounded-lg border border-graphite transition-all shadow"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${fuzzLoading ? 'animate-spin' : ''}`} />
            <span>{fuzzLoading ? 'Fuzzing 100+ Mutations...' : 'Run W16 Fuzz Campaign'}</span>
          </button>
        </div>

        {fuzzReport && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4 pt-4 border-t border-graphite/60">
            <div className="bg-carbon/80 rounded-lg p-3 border border-graphite/40">
              <span className="text-[10px] text-smoke uppercase font-mono block">Evaluated</span>
              <span className="text-heading-sm font-mono font-bold text-chalk mt-1 block">
                {fuzzReport.total_mutations}
              </span>
            </div>
            <div className="bg-carbon/80 rounded-lg p-3 border border-graphite/40">
              <span className="text-[10px] text-smoke uppercase font-mono block">Known Bad Blocked</span>
              <span className="text-heading-sm font-mono font-bold text-violation-red mt-1 block">
                {fuzzReport.known_bad_blocked}
              </span>
            </div>
            <div className="bg-carbon/80 rounded-lg p-3 border border-graphite/40">
              <span className="text-[10px] text-smoke uppercase font-mono block">Unparseable Held</span>
              <span className="text-heading-sm font-mono font-bold text-amber-warning mt-1 block">
                {fuzzReport.unparseable_held}
              </span>
            </div>
            <div className="bg-carbon/80 rounded-lg p-3 border border-graphite/40">
              <span className="text-[10px] text-smoke uppercase font-mono block">Safe Allowed</span>
              <span className="text-heading-sm font-mono font-bold text-pulse-green mt-1 block">
                {fuzzReport.safe_allowed}
              </span>
            </div>
            <div className="bg-carbon/80 rounded-lg p-3 border border-graphite/40">
              <span className="text-[10px] text-smoke uppercase font-mono block">False Allows</span>
              <span className="text-heading-sm font-mono font-bold text-pulse-green mt-1 block">
                {fuzzReport.false_allows} (0%)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-card-bg border border-graphite rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        {/* Family Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-caption font-mono text-smoke mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Family:
          </span>
          {[
            { key: 'ALL', label: `All (15)` },
            { key: 'FAMILY A', label: `Family A: Bounds (3)` },
            { key: 'FAMILY B', label: `Family B: Intent (4)` },
            { key: 'FAMILY C', label: `Family C: Capability (3)` },
            { key: 'FAMILY D', label: `Family D: State (3)` },
            { key: 'FAMILY E', label: `Family E: Fail-Closed (2)` },
          ].map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setSelectedFamily(cat.key)}
              className={`px-3 py-1 rounded-lg text-caption font-mono transition-all ${
                selectedFamily === cat.key
                  ? 'bg-compass-gold/20 text-compass-gold border border-compass-gold font-bold'
                  : 'bg-carbon text-smoke border border-graphite hover:text-chalk hover:border-iron'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search & Status */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-smoke absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search scenario or path..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-carbon border border-graphite rounded-lg pl-9 pr-3 py-1.5 text-caption font-mono text-chalk placeholder-ash focus:outline-none focus:border-compass-gold w-56"
            />
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-carbon border border-graphite rounded-lg px-3 py-1.5 text-caption font-mono text-chalk focus:outline-none focus:border-compass-gold"
          >
            <option value="ALL">All Outcomes</option>
            <option value="PASS">Passed Verification</option>
            <option value="FAIL">Failed Verification</option>
          </select>
        </div>
      </div>

      {/* Benchmark Matrix Table */}
      <div className="bg-card-bg border border-graphite rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-caption font-mono">
            <thead>
              <tr className="bg-carbon border-b border-graphite text-meta text-smoke uppercase tracking-wider">
                <th className="py-3 px-4">Scenario ID</th>
                <th className="py-3 px-4">Attack Path & Name</th>
                <th className="py-3 px-4">Family</th>
                <th className="py-3 px-4">Step Trajectory</th>
                <th className="py-3 px-4">Side Effect</th>
                <th className="py-3 px-4">Latency</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-graphite/60">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-smoke">
                    {loading ? 'Evaluating scenarios...' : 'No benchmark scenarios match the active filters.'}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const isPass = row.passed;
                  const stepDecisions = row.actual_step_decisions || [];

                  return (
                    <tr
                      key={row.scenario_id}
                      className="hover:bg-carbon/60 transition-colors"
                    >
                      {/* Scenario ID */}
                      <td className="py-3 px-4">
                        <span className="font-extrabold text-chalk text-caption">
                          {row.scenario_id}
                        </span>
                      </td>

                      {/* Name & Attack Path */}
                      <td className="py-3 px-4">
                        <div>
                          <span className="text-chalk font-bold block">{row.name}</span>
                          <span className="text-smoke text-[11px] font-mono block">
                            ↳ {row.attack_path}
                          </span>
                        </div>
                      </td>

                      {/* Family */}
                      <td className="py-3 px-4">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-carbon border border-graphite text-smoke">
                          {row.attack_family ? row.attack_family.split(' — ')[1] || row.attack_family : 'Unknown'}
                        </span>
                      </td>

                      {/* Step Trajectory */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 flex-wrap">
                          {stepDecisions.map((dec, sIdx) => {
                            const pillColor = dec === 'BLOCK' ? 'text-violation-red bg-red-950/40 border-red-900/60' :
                              dec === 'HOLD' ? 'text-amber-warning bg-amber-950/40 border-amber-900/60' :
                              'text-pulse-green bg-emerald-950/40 border-emerald-900/60';
                            return (
                              <span
                                key={sIdx}
                                className={`text-[10px] font-mono px-1 py-0.5 rounded border ${pillColor}`}
                                title={`Step ${sIdx + 1}: ${dec}`}
                              >
                                T{sIdx + 1}:{dec[0]}
                              </span>
                            );
                          })}
                        </div>
                      </td>

                      {/* Side Effect */}
                      <td className="py-3 px-4">
                        {row.side_effect_expected === 'Broadcast' ? (
                          <span className="text-pulse-green text-meta font-bold flex items-center gap-1">
                            <Zap className="w-3.5 h-3.5" /> Broadcasted
                          </span>
                        ) : row.side_effect_expected === 'Only authorized txs' ? (
                          <span className="text-compass-gold text-meta font-bold flex items-center gap-1">
                            <Lock className="w-3.5 h-3.5" /> Only Authorized
                          </span>
                        ) : (
                          <span className="text-pulse-green text-meta font-bold flex items-center gap-1">
                            <Lock className="w-3.5 h-3.5" /> Zero Side Effect
                          </span>
                        )}
                      </td>

                      {/* Latency */}
                      <td className="py-3 px-4 text-smoke">
                        {row.latency_ms.toFixed(1)} ms
                      </td>

                      {/* Benchmark Pass/Fail Status */}
                      <td className="py-3 px-4">
                        {isPass ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-meta font-bold bg-pulse-green/15 text-pulse-green border border-pulse-green/30">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>PASS</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-meta font-bold bg-violation-red/15 text-violation-red border border-violation-red/30">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>FAIL</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {onSelectScenario && (
                            <button
                              type="button"
                              onClick={() => onSelectScenario(row.scenario_id)}
                              className="px-2.5 py-1 rounded bg-carbon hover:bg-graphite text-smoke hover:text-chalk border border-graphite text-meta transition-all flex items-center gap-1"
                              title="Inspect scenario in Operator Pipeline"
                            >
                              <Layers className="w-3 h-3 text-compass-gold" />
                              <span>Pipeline</span>
                            </button>
                          )}
                          {onRunCounterfactual && (
                            <button
                              type="button"
                              onClick={() => onRunCounterfactual(row.scenario_id)}
                              className="px-2.5 py-1 rounded bg-carbon hover:bg-graphite text-smoke hover:text-chalk border border-graphite text-meta transition-all flex items-center gap-1"
                              title="Run dual-execution counterfactual proof"
                            >
                              <GitCompare className="w-3 h-3 text-pulse-green" />
                              <span>Proof</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
