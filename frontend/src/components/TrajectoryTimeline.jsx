import React from 'react';
import { Layers, CheckCircle, XCircle, AlertCircle, TrendingUp } from 'lucide-react';

export default function TrajectoryTimeline({ receipts, maxSessionValue = 100000000, activeStepIndex, onSelectStep }) {
  if (!receipts || receipts.length === 0) return null;

  // Compute accumulated spend after each receipt
  let cumulative = 0;
  const stepsWithSpend = receipts.map((r, idx) => {
    const amt = r.decoded?.amount || 0;
    if (r.broadcast || r.decision === 'ALLOW') {
      cumulative += amt;
    }
    return {
      receipt: r,
      stepIndex: idx,
      cumulativeAfter: cumulative,
      amount: amt,
    };
  });

  const maxFormatted = (maxSessionValue / 1000000).toLocaleString();
  const currentTotal = stepsWithSpend[stepsWithSpend.length - 1]?.cumulativeAfter || 0;
  const currentFormatted = (currentTotal / 1000000).toLocaleString();
  const percentUsed = Math.min(100, Math.round((currentTotal / maxSessionValue) * 100));

  return (
    <div className="trajectory-timeline card-obsidian border border-graphite rounded-xl p-5 mb-4 bg-card-bg">
      <div className="flex items-center justify-between border-b border-graphite pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-compass-gold" />
          <h4 className="text-heading-sm font-semibold text-chalk">Trajectory Budget & Step Timeline</h4>
        </div>
        <div className="flex items-center gap-2 text-caption font-mono">
          <span className="text-ash">Session Spend:</span>
          <span className="font-bold text-chalk">{currentFormatted} / {maxFormatted} USDC</span>
          <span className={`text-meta px-1.5 py-0.5 rounded font-bold ${
            percentUsed >= 100 ? 'bg-violation-red/20 text-violation-red' : 'bg-compass-gold/10 text-compass-gold'
          }`}>
            {percentUsed}%
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-carbon h-2 rounded-full overflow-hidden mb-5 border border-graphite">
        <div
          className={`h-full transition-all duration-500 ${
            percentUsed >= 100 ? 'bg-violation-red' : 'bg-compass-gold'
          }`}
          style={{ width: `${percentUsed}%` }}
        />
      </div>

      {/* Steps List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {stepsWithSpend.map(({ receipt, stepIndex, cumulativeAfter, amount }) => {
          const isSelected = activeStepIndex === stepIndex;
          const isBlock = receipt.decision === 'BLOCK';
          const isHold = receipt.decision === 'HOLD';
          const isAllow = receipt.decision === 'ALLOW';

          return (
            <button
              key={stepIndex}
              onClick={() => onSelectStep && onSelectStep(stepIndex)}
              className={`text-left p-3.5 rounded-lg border transition-all ${
                isSelected
                  ? 'border-compass-gold bg-carbon ring-1 ring-compass-gold/50'
                  : 'border-graphite bg-carbon/50 hover:bg-carbon hover:border-iron'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-caption font-semibold text-smoke font-mono">
                  Step {stepIndex + 1}
                </span>
                {isAllow && (
                  <span className="flex items-center gap-1 text-meta font-bold text-pulse-green bg-pulse-green/10 px-2 py-0.5 rounded border border-pulse-green/30">
                    <CheckCircle className="w-3 h-3" /> ALLOW
                  </span>
                )}
                {isBlock && (
                  <span className="flex items-center gap-1 text-meta font-bold text-violation-red bg-violation-red/10 px-2 py-0.5 rounded border border-violation-red/30">
                    <XCircle className="w-3 h-3" /> BLOCKED
                  </span>
                )}
                {isHold && (
                  <span className="flex items-center gap-1 text-meta font-bold text-hold-amber bg-hold-amber/10 px-2 py-0.5 rounded border border-hold-amber/30">
                    <AlertCircle className="w-3 h-3" /> HOLD
                  </span>
                )}
              </div>

              <div className="text-caption font-mono text-chalk font-medium">
                Tx: {(amount / 1000000).toFixed(0)} USDC
              </div>
              <div className="text-meta font-mono text-ash mt-1">
                Cumulative: {(cumulativeAfter / 1000000).toFixed(0)} USDC
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
