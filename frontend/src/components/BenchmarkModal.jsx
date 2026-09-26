import React from 'react';
import { X } from 'lucide-react';
import BrutalMatrix from './BrutalMatrix';

export default function BenchmarkModal({
  isOpen,
  onClose,
  report,
  isLoading = false,
  onRunBenchmark,
  onSelectScenario,
  onRunDualProof,
  activeSubstrate = 'LOCAL'
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="benchmark-modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1100px', width: '95vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        {/* Modal Header */}
        <div className="modal-header" style={{ flexShrink: 0 }}>
          <div className="modal-title-group">
            <div className="badge-pill" style={{ padding: '2px 8px' }}>
              <span style={{ color: 'var(--color-compass-gold)' }}>ADVERSARIAL ATTACK LABORATORY</span>
            </div>
            <h2 className="modal-title">15 Adversarial Trajectories Against an Autonomous Agent</h2>
            <p className="modal-subtitle">
              Deterministic invariant evaluation across 5 attack families: Baseline boundaries, Intent manipulation, Capability boundaries, Stateful trajectories, and Fail-closed parsing.
            </p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} id="btn-close-modal">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body with Scrollable Brutal Matrix */}
        <div className="modal-body" style={{ overflowY: 'auto', padding: '20px', flex: 1 }}>
          <BrutalMatrix
            report={report}
            isLoading={isLoading}
            onRunBenchmark={onRunBenchmark}
            onSelectScenario={(id) => {
              if (onSelectScenario) onSelectScenario(id);
              onClose();
            }}
            onRunDualProof={(id) => {
              if (onRunDualProof) onRunDualProof(id);
              onClose();
            }}
            activeSubstrate={activeSubstrate}
          />
        </div>
      </div>
    </div>
  );
}
