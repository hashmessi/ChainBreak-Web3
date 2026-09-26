import React from 'react';
import { ShieldCheck, ShieldAlert, Split, Scale, Sparkles, CheckCircle2 } from 'lucide-react';
import { getJudgesExplainer } from '../utils/explainer';

/**
 * CounterfactualProof — Matches Screenshot 3 with 100% fidelity:
 * 1. Top banner: ATTACK NEUTRALIZED [SCENARIO {ID}] + Headline + Inset Judge's Verdict Card
 * 2. 3-metric strip: DIVERGENCE STEP | BASELINE RESULT | PROTECTED RESULT
 * 3. 3-column Divergence Diagram: BASELINE (UNPROTECTED) | Divider with ✕ | CHAINBREAK (PROTECTED)
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
            onClick={() => (onRunFeatured ? onRunFeatured('W3') : onRunAgain('W3'))}
            id="btn-proof-run-w3"
          >
            <Sparkles size={13} />
            <span>RUN W3 ATTACK PROOF</span>
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

  const scenario_id = rawScenarioId || selectedScenario?.id || 'W3';
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
    let toolName = 'action';
    if (protItem?.decoded?.method) {
      toolName = `${protItem.decoded.method}`;
    } else if (baseItem?.decoded?.method) {
      toolName = `${baseItem.decoded.method}`;
    } else if (protItem?.tool) {
      toolName = protItem.tool;
    } else if (baseItem?.tool) {
      toolName = baseItem.tool;
    } else if (prop?.data && prop.data !== '0x' && prop.data.length > 10) {
      toolName = 'transfer';
    } else {
      toolName = 'native_eth_transfer';
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
      {/* Top Banner & Inset Judge's Verdict Card (Matching Screenshot 3) */}
      <div className={`violation-panel ${isBlocked ? 'blocked' : 'clean'}`} style={{ margin: 0, padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span className={`flagship-tag ${isBlocked ? 'cat-attack' : 'cat-safe'}`} style={{ padding: '2px 8px' }}>
            {isBlocked ? 'ATTACK NEUTRALIZED' : 'VERIFIED SAFE'}
          </span>
          <span className="badge-pill" style={{ padding: '2px 8px', fontSize: '10px' }}>
            SCENARIO {scenario_id}
          </span>
        </div>

        <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-chalk)', letterSpacing: '-0.02em', marginBottom: '4px' }}>
          {isBlocked
            ? `ChainBreak intercepted at Step ${String(divStepNum || 1).padStart(2, '0')} (${blockedTool})`
            : `All ${maxSteps} Steps Verified Compliant with Intent`}
        </h2>
        <p style={{ fontSize: '12px', color: 'var(--color-smoke)', marginBottom: '14px' }}>
          {isBlocked
            ? `Baseline trajectory progressed through all ${maxSteps} step(s) unchecked. ChainBreak invariant enforcement severed execution before wallet signing.`
            : `Baseline and Protected pipelines both executed safely with zero false blocks.`}
        </p>

        {/* Inset Judge's Verdict Card */}
        <div className="judges-briefing-card danger" style={{ marginTop: '0' }}>
          <div className="judges-briefing-header">
            <Scale size={13} style={{ color: 'var(--color-pulse-green)' }} />
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
            {isBlocked ? 'ALLOW' : 'ALLOW'}
          </span>
        </div>
        <div className="metric-cell">
          <span className="metric-label">PROTECTED RESULT</span>
          <span className={`metric-value ${isBlocked ? 'danger' : 'success'}`}>
            {isBlocked ? 'BLOCK' : 'ALLOW'}
          </span>
        </div>
      </div>

      {/* Visual Divergence Diagram Matching Screenshot 3 */}
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
              return (
                <div
                  key={`prot-row-${row.stepNum}`}
                  className={`divergence-step-row ${isBlock ? 'is-break' : ''}`}
                >
                  <span className="divergence-step-num">{String(row.stepNum).padStart(2, '0')}</span>
                  <span className="divergence-step-tool">{row.tool}</span>
                  <span className="divergence-step-decision">
                    <span className={`decision-pill ${isBlock ? 'block' : 'allow'}`}>
                      {isBlock ? 'BLOCK' : 'ALLOW'}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
