import { createServerClient } from '@/lib/supabase/server';
import { createUntypedServerClient } from '@/lib/supabase/untyped';
import type { AnalysisResult, FundamentalsSnapshot, AnalysisRule, Archetype } from '@/lib/analysis/types';

export interface AnalysisPageData {
  ticker: string;
  archetype: Archetype | null;
  result: AnalysisResult | null;
  fundamentals: FundamentalsSnapshot | null;
  applicableRules: AnalysisRule[];
}

export async function getEquityAnalyses(): Promise<AnalysisPageData[]> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const svc = supabase; // use server client (user auth) for typed tables
  const db = await createUntypedServerClient();

  // Get latest completed batches per holder+institution
  const { data: batches } = await svc
    .from('import_batches')
    .select('id, holder_id, institution, completed_at')
    .eq('status', 'completed')
    .order('completed_at', { ascending: false });

  const latestBatch = new Map<string, string>();
  for (const b of batches ?? []) {
    const hk = `${b.holder_id}:${b.institution}`;
    if (!latestBatch.has(hk)) latestBatch.set(hk, b.id);
  }
  const batchIds = [...latestBatch.values()];
  if (!batchIds.length) return [];

  // Get B3 equity tickers from portfolio
  const { data: positions } = await svc
    .from('positions')
    .select('ticker')
    .in('batch_id', batchIds)
    .eq('asset_class', 'stocks_br')
    .not('ticker', 'is', null);

  const tickers = [...new Set((positions ?? []).map(p => p.ticker as string))];
  if (!tickers.length) return [];

  // Load analysis data from untyped tables in parallel
  const [archetypes, results, fundamentals, rules] = await Promise.all([
    db.from('asset_archetypes').select('*').in('ticker', tickers),
    db.from('asset_analysis_results').select('*').in('ticker', tickers).order('analyzed_at', { ascending: false }),
    db.from('asset_fundamentals').select('*').in('ticker', tickers).order('fetched_at', { ascending: false }),
    db.from('asset_analysis_rules').select('*'),
  ]);

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

  return tickers.map(ticker => {
    const archetype = archetypeMap.get(ticker) ?? null;
    const result = resultMap.get(ticker) ?? null;
    const fund = fundMap.get(ticker) ?? null;
    const applicable = archetype
      ? allRules.filter(r => r.archetype === archetype || r.archetype === null)
      : [];
    return { ticker, archetype, result, fundamentals: fund, applicableRules: applicable };
  });
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
