import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, ShieldAlert, CornerDownRight, Database, Send, Key, Lock, ChevronDown } from 'lucide-react';

/**
 * ActionCard — Collapsed by default, expandable on click.
 * Collapsed: step badge → tool name → decision pill
 * Expanded: semantics, arguments, lineage, execution result
 */
export default function ActionCard({
  action,
  isDivergenceStep = false,
  isHighlighted = false,
  onStepRefClick = null,
  forceExpanded = false
}) {
  const [isExpanded, setIsExpanded] = useState(forceExpanded || isDivergenceStep);

  const {
    step_index,
    tool,
    arguments: args,
    semantics,
    decision,
    violations,
    reason,
    triggered_by = [],
    executed,
    tool_result
  } = action;

  const getDecisionBadge = () => {
    switch (decision) {
      case 'ALLOW':
        return (
          <div className="decision-pill allow" title="Permitted by invariant engine">
            <div className="pulse-dot" />
            <span>ALLOW</span>
          </div>
        );
      case 'HOLD':
        return (
          <div className="decision-pill hold" title="Fail-closed hold">
            <AlertTriangle size={10} />
            <span>HOLD</span>
          </div>
        );
      case 'BLOCK':
        return (
          <div className="decision-pill block" title="Blocked by invariant">
            <ShieldAlert size={10} />
            <span>BLOCK</span>
          </div>
        );
      default:
        return <div className="decision-pill"><span>{decision}</span></div>;
    }
  };

  const getToolIcon = () => {
    if (tool.includes('secret') || tool.includes('privilege')) return <Lock size={13} className="tool-icon" />;
    if (tool.includes('external') || tool.includes('send')) return <Send size={13} className="tool-icon" />;
    return <Database size={13} className="tool-icon" />;
  };

  return (
    <div
      className={`action-card ${decision.toLowerCase()} ${isDivergenceStep ? 'divergence-target' : ''} ${isHighlighted ? 'highlighted-predecessor' : ''}`}
      id={`action-step-${step_index}`}
    >
      {/* Collapsed header — always visible, clickable to toggle */}
      <div className="action-card-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="step-indicator">
          <span className="step-badge">STEP {String(Number(step_index) + 1).padStart(2, '0')}</span>
          <div className="tool-identity">
            {getToolIcon()}
            <code className="tool-name">{tool}</code>
          </div>
        </div>
        <div className="step-status-cluster">
          {isDivergenceStep && (
            <span className="divergence-pill" title="Execution diverged here">
              INTERCEPTION
            </span>
          )}
          {getDecisionBadge()}
          <ChevronDown size={14} className={`expand-chevron ${isExpanded ? 'expanded' : ''}`} />
        </div>
      </div>

      {/* Expanded detail body */}
      {isExpanded && (
        <div className="action-card-body">
          {/* Semantics metadata */}
          {semantics && (
            <div className="semantics-bar">
              <div className="semantic-pill">
                <span className="pill-key">DEST:</span>
                <span className={`pill-val ${semantics.destination === 'EXTERNAL' ? 'warn' : ''}`}>
                  {semantics.destination}
                </span>
              </div>
              <div className="semantic-pill">
                <span className="pill-key">SENSITIVITY:</span>
                <span className={`pill-val ${(semantics.data_sensitivity || semantics.sensitivity) === 'HIGH' ? 'danger' : (semantics.data_sensitivity || semantics.sensitivity) === 'MEDIUM' ? 'warn' : ''}`}>
                  {semantics.data_sensitivity || semantics.sensitivity || 'STANDARD'}
                </span>
              </div>
              {(semantics.data || semantics.data_classes) && (
                <div className="semantic-pill">
                  <span className="pill-key">DATA:</span>
                  <span className="pill-val">{Array.isArray(semantics.data_classes) ? semantics.data_classes.join(', ') : (semantics.data || 'GENERAL')}</span>
                </div>
              )}
              {semantics.confidence !== undefined && (
                <div className="semantic-pill meta-dim">
                  <span className="pill-key">CONF:</span>
                  <span className="pill-val">
                    {typeof semantics.confidence === 'number'
                      ? `${(semantics.confidence * 100).toFixed(0)}%`
                      : semantics.confidence}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Invariant Violations Callout for Blocked/Hold steps */}
          {(violations?.length > 0 || (decision === 'BLOCK' && reason) || (decision === 'HOLD' && reason)) && (
            <div className="step-violation-callout" style={{
              margin: '8px 0',
              padding: '8px 12px',
              background: decision === 'HOLD' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${decision === 'HOLD' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              borderRadius: '6px',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)'
            }}>
              <div style={{ color: decision === 'HOLD' ? 'var(--color-hold-amber)' : 'var(--color-violation-red)', fontWeight: 700, marginBottom: '2px' }}>
                {decision === 'HOLD' ? 'FAIL-CLOSED FREEZE' : 'INVARIANT INTERCEPTION'}: {violations && violations.length > 0 ? violations.join(', ') : 'POLICY_VIOLATION'}
              </div>
              {reason && (
                <div style={{ color: 'var(--color-chalk)', fontSize: '11px', fontFamily: 'var(--font-sans)', marginTop: '2px' }}>
                  {reason}
                </div>
              )}
            </div>
          )}

          {/* Arguments JSON */}
          {args && Object.keys(args).length > 0 && (
            <div className="action-arguments">
              <div className="args-label">PARAMETERS</div>
              <pre className="args-code">{JSON.stringify(args, null, 2)}</pre>
            </div>
          )}

          {/* Lineage / Triggered By */}
          {triggered_by && triggered_by.length > 0 && (
            <div className="lineage-indicator">
              <CornerDownRight size={12} style={{ color: 'var(--color-compass-gold)', flexShrink: 0 }} />
              <span className="lineage-label">LINEAGE:</span>
              <span className="lineage-text">
                Accumulated from{' '}
                {triggered_by.map((stepNum, idx) => (
                  <button
                    key={stepNum}
                    type="button"
                    className="step-ref-link"
                    onClick={(e) => { e.stopPropagation(); onStepRefClick && onStepRefClick(stepNum); }}
                    title={`Focus Step ${Number(stepNum) + 1}`}
                  >
                    Step {Number(stepNum) + 1}
                    {idx < triggered_by.length - 1 ? ', ' : ''}
                  </button>
                ))}
              </span>
            </div>
          )}

          {/* Execution result */}
          <div className="action-footer">
            <span className="execution-status">
              SANDBOX:{' '}
              <strong style={{ color: executed ? 'var(--color-pulse-green)' : 'var(--color-violation-red)' }}>
                {executed ? 'EXECUTED' : 'BLOCKED'}
              </strong>
            </span>
            {tool_result && (
              <span className="tool-result-preview" title={tool_result}>
                {tool_result.length > 40 ? `${tool_result.substring(0, 40)}...` : tool_result}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
