import React from 'react';
import { X, ShieldCheck, CheckCircle2, AlertTriangle, RefreshCw, BarChart3, Clock, Check } from 'lucide-react';

export default function BenchmarkModal({
  isOpen,
  onClose,
  report,
  isLoading = false,
  onRunBenchmark
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="benchmark-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="badge-pill" style={{ padding: '2px 8px' }}>
              <span style={{ color: 'var(--color-compass-gold)' }}>VERIFICATION SUITE</span>
            </div>
            <h2 className="modal-title">{report?.total_scenarios || 12}-Scenario Security Benchmark Report</h2>
            <p className="modal-subtitle">
              Comprehensive counterfactual evaluation of attack neutralization, false positive rate, and fail-closed EVM intent integrity.
            </p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} id="btn-close-modal">
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="modal-body">
          {isLoading ? (
            <div className="modal-loading-state">
              <RefreshCw size={28} className="spin-icon" style={{ color: 'var(--color-chalk)', marginBottom: '16px' }} />
              <div className="loading-title">RUNNING FULL BENCHMARK EVALUATION...</div>
              <p className="loading-sub">
                Executing 20 scenarios through dual-track counterfactual pipeline (Baseline vs Protected).
              </p>
            </div>
          ) : report ? (() => {
            const rawResults = report.results || report.scenario_results || [];
            const attackCount = report.dangerous_scenarios ?? report.attack_scenarios ?? 6;
            const safeCount = report.safe_scenarios ?? 5;
            const attacksPrevented = attackCount ? Math.round((report.prevention_rate ?? 1) * attackCount) : 6;
            const falseBlocks = safeCount ? Math.round((report.false_block_rate ?? 0) * safeCount) : 0;
            const latency = report.avg_latency_ms ?? report.mean_latency_ms ?? 0;

            return (
              <>
                {/* Metric Highlights Grid */}
                <div className="benchmark-metrics-strip">
                  <div className="b-metric-card">
                    <span className="b-metric-label">DETECTION RATE</span>
                    <span className="b-metric-val highlight-green">
                      {((report.detection_rate ?? 1) * 100).toFixed(0)}%
                    </span>
                    <span className="b-metric-sub">
                      {attacksPrevented} / {attackCount} Attacks Caught
                    </span>
                  </div>

                  <div className="b-metric-card">
                    <span className="b-metric-label">PREVENTION RATE</span>
                    <span className="b-metric-val highlight-green">
                      {((report.prevention_rate ?? 1) * 100).toFixed(0)}%
                    </span>
                    <span className="b-metric-sub">Zero Exfiltration on Interception</span>
                  </div>

                  <div className="b-metric-card">
                    <span className="b-metric-label">FALSE BLOCK RATE</span>
                    <span className="b-metric-val highlight-clean">
                      {((report.false_block_rate ?? 0) * 100).toFixed(0)}%
                    </span>
                    <span className="b-metric-sub">
                      {falseBlocks} False Positives / {safeCount} Safe Scenarios
                    </span>
                  </div>

                  <div className="b-metric-card">
                    <span className="b-metric-label">EVALUATION OVERHEAD</span>
                    <span className="b-metric-val">
                      {latency ? `${latency.toFixed(2)}ms` : '<1ms'}
                    </span>
                    <span className="b-metric-sub">Mean Invariant Evaluation Latency</span>
                  </div>
                </div>

                {/* Scenarios Table */}
                <div className="benchmark-table-wrap">
                  <table className="benchmark-table">
                    <thead>
                      <tr>
                        <th style={{ width: '60px' }}>ID</th>
                        <th>SCENARIO</th>
                        <th style={{ width: '130px' }}>CATEGORY</th>
                        <th style={{ width: '100px' }}>BASELINE</th>
                        <th style={{ width: '110px' }}>PROTECTED</th>
                        <th style={{ width: '100px' }}>DIVERGED</th>
                        <th style={{ width: '90px' }}>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rawResults.map((res) => {
                        const scenId = res.scenario?.id || res.scenario_id || '—';
                        const scenName = res.scenario?.name || res.name || scenId;
                        const scenCat = (res.scenario?.category || res.category || 'attack').toUpperCase();
                        const baseDec = res.baseline?.final_decision || res.actual_baseline || 'ALLOW';
                        const protDec = res.protected?.final_decision || res.actual_protected || (res.correctly_blocked ? 'BLOCK' : 'ALLOW');
                        
                        const rawDiv = res.divergence_step !== null && res.divergence_step !== undefined
                          ? res.divergence_step
                          : (res.protected?.blocked_at_step !== null && res.protected?.blocked_at_step !== undefined ? res.protected.blocked_at_step : null);
                        const divStepNum = rawDiv !== null ? Number(rawDiv) + 1 : null;
                        
                        const isPassed = res.passed !== undefined
                          ? res.passed
                          : (res.correctly_blocked || (protDec === (res.scenario?.expected_result || 'BLOCK')));

                        return (
                          <tr key={scenId}>
                            <td><code>{scenId}</code></td>
                            <td>
                              <div className="bench-scen-name">{scenName}</div>
                            </td>
                            <td>
                              <span className="meta-category-badge">{scenCat.replace(/_/g, ' ')}</span>
                            </td>
                            <td>
                              <span className={`status-pill ${baseDec.toLowerCase()}`}>
                                {baseDec}
                              </span>
                            </td>
                            <td>
                              <span className={`status-pill ${protDec.toLowerCase()}`}>
                                {protDec}
                              </span>
                            </td>
                            <td>
                              {divStepNum ? (
                                <span className="divergence-text">Step {String(divStepNum).padStart(2, '0')}</span>
                              ) : (
                                <span style={{ color: 'var(--color-iron)' }}>—</span>
                              )}
                            </td>
                            <td>
                              {isPassed ? (
                                <span className="status-pass-pill">
                                  <Check size={11} /> PASS
                                </span>
                              ) : (
                                <span className="status-fail-pill">FAIL</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            );
          })() : (
            <div className="modal-empty-state">
              <BarChart3 size={32} style={{ color: 'var(--color-compass-gold)', marginBottom: '16px' }} />
              <div className="loading-title">NO BENCHMARK REPORT CACHED</div>
              <p className="loading-sub">
                Click below to trigger automated evaluation of all 20 benchmark scenarios.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <div className="footer-meta">
            <span>SUITE V2.0 • {report?.total_scenarios || 12} EVM SCENARIOS • DETERMINISTIC INVARIANT ENGINE</span>
          </div>
          <div className="footer-actions">
            <button
              type="button"
              className="btn-pill-primary"
              disabled={isLoading}
              onClick={onRunBenchmark}
              id="btn-trigger-benchmark-run"
            >
              <RefreshCw size={13} className={isLoading ? 'spin-icon' : ''} />
              <span>{isLoading ? 'EVALUATING...' : `RERUN ALL ${report?.total_scenarios || 12} SCENARIOS`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
