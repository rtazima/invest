'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { AnalysisPageData, HolderInfo, PositionSummary } from '@/lib/data/analysis';
import type { Archetype, Recommendation, FundamentalsSnapshot } from '@/lib/analysis/types';
import { ARCHETYPE_LABELS } from '@/lib/analysis/types';
import { ArchetypeChip } from './ArchetypeChip';
import { RecommendationBadge } from './RecommendationBadge';
import { SemaphoreRow } from './SemaphoreRow';
import { MissingDataPanel } from './MissingDataPanel';

interface Props {
  items: AnalysisPageData[];
  holders: HolderInfo[];
}

const REC_FILTERS: Array<{ id: 'all' | Recommendation; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'buy', label: 'Comprar' },
  { id: 'hold', label: 'Manter' },
  { id: 'sell', label: 'Vender' },
  { id: 'avoid', label: 'Evitar' },
  { id: 'reduce', label: 'Reduzir' },
];

const ARCHETYPE_FILTERS: Array<{ id: 'all' | Archetype; label: string }> = [
  { id: 'all', label: 'Todos' },
  ...(Object.entries(ARCHETYPE_LABELS) as Array<[Archetype, string]>).map(([id, label]) => ({ id, label })),
];

function num(v: number | null | undefined, dec = 1): string {
  if (v == null) return '—';
  return v.toFixed(dec);
}

