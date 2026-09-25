import React from 'react';
import { ShieldCheck, ShieldAlert, ShieldX, ExternalLink, Hash, Lock, CheckCircle2 } from 'lucide-react';

export default function DecisionReceipt({ receipt, substrate = 'LOCAL' }) {
  if (!receipt) return null;

  const isAllow = receipt.decision === 'ALLOW';
  const isBlock = receipt.decision === 'BLOCK';
  const isHold = receipt.decision === 'HOLD';

  const explorerUrl = receipt.transaction_hash
    ? `https://sepolia.etherscan.io/tx/${receipt.transaction_hash}`
    : null;

  return (
    <div className={`decision-receipt card-obsidian border rounded-xl p-5 mb-4 ${
      isBlock ? 'border-violation-red/60 bg-violation-red/5' :
      isHold ? 'border-hold-amber/60 bg-hold-amber/5' :
      'border-pulse-green/60 bg-pulse-green/5'
    }`}>
      {/* Header Badge */}
      <div className="flex items-center justify-between border-b border-graphite pb-4 mb-4">
        <div className="flex items-center gap-3">
          {isAllow && <ShieldCheck className="w-7 h-7 text-pulse-green" />}
          {isBlock && <ShieldX className="w-7 h-7 text-violation-red" />}
          {isHold && <ShieldAlert className="w-7 h-7 text-hold-amber" />}
          <div>
            <div className="text-meta uppercase tracking-wider text-ash font-bold">
              Cryptographic Decision Proof
            </div>
            <h3 className="text-heading font-extrabold text-chalk tracking-tight">
              DECISION: {receipt.decision}
            </h3>
          </div>
        </div>

        {/* Broadcast Status Badge */}
        <div className="text-right">
          {receipt.broadcast ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-caption font-bold bg-pulse-green/20 text-pulse-green border border-pulse-green/40">
              <CheckCircle2 className="w-3.5 h-3.5" />
              BROADCAST SUCCESS
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-caption font-bold bg-violation-red/20 text-violation-red border border-violation-red/40">
              <Lock className="w-3.5 h-3.5" />
              BROADCAST SUPPRESSED (PRE-SIGNING BLOCK)
            </span>
          )}
          <div className="text-meta text-ash font-mono mt-1">
            Substrate: {substrate === 'TESTNET' ? 'Public Sepolia Testnet' : 'Local Deterministic EVM'}
          </div>
        </div>
      </div>

      {/* Explanatory Message / Violation Banner */}
      {isBlock && (
        <div className="bg-violation-red/15 border border-violation-red/40 rounded-lg p-3.5 mb-4">
          <div className="text-meta uppercase font-bold text-violation-red mb-1">
            Violated Invariant: {receipt.violated_invariants?.join(', ') || 'SECURITY_POLICY'}
          </div>
          <div className="text-caption text-chalk-soft font-medium">
            {receipt.reason}
          </div>
        </div>
      )}

      {isHold && (
        <div className="bg-hold-amber/15 border border-hold-amber/40 rounded-lg p-3.5 mb-4">
          <div className="text-meta uppercase font-bold text-hold-amber mb-1">
            Hold Reason: {receipt.hold_reason || 'UNRESOLVED_UNCERTAINTY'}
          </div>
          <div className="text-caption text-chalk-soft font-medium">
            {receipt.reason}
          </div>
        </div>
      )}

      {isAllow && (
        <div className="bg-pulse-green/10 border border-pulse-green/30 rounded-lg p-3 mb-4 text-caption text-chalk-soft">
          {receipt.reason}
        </div>
      )}

      {/* Cryptographic Hashes & Audit Trail */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-meta font-mono">
        <div className="bg-carbon p-3 rounded border border-graphite/60 space-y-1">
          <div className="text-ash flex items-center gap-1">
            <Hash className="w-3 h-3 text-compass-gold" />
            Proposal Hash:
          </div>
          <div className="text-smoke truncate" title={receipt.proposal_hash}>
            {receipt.proposal_hash || 'N/A'}
          </div>
        </div>

        <div className="bg-carbon p-3 rounded border border-graphite/60 space-y-1">
          <div className="text-ash">Onchain Transaction Hash:</div>
          {receipt.transaction_hash ? (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-pulse-green hover:underline truncate"
              title={receipt.transaction_hash}
            >
              <span>{receipt.transaction_hash}</span>
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
            </a>
          ) : (
            <div className="text-violation-red font-semibold">
              null (Signing structurally prevented)
            </div>
          )}
        </div>

        <div className="bg-carbon p-3 rounded border border-graphite/60 space-y-1">
          <div className="text-ash">State Before Hash:</div>
          <div className="text-smoke truncate" title={receipt.state_before_hash}>
            {receipt.state_before_hash || 'N/A'}
          </div>
        </div>

        <div className="bg-carbon p-3 rounded border border-graphite/60 space-y-1">
          <div className="text-ash">State After Hash:</div>
          <div className="text-smoke truncate" title={receipt.state_after_hash}>
            {receipt.state_after_hash || receipt.state_before_hash || 'N/A'}
          </div>
        </div>
      </div>
    </div>
  );
}
