// Dispara o agente de cenário macro localmente, sem passar pela rota HTTP.
// Requer no .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// ANTHROPIC_API_KEY e (opcional) FRED_API_KEY.
//
//   pnpm tsx scripts/run-macro-scenario.ts          # respeita idempotência semanal
//   pnpm tsx scripts/run-macro-scenario.ts --force  # gera mesmo se já existir
import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const force = process.argv.includes("--force");
  // import dinâmico: macro.ts instancia o cliente Anthropic no load, então a env
  // precisa estar carregada antes.
  const { runMacroScenario } = await import("../src/lib/scenario/macro");
  const result = await runMacroScenario(force);
  console.log(JSON.stringify(result, null, 2));
  if (result.status === "failed") process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
