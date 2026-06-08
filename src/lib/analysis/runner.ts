import { createServiceClient } from '@/lib/supabase/service';
import { createUntypedServiceClient } from '@/lib/supabase/untyped';
import { fetchFundamentus } from '@/lib/scraper/fundamentus';
import { fetchBrapi } from './brapi';
import { computeAnalysis } from './engine';
import type { Archetype, FundamentalsSnapshot, AnalysisRule } from './types';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export interface RunResult {
  analyzed: number;
  blocked: number;
  errors: string[];
}

export async function runStructuredAnalysis(
  tickerFilter?: string[],
  clients?: { supabase: SupabaseClient<Database>; db: SupabaseClient },
): Promise<RunResult> {
  const supabase = clients?.supabase ?? createServiceClient();
  const db = clients?.db ?? createUntypedServiceClient();
  const errors: string[] = [];

  // Fetch all completed batches to build a date map
  const { data: batches } = await supabase
    .from('import_batches')
    .select('id, completed_at')
    .eq('status', 'completed');

  if (!batches?.length) return { analyzed: 0, blocked: 0, errors: [] };

  const batchDateMap = new Map(batches.map(b => [b.id, b.completed_at as string]));
  const allBatchIds = batches.map(b => b.id);

  // Fetch ALL stocks_br positions across every completed batch,
  // then deduplicate by most-recent per (ticker, holder_id) in JS.
  // This mirrors the logic in getEquityAnalyses() and handles the case where
  // a newer non-stock import shadows an older batch that contained stock positions.
  const { data: allPositions } = await supabase
    .from('positions')
    .select('ticker, holder_id, batch_id')
    .in('batch_id', allBatchIds)
    .eq('asset_class', 'stocks_br')
    .not('ticker', 'is', null);

  type RawPos = { ticker: string | null; holder_id: string; batch_id: string };
  const bestPos = new Map<string, RawPos & { completed_at: string }>();
  for (const p of (allPositions ?? []) as RawPos[]) {
    const key = `${p.ticker}:${p.holder_id}`;
    const date = batchDateMap.get(p.batch_id) ?? '';
    const existing = bestPos.get(key);
    if (!existing || date > existing.completed_at) {
      bestPos.set(key, { ...p, completed_at: date });
    }
  }

  let tickers = [...new Set([...bestPos.values()].map(p => p.ticker as string))];
  if (tickerFilter && tickerFilter.length > 0) {
    tickers = tickers.filter(t => tickerFilter.includes(t));
  }
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

      // Derived metrics from Fundamentus raw values
      const fundEbitda = fundamentus?.valorFirma && fundamentus.evEbitda && fundamentus.evEbitda !== 0
        ? fundamentus.valorFirma / fundamentus.evEbitda
        : null;
      const fundDivLiqEbitda = fundEbitda && fundEbitda !== 0 && fundamentus?.divLiquida != null
        ? fundamentus.divLiquida / fundEbitda
        : null;
      const fundRoa = fundamentus?.lucroLiquido != null && fundamentus.ativo && fundamentus.ativo !== 0
        ? (fundamentus.lucroLiquido / fundamentus.ativo) * 100
        : null;

      // Derived metrics from BRAPI when Fundamentus is unavailable
      const brapiDivLiqEbitda = brapi?.ebitda && brapi.ebitda !== 0 && brapi.divLiq != null
        ? brapi.divLiq / brapi.ebitda
        : null;
      const brapiEvEbitda = brapi?.ebitda && brapi.ebitda !== 0 && brapi.enterpriseValue != null
        ? brapi.enterpriseValue / brapi.ebitda
        : null;

      // Build snapshot — Fundamentus is primary source, BRAPI fills the gaps
      const snapshot: FundamentalsSnapshot = {
        ticker,
        fetched_at: new Date().toISOString(),
        pl: fundamentus?.pl ?? brapi?.pe ?? null,
        pvp: fundamentus?.pvp ?? brapi?.pb ?? null,
        dy: fundamentus?.dy ?? brapi?.dy ?? null,
        ev_ebitda: fundamentus?.evEbitda ?? brapiEvEbitda,
        marg_bruta: fundamentus?.margBruta ?? brapi?.margBruta ?? null,
        marg_ebit: fundamentus?.margEbit ?? brapi?.margEbit ?? null,
        marg_liquida: fundamentus?.margLiquida ?? brapi?.margLiquida ?? null,
        roe: fundamentus?.roe ?? brapi?.roe ?? null,
        roa: fundRoa ?? brapi?.roa ?? null,
        roic: fundamentus?.roic ?? null,
        div_liq_ebitda: fundDivLiqEbitda ?? brapiDivLiqEbitda,
        cresc_rec_5a: fundamentus?.crescRec5a ?? brapi?.crescRec ?? null,
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
