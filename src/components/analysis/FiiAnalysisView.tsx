'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { HolderInfo } from '@/lib/data/analysis';
import type { FiiPageData, FiiType, FiiSubsegment } from '@/lib/analysis/fii-types';
import type { Recommendation } from '@/lib/analysis/types';
import { FII_TYPE_LABELS, FII_TYPE_COLORS, FII_SUBSEGMENT_LABELS } from '@/lib/analysis/fii-types';
import { SemaphoreRow } from './SemaphoreRow';
import { RecommendationBadge } from './RecommendationBadge';
import type { FiiFundamentalsSnapshot } from '@/lib/analysis/fii-types';

// ─── helpers ────────────────────────────────────────────────────────────────

function num(v: number | null | undefined, dec = 1) { return v == null ? '—' : v.toFixed(dec); }
function pct(v: number | null | undefined) { return v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`; }
function brl(v: number | null | undefined) {
  if (v == null) return '—';
  const a = Math.abs(v), s = v < 0 ? '-' : '';
  if (a >= 1_000_000) return `${s}R$${(a / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000) return `${s}R$${(a / 1_000).toFixed(0)}k`;
  return `${s}R$${a.toFixed(0)}`;
}
function gainColor(v: number | null | undefined) {
  if (v == null) return 'var(--color-text-3)';
  return v >= 0 ? 'oklch(0.72 0.18 145)' : 'oklch(0.65 0.22 25)';
}
function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}
function initials(name: string) { return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(); }

const INST_LABELS: Record<string, string> = { xp: 'XP', btg: 'BTG', nomad: 'Nomad', rico: 'Rico', clear: 'Clear' };
function instLabel(i: string) { return INST_LABELS[i] ?? i.toUpperCase(); }

// ─── type chip ───────────────────────────────────────────────────────────────

function FiiTypeChip({ fiiType, subsegment }: { fiiType: FiiType; subsegment: FiiSubsegment | null }) {
  const label = FII_TYPE_LABELS[fiiType];
  const sub = subsegment ? FII_SUBSEGMENT_LABELS[subsegment] : null;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      <span style={{
        display: 'inline-block', padding: '2px 7px', borderRadius: '999px',
        fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.02em',
        backgroundColor: `color-mix(in srgb, ${FII_TYPE_COLORS[fiiType]} 15%, transparent)`,
        color: FII_TYPE_COLORS[fiiType], border: `1px solid color-mix(in srgb, ${FII_TYPE_COLORS[fiiType]} 30%, transparent)`,
      }}>
        {label}
      </span>
      {sub && <span style={{ fontSize: '10.5px', color: 'var(--color-text-3)' }}>{sub}</span>}
    </span>
  );
}

// ─── type selector (inline form) ─────────────────────────────────────────────

