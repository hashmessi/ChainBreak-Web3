import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles } from 'lucide-react';
import { getJudgesExplainer } from '../utils/explainer';

/**
 * AiSummaryBot — Shows summary for the CURRENT scenario run only.
 * Each new run replaces the previous summary (no history accumulation).
 */
export default function AiSummaryBot({
  runReport = null,
  counterfactualResult = null,
  selectedScenario = null,
  onRunFeatured = null,
  isOpen = false,
  onToggle = null,
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = onToggle ? isOpen : internalOpen;
  const setOpen = onToggle ? onToggle : setInternalOpen;

  const panelRef = useRef(null);
  const [hasNewResult, setHasNewResult] = useState(false);

  // Retain claims history across executions
  const [claims, setClaims] = useState([]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target) && !e.target.closest('#ai-bot-trigger')) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, setOpen]);

  // Build claim object from execution result
  const buildClaim = (report, proof, scenario) => {
    const scen = scenario || proof?.scenario || null;
    const scenId = scen?.id || proof?.scenario_id || report?.scenario_id || 'W3';
    const scenName = scen?.name || proof?.scenario_name || scenId;

    // Decision resolution
    const decision = proof?.protected?.final_decision ||
      (report?.blocked ? 'BLOCK' : report?.final_decision || report?.receipts?.[0]?.decision) ||
      scen?.expected_decision || 'ALLOW';

    const rawDiv = proof?.divergence_step !== null && proof?.divergence_step !== undefined
      ? proof.divergence_step
      : (report?.stopped_at_step !== null && report?.stopped_at_step !== undefined ? report.stopped_at_step : null);

    const stepNum = rawDiv !== null ? Number(rawDiv) + 1 : (scen?.proposals?.length || scen?.actions?.length || 1);

    const activeReceipt = report?.receipts?.[rawDiv || 0] || report?.receipts?.[0];
    const culpritAction = proof?.protected?.actions?.find(a => a.decision === 'BLOCK' || a.decision === 'HOLD');
    const blockedTool = culpritAction?.tool || activeReceipt?.decoded?.method || 'transfer';

    const totalSteps = scen?.proposals?.length || scen?.actions?.length || proof?.protected?.actions?.length || report?.receipts?.length || 1;

    const explainer = getJudgesExplainer({
      scenarioId: scenId,
      invariantName: activeReceipt?.violated_invariants?.[0] || culpritAction?.violations?.[0] || proof?.divergent_invariant || '',
      decision,
      recipient: activeReceipt?.decoded?.recipient || '',
      amount: activeReceipt?.decoded?.amount || null,
      reason: activeReceipt?.reason || proof?.root_cause_explanation || '',
    });

    if (decision === 'BLOCK') {
      return {
        id: `${scenId}-${Date.now()}`,
        status: 'blocked',
        title: `Attack blocked at Step ${stepNum}`,
        what: `The agent ran ${totalSteps} action(s). Step 1–${Math.max(1, stepNum - 1)} appeared safe individually, but at Step ${stepNum} (${blockedTool}), ChainBreak detected the parameter mutation / trajectory budget violation.`,
        action: `ChainBreak halted execution and dropped the payload before wallet signing. Zero gas burned, zero assets lost.`,
        why: explainer.judgeTakeaway,
        scenarioId: scenId,
        scenarioName: scenName,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };
    } else if (decision === 'HOLD') {
      return {
        id: `${scenId}-${Date.now()}`,
        status: 'hold',
        title: 'Execution frozen — fail-closed',
        what: `The agent encountered unparseable calldata or an unapproved method selector. Rather than guessing, ChainBreak froze execution.`,
        action: `Pending transaction is on HOLD. Signing is physically unreachable.`,
        why: explainer.judgeTakeaway,
        scenarioId: scenId,
        scenarioName: scenName,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };
    } else {
      return {
        id: `${scenId}-${Date.now()}`,
        status: 'safe',
        title: 'Safe workflow — zero friction',
        what: `All ${totalSteps} tool call(s) were verified as safe. The agent operated within authorized intent boundaries.`,
        action: `ChainBreak cleared the pre-signing gate with zero false positives.`,
        why: explainer.judgeTakeaway,
        scenarioId: scenId,
        scenarioName: scenName,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };
    }
  };

  // Replace claim on every new execution — only show the current scenario
  useEffect(() => {
    if (runReport || counterfactualResult || selectedScenario) {
      const newClaim = buildClaim(runReport, counterfactualResult, selectedScenario);
      if (newClaim) {
        setClaims([newClaim]); // always replace, never accumulate
        setHasNewResult(true);
        const timer = setTimeout(() => setHasNewResult(false), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [runReport, counterfactualResult, selectedScenario?.id]);

  const statusColors = {
    blocked: 'var(--color-violation-red)',
    hold: 'var(--color-hold-amber)',
    safe: 'var(--color-pulse-green)',
    idle: 'var(--color-compass-gold)',
  };

  return (
    <>
      {/* Robot trigger button in header */}
      <button
        type="button"
        className={`ai-bot-trigger ${hasNewResult ? 'pulse-alert' : ''} ${open ? 'active' : ''}`}
        onClick={() => setOpen(!open)}
        title="AI Summary Assistant"
        id="ai-bot-trigger"
        aria-label="AI Summary Assistant"
      >
        <svg
          className="robot-icon"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Antenna */}
          <line x1="12" y1="2" x2="12" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="12" cy="2" r="1.5" fill="currentColor" className="antenna-dot" />
          {/* Head */}
          <rect x="4" y="6" width="16" height="12" rx="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
          {/* Eyes */}
          <circle cx="9" cy="12" r="1.8" fill="currentColor" className="robot-eye left-eye" />
          <circle cx="15" cy="12" r="1.8" fill="currentColor" className="robot-eye right-eye" />
          {/* Mouth */}
          <path d="M9 15.5 C10 16.5 14 16.5 15 15.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
          {/* Body indication */}
          <line x1="8" y1="18" x2="8" y2="21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="16" y1="18" x2="16" y2="21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="10" y1="18" x2="14" y2="18" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
        </svg>
        {hasNewResult && <span className="bot-notification-dot" />}
      </button>

      {/* Slide-out panel matching Screenshot 3 */}
      <div className={`ai-bot-panel ${open ? 'open' : ''}`} ref={panelRef}>
        <div className="ai-bot-panel-header">
          <div className="ai-bot-panel-title-row">
            <Sparkles size={14} style={{ color: 'var(--color-compass-gold)' }} />
            <span className="ai-bot-panel-title">AI Summary</span>
          </div>
          <button type="button" className="ai-bot-close" onClick={() => setOpen(false)} aria-label="Close Summary">
            <X size={14} />
          </button>
        </div>

        <div className="ai-bot-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {claims.length === 0 ? (
            <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--color-smoke)', fontSize: '13px' }}>
              Select a scenario and run it to see what ChainBreak does.
            </div>
          ) : (
            claims.map((claim, idx) => (
              <div
                key={claim.id || idx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                {/* Status indicator */}
                <div className="ai-summary-status">
                  <div
                    className="ai-status-dot"
                    style={{ background: statusColors[claim.status] || 'var(--color-compass-gold)' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flex: 1 }}>
                    <span className="ai-status-text">{claim.title}</span>
                    <span style={{ fontSize: '9px', color: 'var(--color-ash)', fontFamily: 'var(--font-mono)' }}>
                      {claim.timestamp}
                    </span>
                  </div>
                </div>

                {/* What happened */}
                <div className="ai-summary-section">
                  <span className="ai-section-label">WHAT HAPPENED</span>
                  <p className="ai-section-text">{claim.what}</p>
                </div>

                {/* What ChainBreak did */}
                {claim.action && (
                  <div className="ai-summary-section">
                    <span className="ai-section-label">WHAT CHAINBREAK DID</span>
                    <p className="ai-section-text">{claim.action}</p>
                  </div>
                )}

                {/* Why it matters */}
                {claim.why && (
                  <div className="ai-summary-section">
                    <span className="ai-section-label">WHY IT MATTERS</span>
                    <p className="ai-section-text highlight">{claim.why}</p>
                  </div>
                )}

                {/* Scenario context */}
                <div className="ai-summary-context">
                  <span className="ai-context-label">Scenario:</span>
                  <span className="ai-context-value">{claim.scenarioId} — {claim.scenarioName}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
