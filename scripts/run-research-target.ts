// Dispara o cruzamento preço-alvo do research × carteira (fase 3) localmente.
// Requer no .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
//   pnpm tsx scripts/run-research-target.ts
import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const { runResearchTargetCheck } = await import("../src/lib/alerts/research-target");
  const result = await runResearchTargetCheck();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
