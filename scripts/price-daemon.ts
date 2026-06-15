/**
 * Daemon de atualização de preços — roda na Amaia (GCP VM), 24/7.
 *
 * - Chama /api/prices/refresh a cada PRICE_INTERVAL (10s)
 * - Chama /api/portfolio/intraday-snapshot a cada INTRADAY_INTERVAL (15min)
 *   para popular o gráfico intraday do dashboard.
 *
 * Uso:
 *   pnpm tsx scripts/price-daemon.ts
 *
 * Variáveis de ambiente (.env.local ou ambiente da VM):
 *   NEXT_PUBLIC_APP_URL   — ex: https://invest.tazima.com.br
 *   AGENT_SECRET          — segredo compartilhado com os endpoints
 */

import { config } from "dotenv";
config({ path: ".env.local" });

const PRICE_INTERVAL = 10_000;
const INTRADAY_INTERVAL = 15 * 60 * 1000;

const BASE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
const AGENT_SECRET = process.env.AGENT_SECRET ?? "";

if (!AGENT_SECRET) {
  console.error("AGENT_SECRET não definido — abortando.");
  process.exit(1);
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function ts() {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

async function post(path: string, label: string): Promise<unknown> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "x-agent-secret": AGENT_SECRET },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    console.error(`[${ts()}] ${label} HTTP ${res.status} ${res.statusText}`);
    return null;
  }
  return res.json();
}

async function tickPrices(): Promise<void> {
  const start = Date.now();
  try {
    const data = (await post("/api/prices/refresh", "prices")) as {
      updated?: number;
      skipped?: number;
      fxRate?: number;
      errors?: string[];
    } | null;

    if (!data) return;

    const elapsed = Date.now() - start;
    console.log(
      `[${ts()}] updated=${data.updated ?? 0} skipped=${data.skipped ?? 0}` +
        ` fx=${data.fxRate?.toFixed(4) ?? "—"} (${elapsed}ms)`,
    );

    if (data.errors?.length) {
      console.warn(`[${ts()}] erros:`, data.errors);
    }
  } catch (err) {
    console.error(`[${ts()}] prices falhou:`, err instanceof Error ? err.message : err);
  }
}

async function tickIntraday(): Promise<void> {
  try {
    const data = (await post("/api/portfolio/intraday-snapshot", "intraday")) as {
      stored?: boolean;
      skipped?: boolean;
      totalBrl?: number;
    } | null;

    if (!data) return;

    if (data.skipped) {
      console.log(`[${ts()}] intraday skipped (< 14min desde último)`);
    } else if (data.stored) {
      console.log(
        `[${ts()}] intraday snapshot: R$ ${(data.totalBrl ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      );
    }
  } catch (err) {
    console.error(`[${ts()}] intraday falhou:`, err instanceof Error ? err.message : err);
  }
}

async function main() {
  console.log(`Price daemon iniciado — prices ${PRICE_INTERVAL / 1000}s · intraday ${INTRADAY_INTERVAL / 60000}min → ${BASE_URL}`);

  let lastIntraday = 0;

  while (true) {
    const start = Date.now();

    await tickPrices();

    if (Date.now() - lastIntraday >= INTRADAY_INTERVAL) {
      await tickIntraday();
      lastIntraday = Date.now();
    }

    const elapsed = Date.now() - start;
    await sleep(Math.max(0, PRICE_INTERVAL - elapsed));
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
