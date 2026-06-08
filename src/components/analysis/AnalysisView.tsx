'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { AnalysisPageData } from '@/lib/data/analysis';
import type { Archetype, Recommendation } from '@/lib/analysis/types';
import { ARCHETYPE_LABELS } from '@/lib/analysis/types';
import { ArchetypeChip } from './ArchetypeChip';
import { RecommendationBadge } from './RecommendationBadge';
import { SemaphoreRow } from './SemaphoreRow';
import { MissingDataPanel } from './MissingDataPanel';

interface Props {
  items: AnalysisPageData[];
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

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function AnalysisView({ items }: Props) {
  const router = useRouter();
  const [filterRec, setFilterRec] = useState<'all' | Recommendation>('all');
  const [filterArchetype, setFilterArchetype] = useState<'all' | Archetype>('all');
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const filtered = items.filter(item => {
    if (filterRec !== 'all' && item.result?.recommendation !== filterRec) return false;
    if (filterArchetype !== 'all' && item.archetype !== filterArchetype) return false;
    return true;
  });

  async function handleRunAnalysis() {
    setRunning(true);
    try {
      await fetch('/api/analysis/run', { method: 'POST' });
      router.refresh();
    } finally {
      setRunning(false);
    }
  }

  const filterChipStyle = (active: boolean) => ({
    padding: '4px 10px',
    fontSize: '12px',
    borderRadius: '999px',
    border: `1px solid ${active ? 'var(--color-text-3)' : 'var(--color-line)'}`,
    backgroundColor: active ? 'var(--color-bg-3)' : 'transparent',
    color: active ? 'var(--color-text)' : 'var(--color-text-3)',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  });

  const colStyle = (basis: string) => ({
    flex: `0 0 ${basis}`,
    minWidth: 0,
    fontSize: '12px',
    color: 'var(--color-text)',
    padding: '0 8px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  });

  return (
    <div style={{ maxWidth: '1000px' }}>
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
            backgroundColor: 'var(--color-bg-3)',
            border: '1px solid var(--color-line)',
            borderRadius: '6px',
            color: 'var(--color-text)',
            cursor: running ? 'not-allowed' : 'pointer',
            opacity: running ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 12V8M6 12V5M10 12V7M14 12V3" />
          </svg>
          {running ? 'Rodando...' : 'Rodar análise'}
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {REC_FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilterRec(f.id)} style={filterChipStyle(filterRec === f.id)}>
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {ARCHETYPE_FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilterArchetype(f.id)} style={filterChipStyle(filterArchetype === f.id)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '300px',
            gap: '16px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'var(--color-bg-3)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 16 16" fill="none" stroke="var(--color-text-3)" strokeWidth="1.5">
              <path d="M2 12V8M6 12V5M10 12V7M14 12V3" />
            </svg>
          </div>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>
              Nenhuma ação no portfólio
            </p>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-3)' }}>
              Importe posições em ações para ver a análise fundamentalista.
            </p>
          </div>
          <Link
            href="/import"
            style={{
              padding: '7px 14px',
              fontSize: '13px',
              fontWeight: 500,
              borderRadius: '6px',
              backgroundColor: 'var(--color-bg-3)',
              border: '1px solid var(--color-line)',
              color: 'var(--color-text)',
              textDecoration: 'none',
            }}
          >
            Importar portfólio
          </Link>
        </div>
      )}

      {/* Table */}
      {items.length > 0 && (
        <div
          style={{
            borderRadius: '8px',
            border: '1px solid var(--color-line-2)',
            backgroundColor: 'var(--color-bg-2)',
            overflow: 'hidden',
          }}
        >
          {/* Table header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 0',
              borderBottom: '1px solid var(--color-line-2)',
              backgroundColor: 'var(--color-bg)',
            }}
          >
            <div style={{ ...colStyle('80px'), fontWeight: 600, fontSize: '11px', color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Ticker</div>
            <div style={{ ...colStyle('130px'), fontWeight: 600, fontSize: '11px', color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Arquétipo</div>
            <div style={{ ...colStyle('100px'), fontWeight: 600, fontSize: '11px', color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Recomendação</div>
            <div style={{ ...colStyle('60px'), fontWeight: 600, fontSize: '11px', color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>P/L</div>
            <div style={{ ...colStyle('60px'), fontWeight: 600, fontSize: '11px', color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>P/VP</div>
            <div style={{ ...colStyle('60px'), fontWeight: 600, fontSize: '11px', color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>ROE%</div>
            <div style={{ flex: '1 1 auto', fontWeight: 600, fontSize: '11px', color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '0 8px' }}>Semáforos</div>
            <div style={{ ...colStyle('120px'), fontWeight: 600, fontSize: '11px', color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Última análise</div>
          </div>

          {/* Rows */}
          {filtered.map(item => {
            const isBlocked = item.result?.status === 'blocked';
            const isExpanded = expandedTicker === item.ticker;

            return (
              <div key={item.ticker} style={{ borderBottom: '1px solid var(--color-line-2)' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '10px 0',
                    cursor: isBlocked ? 'pointer' : 'default',
                    backgroundColor: isExpanded ? 'var(--color-bg)' : 'transparent',
                  }}
                  onClick={() => isBlocked && setExpandedTicker(isExpanded ? null : item.ticker)}
                >
                  <div style={colStyle('80px')}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '12px' }}>
                      {item.ticker}
                    </span>
                  </div>
                  <div style={colStyle('130px')}>
                    {item.archetype ? <ArchetypeChip archetype={item.archetype} /> : <span style={{ color: 'var(--color-text-3)', fontSize: '11px' }}>—</span>}
                  </div>
                  <div style={colStyle('100px')}>
                    {isBlocked ? (
                      <span style={{ fontSize: '11px', color: 'var(--color-warn)', display: 'flex', alignItems: 'center', gap: '4px' }}>
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
                  <div style={{ ...colStyle('60px'), textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                    {fmtNum(item.fundamentals?.pl)}
                  </div>
                  <div style={{ ...colStyle('60px'), textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                    {fmtNum(item.fundamentals?.pvp)}
                  </div>
                  <div style={{ ...colStyle('60px'), textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                    {fmtNum(item.fundamentals?.roe)}
                  </div>
                  <div style={{ flex: '1 1 auto', padding: '0 8px' }}>
                    {item.result && item.applicableRules.length > 0 ? (
                      <SemaphoreRow semaphores={item.result.semaphores} rules={item.applicableRules} />
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--color-text-3)' }}>—</span>
                    )}
                  </div>
                  <div style={{ ...colStyle('120px'), fontSize: '11px', color: 'var(--color-text-3)' }}>
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
