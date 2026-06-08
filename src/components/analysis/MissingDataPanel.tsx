'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AnalysisRule } from '@/lib/analysis/types';

interface Props {
  ticker: string;
  missingMetrics: string[];
  rules: AnalysisRule[];
  onSaved: () => void;
}

export function MissingDataPanel({ ticker, missingMetrics, rules, onSaved }: Props) {
  const router = useRouter();
  const missingRules = rules.filter(r => missingMetrics.includes(r.metric_id));

  const initial: Record<string, string> = {};
  for (const r of missingRules) {
    initial[r.metric_id] = '';
  }

  const [values, setValues] = useState<Record<string, string>>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const overrides: Record<string, number | null> = {};
    for (const rule of missingRules) {
      const raw = values[rule.metric_id];
      const fieldKey = rule.field_name.replace('manual_', '');
      if (raw !== undefined && raw !== '') {
        const n = parseFloat(raw.replace(',', '.'));
        overrides[fieldKey] = isNaN(n) ? null : n;
      }
    }

    try {
      const res = await fetch('/api/analysis/manual-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker, overrides }),
      });
      if (!res.ok) throw new Error('Erro ao salvar dados');

      const runRes = await fetch('/api/analysis/run', { method: 'POST' });
      if (!runRes.ok) throw new Error('Erro ao rodar análise');

      router.refresh();
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        padding: '16px',
        borderTop: '1px solid var(--color-line-2)',
        backgroundColor: 'var(--color-bg)',
      }}
    >
      <p style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 600, color: 'var(--color-text)' }}>
        Dados necessários para análise
      </p>
      <p style={{ margin: '0 0 16px', fontSize: '12px', color: 'var(--color-text-3)' }}>
        Insira os dados abaixo para completar a análise de {ticker}.
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
          {missingRules.map(rule => (
            <div key={rule.metric_id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: '12px', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text)' }}>
                  {rule.label}
                  {rule.unit && (
                    <span style={{ fontSize: '11px', color: 'var(--color-text-3)', marginLeft: '4px' }}>
                      ({rule.unit})
                    </span>
                  )}
                </div>
                {rule.context_notes && (
                  <div style={{ fontSize: '11px', color: 'var(--color-text-3)', marginTop: '2px' }}>
                    {rule.context_notes}
                  </div>
                )}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-3)' }}>
                Ok: {rule.threshold_ok}
              </div>
              <input
                type="text"
                inputMode="decimal"
                placeholder="—"
                value={values[rule.metric_id] ?? ''}
                onChange={e => setValues(prev => ({ ...prev, [rule.metric_id]: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '5px 8px',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                  backgroundColor: 'var(--color-bg-2)',
                  border: '1px solid var(--color-line)',
                  borderRadius: '4px',
                  color: 'var(--color-text)',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          ))}
        </div>

        {error && (
          <p style={{ fontSize: '12px', color: 'var(--color-loss)', margin: '0 0 10px' }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '6px 14px',
            fontSize: '12px',
            fontWeight: 500,
            backgroundColor: 'var(--color-bg-3)',
            border: '1px solid var(--color-line)',
            borderRadius: '5px',
            color: 'var(--color-text)',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Salvando...' : 'Salvar e reanalisar'}
        </button>
      </form>
    </div>
  );
}