function TypeSelector({ ticker, onSaved }: { ticker: string; onSaved: () => void }) {
  const [type, setType] = useState<FiiType>('tijolo');
  const [sub, setSub] = useState<FiiSubsegment | ''>('');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await fetch('/api/analysis/fii-archetype', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker, fii_type: type, subsegment: sub || null }),
    });
    setSaving(false);
    onSaved();
  }

  const sel: React.CSSProperties = {
    padding: '5px 8px', fontSize: '12px', borderRadius: '5px',
    backgroundColor: 'var(--color-bg-3)', border: '1px solid var(--color-line)',
    color: 'var(--color-text)', cursor: 'pointer',
  };

  return (
    <div style={{ padding: '12px 16px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', borderTop: '1px solid var(--color-line-2)', backgroundColor: 'var(--color-bg)' }}>
      <span style={{ fontSize: '12px', color: 'var(--color-text-3)' }}>Classificar:</span>
      <select value={type} onChange={e => setType(e.target.value as FiiType)} style={sel}>
        {(Object.entries(FII_TYPE_LABELS) as [FiiType, string][]).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>
      {type === 'tijolo' && (
        <select value={sub} onChange={e => setSub(e.target.value as FiiSubsegment | '')} style={sel}>
          <option value="">Subsegmento (opcional)</option>
          {(Object.entries(FII_SUBSEGMENT_LABELS) as [FiiSubsegment, string][]).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      )}
      <button
        onClick={save} disabled={saving}
        style={{ padding: '5px 12px', fontSize: '12px', fontWeight: 500, borderRadius: '5px', backgroundColor: 'var(--color-text)', color: 'var(--color-bg)', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}
      >
        {saving ? '...' : 'Salvar'}
      </button>
    </div>
  );
}

// ─── manual data form ─────────────────────────────────────────────────────────

interface MetricField { key: keyof FiiFundamentalsSnapshot; label: string; unit?: string; hint?: string }

const TRANSVERSAL_FIELDS: MetricField[] = [
  { key: 'sustentabilidade_dist', label: 'Sustentabilidade da distribuição', unit: '%', hint: 'Distribuído / resultado recorrente' },
  { key: 'taxa_ntnb', label: 'Taxa NTN-B (ref. atual)', unit: '%', hint: 'Tesouro IPCA+ de prazo equivalente — ex: 6.5' },
  { key: 'taxa_administracao', label: 'Taxa de administração', unit: '%a.a.' },
];

const FIELDS_BY_TYPE: Record<FiiType, MetricField[]> = {
  tijolo: [
    { key: 'vacancia_fisica', label: 'Vacância física', unit: '%' },
    { key: 'vacancia_financeira', label: 'Vacância financeira', unit: '%' },
    { key: 'contratos_atipicos_pct', label: 'Contratos atípicos', unit: '%' },
    { key: 'prazo_medio_contratos', label: 'Prazo médio dos contratos', unit: 'anos' },
    { key: 'contratos_vencendo_24m', label: 'Contratos vencendo em 24m', unit: '%' },
    { key: 'inadimplencia_inquilinos', label: 'Inadimplência dos inquilinos', unit: '%' },
    { key: 'concentracao_inquilino', label: 'Concentração — maior inquilino', unit: '%' },
    { key: 'concentracao_imovel', label: 'Concentração — maior imóvel', unit: '%' },
  ],
  papel: [
    { key: 'ltv_medio', label: 'LTV médio da carteira', unit: '%' },
    { key: 'inadimplencia_cri', label: 'Inadimplência CRI', unit: '%' },
    { key: 'high_grade_pct', label: 'Concentração high grade', unit: '%' },
    { key: 'concentracao_devedor', label: 'Concentração — maior devedor', unit: '%' },
  ],
  fof: [
    { key: 'taxa_fof', label: 'Taxa do FOF', unit: '%a.a.' },
  ],
  hibrido: [
    { key: 'vacancia_fisica', label: 'Vacância física (parte tijolo)', unit: '%' },
    { key: 'ltv_medio', label: 'LTV médio (parte papel)', unit: '%' },
  ],
  desenvolvimento: [],
};

function ManualDataForm({ ticker, fiiType, fundamentals, missingMetrics, onSaved }: {
  ticker: string; fiiType: FiiType; fundamentals: FiiFundamentalsSnapshot | null;
  missingMetrics: string[]; onSaved: () => void;
}) {
  const allFields = [...TRANSVERSAL_FIELDS, ...(FIELDS_BY_TYPE[fiiType] ?? [])];
  const toShow = missingMetrics.length > 0
    ? allFields
    : allFields.filter(f => fundamentals?.[f.key] == null);

  const initial = Object.fromEntries(
    allFields.map(f => [f.key, fundamentals?.[f.key] != null ? String(fundamentals[f.key]) : '']),
  );
  const [vals, setVals] = useState<Record<string, string>>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!toShow.length) return null;

  async function save() {
    setSaving(true);
    setError(null);
    const overrides: Record<string, number | null> = {};
    for (const f of allFields) {
      const v = vals[f.key as string]?.trim();
      overrides[f.key as string] = v ? parseFloat(v.replace(',', '.')) : null;
    }
    const res = await fetch('/api/analysis/fii-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker, overrides }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({})) as { error?: string };
      setError(d.error ?? 'Erro ao salvar');
    } else {
      onSaved();
    }
    setSaving(false);
  }

  const inp: React.CSSProperties = {
    width: '80px', padding: '4px 6px', fontSize: '12px', fontFamily: 'var(--font-mono)',
    backgroundColor: 'var(--color-bg-3)', border: '1px solid var(--color-line)',
    borderRadius: '4px', color: 'var(--color-text)', textAlign: 'right',
  };

  return (
    <div style={{ padding: '16px', borderTop: '1px solid var(--color-line-2)', backgroundColor: 'var(--color-bg)' }}>
      <div style={{ fontSize: '10.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-3)', marginBottom: '12px' }}>
        Dados do relatório gerencial
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px', marginBottom: '14px' }}>
        {toShow.map(f => (
          <div key={f.key as string} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <label style={{ fontSize: '11px', color: 'var(--color-text-3)' }}>
              {f.label}{f.unit ? ` (${f.unit})` : ''}
            </label>
            {f.hint && <span style={{ fontSize: '10px', color: 'var(--color-text-3)', opacity: 0.7 }}>{f.hint}</span>}
            <input
              style={inp}
              type="text"
              inputMode="decimal"
              value={vals[f.key as string] ?? ''}
              onChange={e => setVals(v => ({ ...v, [f.key as string]: e.target.value }))}
              placeholder="—"
            />
          </div>
        ))}
      </div>
      {error && <div style={{ fontSize: '11px', color: 'var(--color-crit)', marginBottom: '8px' }}>{error}</div>}
      <button
        onClick={save} disabled={saving}
        style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 500, borderRadius: '5px', backgroundColor: 'var(--color-text)', color: 'var(--color-bg)', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}
      >
        {saving ? 'Salvando...' : 'Salvar dados'}
      </button>
    </div>
  );
}

