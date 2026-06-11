/**
 * Daemon de atualização de preços — roda na Amaia (GCP VM), 24/7.
 *
 * Chama /api/prices/refresh a cada INTERVAL_MS. O endpoint atualiza a tabela
 * positions no Supabase; o Supabase Realtime empurra as mudanças para o browser
 * automaticamente (sem polling do lado do cliente).
 *
 * Uso:
 *   pnpm tsx scripts/price-daemon.ts
 *
 * Variáveis de ambiente necessárias (.env.local ou ambiente da VM):
 *   NEXT_PUBLIC_APP_URL   — ex: https://invest.tazima.com.br
 *   AGENT_SECRET          — segredo compartilhado com o endpoint
 *
 * Para rodar como serviço systemd na Amaia, ver docs/runbooks/price-daemon.md
 */

import { config } from "dotenv";
config({ path: ".env.local" });

const INTERVAL_MS = 10_000;
const BASE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
const AGENT_SECRET = process.env.AGENT_SECRET ?? "";

if (!AGENT_SECRET) {
  console.error("AGENT_SECRET não definido — abortando.");
  process.exit(1);
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function tick(): Promise<void> {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/api/prices/refresh`, {
      method: "POST",
      headers: { "x-agent-secret": AGENT_SECRET },
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      console.error(`[${ts()}] HTTP ${res.status} ${res.statusText}`);
      return;
    }

    const data = (await res.json()) as {
      updated?: number;
      skipped?: number;
      fxRate?: number;
      errors?: string[];
    };

    const elapsed = Date.now() - start;
    console.log(
      `[${ts()}] updated=${data.updated ?? 0} skipped=${data.skipped ?? 0}` +
        ` fx=${data.fxRate?.toFixed(4) ?? "—"} (${elapsed}ms)`,
    );

    if (data.errors?.length) {
      console.warn(`[${ts()}] erros:`, data.errors);
    }
  } catch (err) {
    console.error(`[${ts()}] tick falhou:`, err instanceof Error ? err.message : err);
  }
}

function ts() {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

async function main() {
  console.log(`Price daemon iniciado — intervalo ${INTERVAL_MS / 1000}s → ${BASE_URL}`);

  while (true) {
    const start = Date.now();
    await tick();
    const elapsed = Date.now() - start;
    await sleep(Math.max(0, INTERVAL_MS - elapsed));
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
