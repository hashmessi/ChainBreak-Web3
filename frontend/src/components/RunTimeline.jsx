import React from 'react';
import ActionCard from './ActionCard';
import ViolationPanel from './ViolationPanel';
import { Activity, Layers, ShieldAlert, Sparkles, GitCompare, ArrowRight } from 'lucide-react';

/**
 * RunTimeline — Full-width "Interception" view matching Screenshots 1 & 2.
 * Shows:
 * 1. INTERCEPTION TELEMETRY header + [PROTECTED | BASELINE] toggle + [DUAL PROOF →] CTA
 * 2. Cumulative security state ribbon (PRIVILEGE, SENSITIVE DATA, SECRETS, DESTINATIONS, VERDICT)
 * 3. ViolationPanel (Judge's Verdict, Invariant, Antecedents, Zero-Loss Callout)
 * 4. Step accordion cards (ActionCard) with parameters and execution results
 * 5. Next Step Banner to transition to Step 3 (Dual Proof)
 */
export default function RunTimeline({
  chainState,
  scenario = null,
  scenarioId = '',
  runMode = 'PROTECTED',
  onModeToggle = null,
  isCounterfactualAvailable = false,
  divergenceStep = null,
  highlightedStep = null,
  onStepRefClick = null,
  onRunFeatured = null,
  onViewProof = null,
}) {
  // Normalize state for both Web3 (receipts) and legacy (actions)
  const normalizedState = React.useMemo(() => {
    if (!chainState) return null;
    if (chainState.actions && chainState.actions.length > 0) return chainState;

    const receipts = chainState.receipts || [];
    if (receipts.length === 0) return null;

    const actions = receipts.map((r, idx) => {
      const prop = scenario?.proposals?.[idx];
      const dec = r.decoded;
      const isBlock = r.decision === 'BLOCK';
      const isHold = r.decision === 'HOLD';
      const tool = dec?.method
        ? `${dec.method}`
        : (prop?.data && prop.data !== '0x' && prop.data.length > 10 ? 'transfer' : 'native_eth_transfer');

      return {
        id: `act-${idx}`,
        step_index: idx,
        tool: tool,
        arguments: {
          to: prop?.to || dec?.raw_to || dec?.contract || '0x...',
          value: prop?.value ?? dec?.raw_value ?? 0,
          recipient: dec?.recipient || prop?.to || '0x...',
          amount: dec?.amount ? `${(dec.amount / 1e6).toLocaleString()} USDC` : (prop?.value ? `${prop.value} wei` : '0 USDC'),
          contract: dec?.token_contract || dec?.contract || prop?.to || '0x...',
          data: prop?.data || '0x'
        },
        semantics: {
          destination: dec?.recipient?.toLowerCase()?.includes('90f79bf6') ? 'EXTERNAL' : 'INTERNAL',
          sensitivity: isBlock ? 'HIGH' : 'LOW',
          data: dec?.asset || 'GENERAL',
          confidence: '100%'
        },
        decision: r.decision,
        violations: r.violated_invariants,
        reason: r.reason,
        triggered_by: idx > 0 ? Array.from({ length: idx }, (_, i) => i) : [],
        executed: r.broadcast,
        tool_result: r.broadcast
          ? (r.transaction_hash || '0x4f829a...broadcast_ok')
          : 'BLOCKED (PRE-SIGNING GATE)'
      };
    });

    const hasBreach = receipts.some((r) => r.decision === 'BLOCK');
    const hasExt = receipts.some((r) => r.decoded?.recipient?.toLowerCase()?.includes('90f79bf6'));

    return {
      actions,
      privilege_level: 'STANDARD',
      sensitive_data_observed: hasBreach,
      secrets_observed: false,
      destinations: hasExt ? ['INTERNAL', 'EXTERNAL'] : ['INTERNAL'],
      final_decision: chainState.final_decision || (hasBreach ? 'BLOCK' : 'ALLOW'),
      blocked_at_step: chainState.stopped_at_step
    };
  }, [chainState, scenario]);

  if (!normalizedState || !normalizedState.actions || normalizedState.actions.length === 0) {
    return (
      <div className="timeline-empty-state">
        <Activity size={24} style={{ color: 'var(--color-compass-gold)', marginBottom: '12px' }} />
        <div className="empty-title">NO EXECUTION TELEMETRY</div>
        <p className="empty-desc">
          Select a scenario to inspect step-by-step invariant interception.
        </p>
        {onRunFeatured && (
          <button
            type="button"
            className="btn-pill-primary"
            style={{ marginTop: '14px', gap: '6px' }}
            onClick={() => onRunFeatured('W3')}
            id="btn-timeline-run-featured"
          >
            <Sparkles size={13} />
            <span>RUN W3 FLAGSHIP ATTACK DEMO</span>
          </button>
        )}
      </div>
    );
  }

  const { actions, privilege_level, sensitive_data_observed, secrets_observed, destinations, final_decision, blocked_at_step } = normalizedState;

  // Detect if baseline permitted a dangerous exfiltration/mutation
  const isBaselineBreach = runMode === 'BASELINE' && (
    (destinations && destinations.includes('EXTERNAL') && (sensitive_data_observed || secrets_observed)) ||
    (scenarioId && ['W3', 'W4', 'W5', 'W6', 'W7', 'W8', 'W9', 'S1', 'S2', 'S3', 'S6'].includes(scenarioId.toUpperCase()))
  );

  return (
    <div className="run-timeline-container" id="run-timeline-panel">
      {/* Mode Switcher & Telemetry Header */}
      <div className="timeline-control-header">
        <div className="timeline-title-wrap">
          <Layers size={14} style={{ color: 'var(--color-compass-gold)' }} />
          <span className="timeline-section-title">INTERCEPTION TELEMETRY</span>
          <span className="badge-pill" style={{ padding: '2px 6px', fontSize: '10px' }}>
            {actions.length} {actions.length === 1 ? 'STEP' : 'STEPS'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onModeToggle && (
            <div className="mode-toggle-group">
              <button
                type="button"
                className={`mode-toggle-btn ${runMode === 'PROTECTED' ? 'active protected' : ''}`}
                onClick={() => onModeToggle('PROTECTED')}
              >
                PROTECTED
              </button>
              <button
                type="button"
                className={`mode-toggle-btn ${runMode === 'BASELINE' ? 'active baseline' : ''}`}
                onClick={() => onModeToggle('BASELINE')}
              >
                BASELINE
              </button>
            </div>
          )}

          {isCounterfactualAvailable && onViewProof && (
            <button
              type="button"
              className="btn-pill-primary"
              style={{ padding: '4px 12px', fontSize: '11px', gap: '6px', height: '28px' }}
              onClick={onViewProof}
              id="timeline-header-view-proof"
              title="Proceed to Step 3: Dual Proof"
            >
              <GitCompare size={12} />
              <span>DUAL PROOF →</span>
            </button>
          )}
        </div>
      </div>

      {/* Baseline Breach Warning Callout */}
      {isBaselineBreach && (
        <div className="baseline-breach-banner" id="baseline-breach-callout">
          <div className="baseline-breach-icon">
            <ShieldAlert size={18} />
          </div>
          <div className="baseline-breach-text">
            <div className="baseline-breach-title">
              UNMITIGATED SECURITY BREACH (BASELINE MODE)
            </div>
            <div className="baseline-breach-sub">
              Without ChainBreak runtime invariants, all {actions.length} action(s) executed unchecked. Irreversible onchain state drift occurred.
            </div>
          </div>
        </div>
      )}

      {/* Cumulative Security State Bar */}
      <div className="cumulative-state-bar">
        <div className="state-cell">
          <span className="state-cell-label">PRIVILEGE:</span>
          <span className={`state-cell-val ${privilege_level === 'ELEVATED' ? 'warn' : ''}`}>
            {privilege_level || 'STANDARD'}
          </span>
        </div>
        <div className="state-cell">
          <span className="state-cell-label">SENSITIVE DATA:</span>
          <span className={`state-cell-val ${sensitive_data_observed ? 'warn' : ''}`}>
            {sensitive_data_observed ? 'OBSERVED' : 'NONE'}
          </span>
        </div>
        <div className="state-cell">
          <span className="state-cell-label">SECRETS:</span>
          <span className={`state-cell-val ${secrets_observed ? 'danger' : ''}`}>
            {secrets_observed ? 'OBSERVED' : 'NONE'}
          </span>
        </div>
        <div className="state-cell">
          <span className="state-cell-label">DESTINATIONS:</span>
          <span className={`state-cell-val ${destinations && destinations.includes('EXTERNAL') ? 'danger' : ''}`}>
            {destinations && destinations.length > 0 ? destinations.join(', ') : 'INTERNAL'}
          </span>
        </div>
        <div className="state-cell decision">
          <span className="state-cell-label">VERDICT:</span>
          <span className={`state-cell-val verdict-${(final_decision || 'ALLOW').toLowerCase()}`}>
            {final_decision || 'ALLOW'}
          </span>
        </div>
      </div>

      {/* Violation Panel (compact inline) */}
      {(final_decision === 'BLOCK' || final_decision === 'HOLD') && (
        <ViolationPanel
          chainState={normalizedState}
          scenarioId={scenarioId}
          onHighlightStep={(stepNum) => onStepRefClick && onStepRefClick(stepNum)}
        />
      )}

      {/* Timeline with visual connectors */}
      <div className="timeline-steps-list">
        {actions.map((act) => {
          const isDivergence = runMode === 'PROTECTED' && (act.decision === 'BLOCK' || act.decision === 'HOLD');
          const isHighlight = highlightedStep !== null && (Number(act.step_index) + 1 === Number(highlightedStep));
          const stepDecisionClass = `step-${(act.decision || 'allow').toLowerCase()}`;

          return (
            <div
              key={act.id || `${act.step_index}-${act.tool}`}
              className={`timeline-step-wrapper ${stepDecisionClass}`}
            >
              <ActionCard
                action={act}
                isDivergenceStep={isDivergence}
                isHighlighted={isHighlight}
                onStepRefClick={onStepRefClick}
              />
            </div>
          );
        })}
      </div>

      {/* Demo Step 3: Dual Proof Navigation Banner */}
      {isCounterfactualAvailable && onViewProof && (
        <div
          className="proof-ready-callout-banner"
          id="proof-ready-next-step"
          style={{
            marginTop: '24px',
            marginBottom: '16px',
            padding: '16px 20px',
            background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.08) 0%, rgba(13, 14, 18, 0.95) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-pulse-green)',
                flexShrink: 0,
              }}
            >
              <GitCompare size={16} />
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-chalk)', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
                DEMO STEP 3: DUAL PROOF READY
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-smoke)' }}>
                Inspection complete. Proceed to view side-by-side Unprotected Baseline vs ChainBreak Protected divergence proof.
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn-pill-primary"
            onClick={onViewProof}
            style={{
              padding: '8px 18px',
              fontSize: '11px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
            }}
            id="btn-timeline-go-to-proof"
          >
            <span>VIEW DUAL PROOF</span>
            <ArrowRight size={13} />
          </button>
        </div>
      )}

      {/* Footer System Branding */}
      <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--color-graphite)', display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-ash)' }}>
        <span>CHAINBREAK RUNTIME ENGINE // V2.0</span>
        <span>OBSIDIAN DESIGN SYSTEM</span>
      </div>
    </div>
  );
}
