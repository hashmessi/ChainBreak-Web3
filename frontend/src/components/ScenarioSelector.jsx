import React, { useState, useMemo } from 'react';
import { Split, ShieldAlert, ShieldCheck, AlertTriangle, HelpCircle, Terminal, Flame, Layers, ArrowUpRight } from 'lucide-react';

const CATEGORIES = [
  { key: 'ALL', label: 'ALL', icon: Terminal },
  { key: 'ATTACK', label: 'ATTACKS', icon: Flame },
  { key: 'SAFE', label: 'SAFE', icon: ShieldCheck },
  { key: 'NEAR_MISS', label: 'NEAR-MISS', icon: AlertTriangle },
  { key: 'MALFORMED', label: 'MALFORMED', icon: HelpCircle },
];

/**
 * ScenarioSelector — Full-width grid layout for Scenarios view
 * Developer-grade cards: ID + name + category + step count + expected outcome + inline CTAs
 */
export default function ScenarioSelector({
  scenarios = [],
  selectedScenario = null,
  onSelectScenario,
  onRunCounterfactual,
  onInspectScenario,
  isLoading = false
}) {
  const [activeCategory, setActiveCategory] = useState('ALL');

  const normalizeCat = (cat) => {
    const c = (cat || '').toUpperCase();
    if (c === 'FAILURE' || c === 'UNKNOWN_TOOL') return 'MALFORMED';
    return c;
  };

  const filteredScenarios = useMemo(() => {
    if (activeCategory === 'ALL') return scenarios;
    return scenarios.filter((s) => normalizeCat(s.category) === activeCategory);
  }, [scenarios, activeCategory]);

  const categoryCounts = useMemo(() => {
    const counts = { ALL: scenarios.length };
    scenarios.forEach((s) => {
      const cat = normalizeCat(s.category);
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [scenarios]);

  const getCategoryBadgeClass = (category) => {
    const cat = normalizeCat(category);
    switch (cat) {
      case 'ATTACK': return 'cat-attack';
      case 'SAFE': return 'cat-safe';
      case 'NEAR_MISS': return 'cat-near-miss';
      case 'MALFORMED': return 'cat-failure';
      default: return '';
    }
  };

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
            const catNorm = normalizeCat(scen.category);

            const isAttack = catNorm === 'ATTACK';
            const isSafe = catNorm === 'SAFE' || catNorm === 'NEAR_MISS';
            const isMalformed = catNorm === 'MALFORMED';

            const expBaseline = isAttack ? 'ALLOW (BREACH)' : isMalformed ? 'FAIL-OPEN' : 'ALLOW';
            const expProtected = scen.expected_decision ||
              (scen.expected_result === 'BLOCK' ? 'BLOCK' : scen.expected_result === 'HOLD' ? 'HOLD' : 'ALLOW');

            const expBaselineClass = isAttack ? 'val-block' : isMalformed ? 'val-hold' : 'val-allow';
            const expProtectedClass = expProtected === 'BLOCK' ? 'val-block' : expProtected === 'HOLD' ? 'val-hold' : 'val-allow';

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
                    <span className={`scen-cat-badge ${getCategoryBadgeClass(scen.category)}`}>
                      {catNorm.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span className="scen-steps-count">
                    {actionCount} {actionCount === 1 ? 'STEP' : 'STEPS'}
                  </span>
                </div>

                <h4 className="scenario-card-name">{scen.name}</h4>

                {scen.description && (
                  <p className="scenario-card-desc">
                    {scen.description}
                  </p>
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
