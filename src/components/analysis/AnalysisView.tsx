'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { AnalysisPageData, HolderInfo } from '@/lib/data/analysis';
import type { Archetype, Recommendation } from '@/lib/analysis/types';
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

function fmtNum(v: number | null | undefined, decimals = 1): string {
  if (v === null || v === undefined) return '—';
  return v.toFixed(decimals);
}

function fmtBRL(v: number): string {
  if (v >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$${(v / 1_000).toFixed(0)}k`;
  return `R$${v.toFixed(0)}`;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export function AnalysisView({ items, holders }: Props) {
  const router = useRouter();
  const [filterHolder, setFilterHolder] = useState<'all' | string>('all');
  const [filterRec, setFilterRec] = useState<'all' | Recommendation>('all');
  const [filterArchetype, setFilterArchetype] = useState<'all' | Archetype>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

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
      setSelected(prev => {
        const next = new Set(prev);
        allFilteredTickers.forEach(t => next.delete(t));
        return next;
      });
    } else {
      setSelected(prev => new Set([...prev, ...allFilteredTickers]));
    }
  }

  function toggleTicker(ticker: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(ticker)) next.delete(ticker);
      else next.add(ticker);
      return next;
    });
  }

  async function handleRunAnalysis() {
    setRunning(true);
    const tickersToRun = someSelected ? allFilteredTickers.filter(t => selected.has(t)) : undefined;
    try {
      await fetch('/api/analysis/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: tickersToRun ? JSON.stringify({ tickers: tickersToRun }) : undefined,
      });
      router.refresh();
    } finally {
      setRunning(false);
      setSelected(new Set());
    }
  }

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: '4px 10px',
    fontSize: '12px',
    borderRadius: '999px',
    border: `1px solid ${active ? 'var(--color-text-3)' : 'var(--color-line)'}`,
    backgroundColor: active ? 'var(--color-bg-3)' : 'transparent',
    color: active ? 'var(--color-text)' : 'var(--color-text-3)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  });

  const col = (basis: string, extra?: React.CSSProperties): React.CSSProperties => ({
    flex: `0 0 ${basis}`,
    minWidth: 0,
    fontSize: '12px',
    color: 'var(--color-text)',
    padding: '0 6px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    ...extra,
  });

  const hdrCol = (basis: string, extra?: React.CSSProperties): React.CSSProperties => ({
    ...col(basis, extra),
    fontWeight: 600,
    fontSize: '10.5px',
    color: 'var(--color-text-3)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  });

  const runLabel = running
    ? 'Rodando...'
    : someSelected
    ? `Rodar análise (${selectedCount})`
    : 'Rodar análise';

  return (
    <div style={{ maxWidth: '1100px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>
            Análise de Ações
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--color-text-3)' }}>
            Avaliação fundamentalista por arquétipo de empresa.
          </p>
        </div>
        <button
          onClick={handleRunAnalysis}
          disabled={running}
          style={{
            padding: '7px 14px',
            fontSize: '12.5px',
            fontWeight: 500,
            backgroundColor: someSelected ? 'var(--color-text)' : 'var(--color-bg-3)',
            border: `1px solid ${someSelected ? 'var(--color-text)' : 'var(--color-line)'}`,
            borderRadius: '6px',
            color: someSelected ? 'var(--color-bg)' : 'var(--color-text)',
            cursor: running ? 'not-allowed' : 'pointer',
            opacity: running ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'background-color 0.15s, color 0.15s',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 12V8M6 12V5M10 12V7M14 12V3" />
          </svg>
          {runLabel}
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
        {holders.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button onClick={() => setFilterHolder('all')} style={chipStyle(filterHolder === 'all')}>Todos</button>
            {holders.map(h => (
              <button key={h.id} onClick={() => setFilterHolder(h.id)} style={chipStyle(filterHolder === h.id)}>
                {h.name}
              </button>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {REC_FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilterRec(f.id)} style={chipStyle(filterRec === f.id)}>{f.label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {ARCHETYPE_FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilterArchetype(f.id)} style={chipStyle(filterArchetype === f.id)}>{f.label}</button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '16px', textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'var(--color-bg-3)', display: 'grid', placeItems: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 16 16" fill="none" stroke="var(--color-text-3)" strokeWidth="1.5">
              <path d="M2 12V8M6 12V5M10 12V7M14 12V3" />
            </svg>
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
          {/* Table header */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--color-line-2)', backgroundColor: 'var(--color-bg)' }}>
            <div style={{ flex: '0 0 36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <input
                type="checkbox"
                checked={allSelected}
                ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                onChange={toggleAll}
                style={{ cursor: 'pointer', accentColor: 'var(--color-text)' }}
              />
            </div>
            <div style={hdrCol('72px')}>Ticker</div>
            <div style={hdrCol('110px')}>Titulares</div>
            <div style={hdrCol('64px', { textAlign: 'right' })}>Qtd</div>
            <div style={hdrCol('90px', { textAlign: 'right' })}>Mkt value</div>
            <div style={hdrCol('68px', { textAlign: 'right' })}>P&L%</div>
            <div style={hdrCol('110px')}>Arquétipo</div>
            <div style={hdrCol('96px')}>Recomendação</div>
            <div style={hdrCol('52px', { textAlign: 'right' })}>P/L</div>
            <div style={hdrCol('52px', { textAlign: 'right' })}>P/VP</div>
            <div style={hdrCol('52px', { textAlign: 'right' })}>ROE%</div>
            <div style={{ flex: '1 1 auto', ...hdrCol('auto'), padding: '0 8px' }}>Semáforos</div>
            <div style={hdrCol('80px')}>Análise</div>
          </div>

          {/* Rows */}
          {filtered.map(item => {
            const isBlocked = item.result?.status === 'blocked';
            const isExpanded = expandedTicker === item.ticker;
            const isChecked = selected.has(item.ticker);

            const visiblePositions = filterHolder === 'all'
              ? item.positions
              : item.positions.filter(p => p.holder_id === filterHolder);
            const totalPnl = visiblePositions.reduce((s, p) => s + (p.pnl ?? 0), 0);
            const totalCost = visiblePositions.reduce((s, p) => s + (p.market_value - (p.pnl ?? 0)), 0);
            const pnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : null;
            const totalMv = visiblePositions.reduce((s, p) => s + p.market_value, 0);
            const totalQty = visiblePositions.reduce((s, p) => s + p.quantity, 0);

            return (
              <div key={item.ticker} style={{ borderBottom: '1px solid var(--color-line-2)' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '9px 0',
                  backgroundColor: isChecked ? 'oklch(0.22 0 0)' : isExpanded ? 'var(--color-bg)' : 'transparent',
                  transition: 'background-color 0.1s',
                }}>
                  {/* Checkbox */}
                  <div style={{ flex: '0 0 36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleTicker(item.ticker)}
                      style={{ cursor: 'pointer', accentColor: 'var(--color-text)' }}
                    />
                  </div>

                  {/* Ticker */}
                  <div style={col('72px')}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '12px' }}>{item.ticker}</span>
                  </div>

                  {/* Titulares */}
                  <div style={{ ...col('110px'), display: 'flex', gap: '3px', overflow: 'visible' }}>
                    {item.positions.map(p => (
                      <span
                        key={p.holder_id}
                        title={`${p.holder_name} — ${p.quantity.toLocaleString('pt-BR')} un @ ${p.institution}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--color-bg-3)',
                          border: '1px solid var(--color-line)',
                          fontSize: '9px',
                          fontWeight: 700,
                          color: 'var(--color-text-2)',
                          flexShrink: 0,
                          cursor: 'default',
                        }}
                      >
                        {initials(p.holder_name)}
                      </span>
                    ))}
                  </div>

                  {/* Qtd */}
                  <div style={{ ...col('64px'), textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                    {totalQty > 0 ? totalQty.toLocaleString('pt-BR') : '—'}
                  </div>

                  {/* Mkt value */}
                  <div style={{ ...col('90px'), textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                    {totalMv > 0 ? fmtBRL(totalMv) : '—'}
                  </div>

                  {/* P&L% */}
                  <div style={{
                    ...col('68px'),
                    textAlign: 'right',
                    fontFamily: 'var(--font-mono)',
                    color: pnlPct === null
                      ? 'var(--color-text-3)'
                      : pnlPct >= 0
                      ? 'var(--color-gain, oklch(0.72 0.18 145))'
                      : 'var(--color-loss, oklch(0.65 0.22 25))',
                  }}>
                    {pnlPct === null ? '—' : `${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(1)}%`}
                  </div>

                  {/* Arquétipo */}
                  <div style={col('110px')}>
                    {item.archetype
                      ? <ArchetypeChip archetype={item.archetype} />
                      : <span style={{ color: 'var(--color-text-3)', fontSize: '11px' }}>—</span>}
                  </div>

                  {/* Recomendação */}
                  <div style={col('96px')}>
                    {isBlocked ? (
                      <span
                        style={{ fontSize: '11px', color: 'var(--color-warn)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                        onClick={() => setExpandedTicker(isExpanded ? null : item.ticker)}
                      >
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <circle cx="5" cy="5" r="4" />
                          <path d="M5 3v2.5M5 7h.01" />
                        </svg>
                        Dados faltantes
                      </span>
                    ) : (
                      <RecommendationBadge recommendation={item.result?.recommendation ?? null} />
                    )}
                  </div>

                  {/* P/L */}
                  <div style={{ ...col('52px'), textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                    {fmtNum(item.fundamentals?.pl)}
                  </div>

                  {/* P/VP */}
                  <div style={{ ...col('52px'), textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                    {fmtNum(item.fundamentals?.pvp)}
                  </div>

                  {/* ROE% */}
                  <div style={{ ...col('52px'), textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                    {fmtNum(item.fundamentals?.roe)}
                  </div>

                  {/* Semáforos */}
                  <div style={{ flex: '1 1 auto', padding: '0 8px' }}>
                    {item.result && item.applicableRules.length > 0 ? (
                      <SemaphoreRow semaphores={item.result.semaphores} rules={item.applicableRules} />
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--color-text-3)' }}>—</span>
                    )}
                  </div>

                  {/* Data */}
                  <div style={{ ...col('80px'), fontSize: '11px', color: 'var(--color-text-3)' }}>
                    {fmtDate(item.result?.analyzed_at)}
                  </div>
                </div>

                {isBlocked && isExpanded && item.result && (
                  <MissingDataPanel
                    ticker={item.ticker}
                    missingMetrics={item.result.missing_metrics}
                    rules={item.applicableRules}
                    onSaved={() => setExpandedTicker(null)}
                  />
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
