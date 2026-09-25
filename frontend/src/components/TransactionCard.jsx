import React from 'react';
import { Cpu, ArrowRight, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function TransactionCard({ proposal, decoded, stepIndex, isAttacking }) {
  if (!proposal) return null;

  const formatAmount = (asset, amt) => {
    if (amt === undefined || amt === null) return '0';
    if (asset?.toUpperCase() === 'USDC') {
      return `${(amt / 1000000).toLocaleString()} USDC`;
    }
    if (asset?.toUpperCase() === 'ETH') {
      return `${(amt / 1e18).toFixed(4)} ETH`;
    }
    return `${amt} ${asset || 'Units'}`;
  };

  const isMallory = decoded?.recipient?.toLowerCase()?.includes('90f79bf6') || proposal.to?.toLowerCase()?.includes('90f79bf6');

  return (
    <div className={`transaction-card card-obsidian border rounded-xl p-5 mb-4 ${
      isAttacking || isMallory ? 'border-violation-red/50 bg-violation-red/5' : 'border-graphite bg-card-bg'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-graphite pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Cpu className={`w-5 h-5 ${isAttacking || isMallory ? 'text-violation-red' : 'text-compass-gold'}`} />
          <h4 className="text-heading-sm font-semibold text-chalk">
            Step {stepIndex !== undefined ? stepIndex + 1 : 1}: Agent EVM Proposal
          </h4>
        </div>
        {isMallory && (
          <span className="flex items-center gap-1 text-meta px-2.5 py-1 rounded bg-violation-red/20 text-violation-red border border-violation-red/40 font-semibold animate-pulse">
            <AlertTriangle className="w-3 h-3" />
            ATTACK DRIFT DETECTED
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Raw EVM Proposal */}
        <div className="bg-carbon p-3.5 rounded-lg border border-graphite space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-meta uppercase tracking-wider text-ash font-semibold">Raw Transaction Payload</span>
            <span className="text-meta font-mono text-smoke">Nonce: {proposal.nonce ?? 0}</span>
          </div>

          <div>
            <span className="text-meta text-ash">Target Address (to):</span>
            <div className="text-caption font-mono text-chalk break-all bg-card-bg p-1.5 rounded border border-graphite/60 mt-0.5">
              {proposal.to}
            </div>
          </div>

          <div className="flex justify-between items-center text-caption font-mono">
            <span className="text-ash">Native Value:</span>
            <span className="text-chalk">{proposal.value || 0} wei</span>
          </div>

          <div>
            <span className="text-meta text-ash">Raw Calldata:</span>
            <div className="text-meta font-mono text-smoke break-all bg-card-bg p-2 rounded border border-graphite/60 max-h-24 overflow-y-auto mt-0.5">
              {proposal.data || '0x (Empty — Native ETH)'}
            </div>
          </div>
        </div>

        {/* Right: Deterministically Decoded EVM Fields */}
        <div className="bg-carbon p-3.5 rounded-lg border border-graphite space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-meta uppercase tracking-wider text-compass-gold font-semibold">Deterministic EVM Decode</span>
            <span className="text-meta font-mono text-pulse-green">Zero-LLM Authority</span>
          </div>

          {decoded ? (
            <div className="space-y-2.5">
              <div>
                <span className="text-meta text-ash">Decoded Method & Asset:</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-caption font-mono font-bold text-chalk px-2 py-0.5 bg-compass-gold/10 border border-compass-gold/30 rounded">
                    {decoded.method}()
                  </span>
                  <span className="text-caption font-mono font-bold text-pulse-green px-2 py-0.5 bg-pulse-green/10 border border-pulse-green/30 rounded">
                    {decoded.asset}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-meta text-ash">Decoded Recipient:</span>
                <div className={`text-caption font-mono break-all p-1.5 rounded border mt-0.5 ${
                  isMallory ? 'bg-violation-red/10 border-violation-red/50 text-violation-red font-bold' : 'bg-card-bg border-graphite/60 text-chalk'
                }`}>
                  {decoded.recipient || 'N/A'}
                  {isMallory && <span className="ml-2 text-meta text-violation-red">(MALLORY / ATTACKER)</span>}
                </div>
              </div>

              <div className="flex justify-between items-center text-caption font-mono bg-card-bg p-2 rounded border border-graphite/60">
                <span className="text-ash">Decoded Amount:</span>
                <span className={`font-bold ${isAttacking ? 'text-violation-red' : 'text-chalk'}`}>
                  {formatAmount(decoded.asset, decoded.amount)}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-ash text-caption">
              <ShieldAlert className="w-6 h-6 mx-auto mb-1 opacity-50 text-hold-amber" />
              Calldata failed closed or unparseable.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