// ─── main component ────────────────────────────────────────────────────────

const REC_FILTERS: Array<{ id: 'all' | Recommendation; label: string }> = [
  { id: 'all', label: 'Todos' }, { id: 'buy', label: 'Comprar' }, { id: 'hold', label: 'Manter' },
  { id: 'sell', label: 'Vender' }, { id: 'avoid', label: 'Evitar' },
];

const TYPE_FILTERS: Array<{ id: 'all' | FiiType; label: string }> = [
  { id: 'all', label: 'Todos' },
  ...(Object.entries(FII_TYPE_LABELS) as [FiiType, string][]).map(([id, label]) => ({ id, label })),
];

interface Props { items: FiiPageData[]; holders: HolderInfo[] }

export function FiiAnalysisView({ items, holders }: Props) {
  const router = useRouter();
  const [filterHolder, setFilterHolder] = useState<'all' | string>('all');
  const [filterRec, setFilterRec] = useState<'all' | Recommendation>('all');
  const [filterType, setFilterType] = useState<'all' | FiiType>('all');
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<{ analyzed?: number; blocked?: number; errors?: string[]; error?: string } | null>(null);

  const filtered = useMemo(() => items.filter(item => {
    if (filterHolder !== 'all' && !item.positions.some(p => p.holder_id === filterHolder)) return false;
    if (filterRec !== 'all' && item.result?.recommendation !== filterRec) return false;
    if (filterType !== 'all' && item.fiiType !== filterType) return false;
    return true;
  }), [items, filterHolder, filterRec, filterType]);

  const allTickers = filtered.map(i => i.ticker);
  const allSelected = allTickers.length > 0 && allTickers.every(t => selected.has(t));
  const someSelected = allTickers.some(t => selected.has(t));
  const selectedCount = allTickers.filter(t => selected.has(t)).length;

  function toggleAll() {
    if (allSelected) setSelected(p => { const n = new Set(p); allTickers.forEach(t => n.delete(t)); return n; });
    else setSelected(p => new Set([...p, ...allTickers]));
  }

  async function handleRunAnalysis() {
    setRunning(true);
    setRunResult(null);
    const tickersToRun = someSelected ? allTickers.filter(t => selected.has(t)) : undefined;
    try {
      const res = await fetch('/api/analysis/fii-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: tickersToRun ? JSON.stringify({ tickers: tickersToRun }) : undefined,
      });
      const data = await res.json() as { analyzed?: number; blocked?: number; errors?: string[]; error?: string };
      if (!res.ok) setRunResult({ error: data.error ?? `Erro ${res.status}` });
      else { setRunResult(data); router.refresh(); }
    } catch (e) {
      setRunResult({ error: e instanceof Error ? e.message : 'Erro' });
    } finally {
      setRunning(false);
      setSelected(new Set());
    }
  }

  const chip = (active: boolean): React.CSSProperties => ({
    padding: '4px 10px', fontSize: '12px', borderRadius: '999px',
    border: `1px solid ${active ? 'var(--color-text-3)' : 'var(--color-line)'}`,
    backgroundColor: active ? 'var(--color-bg-3)' : 'transparent',
    color: active ? 'var(--color-text)' : 'var(--color-text-3)',
    cursor: 'pointer', whiteSpace: 'nowrap',
  });

  const col = (basis: string, extra?: React.CSSProperties): React.CSSProperties => ({
    flex: `0 0 ${basis}`, minWidth: 0, fontSize: '12px', color: 'var(--color-text)',
    padding: '0 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...extra,
  });

  const hdr = (basis: string, extra?: React.CSSProperties): React.CSSProperties => ({
    ...col(basis, extra), fontWeight: 600, fontSize: '10.5px',
    color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em',
  });

  return (
    <div style={{ maxWidth: '1100px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Análise de FIIs</h1>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--color-text-3)' }}>
            Avaliação fundamentalista por tipo de fundo. Dados do relatório gerencial mensal.
          </p>
        </div>
        <button
          onClick={handleRunAnalysis} disabled={running}
          style={{
            padding: '7px 14px', fontSize: '12.5px', fontWeight: 500,
            backgroundColor: someSelected ? 'var(--color-text)' : 'var(--color-bg-3)',
            border: `1px solid ${someSelected ? 'var(--color-text)' : 'var(--color-line)'}`,
            borderRadius: '6px', color: someSelected ? 'var(--color-bg)' : 'var(--color-text)',
            cursor: running ? 'not-allowed' : 'pointer', opacity: running ? 0.6 : 1,
            display: 'flex', alignItems: 'center', gap: '6px',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21V11h6v10" />
          </svg>
          {running ? 'Rodando...' : someSelected ? `Rodar análise (${selectedCount})` : 'Rodar análise'}
        </button>
      </div>

      {/* Feedback */}
      {runResult && (
        <div style={{
          marginBottom: '12px', padding: '8px 12px', borderRadius: '6px', fontSize: '12.5px',
          backgroundColor: runResult.error ? 'color-mix(in srgb, var(--color-crit) 10%, transparent)' : 'color-mix(in srgb, var(--color-gain) 10%, transparent)',
          color: runResult.error ? 'var(--color-crit)' : 'var(--color-gain)',
          border: `1px solid ${runResult.error ? 'color-mix(in srgb, var(--color-crit) 30%, transparent)' : 'color-mix(in srgb, var(--color-gain) 30%, transparent)'}`,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px',
        }}>
          <div>
            {runResult.error
              ? `Erro: ${runResult.error}`
              : `Concluído — ${runResult.analyzed} analisados, ${runResult.blocked} bloqueados.`}
            {runResult.errors?.length ? (
              <ul style={{ margin: '6px 0 0', paddingLeft: '16px', fontSize: '11px' }}>
                {runResult.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            ) : null}
          </div>
          <button onClick={() => setRunResult(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '14px', flexShrink: 0 }}>×</button>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
        {holders.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button onClick={() => setFilterHolder('all')} style={chip(filterHolder === 'all')}>Todos</button>
            {holders.map(h => <button key={h.id} onClick={() => setFilterHolder(h.id)} style={chip(filterHolder === h.id)}>{h.name}</button>)}
          </div>
        )}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {TYPE_FILTERS.map(f => <button key={f.id} onClick={() => setFilterType(f.id)} style={chip(filterType === f.id)}>{f.label}</button>)}
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {REC_FILTERS.map(f => <button key={f.id} onClick={() => setFilterRec(f.id)} style={chip(filterRec === f.id)}>{f.label}</button>)}
        </div>
      </div>

      {/* Table */}
      {items.length > 0 && (
        <div style={{ borderRadius: '8px', border: '1px solid var(--color-line-2)', backgroundColor: 'var(--color-bg-2)', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--color-line-2)', backgroundColor: 'var(--color-bg)' }}>
            <div style={{ flex: '0 0 28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <input type="checkbox" checked={allSelected}
                ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                onChange={toggleAll} style={{ cursor: 'pointer', accentColor: 'var(--color-text)' }} />
            </div>
            <div style={{ flex: '0 0 24px' }} />
            <div style={hdr('68px')}>Ticker</div>
            <div style={hdr('88px')}>Titulares</div>
            <div style={hdr('64px', { textAlign: 'right' })}>Qtd</div>
            <div style={hdr('82px', { textAlign: 'right' })}>Valor</div>
            <div style={hdr('76px', { textAlign: 'right' })}>P&L</div>
            <div style={hdr('64px', { textAlign: 'right' })}>P&L%</div>
            <div style={hdr('120px')}>Tipo</div>
            <div style={hdr('44px', { textAlign: 'right' })}>DY%</div>
            <div style={hdr('48px', { textAlign: 'right' })}>P/VP</div>
            <div style={hdr('56px', { textAlign: 'right' })}>Spread</div>
            <div style={hdr('90px')}>Recomendação</div>
            <div style={{ flex: '1 1 auto', ...hdr('auto'), padding: '0 8px' }}>Semáforos</div>
            <div style={hdr('76px')}>Análise</div>
          </div>

          {/* Rows */}
          {filtered.map(item => {
            const isExpanded = expandedTicker === item.ticker;
            const isChecked = selected.has(item.ticker);
            const isBlocked = item.result?.status === 'blocked';
            const noType = !item.fiiType;

            const visPosns = filterHolder === 'all' ? item.positions : item.positions.filter(p => p.holder_id === filterHolder);
            const totalMv = visPosns.reduce((s, p) => s + p.market_value, 0);
            const totalQty = visPosns.reduce((s, p) => s + p.quantity, 0);
            const totalPnl = visPosns.reduce((s, p) => s + (p.pnl ?? 0), 0);
            const totalCost = visPosns.reduce((s, p) => s + (p.market_value - (p.pnl ?? 0)), 0);
            const aggPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : null;

            const fund = item.fundamentals;

            return (
              <div key={item.ticker} style={{ borderBottom: '1px solid var(--color-line-2)' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', padding: '9px 0',
                  backgroundColor: isChecked ? 'oklch(0.22 0 0)' : isExpanded ? 'var(--color-bg)' : 'transparent',
                }}>
                  <div style={{ flex: '0 0 28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <input type="checkbox" checked={isChecked}
                      onChange={() => setSelected(p => { const n = new Set(p); n.has(item.ticker) ? n.delete(item.ticker) : n.add(item.ticker); return n; })}
                      style={{ cursor: 'pointer', accentColor: 'var(--color-text)' }} />
                  </div>
                  <div onClick={() => setExpandedTicker(p => p === item.ticker ? null : item.ticker)}
                    style={{ flex: '0 0 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-3)' }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5"
                      style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
                      <path d="M3 2l4 3-4 3" />
                    </svg>
                  </div>
                  <div style={{ ...col('68px'), cursor: 'pointer', fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                    onClick={() => setExpandedTicker(p => p === item.ticker ? null : item.ticker)}>
                    {item.ticker}
                  </div>
                  <div style={{ ...col('88px'), display: 'flex', gap: '3px', overflow: 'visible' }}>
                    {item.positions.map(p => (
                      <span key={p.holder_id} title={`${p.holder_name} · ${instLabel(p.institution)}`}
                        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--color-bg-3)', border: '1px solid var(--color-line)', fontSize: '9px', fontWeight: 700, color: 'var(--color-text-2)', flexShrink: 0 }}>
                        {initials(p.holder_name)}
                      </span>
                    ))}
                  </div>
                  <div style={{ ...col('64px'), textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{totalQty > 0 ? totalQty.toLocaleString('pt-BR') : '—'}</div>
                  <div style={{ ...col('82px'), textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{brl(totalMv)}</div>
                  <div style={{ ...col('76px'), textAlign: 'right', fontFamily: 'var(--font-mono)', color: gainColor(totalPnl) }}>{visPosns.some(p => p.pnl != null) ? brl(totalPnl) : '—'}</div>
                  <div style={{ ...col('64px'), textAlign: 'right', fontFamily: 'var(--font-mono)', color: gainColor(aggPnlPct) }}>{aggPnlPct != null ? pct(aggPnlPct) : '—'}</div>
                  <div style={col('120px')}>
                    {item.fiiType
                      ? <FiiTypeChip fiiType={item.fiiType} subsegment={item.subsegment} />
                      : <span style={{ fontSize: '11px', color: 'var(--color-warn)', cursor: 'pointer' }} onClick={() => setExpandedTicker(item.ticker)}>Classificar →</span>}
                  </div>
                  <div style={{ ...col('44px'), textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{num(fund?.dy_12m)}</div>
                  <div style={{ ...col('48px'), textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{num(fund?.pvp, 2)}</div>
                  <div style={{ ...col('56px'), textAlign: 'right', fontFamily: 'var(--font-mono)', color: fund?.dy_spread != null ? (fund.dy_spread >= 3 ? 'oklch(0.72 0.18 145)' : fund.dy_spread >= 1.5 ? 'oklch(0.75 0.16 80)' : 'oklch(0.65 0.22 25)') : 'var(--color-text-3)' }}>
                    {fund?.dy_spread != null ? `+${fund.dy_spread.toFixed(1)}` : '—'}
                  </div>
                  <div style={col('90px')}>
                    {noType ? <span style={{ fontSize: '11px', color: 'var(--color-text-3)' }}>—</span>
                      : isBlocked
                        ? <span style={{ fontSize: '11px', color: 'var(--color-warn)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => setExpandedTicker(item.ticker)}>
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="5" cy="5" r="4" /><path d="M5 3v2.5M5 7h.01" /></svg>
                            Dados faltantes
                          </span>
                        : <RecommendationBadge recommendation={item.result?.recommendation ?? null} />
                    }
                  </div>
                  <div style={{ flex: '1 1 auto', padding: '0 8px' }}>
                    {item.result && item.applicableRules.length > 0
                      ? <SemaphoreRow
                          semaphores={item.result.semaphores}
                          rules={item.applicableRules}
                          snapshot={fund as unknown as import('@/lib/analysis/types').FundamentalsSnapshot | undefined}
                        />
                      : <span style={{ fontSize: '11px', color: 'var(--color-text-3)' }}>—</span>}
                  </div>
                  <div style={{ ...col('76px'), fontSize: '11px', color: 'var(--color-text-3)' }}>{fmtDate(item.result?.analyzed_at)}</div>
                </div>

                {/* Expanded */}
                {isExpanded && (
                  <div style={{ backgroundColor: 'var(--color-bg)', borderTop: '1px solid var(--color-line-2)' }}>
                    {/* Type selector if no type */}
                    {noType && (
                      <TypeSelector ticker={item.ticker} onSaved={() => { setExpandedTicker(null); router.refresh(); }} />
                    )}

                    {/* Positions table */}
                    {!noType && (
                      <div style={{ padding: '12px 16px 0' }}>
                        <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Posições</p>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '480px' }}>
                            <thead>
                              <tr style={{ backgroundColor: 'var(--color-bg-2)' }}>
                                {['Titular', 'Instituição', 'Qtd', 'Preço médio', 'Preço atual', 'Valor', 'P&L', 'P&L%'].map(h => (
                                  <th key={h} style={{ padding: '5px 10px', fontSize: '10.5px', fontWeight: 600, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: h === 'Titular' || h === 'Instituição' ? 'left' : 'right', borderBottom: '1px solid var(--color-line-2)', whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {item.positions.map(p => {
                                const pnlPct = p.cost_basis && p.cost_basis > 0 ? ((p.market_value - p.cost_basis) / p.cost_basis) * 100 : p.pnl_pct;
                                const td: React.CSSProperties = { padding: '5px 10px', fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--color-text)', borderBottom: '1px solid var(--color-line-2)', whiteSpace: 'nowrap' };
                                return (
                                  <tr key={p.holder_id}>
                                    <td style={{ ...td, fontFamily: 'inherit', color: 'var(--color-text-2)' }}>{p.holder_name}</td>
                                    <td style={{ ...td, fontFamily: 'inherit', color: 'var(--color-text-3)' }}>{instLabel(p.institution)}</td>
                                    <td style={{ ...td, textAlign: 'right' }}>{p.quantity.toLocaleString('pt-BR')}</td>
                                    <td style={{ ...td, textAlign: 'right', color: 'var(--color-text-3)' }}>{p.avg_price != null ? `R$${p.avg_price.toFixed(2)}` : '—'}</td>
                                    <td style={{ ...td, textAlign: 'right', color: 'var(--color-text-3)' }}>{p.current_price != null ? `R$${p.current_price.toFixed(2)}` : '—'}</td>
                                    <td style={{ ...td, textAlign: 'right' }}>{brl(p.market_value)}</td>
                                    <td style={{ ...td, textAlign: 'right', color: gainColor(p.pnl) }}>{brl(p.pnl)}</td>
                                    <td style={{ ...td, textAlign: 'right', color: gainColor(pnlPct) }}>{pct(pnlPct)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Manual data form */}
                    {!noType && item.fiiType && (
                      <ManualDataForm
                        ticker={item.ticker}
                        fiiType={item.fiiType}
                        fundamentals={item.fundamentals}
                        missingMetrics={item.result?.missing_metrics ?? []}
                        onSaved={() => { setExpandedTicker(null); router.refresh(); }}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && items.length > 0 && (
            <div style={{ padding: '32px', textAlign: 'center', fontSize: '13px', color: 'var(--color-text-3)' }}>
              Nenhum FII corresponde aos filtros selecionados.
            </div>
          )}
        </div>
      )}

      {items.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '16px', textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'var(--color-bg-3)', display: 'grid', placeItems: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-3)" strokeWidth="1.5">
              <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21V11h6v10" />
            </svg>
          </div>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 600 }}>Nenhum FII no portfólio</p>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-3)' }}>Importe posições de FIIs para ver a análise.</p>
          </div>
        </div>
      )}
    </div>
  );
}
