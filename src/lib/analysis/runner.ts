import { createServiceClient } from '@/lib/supabase/service';
import { createUntypedServiceClient } from '@/lib/supabase/untyped';
import { fetchFundamentus } from '@/lib/scraper/fundamentus';
import { fetchBrapi } from './brapi';
import { computeAnalysis } from './engine';
import type { Archetype, FundamentalsSnapshot, AnalysisRule } from './types';

export interface RunResult {
  analyzed: number;
  blocked: number;
  errors: string[];
}

export async function runStructuredAnalysis(): Promise<RunResult> {
  const supabase = createServiceClient();
  const db = createUntypedServiceClient();
  const errors: string[] = [];

  // Get completed import batches (typed table)
  const { data: batches } = await supabase
    .from('import_batches')
    .select('id, holder_id, institution, completed_at')
    .eq('status', 'completed')
    .order('completed_at', { ascending: false });

  const latestBatchKey = new Map<string, string>();
  for (const b of batches ?? []) {
    const hk = `${b.holder_id}:${b.institution}`;
    if (!latestBatchKey.has(hk)) latestBatchKey.set(hk, b.id);
  }
  const batchIds = [...latestBatchKey.values()];
  if (batchIds.length === 0) return { analyzed: 0, blocked: 0, errors: [] };

  // Get B3 equity positions (typed table)
  const { data: positions } = await supabase
    .from('positions')
    .select('ticker, asset_class')
    .in('batch_id', batchIds)
    .eq('asset_class', 'stocks_br')
    .not('ticker', 'is', null);

  const tickers = [...new Set((positions ?? []).map(p => p.ticker as string))];
  if (tickers.length === 0) return { analyzed: 0, blocked: 0, errors: [] };

  // Load rules from untyped tables
  const { data: rulesData } = await db
    .from('asset_analysis_rules')
    .select('*');
  const rules = (rulesData ?? []) as AnalysisRule[];

  let analyzed = 0;
  let blocked = 0;

  for (const ticker of tickers) {
    try {
      // Fetch archetype from untyped table
      const { data: archetypeRow } = await db
        .from('asset_archetypes')
        .select('archetype')
        .eq('ticker', ticker)
        .maybeSingle();

      const archetype = (archetypeRow as { archetype: string } | null)?.archetype as Archetype | undefined;
      if (!archetype) {
        errors.push(`${ticker}: arquétipo não classificado — pulando`);
        continue;
      }

      // Fetch fundamentals in parallel
      const [fundamentus, brapi] = await Promise.all([
        fetchFundamentus(ticker).catch(() => null),
        fetchBrapi(ticker).catch(() => null),
      ]);

      // Load existing manual overrides
      const { data: existingFund } = await db
        .from('asset_fundamentals')
        .select('manual_overrides')
        .eq('ticker', ticker)
        .order('fetched_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const manualOverrides = ((existingFund as { manual_overrides: Record<string, number | null> } | null)?.manual_overrides ?? {});

      // Build snapshot
      const snapshot: FundamentalsSnapshot = {
        ticker,
        fetched_at: new Date().toISOString(),
        pl: fundamentus?.pl ?? brapi?.pe ?? null,
        pvp: fundamentus?.pvp ?? brapi?.pb ?? null,
        dy: fundamentus?.dy ?? brapi?.dy ?? null,
        ev_ebitda: fundamentus?.evEbitda ?? null,
        marg_bruta: fundamentus?.margBruta ?? null,
        marg_ebit: fundamentus?.margEbit ?? null,
        marg_liquida: fundamentus?.margLiquida ?? null,
        roe: fundamentus?.roe ?? null,
        roa: fundamentus?.roa ?? null,
        roic: fundamentus?.roic ?? null,
        div_liq_ebitda: fundamentus?.divLiqEbitda ?? null,
        cresc_rec_5a: fundamentus?.crescRec5a ?? null,
        preco_atual: brapi?.price ?? null,
        volume_medio: brapi?.avgVolume ?? null,
        manual_overrides: manualOverrides,
      };

      // Store fundamentals snapshot
      await db.from('asset_fundamentals').insert({
        ticker,
        fetched_at: snapshot.fetched_at,
        pl: snapshot.pl,
        pvp: snapshot.pvp,
        dy: snapshot.dy,
        ev_ebitda: snapshot.ev_ebitda,
        marg_bruta: snapshot.marg_bruta,
        marg_ebit: snapshot.marg_ebit,
        marg_liquida: snapshot.marg_liquida,
        roe: snapshot.roe,
        roa: snapshot.roa,
        roic: snapshot.roic,
        div_liq_ebitda: snapshot.div_liq_ebitda,
        cresc_rec_5a: snapshot.cresc_rec_5a,
        preco_atual: snapshot.preco_atual,
        volume_medio: snapshot.volume_medio,
        manual_overrides: manualOverrides,
        raw_fundamentus: fundamentus ? { ...fundamentus } : null,
        raw_brapi: brapi ? { ...brapi } : null,
      });

      // Compute and store analysis result
      const result = computeAnalysis(snapshot, archetype, rules);

      await db.from('asset_analysis_results').insert({
        ticker: result.ticker,
        analyzed_at: result.analyzed_at,
        archetype: result.archetype,
        status: result.status,
        missing_metrics: result.missing_metrics,
        semaphores: result.semaphores,
        solvency_override: result.solvency_override,
        quality_score: result.quality_score,
        valuation: result.valuation,
        recommendation: result.recommendation,
        trend_downgrade: result.trend_downgrade,
        justifications: result.justifications,
      });

      if (result.status === 'blocked') blocked++;
      else analyzed++;
    } catch (e) {
      errors.push(`${ticker}: ${e instanceof Error ? e.message : 'erro desconhecido'}`);
    }
  }

  return { analyzed, blocked, errors };
}
