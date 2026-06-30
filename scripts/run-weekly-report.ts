// Dispara o relatório semanal (fase 4) localmente.
//   pnpm tsx scripts/run-weekly-report.ts          # respeita idempotência semanal
//   pnpm tsx scripts/run-weekly-report.ts --force  # gera mesmo se já existir
import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const force = process.argv.includes("--force");
  const { runWeeklyReport } = await import("../src/lib/reports/weekly");
  console.log(JSON.stringify(await runWeeklyReport(force), null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
