import { createServerClient } from '@/lib/supabase/server';
import { createUntypedServerClient } from '@/lib/supabase/untyped';
import type { AnalysisResult, FundamentalsSnapshot, AnalysisRule, Archetype } from '@/lib/analysis/types';

export interface PositionSummary {
  holder_id: string;
  holder_name: string;
  institution: string;
  quantity: number;
  avg_price: number | null;
  current_price: number | null;
  market_value: number;
  pnl: number | null;
  pnl_pct: number | null;
}

export interface HolderInfo {
  id: string;
  name: string;
}

export interface AnalysisPageData {
  ticker: string;
  archetype: Archetype | null;
  result: AnalysisResult | null;
  fundamentals: FundamentalsSnapshot | null;
  applicableRules: AnalysisRule[];
  positions: PositionSummary[];
  totalMarketValue: number;
  totalQuantity: number;
}

export async function getEquityAnalyses(): Promise<{ items: AnalysisPageData[]; holders: HolderInfo[] }> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { items: [], holders: [] };

  const svc = supabase;
  const db = await createUntypedServerClient();

  // Fetch all completed batches (to know each batch's date)
  const { data: batches } = await svc
    .from('import_batches')
    .select('id, completed_at')
    .eq('status', 'completed');

  if (!batches?.length) return { items: [], holders: [] };

  const batchDateMap = new Map((batches).map(b => [b.id, b.completed_at as string]));
  const allBatchIds = batches.map(b => b.id);

  // Fetch ALL stocks_br positions from every completed batch, then keep
  // the most recent position per (ticker, holder_id) in JS.
  // This handles the case where a newer non-stock import exists for the
  // same holder+institution, which would otherwise shadow the stock positions.
  const { data: allPositions } = await svc
    .from('positions')
    .select('ticker, holder_id, institution, quantity, avg_price, current_price, market_value, pnl, pnl_pct, batch_id')
    .in('batch_id', allBatchIds)
    .eq('asset_class', 'stocks_br')
    .not('ticker', 'is', null);

  type RawPosWithBatch = {
    ticker: string | null;
    holder_id: string;
    institution: string;
    quantity: number;
    avg_price: number | null;
    current_price: number | null;
    market_value: number;
    pnl: number | null;
    pnl_pct: number | null;
    batch_id: string;
  };

  // Keep only the most recent position per (ticker, holder_id)
  const bestPos = new Map<string, RawPosWithBatch & { completed_at: string }>();
  for (const p of (allPositions ?? []) as RawPosWithBatch[]) {
    const key = `${p.ticker}:${p.holder_id}`;
    const date = batchDateMap.get(p.batch_id) ?? '';
    const existing = bestPos.get(key);
    if (!existing || date > existing.completed_at) {
      bestPos.set(key, { ...p, completed_at: date });
    }
  }

  const rawPositions = [...bestPos.values()];

  const tickers = [...new Set((rawPositions ?? []).map(p => p.ticker as string))];
  if (!tickers.length) return { items: [], holders: [] };

  const holderIds = [...new Set((rawPositions ?? []).map(p => p.holder_id))];
  const [holderRows, archetypes, results, fundamentals, rules] = await Promise.all([
    svc.from('holders').select('id, name').in('id', holderIds),
    db.from('asset_archetypes').select('*').in('ticker', tickers),
    db.from('asset_analysis_results').select('*').in('ticker', tickers).order('analyzed_at', { ascending: false }),
    db.from('asset_fundamentals').select('*').in('ticker', tickers).order('fetched_at', { ascending: false }),
    db.from('asset_analysis_rules').select('*'),
  ]);

  const holderNameMap = new Map(
    ((holderRows.data ?? []) as HolderInfo[]).map(h => [h.id, h.name]),
  );

  type ArchetypeRow = { ticker: string; archetype: string };
  const archetypeMap = new Map(
    ((archetypes.data ?? []) as ArchetypeRow[]).map(a => [a.ticker, a.archetype as Archetype]),
  );

  const resultMap = new Map<string, AnalysisResult>();
  for (const r of (results.data ?? []) as AnalysisResult[]) {
    if (!resultMap.has(r.ticker)) resultMap.set(r.ticker, r);
  }

  const fundMap = new Map<string, FundamentalsSnapshot>();
  for (const f of (fundamentals.data ?? []) as FundamentalsSnapshot[]) {
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
      pnl: p.pnl,
      pnl_pct: p.pnl_pct,
    });
  }

  const allHolders: HolderInfo[] = ((holderRows.data ?? []) as HolderInfo[]);

  const items = tickers.map(ticker => {
    const archetype = archetypeMap.get(ticker) ?? null;
    const result = resultMap.get(ticker) ?? null;
    const fund = fundMap.get(ticker) ?? null;
    const applicable = archetype
      ? allRules.filter(r => r.archetype === archetype || r.archetype === null)
      : [];
    const positions = positionsByTicker.get(ticker) ?? [];
    const totalMarketValue = positions.reduce((s, p) => s + p.market_value, 0);
    const totalQuantity = positions.reduce((s, p) => s + p.quantity, 0);
    return { ticker, archetype, result, fundamentals: fund, applicableRules: applicable, positions, totalMarketValue, totalQuantity };
  });

  return { items, holders: allHolders };
}

export async function saveManualData(ticker: string, overrides: Record<string, number | null>): Promise<void> {
  const db = await createUntypedServerClient();

  type FundRow = { id: string; manual_overrides: Record<string, number | null> };
  const { data: existing } = await db
    .from('asset_fundamentals')
    .select('id, manual_overrides')
    .eq('ticker', ticker)
    .order('fetched_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const row = existing as FundRow | null;
  const merged = { ...(row?.manual_overrides ?? {}), ...overrides };

  if (row?.id) {
    await db.from('asset_fundamentals').update({ manual_overrides: merged }).eq('id', row.id);
  } else {
    await db.from('asset_fundamentals').insert({
      ticker,
      manual_overrides: merged,
      fetched_at: new Date().toISOString(),
    });
  }
}
