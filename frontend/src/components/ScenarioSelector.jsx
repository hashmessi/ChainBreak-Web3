import React, { useState, useMemo } from 'react';
import { Split, ShieldAlert, ShieldCheck, AlertTriangle, HelpCircle, Terminal, Flame, Layers, ArrowUpRight, Lock, Zap } from 'lucide-react';

const CATEGORIES = [
  { key: 'ALL', label: 'ALL SCENARIOS', icon: Terminal },
  { key: 'FAMILY_A', label: 'A: BASELINE & BOUNDS', icon: ShieldCheck },
  { key: 'FAMILY_B', label: 'B: INTENT ATTACKS', icon: Flame },
  { key: 'FAMILY_C', label: 'C: CAPABILITY', icon: AlertTriangle },
  { key: 'FAMILY_D', label: 'D: STATE ATTACKS', icon: Layers },
  { key: 'FAMILY_E', label: 'E: FAIL-CLOSED', icon: HelpCircle },
];

const FAMILY_COLORS = {
  FAMILY_A: { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.12)', border: 'rgba(34, 197, 94, 0.35)' },
  FAMILY_B: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.35)' },
  FAMILY_C: { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.35)' },
  FAMILY_D: { color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.12)', border: 'rgba(167, 139, 250, 0.35)' },
  FAMILY_E: { color: '#f472b6', bg: 'rgba(244, 114, 182, 0.12)', border: 'rgba(244, 114, 182, 0.35)' },
};

