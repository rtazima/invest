'use client';

import { useState } from 'react';
import type { SemaphoreState, AnalysisRule, FundamentalsSnapshot } from '@/lib/analysis/types';
import { Semaphore } from './Semaphore';

function getFieldValue(snap: FundamentalsSnapshot, fieldName: string): number | null {
  if (fieldName.startsWith('manual_')) {
    const key = fieldName.replace('manual_', '');
    return snap.manual_overrides[key] ?? null;
  }
  return (snap as unknown as Record<string, number | null>)[fieldName] ?? null;
}

const STATE_LABELS: Record<SemaphoreState, string> = {
  ok: 'Positivo',
  warning: 'Atenção',
  critical: 'Crítico',
  informational: 'Informativo',
  missing: 'Sem dados',
};

const STATE_COLORS: Record<SemaphoreState, string> = {
  ok: 'oklch(0.72 0.18 145)',
  warning: 'oklch(0.75 0.16 80)',
  critical: 'oklch(0.65 0.22 25)',
  informational: 'var(--color-text-3)',
  missing: 'var(--color-text-3)',
};

interface TooltipData {
  rule: AnalysisRule;
  state: SemaphoreState;
  x: number;
  y: number;
}

function TooltipPanel({ rule, state, snapshot, x, y }: TooltipData & { snapshot?: FundamentalsSnapshot }) {
  const value = snapshot ? getFieldValue(snapshot, rule.field_name) : null;
  let valueStr = '—';
  if (value != null) {
    valueStr = rule.unit === '%' ? `${value.toFixed(1)}%` : value.toFixed(2);
  }

  const isInformational = rule.threshold_ok === 'informational';

  return (
    <div style={{
      position: 'fixed',
      left: x,
      top: y - 8,
      transform: 'translate(-50%, -100%)',
      zIndex: 9999,
      backgroundColor: 'var(--color-bg)',
      border: '1px solid var(--color-line)',
      borderRadius: '7px',
      padding: '10px 12px',
      minWidth: '168px',
      maxWidth: '248px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      pointerEvents: 'none',
    }}>
      {/* Label */}
      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '5px' }}>
        {rule.label}
      </div>

      {/* Value + state */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: isInformational ? 0 : '7px' }}>
        <span style={{ fontSize: '14px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-text)' }}>
          {valueStr}
        </span>
        <span style={{ fontSize: '11px', fontWeight: 600, color: STATE_COLORS[state], whiteSpace: 'nowrap' }}>
          {STATE_LABELS[state]}
        </span>
      </div>

      {/* Thresholds */}
      {!isInformational && (
        <div style={{ fontSize: '11px', color: 'var(--color-text-3)', marginBottom: rule.context_notes ? '7px' : 0 }}>
          <span style={{ color: 'oklch(0.72 0.18 145)' }}>●</span>{' '}ok: {rule.threshold_ok}
          {'  ·  '}
          <span style={{ color: 'oklch(0.75 0.16 80)' }}>●</span>{' '}atenção: {rule.threshold_warning}
        </div>
      )}

      {/* Context notes */}
      {rule.context_notes && (
        <div style={{
          fontSize: '11px', color: 'var(--color-text-3)',
          borderTop: '1px solid var(--color-line-2)', paddingTop: '6px',
        }}>
          {rule.context_notes}
        </div>
      )}
    </div>
  );
}

interface Props {
  semaphores: Record<string, SemaphoreState>;
  rules: AnalysisRule[];
  snapshot?: FundamentalsSnapshot;
}

export function SemaphoreRow({ semaphores, rules, snapshot }: Props) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  return (
    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
      {rules.map(rule => {
        const state = semaphores[rule.metric_id] ?? 'missing';
        return (
          <span
            key={rule.metric_id}
            style={{ display: 'inline-flex', alignItems: 'center', cursor: 'default' }}
            onMouseEnter={e => {
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              setTooltip({ rule, state, x: rect.left + rect.width / 2, y: rect.top });
            }}
            onMouseLeave={() => setTooltip(null)}
          >
            <Semaphore state={state} size={8} />
          </span>
        );
      })}
      {tooltip && <TooltipPanel {...tooltip} snapshot={snapshot} />}
    </div>
  );
}
