import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createUntypedServerClient } from '@/lib/supabase/untyped';
import { computeFiiAnalysis } from '@/lib/analysis/fii-engine';
import type { AnalysisRule } from '@/lib/analysis/types';
import type { FiiType, FiiSubsegment, FiiFundamentalsSnapshot, FiiArchetype } from '@/lib/analysis/fii-types';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = await createUntypedServerClient();

  let tickers: string[] | undefined;
  try {
    const body = await req.json() as { tickers?: string[] };
    if (Array.isArray(body.tickers) && body.tickers.length > 0) tickers = body.tickers;
  } catch { /* no body */ }

  // Fetch all FII tickers from positions
  const { data: batches } = await supabase
    .from('import_batches').select('id, completed_at').eq('status', 'completed');

  if (!batches?.length) return NextResponse.json({ analyzed: 0, blocked: 0, errors: [] });

  const batchDateMap = new Map(batches.map(b => [b.id, b.completed_at as string]));
  const allBatchIds = batches.map(b => b.id);

  const { data: allPositions } = await supabase
    .from('positions').select('ticker, holder_id, batch_id')
    .in('batch_id', allBatchIds).eq('asset_class', 'fiis').not('ticker', 'is', null);

  type RawPos = { ticker: string | null; holder_id: string; batch_id: string };
  const bestPos = new Map<string, RawPos & { completed_at: string }>();
  for (const p of (allPositions ?? []) as RawPos[]) {
    const key = `${p.ticker}:${p.holder_id}`;
    const date = batchDateMap.get(p.batch_id) ?? '';
    const existing = bestPos.get(key);
    if (!existing || date > existing.completed_at) bestPos.set(key, { ...p, completed_at: date });
  }

  let portfolioTickers = [...new Set([...bestPos.values()].map(p => p.ticker as string))];
  if (tickers?.length) portfolioTickers = portfolioTickers.filter(t => tickers!.includes(t));
  if (!portfolioTickers.length) return NextResponse.json({ analyzed: 0, blocked: 0, errors: [] });

  const [rulesData, archetypesData, fundamentalsData] = await Promise.all([
    db.from('asset_analysis_rules').select('*').eq('asset_class', 'fiis'),
    db.from('fii_archetypes').select('*').in('ticker', portfolioTickers),
    db.from('fii_fundamentals').select('*').in('ticker', portfolioTickers).order('fetched_at', { ascending: false }),
  ]);

  const rules = (rulesData.data ?? []) as AnalysisRule[];
  const archetypeMap = new Map(((archetypesData.data ?? []) as FiiArchetype[]).map(a => [a.ticker, a]));

  const fundMap = new Map<string, FiiFundamentalsSnapshot>();
  for (const f of (fundamentalsData.data ?? []) as FiiFundamentalsSnapshot[]) {
    if (!fundMap.has(f.ticker)) fundMap.set(f.ticker, f);
  }

  let analyzed = 0, blocked = 0;
  const errors: string[] = [];

  for (const ticker of portfolioTickers) {
    try {
      const arch = archetypeMap.get(ticker);
      if (!arch) { errors.push(`${ticker}: tipo não classificado`); continue; }

      const fund = fundMap.get(ticker);
      if (!fund) { errors.push(`${ticker}: sem fundamentais — preencha os dados`); continue; }

      // Compute dy_spread if we have dy_12m and taxa_ntnb
      const taxa_ntnb = fund.taxa_ntnb ?? (fund.manual_overrides?.['taxa_ntnb'] as number | null) ?? null;
      const dy_12m = fund.dy_12m;
      const snap: FiiFundamentalsSnapshot = {
        ...fund,
        dy_spread: dy_12m != null && taxa_ntnb != null ? dy_12m - taxa_ntnb : fund.dy_spread,
        taxa_ntnb,
        manual_overrides: fund.manual_overrides ?? {},
      };

      const result = computeFiiAnalysis(snap, arch.fii_type as FiiType, arch.subsegment as FiiSubsegment | null, rules);

      await db.from('fii_analysis_results').insert({
        ticker: result.ticker,
        analyzed_at: result.analyzed_at,
        fii_type: result.fii_type,
        subsegment: result.subsegment,
        status: result.status,
        missing_metrics: result.missing_metrics,
        semaphores: result.semaphores,
        sustainability_override: result.sustainability_override,
        quality_score: result.quality_score,
        valuation: result.valuation,
        recommendation: result.recommendation,
        trend_downgrade: result.trend_downgrade,
        justifications: result.justifications,
      });

      if (result.status === 'blocked') blocked++;
      else analyzed++;
    } catch (e) {
      errors.push(`${ticker}: ${e instanceof Error ? e.message : 'erro'}`);
    }
  }

  return NextResponse.json({ analyzed, blocked, errors });
}