function brl(v: number | null | undefined): string {
  if (v == null) return '—';
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}R$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}R$${(abs / 1_000).toFixed(0)}k`;
  return `${sign}R$${abs.toFixed(0)}`;
}

function pct(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

const INST_LABELS: Record<string, string> = {
  xp: 'XP', btg: 'BTG', nomad: 'Nomad', mercadopago: 'Mercado Pago',
  nubank: 'Nu', inter: 'Inter', clear: 'Clear', rico: 'Rico',
};
function instLabel(i: string) { return INST_LABELS[i] ?? i.toUpperCase(); }

type FundKey = keyof FundamentalsSnapshot;
const FUND_METRICS: Array<{ key: FundKey; label: string; dec?: number; suffix?: string }> = [
  { key: 'pl', label: 'P/L', dec: 1 },
  { key: 'pvp', label: 'P/VP', dec: 2 },
  { key: 'dy', label: 'DY', dec: 1, suffix: '%' },
  { key: 'ev_ebitda', label: 'EV/EBITDA', dec: 1 },
  { key: 'roic', label: 'ROIC', dec: 1, suffix: '%' },
  { key: 'roe', label: 'ROE', dec: 1, suffix: '%' },
  { key: 'roa', label: 'ROA', dec: 1, suffix: '%' },
  { key: 'marg_bruta', label: 'Marg. bruta', dec: 1, suffix: '%' },
  { key: 'marg_ebit', label: 'Marg. EBIT', dec: 1, suffix: '%' },
  { key: 'marg_liquida', label: 'Marg. líq.', dec: 1, suffix: '%' },
  { key: 'div_liq_ebitda', label: 'DL/EBITDA', dec: 2 },
  { key: 'cresc_rec_5a', label: 'Cresc. rec. 5a', dec: 1, suffix: '%' },
];

function gainColor(v: number | null | undefined) {
  if (v == null) return 'var(--color-text-3)';
  return v >= 0 ? 'oklch(0.72 0.18 145)' : 'oklch(0.65 0.22 25)';
}

// ─── sub-components ────────────────────────────────────────────────────────

function PositionDetailRow({ p }: { p: PositionSummary }) {
  const pnlPct = p.cost_basis && p.cost_basis > 0
    ? ((p.market_value - p.cost_basis) / p.cost_basis) * 100
    : p.pnl_pct;

  const td: React.CSSProperties = {
    padding: '5px 10px', fontSize: '12px', fontFamily: 'var(--font-mono)',
    color: 'var(--color-text)', borderBottom: '1px solid var(--color-line-2)',
    whiteSpace: 'nowrap',
  };

  return (
    <tr>
      <td style={{ ...td, fontFamily: 'inherit', color: 'var(--color-text-2)' }}>{p.holder_name}</td>
      <td style={{ ...td, fontFamily: 'inherit', color: 'var(--color-text-3)' }}>{instLabel(p.institution)}</td>
      <td style={{ ...td, textAlign: 'right' }}>{p.quantity.toLocaleString('pt-BR')}</td>
      <td style={{ ...td, textAlign: 'right', color: 'var(--color-text-3)' }}>
        {p.avg_price != null ? `R$${p.avg_price.toFixed(2)}` : '—'}
      </td>
      <td style={{ ...td, textAlign: 'right', color: 'var(--color-text-3)' }}>
        {p.current_price != null ? `R$${p.current_price.toFixed(2)}` : '—'}
      </td>
      <td style={{ ...td, textAlign: 'right' }}>{brl(p.market_value)}</td>
      <td style={{ ...td, textAlign: 'right', color: gainColor(p.pnl) }}>{brl(p.pnl)}</td>
      <td style={{ ...td, textAlign: 'right', color: gainColor(pnlPct) }}>{pct(pnlPct)}</td>
    </tr>
  );
}

function FundamentalsDetail({ fund }: { fund: FundamentalsSnapshot }) {
  const entries = FUND_METRICS.filter(m => fund[m.key] != null);
  if (!entries.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', padding: '12px 16px', borderTop: '1px solid var(--color-line-2)' }}>
      {entries.map(m => (
        <div key={m.key as string} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '10px', color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{m.label}</span>
          <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-text)' }}>
            {num(fund[m.key] as number, m.dec ?? 1)}{m.suffix ?? ''}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── main component ────────────────────────────────────────────────────────

export function AnalysisView({ items, holders }: Props) {
  const router = useRouter();
  const [filterHolder, setFilterHolder] = useState<'all' | string>('all');
  const [filterRec, setFilterRec] = useState<'all' | Recommendation>('all');
  const [filterArchetype, setFilterArchetype] = useState<'all' | Archetype>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<{ analyzed?: number; blocked?: number; error?: string } | null>(null);

  const filtered = useMemo(() => items.filter(item => {
    if (filterHolder !== 'all' && !item.positions.some(p => p.holder_id === filterHolder)) return false;
    if (filterRec !== 'all' && item.result?.recommendation !== filterRec) return false;
    if (filterArchetype !== 'all' && item.archetype !== filterArchetype) return false;
    return true;
  }), [items, filterHolder, filterRec, filterArchetype]);

  const allFilteredTickers = filtered.map(i => i.ticker);
  const allSelected = allFilteredTickers.length > 0 && allFilteredTickers.every(t => selected.has(t));
  const someSelected = allFilteredTickers.some(t => selected.has(t));
  const selectedCount = allFilteredTickers.filter(t => selected.has(t)).length;

  function toggleAll() {
    if (allSelected) {
      setSelected(prev => { const n = new Set(prev); allFilteredTickers.forEach(t => n.delete(t)); return n; });
    } else {
      setSelected(prev => new Set([...prev, ...allFilteredTickers]));
    }
  }

  function toggleTicker(ticker: string) {
    setSelected(prev => { const n = new Set(prev); n.has(ticker) ? n.delete(ticker) : n.add(ticker); return n; });
  }

  function toggleExpand(ticker: string) {
    setExpandedTicker(prev => prev === ticker ? null : ticker);
  }

  async function handleRunAnalysis() {
    setRunning(true);
    setRunResult(null);
    const tickersToRun = someSelected ? allFilteredTickers.filter(t => selected.has(t)) : undefined;
    try {
      const res = await fetch('/api/analysis/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: tickersToRun ? JSON.stringify({ tickers: tickersToRun }) : undefined,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setRunResult({ error: data.error ?? `Erro ${res.status}` });
      } else {
        const data = await res.json() as { analyzed: number; blocked: number };
        setRunResult({ analyzed: data.analyzed, blocked: data.blocked });
        router.refresh();
      }
    } catch (e) {
      setRunResult({ error: e instanceof Error ? e.message : 'Erro desconhecido' });
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

  const runLabel = running ? 'Rodando...' : someSelected ? `Rodar análise (${selectedCount})` : 'Rodar análise';

  return (
    <div style={{ maxWidth: '1100px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>Análise de Ações</h1>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--color-text-3)' }}>Avaliação fundamentalista por arquétipo de empresa.</p>
        </div>
        <button
          onClick={handleRunAnalysis}
          disabled={running}
          style={{
            padding: '7px 14px', fontSize: '12.5px', fontWeight: 500,
            backgroundColor: someSelected ? 'var(--color-text)' : 'var(--color-bg-3)',
            border: `1px solid ${someSelected ? 'var(--color-text)' : 'var(--color-line)'}`,
            borderRadius: '6px',
            color: someSelected ? 'var(--color-bg)' : 'var(--color-text)',
            cursor: running ? 'not-allowed' : 'pointer', opacity: running ? 0.6 : 1,
            display: 'flex', alignItems: 'center', gap: '6px', transition: 'background-color 0.15s, color 0.15s',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 12V8M6 12V5M10 12V7M14 12V3" />
          </svg>
          {runLabel}
        </button>
      </div>

      {/* Run result feedback */}
      {runResult && (
        <div style={{
          marginBottom: '12px', padding: '8px 12px', borderRadius: '6px', fontSize: '12.5px',
          backgroundColor: runResult.error
            ? 'color-mix(in srgb, var(--color-crit) 10%, transparent)'
            : 'color-mix(in srgb, var(--color-gain) 10%, transparent)',
          color: runResult.error ? 'var(--color-crit)' : 'var(--color-gain)',
          border: `1px solid ${runResult.error ? 'color-mix(in srgb, var(--color-crit) 30%, transparent)' : 'color-mix(in srgb, var(--color-gain) 30%, transparent)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span>
            {runResult.error
              ? `Erro: ${runResult.error}`
              : `Análise concluída — ${runResult.analyzed} analisadas, ${runResult.blocked} bloqueadas por dados faltantes.`}
          </span>
          <button onClick={() => setRunResult(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '14px', lineHeight: 1, padding: '0 4px' }}>×</button>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
        {holders.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button onClick={() => setFilterHolder('all')} style={chip(filterHolder === 'all')}>Todos</button>
            {holders.map(h => (
              <button key={h.id} onClick={() => setFilterHolder(h.id)} style={chip(filterHolder === h.id)}>{h.name}</button>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {REC_FILTERS.map(f => <button key={f.id} onClick={() => setFilterRec(f.id)} style={chip(filterRec === f.id)}>{f.label}</button>)}
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {ARCHETYPE_FILTERS.map(f => <button key={f.id} onClick={() => setFilterArchetype(f.id)} style={chip(filterArchetype === f.id)}>{f.label}</button>)}
        </div>
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '16px', textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'var(--color-bg-3)', display: 'grid', placeItems: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 16 16" fill="none" stroke="var(--color-text-3)" strokeWidth="1.5"><path d="M2 12V8M6 12V5M10 12V7M14 12V3" /></svg>
          </div>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>Nenhuma ação no portfólio</p>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-3)' }}>Importe posições em ações para ver a análise fundamentalista.</p>
          </div>
          <Link href="/import" style={{ padding: '7px 14px', fontSize: '13px', fontWeight: 500, borderRadius: '6px', backgroundColor: 'var(--color-bg-3)', border: '1px solid var(--color-line)', color: 'var(--color-text)', textDecoration: 'none' }}>
            Importar portfólio
          </Link>
        </div>
      )}

      {/* Table */}
      {items.length > 0 && (
        <div style={{ borderRadius: '8px', border: '1px solid var(--color-line-2)', backgroundColor: 'var(--color-bg-2)', overflow: 'hidden' }}>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--color-line-2)', backgroundColor: 'var(--color-bg)' }}>
            <div style={{ flex: '0 0 28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <input type="checkbox" checked={allSelected}
                ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                onChange={toggleAll} style={{ cursor: 'pointer', accentColor: 'var(--color-text)' }} />
            </div>
            <div style={{ flex: '0 0 24px' }} /> {/* chevron spacer */}
            <div style={hdr('68px')}>Ticker</div>
            <div style={hdr('96px')}>Titulares</div>
            <div style={hdr('64px', { textAlign: 'right' })}>Qtd</div>
            <div style={hdr('82px', { textAlign: 'right' })}>Valor</div>
            <div style={hdr('76px', { textAlign: 'right' })}>P&L</div>
            <div style={hdr('64px', { textAlign: 'right' })}>P&L%</div>
            <div style={hdr('104px')}>Arquétipo</div>
            <div style={hdr('90px')}>Recomendação</div>
            <div style={hdr('44px', { textAlign: 'right' })}>P/L</div>
            <div style={hdr('44px', { textAlign: 'right' })}>P/VP</div>
            <div style={hdr('44px', { textAlign: 'right' })}>DY%</div>
            <div style={hdr('44px', { textAlign: 'right' })}>ROE%</div>
            <div style={{ flex: '1 1 auto', ...hdr('auto'), padding: '0 8px' }}>Semáforos</div>
            <div style={hdr('76px')}>Análise</div>
          </div>

          {/* Rows */}
          {filtered.map(item => {
            const isBlocked = item.result?.status === 'blocked';
            const isExpanded = expandedTicker === item.ticker;
            const isChecked = selected.has(item.ticker);

            const visPosns = filterHolder === 'all'
              ? item.positions
              : item.positions.filter(p => p.holder_id === filterHolder);
            const totalMv = visPosns.reduce((s, p) => s + p.market_value, 0);
            const totalQty = visPosns.reduce((s, p) => s + p.quantity, 0);
            const totalPnl = visPosns.reduce((s, p) => s + (p.pnl ?? 0), 0);
            const totalCost = visPosns.reduce((s, p) => s + (p.market_value - (p.pnl ?? 0)), 0);
            const aggPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : null;

            return (
              <div key={item.ticker} style={{ borderBottom: '1px solid var(--color-line-2)' }}>
                {/* Summary row */}
                <div style={{
                  display: 'flex', alignItems: 'center', padding: '9px 0',
                  backgroundColor: isChecked ? 'oklch(0.22 0 0)' : isExpanded ? 'var(--color-bg)' : 'transparent',
                  transition: 'background-color 0.1s',
                }}>
                  {/* Checkbox */}
                  <div style={{ flex: '0 0 28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <input type="checkbox" checked={isChecked} onChange={() => toggleTicker(item.ticker)}
                      style={{ cursor: 'pointer', accentColor: 'var(--color-text)' }} />
                  </div>

                  {/* Expand chevron */}
                  <div
                    onClick={() => toggleExpand(item.ticker)}
                    style={{ flex: '0 0 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-3)' }}
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5"
                      style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
                      <path d="M3 2l4 3-4 3" />
                    </svg>
                  </div>

                  {/* Ticker — click to expand */}
                  <div style={{ ...col('68px'), cursor: 'pointer' }} onClick={() => toggleExpand(item.ticker)}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '12px' }}>{item.ticker}</span>
                  </div>

                  {/* Titulares */}
                  <div style={{ ...col('96px'), display: 'flex', gap: '3px', overflow: 'visible' }}>
                    {item.positions.map(p => (
                      <span key={p.holder_id} title={`${p.holder_name} · ${instLabel(p.institution)}`}
                        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--color-bg-3)', border: '1px solid var(--color-line)', fontSize: '9px', fontWeight: 700, color: 'var(--color-text-2)', flexShrink: 0, cursor: 'default' }}>
                        {initials(p.holder_name)}
                      </span>
                    ))}
                  </div>

                  {/* Qtd */}
                  <div style={{ ...col('64px'), textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                    {totalQty > 0 ? totalQty.toLocaleString('pt-BR') : '—'}
                  </div>

                  {/* Valor */}
                  <div style={{ ...col('82px'), textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                    {totalMv > 0 ? brl(totalMv) : '—'}
                  </div>

                  {/* P&L */}
                  <div style={{ ...col('76px'), textAlign: 'right', fontFamily: 'var(--font-mono)', color: gainColor(totalPnl) }}>
                    {visPosns.some(p => p.pnl != null) ? brl(totalPnl) : '—'}
                  </div>

                  {/* P&L% */}
                  <div style={{ ...col('64px'), textAlign: 'right', fontFamily: 'var(--font-mono)', color: gainColor(aggPnlPct) }}>
                    {aggPnlPct != null ? pct(aggPnlPct) : '—'}
                  </div>

                  {/* Arquétipo */}
                  <div style={col('104px')}>
                    {item.archetype ? <ArchetypeChip archetype={item.archetype} /> : <span style={{ color: 'var(--color-text-3)', fontSize: '11px' }}>—</span>}
                  </div>

                  {/* Recomendação */}
                  <div style={col('90px')}>
                    {isBlocked ? (
                      <span style={{ fontSize: '11px', color: 'var(--color-warn)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                        onClick={() => toggleExpand(item.ticker)}>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <circle cx="5" cy="5" r="4" /><path d="M5 3v2.5M5 7h.01" />
                        </svg>
                        Dados faltantes
                      </span>
                    ) : (
                      <RecommendationBadge recommendation={item.result?.recommendation ?? null} />
                    )}
                  </div>

                  {/* P/L */}
                  <div style={{ ...col('44px'), textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{num(item.fundamentals?.pl)}</div>

                  {/* P/VP */}
                  <div style={{ ...col('44px'), textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{num(item.fundamentals?.pvp)}</div>

                  {/* DY% */}
                  <div style={{ ...col('44px'), textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{num(item.fundamentals?.dy)}</div>

                  {/* ROE% */}
                  <div style={{ ...col('44px'), textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{num(item.fundamentals?.roe)}</div>

                  {/* Semáforos */}
                  <div style={{ flex: '1 1 auto', padding: '0 8px' }}>
                    {item.result && item.applicableRules.length > 0
                      ? <SemaphoreRow semaphores={item.result.semaphores} rules={item.applicableRules} snapshot={item.fundamentals ?? undefined} />
                      : <span style={{ fontSize: '11px', color: 'var(--color-text-3)' }}>—</span>}
                  </div>

                  {/* Data */}
                  <div style={{ ...col('76px'), fontSize: '11px', color: 'var(--color-text-3)' }}>{fmtDate(item.result?.analyzed_at)}</div>
                </div>

                {/* Expanded detail panel */}
                {isExpanded && (
                  <div style={{ backgroundColor: 'var(--color-bg)', borderTop: '1px solid var(--color-line-2)' }}>
                    {/* Position breakdown */}
                    <div style={{ padding: '12px 16px 0' }}>
                      <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Posições
                      </p>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '560px' }}>
                          <thead>
                            <tr style={{ backgroundColor: 'var(--color-bg-2)' }}>
                              {['Titular', 'Instituição', 'Qtd', 'Preço médio', 'Preço atual', 'Valor', 'P&L', 'P&L%'].map(h => (
                                <th key={h} style={{ padding: '5px 10px', fontSize: '10.5px', fontWeight: 600, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: h === 'Titular' || h === 'Instituição' ? 'left' : 'right', borderBottom: '1px solid var(--color-line-2)', whiteSpace: 'nowrap' }}>
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {item.positions.map(p => <PositionDetailRow key={p.holder_id} p={p} />)}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Fundamentals */}
                    {item.fundamentals && <FundamentalsDetail fund={item.fundamentals} />}

                    {/* Missing data form (blocked rows) */}
                    {isBlocked && item.result && (
                      <div style={{ borderTop: '1px solid var(--color-line-2)', padding: '0' }}>
                        <MissingDataPanel
                          ticker={item.ticker}
                          missingMetrics={item.result.missing_metrics}
                          rules={item.applicableRules}
                          onSaved={() => setExpandedTicker(null)}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && items.length > 0 && (
            <div style={{ padding: '32px', textAlign: 'center', fontSize: '13px', color: 'var(--color-text-3)' }}>
              Nenhuma ação corresponde aos filtros selecionados.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
