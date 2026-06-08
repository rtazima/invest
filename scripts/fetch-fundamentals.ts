/**
 * Scraping de fundamentais para análise de ações B3.
 * Roda na Amaia (GCP VM) ou localmente — nunca no Vercel (Fundamentus bloqueia IPs de datacenter).
 * Grava direto no Supabase via service role key, sem passar pelo Next.js.
 *
 * Uso:
 *   pnpm tsx scripts/fetch-fundamentals.ts            # todos os tickers do portfólio
 *   pnpm tsx scripts/fetch-fundamentals.ts ITUB4 PETR4 # tickers específicos
 *
 * Variáveis de ambiente necessárias (.env.local ou ambiente da VM):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { fetchFundamentus } from "../src/lib/scraper/fundamentus";
import { fetchBrapi } from "../src/lib/analysis/brapi";
import { computeAnalysis } from "../src/lib/analysis/engine";
import type { Archetype, FundamentalsSnapshot, AnalysisRule } from "../src/lib/analysis/types";

const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausente");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

async function getTickers(filter?: string[]): Promise<string[]> {
  const { data: batches } = await db
    .from("import_batches")
    .select("id, completed_at")
    .eq("status", "completed");

  if (!batches?.length) return [];

  const batchDateMap = new Map(batches.map((b: { id: string; completed_at: string }) => [b.id, b.completed_at]));
  const allBatchIds = batches.map((b: { id: string }) => b.id);

  const { data: positions } = await db
    .from("positions")
    .select("ticker, holder_id, batch_id")
    .in("batch_id", allBatchIds)
    .eq("asset_class", "stocks_br")
    .not("ticker", "is", null);

  type RawPos = { ticker: string | null; holder_id: string; batch_id: string };
  const bestPos = new Map<string, RawPos & { completed_at: string }>();
  for (const p of (positions ?? []) as RawPos[]) {
    const key = `${p.ticker}:${p.holder_id}`;
    const date = batchDateMap.get(p.batch_id) ?? "";
    const existing = bestPos.get(key);
    if (!existing || date > existing.completed_at) {
      bestPos.set(key, { ...p, completed_at: date });
    }
  }

  let tickers = [...new Set([...bestPos.values()].map(p => p.ticker as string))];
  if (filter && filter.length > 0) tickers = tickers.filter(t => filter.includes(t));
  return tickers;
}

async function main() {
  const tickerFilter = process.argv.slice(2).map(t => t.toUpperCase());
  const tickers = await getTickers(tickerFilter.length ? tickerFilter : undefined);

  if (!tickers.length) {
    console.log("Nenhum ticker encontrado.");
    return;
  }

  console.log(`Analisando ${tickers.length} tickers: ${tickers.join(", ")}`);

  const { data: rulesData } = await db.from("asset_analysis_rules").select("*");
  const rules = (rulesData ?? []) as AnalysisRule[];

  let analyzed = 0, blocked = 0, errors = 0;

  for (const ticker of tickers) {
    try {
      process.stdout.write(`  ${ticker}... `);

      const { data: archetypeRow } = await db
        .from("asset_archetypes")
        .select("archetype")
        .eq("ticker", ticker)
        .maybeSingle();

      const archetype = (archetypeRow as { archetype: string } | null)?.archetype as Archetype | undefined;
      if (!archetype) {
        console.log("sem arquétipo — pulando");
        continue;
      }

      const [fundamentus, brapi] = await Promise.all([
        fetchFundamentus(ticker).catch(() => null),
        fetchBrapi(ticker).catch(() => null),
      ]);

      const { data: existingFund } = await db
        .from("asset_fundamentals")
        .select("manual_overrides")
        .eq("ticker", ticker)
        .order("fetched_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const manualOverrides = ((existingFund as { manual_overrides: Record<string, number | null> } | null)?.manual_overrides ?? {});

      const brapiDivLiqEbitda = brapi?.ebitda && brapi.ebitda !== 0 && brapi.divLiq != null
        ? brapi.divLiq / brapi.ebitda
        : null;
      const brapiEvEbitda = brapi?.ebitda && brapi.ebitda !== 0 && brapi.enterpriseValue != null
        ? brapi.enterpriseValue / brapi.ebitda
        : null;

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
        roa: fundamentus?.roa ?? brapi?.roa ?? null,
        roic: fundamentus?.roic ?? null,
        div_liq_ebitda: fundamentus?.divLiqEbitda ?? brapiDivLiqEbitda,
        cresc_rec_5a: fundamentus?.crescRec5a ?? brapi?.crescRec ?? null,
        preco_atual: brapi?.price ?? null,
        volume_medio: brapi?.avgVolume ?? null,
        manual_overrides: manualOverrides,
      };

      await db.from("asset_fundamentals").insert({
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

      const result = computeAnalysis(snapshot, archetype, rules);

      await db.from("asset_analysis_results").insert({
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

      if (result.status === "blocked") {
        blocked++;
        console.log(`bloqueado (falta: ${result.missing_metrics.join(", ")})`);
      } else {
        analyzed++;
        console.log(`ok → ${result.recommendation ?? "sem recomendação"} (qualidade: ${result.quality_score})`);
      }
    } catch (e) {
      errors++;
      console.log(`ERRO: ${e instanceof Error ? e.message : e}`);
    }
  }

  console.log(`\nConcluído: ${analyzed} analisados, ${blocked} bloqueados, ${errors} erros`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
