import { createServerClient } from '@/lib/supabase/server';
import { createUntypedServerClient } from '@/lib/supabase/untyped';
import type { AnalysisRule } from '@/lib/analysis/types';
import type { FiiType, FiiSubsegment, FiiAnalysisResult, FiiFundamentalsSnapshot, FiiPageData, FiiArchetype } from '@/lib/analysis/fii-types';
import type { PositionSummary, HolderInfo } from './analysis';

export async function getFiiAnalyses(): Promise<{ items: FiiPageData[]; holders: HolderInfo[] }> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { items: [], holders: [] };

  const db = await createUntypedServerClient();

  const { data: batches } = await supabase
    .from('import_batches')
    .select('id, completed_at')
    .eq('status', 'completed');

  if (!batches?.length) return { items: [], holders: [] };

  const batchDateMap = new Map(batches.map(b => [b.id, b.completed_at as string]));
  const allBatchIds = batches.map(b => b.id);

  const { data: allPositions } = await supabase
    .from('positions')
    .select('ticker, holder_id, institution, quantity, avg_price, current_price, market_value, cost_basis, pnl, pnl_pct, batch_id')
    .in('batch_id', allBatchIds)
    .eq('asset_class', 'fiis')
    .not('ticker', 'is', null);

  type RawPos = {
    ticker: string | null; holder_id: string; institution: string;
    quantity: number; avg_price: number | null; current_price: number | null;
    market_value: number; cost_basis: number | null; pnl: number | null;
    pnl_pct: number | null; batch_id: string;
  };

  const bestPos = new Map<string, RawPos & { completed_at: string }>();
  for (const p of (allPositions ?? []) as RawPos[]) {
    const key = `${p.ticker}:${p.holder_id}`;
    const date = batchDateMap.get(p.batch_id) ?? '';
    const existing = bestPos.get(key);
    if (!existing || date > existing.completed_at) bestPos.set(key, { ...p, completed_at: date });
  }

  const rawPositions = [...bestPos.values()];
  const tickers = [...new Set(rawPositions.map(p => p.ticker as string))];
  if (!tickers.length) return { items: [], holders: [] };

  const holderIds = [...new Set(rawPositions.map(p => p.holder_id))];
  const [holderRows, archetypes, results, fundamentals, rules] = await Promise.all([
    supabase.from('holders').select('id, name').in('id', holderIds),
    db.from('asset_archetypes').select('*').in('ticker', tickers).eq('asset_class', 'fiis'),
    db.from('fii_analysis_results').select('*').in('ticker', tickers).order('analyzed_at', { ascending: false }),
    db.from('fii_fundamentals').select('*').in('ticker', tickers).order('fetched_at', { ascending: false }),
    db.from('asset_analysis_rules').select('*').eq('asset_class', 'fiis'),
  ]);

  const holderNameMap = new Map(((holderRows.data ?? []) as HolderInfo[]).map(h => [h.id, h.name]));
  const archetypeMap = new Map(((archetypes.data ?? []) as FiiArchetype[]).map(a => [a.ticker, a]));

  const resultMap = new Map<string, FiiAnalysisResult>();
  for (const r of (results.data ?? []) as FiiAnalysisResult[]) {
    if (!resultMap.has(r.ticker)) resultMap.set(r.ticker, r);
  }

  const fundMap = new Map<string, FiiFundamentalsSnapshot>();
  for (const f of (fundamentals.data ?? []) as FiiFundamentalsSnapshot[]) {
    if (!fundMap.has(f.ticker)) fundMap.set(f.ticker, f);
  }

  const allRules = (rules.data ?? []) as AnalysisRule[];

  const positionsByTicker = new Map<string, PositionSummary[]>();
  for (const p of rawPositions) {
    const t = p.ticker as string;
    if (!positionsByTicker.has(t)) positionsByTicker.set(t, []);
    positionsByTicker.get(t)!.push({
      holder_id: p.holder_id,
      holder_name: holderNameMap.get(p.holder_id) ?? p.holder_id,
      institution: p.institution,
      quantity: p.quantity,
      avg_price: p.avg_price,
      current_price: p.current_price,
      market_value: p.market_value,
      cost_basis: p.cost_basis,
      pnl: p.pnl,
      pnl_pct: p.pnl_pct,
    });
  }

  const items = tickers.map(ticker => {
    const arch = archetypeMap.get(ticker) ?? null;
    const fiiType = arch?.archetype ?? null;
    const subsegment = (arch?.subsegment ?? null) as FiiSubsegment | null;
    const result = resultMap.get(ticker) ?? null;
    const fund = fundMap.get(ticker) ?? null;
    const applicable = fiiType
      ? allRules.filter(r => r.archetype === fiiType || r.archetype === null)
      : [];
    const positions = positionsByTicker.get(ticker) ?? [];
    return {
      ticker, fiiType, subsegment, result, fundamentals: fund,
      applicableRules: applicable, positions,
      totalMarketValue: positions.reduce((s, p) => s + p.market_value, 0),
      totalQuantity: positions.reduce((s, p) => s + p.quantity, 0),
    };
  });

  return { items, holders: (holderRows.data ?? []) as HolderInfo[] };
}

export async function saveFiiManualData(
  ticker: string,
  overrides: Record<string, number | null>,
): Promise<void> {
  const db = await createUntypedServerClient();
  type FundRow = { id: string; manual_overrides: Record<string, number | null> };
  const { data: existing } = await db
    .from('fii_fundamentals')
    .select('id, manual_overrides')
    .eq('ticker', ticker)
    .order('fetched_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const row = existing as FundRow | null;
  const merged = { ...(row?.manual_overrides ?? {}), ...overrides };

  if (row?.id) {
    await db.from('fii_fundamentals').update({ manual_overrides: merged }).eq('id', row.id);
  } else {
    await db.from('fii_fundamentals').insert({ ticker, manual_overrides: merged, fetched_at: new Date().toISOString() });
  }
}

export async function saveFiiArchetype(
  ticker: string,
  fiiType: FiiType,
  subsegment: FiiSubsegment | null,
): Promise<void> {
  const db = await createUntypedServerClient();
  await db.from('asset_archetypes').upsert(
    { ticker, archetype: fiiType, subsegment, asset_class: 'fiis' },
    { onConflict: 'ticker' },
  );
}
