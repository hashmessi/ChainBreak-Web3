import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck, Code, Cpu, ArrowRight, Zap, Copy, Check, X } from 'lucide-react';

export default function ArchitectureBrief() {
  const [activeView, setActiveView] = useState('contrast'); // 'contrast' | 'sdk'
  const [copied, setCopied] = useState(false);

  const sdkCode = `# Install: pip install chainbreak-web3
from chainbreak import ChainBreakExecutor, IntentEnvelope, InvariantBreach

# Initialize deterministic invariant firewall
executor = ChainBreakExecutor(policy="strict")

# Pre-signing gate wrapper for autonomous EVM agent loops
@agent.on_transaction_proposal
async def enforce_evm_intent_integrity(proposal, intent: IntentEnvelope):
    receipt = await executor.evaluate_and_execute(proposal, intent)
    if receipt.decision != "ALLOW":
        # Blocked pre-signing: zero onchain gas burned, zero assets lost
        raise InvariantBreach(receipt.violated_invariants, receipt.reason)
    return receipt.transaction_hash`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sdkCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="arch-brief-container" id="arch-brief-panel">
      {/* View Toggle Bar */}
      <div className="arch-brief-nav">
        <div className="arch-brief-title-cluster">
          <Cpu size={14} style={{ color: 'var(--color-compass-gold)' }} />
          <span className="arch-brief-title">ARCHITECTURAL SPECIFICATION</span>
        </div>
        <div className="arch-brief-toggle-group">
          <button
            type="button"
            className={`arch-toggle-btn ${activeView === 'contrast' ? 'active' : ''}`}
            onClick={() => setActiveView('contrast')}
          >
            <ShieldAlert size={12} />
            <span>WHY FIREWALLS FAIL</span>
          </button>
          <button
            type="button"
            className={`arch-toggle-btn ${activeView === 'sdk' ? 'active' : ''}`}
            onClick={() => setActiveView('sdk')}
          >
            <Code size={12} />
            <span>DROP-IN SDK (6 LINES)</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Contrast Matrix */}
      {activeView === 'contrast' && (
        <div className="arch-contrast-grid">
          {/* Traditional Perimeter / Guardrail */}
          <div className="arch-contrast-col legacy">
            <div className="col-header">
              <div className="col-status-pill danger">PERIMETER / PROMPT GUARDRAILS</div>
              <h4>Point-in-Time Action Inspection</h4>
              <p className="col-subtitle">NeMo Guardrails, Guardrails AI, API Gateways</p>
            </div>
            <div className="col-points">
              <div className="col-point-item">
                <span className="bullet-indicator danger" style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <X size={13} />
                </span>
                <div>
                  <strong>Zero Stateful Lineage:</strong> Evaluates tool calls in strict isolation. Reads, syntheses, and exports are all individually approved.
                </div>
              </div>
              <div className="col-point-item">
                <span className="bullet-indicator danger" style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <X size={13} />
                </span>
                <div>
                  <strong>Blind to Trajectory Escalation:</strong> In multi-step sequences (e.g. W5), benign transfers pass security checks. Cumulative budget drain succeeds undetected.
                </div>
              </div>
              <div className="col-point-item">
                <span className="bullet-indicator danger" style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <X size={13} />
                </span>
                <div>
                  <strong>High Latency Penalty:</strong> Re-querying LLM-as-a-judge on every single transaction adds 1.5s–3.0s latency.
                </div>
              </div>
            </div>
            <div className="col-footer-verdict danger">
              FAIL RATE ON MULTI-STEP ATTACKS: 100%
            </div>
          </div>

          {/* ChainBreak Trajectory Invariants */}
          <div className="arch-contrast-col active">
            <div className="col-header">
              <div className="col-status-pill success">CHAINBREAK RUNTIME ENGINE</div>
              <h4>Causal Trajectory Invariants</h4>
              <p className="col-subtitle">Stateful Causal Graph + Deterministic Invariants</p>
            </div>
            <div className="col-points">
              <div className="col-point-item">
                <span className="bullet-indicator success" style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <Check size={13} />
                </span>
                <div>
                  <strong>Stateful Causal Provenance:</strong> Tracks lineage across the full chain (calldata parameters, cumulative budgets) from intent to signing.
                </div>
              </div>
              <div className="col-point-item">
                <span className="bullet-indicator success" style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <Check size={13} />
                </span>
                <div>
                  <strong>Deterministic Invariant Interception:</strong> Pure Python invariant logic halts before wallet signing. Zero bytes, zero gas egress.
                </div>
              </div>
              <div className="col-point-item">
                <span className="bullet-indicator success" style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <Check size={13} />
                </span>
                <div>
                  <strong>Sub-Millisecond Overhead:</strong> Mean evaluation latency is &lt; 0.15ms. Zero noticeable latency on agent workflows.
                </div>
              </div>
            </div>
            <div className="col-footer-verdict success">
              PREVENTION RATE ON ATTACKS: 100% (ZERO EGRESS)
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: 6-Line Drop-in SDK */}
      {activeView === 'sdk' && (
        <div className="arch-sdk-view">
          <div className="sdk-header">
            <div>
              <h4 className="sdk-title">Deterministic EVM Pre-Signing Firewall</h4>
              <p className="sdk-desc">
                Drops directly between autonomous agent decision loops and wallet signing functions with zero architectural rewrites.
              </p>
            </div>
            <button
              type="button"
              className="btn-ghost-outline copy-btn"
              onClick={handleCopy}
            >
              {copied ? <Check size={12} style={{ color: 'var(--color-pulse-green)' }} /> : <Copy size={12} />}
              <span>{copied ? 'COPIED' : 'COPY SNIPPET'}</span>
            </button>
          </div>
          <div className="sdk-code-frame">
            <pre>
              <code>{sdkCode}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
