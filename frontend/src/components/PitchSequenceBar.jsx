import React from 'react';

export default function PitchSequenceBar() {
  const steps = [
    { text: 'It works', color: 'var(--color-pulse-green)', weight: 800 },
    { text: 'Detects manipulation', weight: 700 },
    { text: 'Understands history', weight: 700 },
    { text: 'Fails closed', color: '#f59e0b', weight: 700 },
    { text: 'Survives adaptive attack', weight: 700 },
    { text: 'Physically prevents execution', color: 'var(--color-pulse-green)', weight: 800 },
  ];

  return (
    <div
      className="pitch-sequence-bar-wrap mb-4"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '10px 18px',
        marginBottom: '1rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px 8px',
          fontFamily: 'var(--font-mono, monospace)',
          fontSize: '12px',
          letterSpacing: '0.01em',
          textAlign: 'center',
        }}
      >
        <span
          style={{
            opacity: 0.6,
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginRight: '4px',
            whiteSpace: 'nowrap',
          }}
        >
          Autonomous Attack Laboratory:
        </span>
        {steps.map((step, idx) => (
          <React.Fragment key={idx}>
            <span
              style={{
                color: step.color || 'var(--color-chalk)',
                fontWeight: step.weight || 600,
                whiteSpace: 'nowrap',
              }}
            >
              {step.text}
            </span>
            {idx < steps.length - 1 && (
              <span style={{ color: 'var(--color-ash)', opacity: 0.6, userSelect: 'none' }}>
                →
              </span>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

