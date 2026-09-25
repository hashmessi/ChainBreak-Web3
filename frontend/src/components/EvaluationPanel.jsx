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
} from 'lucide-react';

export default function EvaluationPanel({
  substrate = 'LOCAL',
  onSelectScenario = null,
  onRunCounterfactual = null,
}) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('ALL'); // ALL | attack | safe | malformed
  const [selectedStatus, setSelectedStatus] = useState('ALL');     // ALL | PASS | FAIL
  const [searchQuery, setSearchQuery] = useState('');

  const fetchBenchmark = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v2/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ substrate }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Evaluation benchmark failed');
      }
      const data = await res.json();
      setReport(data);
    } catch (err) {
      console.error('Failed to load benchmark evaluation:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load on mount and when substrate changes
  useEffect(() => {
    fetchBenchmark();
  }, [substrate]);

  const rows = report?.results || [];

  // Filtered rows
  const filteredRows = rows.filter((r) => {
    // Category filter
    if (selectedCategory !== 'ALL' && r.category !== selectedCategory) {
      return false;
    }
    // Status filter
    if (selectedStatus === 'PASS' && !r.passed) return false;
    if (selectedStatus === 'FAIL' && r.passed) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = r.scenario_id.toLowerCase().includes(q);
      const matchName = r.name.toLowerCase().includes(q);
      const matchCategory = r.category.toLowerCase().includes(q);
      if (!matchId && !matchName && !matchCategory) return false;
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
              Adversarial Evaluation & Benchmark Suite
            </h2>
            <span className="text-meta font-mono px-2 py-0.5 rounded bg-compass-gold/15 text-compass-gold border border-compass-gold/30">
              EVAL-01 / EVAL-02 / EVAL-03
            </span>
          </div>
          <p className="text-caption text-smoke mt-1">
            Deterministic pre-signing verification across 12 EVM adversarial vectors and safe baseline trajectories.
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
            <span>{loading ? 'Running Suite...' : 'Re-run Benchmark Suite'}</span>
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
          {/* Card 1: Prevention Rate */}
          <div className="bg-carbon border border-graphite rounded-xl p-4 relative overflow-hidden">
            <div className="text-meta text-smoke uppercase font-mono tracking-wider flex items-center justify-between">
              <span>Threat Prevention Rate</span>
              <ShieldCheck className="w-4 h-4 text-pulse-green" />
            </div>
            <div className="text-heading-lg font-mono font-extrabold text-pulse-green mt-2">
              {(report.prevention_rate * 100).toFixed(1)}%
            </div>
            <div className="text-meta text-ash mt-1">
              {report.attacks_prevented} of {report.attack_scenarios + report.malformed_scenarios} attacks blocked
            </div>
          </div>

          {/* Card 2: False Block Rate */}
          <div className="bg-carbon border border-graphite rounded-xl p-4 relative overflow-hidden">
            <div className="text-meta text-smoke uppercase font-mono tracking-wider flex items-center justify-between">
              <span>False Block Rate</span>
              <CheckCircle2 className="w-4 h-4 text-pulse-green" />
            </div>
            <div className="text-heading-lg font-mono font-extrabold text-chalk mt-2">
              {(report.false_block_rate * 100).toFixed(1)}%
            </div>
            <div className="text-meta text-ash mt-1">
              {report.safe_passed} of {report.safe_scenarios} safe flows allowed
            </div>
          </div>

          {/* Card 3: Broadcast Suppression */}
          <div className="bg-carbon border border-graphite rounded-xl p-4 relative overflow-hidden">
            <div className="text-meta text-smoke uppercase font-mono tracking-wider flex items-center justify-between">
              <span>Broadcast Suppression</span>
              <Lock className="w-4 h-4 text-compass-gold" />
            </div>
            <div className="text-heading-lg font-mono font-extrabold text-compass-gold mt-2">
              {(report.broadcast_suppression_rate * 100).toFixed(1)}%
            </div>
            <div className="text-meta text-ash mt-1">
              Pre-signing interception before RPC
            </div>
          </div>

          {/* Card 4: Gate Latency */}
          <div className="bg-carbon border border-graphite rounded-xl p-4 relative overflow-hidden">
            <div className="text-meta text-smoke uppercase font-mono tracking-wider flex items-center justify-between">
              <span>Avg Invariant Latency</span>
              <Timer className="w-4 h-4 text-smoke" />
            </div>
            <div className="text-heading-lg font-mono font-extrabold text-chalk mt-2">
              {report.avg_latency_ms} <span className="text-caption font-normal text-smoke">ms</span>
            </div>
            <div className="text-meta text-pulse-green mt-1">
              Sub-10ms deterministic speed
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Controls */}
      <div className="bg-card-bg border border-graphite rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-caption font-mono text-smoke mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Category:
          </span>
          {[
            { key: 'ALL', label: `All (${rows.length})` },
            { key: 'attack', label: `Attacks (${rows.filter(r => r.category === 'attack').length})` },
            { key: 'safe', label: `Safe Flows (${rows.filter(r => r.category === 'safe').length})` },
            { key: 'malformed', label: `Malformed (${rows.filter(r => r.category === 'malformed').length})` },
          ].map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setSelectedCategory(cat.key)}
              className={`px-3 py-1 rounded-lg text-caption font-mono transition-all ${
                selectedCategory === cat.key
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
              placeholder="Filter by ID or keyword..."
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
                <th className="py-3 px-4">Scenario</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Baseline (No Gate)</th>
                <th className="py-3 px-4">ChainBreak Protected</th>
                <th className="py-3 px-4">Suppression</th>
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
                  const isBlocked = row.actual_decision === 'BLOCK';
                  const isHeld = row.actual_decision === 'HOLD';
                  const isAllowed = row.actual_decision === 'ALLOW';

                  return (
                    <tr
                      key={row.scenario_id}
                      className="hover:bg-carbon/60 transition-colors"
                    >
                      {/* Scenario ID & Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-chalk text-caption">
                            {row.scenario_id}
                          </span>
                          <span className="text-smoke text-caption truncate max-w-xs block font-sans" title={row.name}>
                            {row.name}
                          </span>
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-meta font-bold uppercase ${
                            row.category === 'attack'
                              ? 'bg-violation-red/15 text-violation-red border border-violation-red/30'
                              : row.category === 'safe'
                              ? 'bg-pulse-green/15 text-pulse-green border border-pulse-green/30'
                              : 'bg-amber-warning/15 text-amber-warning border border-amber-warning/30'
                          }`}
                        >
                          {row.category}
                        </span>
                      </td>

                      {/* Baseline Outcome */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="text-violation-red font-bold">ALLOW</span>
                          <span className="text-meta text-ash">
                            ({row.baseline_broadcasts} {row.baseline_broadcasts === 1 ? 'tx' : 'txs'})
                          </span>
                        </div>
                      </td>

                      {/* Protected Decision */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-bold px-2 py-0.5 rounded text-meta ${
                              isBlocked
                                ? 'bg-violation-red/20 text-violation-red border border-violation-red/40'
                                : isHeld
                                ? 'bg-amber-warning/20 text-amber-warning border border-amber-warning/40'
                                : 'bg-pulse-green/20 text-pulse-green border border-pulse-green/40'
                            }`}
                          >
                            {row.actual_decision}
                          </span>
                          <span className="text-meta text-ash">
                            ({row.protected_broadcasts} tx)
                          </span>
                        </div>
                      </td>

                      {/* Suppression Status */}
                      <td className="py-3 px-4">
                        {row.broadcast_suppressed ? (
                          <span className="text-pulse-green text-meta font-bold flex items-center gap-1">
                            <Lock className="w-3.5 h-3.5" /> Blocked Pre-Sign
                          </span>
                        ) : (
                          <span className="text-smoke text-meta">
                            {row.actual_decision === 'ALLOW' ? 'Permitted Broadcast' : 'N/A'}
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
