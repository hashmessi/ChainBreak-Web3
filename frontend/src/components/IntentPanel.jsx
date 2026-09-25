import React from 'react';
import { Target, Shield, Coins, CheckCircle, UserCheck } from 'lucide-react';

export default function IntentPanel({ intent, fixtures }) {
  if (!intent) {
    return (
      <div className="card-obsidian p-6 text-center text-ash">
        <Target className="w-8 h-8 mx-auto mb-2 opacity-40" />
        No active intent loaded. Select a scenario to inspect authorized intent boundaries.
      </div>
    );
  }

  const formatAmount = (asset, val) => {
    if (val === undefined || val === null) return '0';
    if (asset.toUpperCase() === 'USDC') {
      return `${(val / 1000000).toLocaleString()} USDC`;
    }
    if (asset.toUpperCase() === 'ETH') {
      return `${(val / 1e18).toFixed(4)} ETH`;
    }
    return `${val} ${asset}`;
  };

  return (
    <div className="intent-panel card-obsidian border border-graphite rounded-xl p-5 bg-card-bg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-graphite pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-compass-gold" />
          <h3 className="text-heading-sm font-semibold text-chalk">Authorized Intent Envelope</h3>
        </div>
        <span className="text-meta px-2.5 py-1 rounded bg-carbon border border-graphite font-mono text-smoke">
          {intent.intent_id}
        </span>
      </div>

      {/* User Goal */}
      <div className="mb-4">
        <div className="text-meta text-ash uppercase tracking-wider mb-1 font-semibold">User Goal</div>
        <div className="text-body font-medium text-chalk-soft bg-carbon p-3 rounded-lg border border-graphite/60">
          "{intent.user_goal}"
        </div>
      </div>

      {/* Grid of Bounds */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Column: Authorized Scope */}
        <div className="space-y-3">
          <div>
            <div className="text-meta text-ash uppercase tracking-wider mb-1">Target Chain</div>
            <div className="flex items-center gap-2 text-caption text-chalk font-mono bg-carbon/50 px-2.5 py-1.5 rounded border border-graphite/40">
              <Shield className="w-3.5 h-3.5 text-compass-gold" />
              <span>Sepolia Testnet ({intent.chain_id})</span>
            </div>
          </div>

          <div>
            <div className="text-meta text-ash uppercase tracking-wider mb-1">Allowed Assets</div>
            <div className="flex flex-wrap gap-1.5">
              {intent.allowed_assets?.map((asset) => (
                <span key={asset} className="text-meta font-mono px-2 py-0.5 rounded bg-compass-gold/10 text-compass-gold border border-compass-gold/30">
                  {asset}
                </span>
              ))}
            </div>
          </div>

          <div>
            <div className="text-meta text-ash uppercase tracking-wider mb-1">Allowed Methods</div>
            <div className="flex flex-wrap gap-1.5">
              {intent.allowed_methods?.map((m) => (
                <span key={m} className="text-meta font-mono px-2 py-0.5 rounded bg-carbon text-smoke border border-graphite">
                  {m}()
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Financial Boundaries */}
        <div className="space-y-3">
          <div>
            <div className="text-meta text-ash uppercase tracking-wider mb-1">Single-Tx Spend Cap</div>
            <div className="space-y-1">
              {Object.entries(intent.max_single_value_per_asset || {}).map(([asset, val]) => (
                <div key={asset} className="flex justify-between text-caption font-mono bg-carbon/50 px-2.5 py-1 rounded border border-graphite/40">
                  <span className="text-smoke">{asset}:</span>
                  <span className="text-chalk font-semibold">{formatAmount(asset, val)}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-meta text-ash uppercase tracking-wider mb-1">Session Total Budget</div>
            <div className="space-y-1">
              {Object.entries(intent.max_session_value_per_asset || {}).map(([asset, val]) => (
                <div key={asset} className="flex justify-between text-caption font-mono bg-compass-gold/5 px-2.5 py-1 rounded border border-compass-gold/20">
                  <span className="text-compass-gold font-medium">{asset}:</span>
                  <span className="text-chalk font-bold">{formatAmount(asset, val)}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-meta text-ash uppercase tracking-wider mb-1">Authorized Recipient</div>
            <div className="text-meta font-mono bg-carbon/60 p-1.5 rounded border border-graphite/40 truncate text-smoke" title={intent.allowed_recipients?.[0]}>
              <span className="text-pulse-green">Alice: </span>
              {intent.allowed_recipients?.[0] || 'Any'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