export default function ScenarioSelector({
  scenarios = [],
  selectedScenario = null,
  onSelectScenario,
  onRunCounterfactual,
  onInspectScenario,
  isLoading = false,
}) {
  const [activeCategory, setActiveCategory] = useState('ALL');

  const getFamilyKey = (scen) => {
    const fam = (scen.attack_family || '').toUpperCase();
    if (fam.includes('FAMILY A') || scen.id === 'W01' || scen.id === 'W02' || scen.id === 'W03') return 'FAMILY_A';
    if (fam.includes('FAMILY B') || scen.id === 'W04' || scen.id === 'W05' || scen.id === 'W07' || scen.id === 'W11') return 'FAMILY_B';
    if (fam.includes('FAMILY C') || scen.id === 'W08' || scen.id === 'W09' || scen.id === 'W10') return 'FAMILY_C';
    if (fam.includes('FAMILY D') || scen.id === 'W06' || scen.id === 'W12' || scen.id === 'W15') return 'FAMILY_D';
    if (fam.includes('FAMILY E') || scen.id === 'W13' || scen.id === 'W14') return 'FAMILY_E';
    return 'ALL';
  };

  const filteredScenarios = useMemo(() => {
    if (activeCategory === 'ALL') return scenarios;
    return scenarios.filter((s) => getFamilyKey(s) === activeCategory);
  }, [scenarios, activeCategory]);

  const categoryCounts = useMemo(() => {
    const counts = { ALL: scenarios.length };
    scenarios.forEach((s) => {
      const fKey = getFamilyKey(s);
      counts[fKey] = (counts[fKey] || 0) + 1;
    });
    return counts;
  }, [scenarios]);

  return (
    <div className="scenario-selector-container" id="scenario-selector-panel">
      {/* Category Filter Tabs */}
      <div className="category-filter-tabs">
        {CATEGORIES.map((tab) => {
          const count = categoryCounts[tab.key] || 0;
          const IconComponent = tab.icon;
          const isActive = activeCategory === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              className={`cat-tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => setActiveCategory(tab.key)}
            >
              <IconComponent size={11} className="tab-icon" />
              <span className="tab-label">{tab.label}</span>
              <span className={`tab-count ${isActive ? 'active-count' : ''}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Scenario Grid */}
      <div className="scenario-grid" id="scenario-deck-list">
        {filteredScenarios.length === 0 ? (
          <div className="no-scenarios-msg" style={{ padding: '32px', textAlign: 'center', gridColumn: '1 / -1' }}>
            <ShieldAlert size={20} style={{ color: 'var(--color-compass-gold)', margin: '0 auto 8px auto', display: 'block' }} />
            <div style={{ color: 'var(--color-smoke)', fontSize: '13px' }}>No scenarios in this category.</div>
          </div>
        ) : (
          filteredScenarios.map((scen) => {
            const isSelected = selectedScenario && selectedScenario.id === scen.id;
            const actionCount = scen.proposals?.length || scen.actions?.length || 1;
            const famKey = getFamilyKey(scen);
            const famStyle = FAMILY_COLORS[famKey] || { color: 'var(--color-smoke)', bg: 'var(--color-charcoal)', border: 'var(--color-slate)' };
            const famLabel = scen.attack_family ? scen.attack_family.split(' — ')[1] || scen.attack_family : famKey;

            const isAttack = scen.category === 'attack';
            const isSafe = scen.category === 'safe';
            const isMalformed = scen.category === 'malformed';

            const expBaseline = isAttack ? 'ALLOW (BREACH)' : isMalformed ? 'FAIL-OPEN' : 'ALLOW';
            const expProtected = scen.expected_decision || 'ALLOW';

            const expBaselineClass = isAttack ? 'val-block' : isMalformed ? 'val-hold' : 'val-allow';
            const expProtectedClass = expProtected === 'BLOCK' ? 'val-block' : expProtected === 'HOLD' ? 'val-hold' : 'val-allow';

            const stepDecisions = scen.expected_step_decisions || [];

            return (
              <div
                key={scen.id}
                className={`scenario-card ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectScenario(scen)}
                id={`scenario-card-${scen.id}`}
              >
                <div className="scenario-card-top">
                  <div className="scenario-id-tag">
                    <span className="scen-number">{scen.id}</span>
                    <span
                      className="scen-cat-badge"
                      style={{
                        color: famStyle.color,
                        background: famStyle.bg,
                        border: `1px solid ${famStyle.border}`,
                        fontWeight: 700,
                      }}
                    >
                      {famLabel}
                    </span>
                  </div>
                  <span className="scen-steps-count font-mono text-[10px]">
                    {actionCount} {actionCount === 1 ? 'STEP' : 'STEPS'}
                  </span>
                </div>

                <h4 className="scenario-card-name">{scen.name}</h4>

                {scen.attack_path && (
                  <div className="text-[11px] font-mono text-[var(--color-compass-gold)] mb-1 flex items-center gap-1">
                    <span>PATH:</span> <span>{scen.attack_path}</span>
                  </div>
                )}

                {scen.description && (
                  <p className="scenario-card-desc">
                    {scen.description}
                  </p>
                )}

                {/* Trajectory Step Pills */}
                {stepDecisions.length > 0 && (
                  <div className="flex items-center gap-1 my-2 flex-wrap">
                    <span className="text-[9px] font-mono text-[var(--color-smoke)] mr-1">STEPS:</span>
                    {stepDecisions.map((dec, sIdx) => {
                      const pillCls = dec === 'BLOCK' ? 'text-violation-red bg-red-950/40 border-red-900/60' :
                        dec === 'HOLD' ? 'text-amber-400 bg-amber-950/40 border-amber-900/60' :
                        'text-emerald-400 bg-emerald-950/40 border-emerald-900/60';
                      return (
                        <span
                          key={sIdx}
                          className={`text-[9px] font-mono px-1 py-0.5 rounded border ${pillCls}`}
                          title={`Step ${sIdx + 1}: ${dec}`}
                        >
                          T{sIdx + 1}:{dec[0]}
                        </span>
                      );
                    })}
                  </div>
                )}

                <div className="scenario-card-footer">
                  <div className="expected-outcomes">
                    <span className="outcome-tag">
                      <strong className={expBaselineClass}>
                        {expBaseline}
                      </strong>
                    </span>
                    <span className="outcome-sep">→</span>
                    <span className="outcome-tag">
                      <strong className={expProtectedClass}>
                        {expProtected}
                      </strong>
                    </span>
                  </div>

                  <div className="scenario-cta-cluster" onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: '6px' }}>
                    {onInspectScenario && (
                      <button
                        type="button"
                        className="btn-ghost-outline"
                        style={{ padding: '6px 10px', fontSize: '10px' }}
                        onClick={() => {
                          onSelectScenario(scen);
                          onInspectScenario(scen);
                        }}
                        title="Inspect in Operator Pipeline"
                      >
                        <Layers size={11} />
                        <span>INSPECT</span>
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn-pill-primary run-dual-btn"
                      disabled={isLoading}
                      onClick={() => {
                        onSelectScenario(scen);
                        onRunCounterfactual(scen.id);
                      }}
                      id={`btn-run-counterfactual-${scen.id}`}
                      title="Run Counterfactual Execution (Baseline vs Protected)"
                      style={{ padding: '6px 12px', fontSize: '10px' }}
                    >
                      <Split size={11} />
                      <span>{isLoading && isSelected ? 'RUNNING...' : 'RUN PROOF'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
