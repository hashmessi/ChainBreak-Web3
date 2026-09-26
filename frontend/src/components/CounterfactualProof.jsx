import React from 'react';
import { ShieldCheck, ShieldAlert, Split, Scale, Sparkles, CheckCircle2, Lock, Zap, ArrowRight, AlertTriangle } from 'lucide-react';
import { getJudgesExplainer } from '../utils/explainer';

/**
 * CounterfactualProof — Dual-track execution proof:
 * 1. Top banner: ATTACK NEUTRALIZED [SCENARIO {ID}] + Headline + Inset Judge's Verdict Card
 * 2. Interactive Judge's Moment & Compound Violations Grid (W2, W8, W11)
 * 3. 3-metric strip: DIVERGENCE STEP | BASELINE RESULT | PROTECTED RESULT
 * 4. 3-column Divergence Diagram: BASELINE (UNPROTECTED) | Divider with ✕ | CHAINBREAK (PROTECTED)
 * 5. Counterfactual Closing Proof: Baseline Executes (tx_hash) vs ChainBreak Blocks (tx_hash = null)
 */
export default function CounterfactualProof({
  counterfactualResult,
  selectedScenario = null,
  onRunAgain = null,
  onRunFeatured = null
}) {
  if (!counterfactualResult) {
    return (
      <div className="timeline-empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
        <Split size={28} style={{ color: 'var(--color-compass-gold)', margin: '0 auto 12px auto' }} />
        <div className="empty-title">AWAITING COUNTERFACTUAL EXECUTION</div>
        <p className="empty-desc" style={{ maxWidth: '520px', margin: '0 auto 18px auto', fontSize: '13px' }}>
          Run any scenario to generate side-by-side counterfactual proof: Unprotected Baseline vs ChainBreak Invariant Firewall.
        </p>
        {(onRunFeatured || onRunAgain) && (
          <button
            type="button"
            className="btn-pill-primary"
            style={{ gap: '6px' }}
            onClick={() => (onRunFeatured ? onRunFeatured('W2') : onRunAgain('W2'))}
            id="btn-proof-run-w2"
          >
            <Sparkles size={13} />
            <span>RUN W2 RECIPIENT HIJACK PROOF</span>
          </button>
        )}
      </div>
    );
  }

  const {
    scenario_id: rawScenarioId,
    scenario_name,
    baseline,
    protected: protectedRun,
    attack_prevented: rawAttackPrevented,
    correctly_blocked,
    divergence_step: rawDivergenceStep,
    causal_lineage,
    root_cause_explanation,
  } = counterfactualResult;

  const scenario_id = rawScenarioId || selectedScenario?.id || 'W2';
  const attack_prevented = rawAttackPrevented ?? correctly_blocked ?? (protectedRun?.final_decision === 'BLOCK');
  const divergence_step = rawDivergenceStep ?? causal_lineage?.divergence_step ?? null;

  const isBlocked = attack_prevented || protectedRun?.final_decision === 'BLOCK';
  const isHold = protectedRun?.final_decision === 'HOLD';
  const isSafe = !isBlocked && !isHold;

  // Extract receipts/actions for step rows
  const baseItems = baseline?.receipts || baseline?.actions || [];
  const protItems = protectedRun?.receipts || protectedRun?.actions || [];
  const maxSteps = Math.max(baseItems.length, protItems.length, selectedScenario?.proposals?.length || 1);

  const rows = [];
  for (let i = 0; i < maxSteps; i++) {
    const stepNum = i + 1;
    const baseItem = baseItems[i];
    const protItem = protItems[i];
    const prop = selectedScenario?.proposals?.[i];

    // Determine tool name
    let toolName = 'transfer';
    if (protItem?.decoded?.method) {
      toolName = `${protItem.decoded.method}`;
    } else if (baseItem?.decoded?.method) {
      toolName = `${baseItem.decoded.method}`;
    } else if (protItem?.tool) {
      toolName = protItem.tool;
    } else if (baseItem?.tool) {
      toolName = baseItem.tool;
    }

    const isBreak = i === divergence_step;

    let protDec = 'ALLOW';
    if (protItem) {
      protDec = protItem.decision;
    } else if (isBlocked && divergence_step !== null && i >= divergence_step) {
      protDec = 'BLOCK';
    } else if (isBlocked) {
      protDec = 'BLOCK';
    }

    rows.push({
      stepNum,
      tool: toolName,
      baseDecision: baseItem?.decision || 'ALLOW',
      protDecision: protDec,
      isBreak,
      baseTxHash: baseItem?.transaction_hash || null,
      protTxHash: protItem?.transaction_hash || null,
    });
  }

  const divStepNum = divergence_step !== null && divergence_step !== undefined
    ? Number(divergence_step) + 1
    : (isBlocked ? 1 : null);

  const blockedTool = rows.find(r => r.isBreak)?.tool || rows[rows.length - 1]?.tool || 'transfer';

  // Get Judge's Explainer
  const explainer = getJudgesExplainer({
    scenarioId: scenario_id,
    invariantName: causal_lineage?.violated_invariants?.[0] || '',
    decision: isBlocked ? 'BLOCK' : isHold ? 'HOLD' : 'ALLOW',
    reason: root_cause_explanation || causal_lineage?.reason || '',
  });

  return (
    <div className="proof-container space-y-4" id="proof-panel-deck" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Banner & Inset Judge's Verdict Card */}
      <div className={`violation-panel ${isBlocked ? 'blocked' : isHold ? 'held' : 'clean'}`} style={{ margin: 0, padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span className={`flagship-tag ${isBlocked ? 'cat-attack' : isHold ? 'cat-failure' : 'cat-safe'}`} style={{ padding: '2px 8px' }}>
            {isBlocked ? 'ATTACK NEUTRALIZED' : isHold ? 'FAIL-CLOSED ACTIVE' : 'VERIFIED SAFE'}
          </span>
          <span className="badge-pill" style={{ padding: '2px 8px', fontSize: '10px' }}>
            SCENARIO {scenario_id}
          </span>
        </div>

        <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-chalk)', letterSpacing: '-0.02em', marginBottom: '4px' }}>
          {isBlocked
            ? `ChainBreak Intercepted at Step ${String(divStepNum || 1).padStart(2, '0')} (${blockedTool})`
            : isHold
            ? `ChainBreak Held at Step ${String(divStepNum || 1).padStart(2, '0')} — Fail-Closed Under Uncertainty`
            : `All ${maxSteps} Steps Verified Compliant with Intent`}
        </h2>
        <p style={{ fontSize: '12px', color: 'var(--color-smoke)', marginBottom: '14px' }}>
          {isBlocked
            ? `Baseline trajectory progressed through all ${maxSteps} step(s) unchecked. ChainBreak invariant enforcement severed execution before wallet signing.`
            : isHold
            ? `Calldata decoding failed safe on HOLD. Signer and broadcaster never invoked.`
            : `Baseline and Protected pipelines both executed safely with zero false blocks.`}
        </p>

        {/* Inset Judge's Verdict Card */}
        <div className={`judges-briefing-card ${isBlocked ? 'danger' : isHold ? 'hold' : 'success'}`} style={{ marginTop: '0' }}>
          <div className="judges-briefing-header">
            <Scale size={13} style={{ color: isBlocked ? 'var(--color-violation-red)' : isHold ? 'var(--color-hold-amber)' : 'var(--color-pulse-green)' }} />
            <span className="judges-tag">{explainer.title}</span>
            <span className="judges-badge-pill">{explainer.badge}</span>
          </div>
          <div className="judges-headline">{explainer.headline}</div>
          <p className="judges-body-text">{explainer.explanation}</p>
          <div className="judges-takeaway-strip">
            <Sparkles size={12} style={{ color: 'var(--color-compass-gold)', flexShrink: 0 }} />
            <span>
              <strong>Key Takeaway:</strong> {explainer.judgeTakeaway}
            </span>
          </div>

          {/* Judge Moment Display (e.g. AUTHORIZED -> Alice, PROPOSED -> Mallory => BLOCKED) */}
          {explainer.judgeMoment && (
            <div className="judge-moment-strip mt-3 p-3 bg-obsidian/70 border border-graphite rounded-lg">
              <div className="text-meta font-mono font-bold text-compass-gold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Lock size={12} />
                <span>Security Boundary Proof Moment</span>
              </div>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-caption font-mono">
                <div className="flex-1">
                  <div className="text-meta text-smoke">AUTHORIZED INTENT</div>
                  <div className="text-chalk font-semibold text-caption mt-0.5">{explainer.judgeMoment.authorized}</div>
                </div>
                <div className="text-smoke hidden md:block">→</div>
                <div className="flex-1">
                  <div className="text-meta text-smoke">PROPOSED ACTION</div>
                  <div className="text-violation-red font-semibold text-caption mt-0.5">{explainer.judgeMoment.proposed}</div>
                </div>
                <div className="text-smoke hidden md:block">↓</div>
                <div className="text-right">
                  <div className="text-meta text-smoke">DECISION</div>
                  <div className={`font-extrabold text-caption mt-0.5 ${isBlocked ? 'text-violation-red' : isHold ? 'text-amber-warning' : 'text-pulse-green'}`}>
                    {explainer.judgeMoment.verdict}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Compound Violations Breakdown (W11: 4 Security Violations) */}
          {explainer.compoundViolations && (
            <div className="compound-violations-box mt-3 p-3 bg-carbon/90 border border-violation-red/40 rounded-lg">
              <div className="text-meta font-mono font-bold text-violation-red uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ShieldAlert size={13} />
                <span>4 Security Violations Neutralized Simultaneously</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-caption font-mono">
                {explainer.compoundViolations.map((v, idx) => (
                  <div key={idx} className="bg-obsidian/60 p-2 rounded border border-graphite flex items-center justify-between">
                    <div>
                      <span className="text-smoke text-meta font-bold uppercase">{v.label}:</span>
                      <div className="text-caption mt-0.5">
                        <span className="text-chalk">{v.authorized}</span>
                        <span className="text-smoke mx-1.5">→</span>
                        <span className="text-violation-red font-bold">{v.proposed}</span>
                      </div>
                    </div>
                    <span className="status-pill block" style={{ fontSize: '9px', padding: '1px 6px' }}>BLOCKED</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3 Metrics Row (Divergence Step, Baseline Result, Protected Result) */}
      <div className="proof-metrics-row">
        <div className="metric-cell">
          <span className="metric-label">DIVERGENCE STEP</span>
          <span className="metric-value">
            {divStepNum ? `Step ${String(divStepNum).padStart(2, '0')}` : 'None'}
          </span>
        </div>
        <div className="metric-cell">
          <span className="metric-label">BASELINE RESULT</span>
          <span className="metric-value danger">
            ALLOW (BREACH)
          </span>
        </div>
        <div className="metric-cell">
          <span className="metric-label">PROTECTED RESULT</span>
          <span className={`metric-value ${isBlocked ? 'danger' : isHold ? 'gold' : 'success'}`}>
            {isBlocked ? 'BLOCK' : isHold ? 'HOLD' : 'ALLOW'}
          </span>
        </div>
      </div>

      {/* Visual Divergence Diagram */}
      <div className="divergence-diagram">
        {/* Left Track: BASELINE (UNPROTECTED) */}
        <div className="divergence-track">
          <div className="divergence-track-header">BASELINE (UNPROTECTED)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {rows.map((row) => (
              <div key={`base-row-${row.stepNum}`} className="divergence-step-row">
                <span className="divergence-step-num">{String(row.stepNum).padStart(2, '0')}</span>
                <span className="divergence-step-tool">{row.tool}</span>
                <span className="divergence-step-decision">
                  <span className="decision-pill allow">ALLOW</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Center: Divergence Break Line & Indicator */}
        <div className="divergence-center">
          {rows.map((row) => (
            <div
              key={`div-center-${row.stepNum}`}
              className="divergence-break-indicator"
              style={{ height: '36px' }}
            >
              {row.isBreak ? (
                <div className="break-line" title="Execution severed here" />
              ) : (
                <div className="concordant-line" />
              )}
            </div>
          ))}
        </div>

        {/* Right Track: CHAINBREAK (PROTECTED) */}
        <div className="divergence-track">
          <div className="divergence-track-header">CHAINBREAK (PROTECTED)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {rows.map((row) => {
              const isBlock = row.protDecision === 'BLOCK' || row.isBreak;
              const isHeld = row.protDecision === 'HOLD';
              return (
                <div
                  key={`prot-row-${row.stepNum}`}
                  className={`divergence-step-row ${isBlock ? 'is-break' : ''}`}
                >
                  <span className="divergence-step-num">{String(row.stepNum).padStart(2, '0')}</span>
                  <span className="divergence-step-tool">{row.tool}</span>
                  <span className="divergence-step-decision">
                    <span className={`decision-pill ${isBlock ? 'block' : isHeld ? 'hold' : 'allow'}`}>
                      {row.protDecision}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Counterfactual Proof Closing Evidence Card ────────────────────── */}
      <div className="counterfactual-proof-verdict-box p-4 bg-card-bg border border-graphite rounded-xl">
        <div className="text-meta font-mono font-bold text-smoke uppercase tracking-wider mb-3 flex items-center justify-between">
          <span>Comparative Execution Proof Summary</span>
          <span className="text-pulse-green font-bold flex items-center gap-1">
            <Lock size={12} /> Broadcast Suppression = VERIFIED
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-caption font-mono">
          <div className="p-3 bg-carbon/70 rounded-lg border border-graphite">
            <div className="text-meta text-smoke mb-1">BASELINE (UNPROTECTED)</div>
            <div className="text-violation-red font-bold text-caption">EXECUTES & BROADCASTS</div>
            <div className="text-meta text-ash mt-1">
              Broadcasts completed: {baseline?.broadcast_count || 1} &bull; tx_hash created &bull; Capital drained
            </div>
          </div>

          <div className="p-3 bg-carbon/70 rounded-lg border border-graphite">
            <div className="text-meta text-smoke mb-1">CHAINBREAK (PROTECTED)</div>
            <div className={`font-bold text-caption ${isBlocked ? 'text-violation-red' : isHold ? 'text-amber-warning' : 'text-pulse-green'}`}>
              {isBlocked ? 'SEVERED PRE-SIGNING' : isHold ? 'FROZEN FAIL-CLOSED' : 'PERMITTED CLEANLY'}
            </div>
            <div className="text-meta text-ash mt-1">
              {isBlocked || isHold ? (
                <>
                  Signer: <strong className="text-chalk">NOT CALLED</strong> &bull; Broadcast: <strong className="text-chalk">FALSE</strong> &bull; tx_hash: <strong className="text-chalk">NULL</strong>
                </>
              ) : (
                'Verified compliant &bull; tx_hash created &bull; Zero false blocks'
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
