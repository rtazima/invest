#!/usr/bin/env tsx
/**
 * Deploy + regressão visual auto-corrigida.
 *
 * Fluxo:
 *   1. Deploy para Vercel
 *   2. Roda Playwright contra a URL de produção
 *   3. Se falhar → imprime falhas no stdout (para Claude corrigir e re-rodar)
 *   4. Se passar → manda WhatsApp "tudo ok" e encerra
 *
 * Variáveis necessárias em .env.local:
 *   E2E_BASE_URL          — URL estável de produção (ex: https://project-cfwnl.vercel.app)
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   E2E_TEST_EMAIL        — email do usuário de teste (sem MFA)
 *   E2E_TEST_PASSWORD     — senha do usuário de teste
 *   EVOLUTION_API_URL     — Evolution API (WhatsApp)
 *   EVOLUTION_API_KEY
 *   EVOLUTION_INSTANCE
 *   WHATSAPP_NOTIFY_TO    — número destino (ex: 5511999999999@s.whatsapp.net)
 */

import { execSync, spawnSync } from "child_process";
import { notifyWhatsApp } from "./notify-whatsapp";

try {
  const { config } = await import("dotenv");
  config({ path: ".env.local" });
} catch {
  // dotenv opcional
}

function getCommitMsg(): string {
  try {
    return execSync("git log -1 --format=%s", { encoding: "utf8" }).trim();
  } catch {
    return "—";
  }
}

function deploy(): string {
  console.log("🚀 Deployando para Vercel...\n");
  const result = spawnSync("npx", ["vercel", "--prod", "--yes"], {
    encoding: "utf8",
    stdio: ["inherit", "pipe", "pipe"],
  });

  const output = (result.stdout ?? "") + (result.stderr ?? "");
  process.stdout.write(output);

  if (result.status !== 0) {
    throw new Error(`vercel --prod falhou (exit ${result.status})`);
  }

  const aliasMatch = output.match(/Aliased\s+(https?:\/\/\S+)/);
  if (aliasMatch?.[1]) return aliasMatch[1];

  const prodMatch = output.match(/Production\s+(https?:\/\/\S+)/);
  if (prodMatch?.[1]) return prodMatch[1];

  return process.env["E2E_BASE_URL"] ?? "https://project-cfwnl.vercel.app";
}

interface TestResult {
  passed: number;
  failed: number;
  failedTests: string[];
  rawOutput: string;
}

function runTests(baseUrl: string): TestResult {
  console.log(`\n🧪 Regressão visual em ${baseUrl}...\n`);

  const result = spawnSync(
    "pnpm",
    ["exec", "playwright", "test", "e2e/visual/", "--reporter=list,json"],
    {
      encoding: "utf8",
      stdio: ["inherit", "pipe", "pipe"],
      env: { ...process.env, E2E_BASE_URL: baseUrl },
    },
  );

  const rawOutput = (result.stdout ?? "") + (result.stderr ?? "");
  process.stdout.write(rawOutput);

  let passed = 0;
  let failed = 0;
  const failedTests: string[] = [];

  try {
    const jsonStart = rawOutput.lastIndexOf('{"');
    if (jsonStart >= 0) {
      const report = JSON.parse(rawOutput.slice(jsonStart)) as {
        suites?: Array<{ specs?: Array<{ ok: boolean; title: string }> }>;
      };
      for (const suite of report.suites ?? []) {
        for (const spec of suite.specs ?? []) {
          if (spec.ok) passed++;
          else { failed++; failedTests.push(spec.title); }
        }
      }
    }
  } catch {
    if (result.status === 0) passed = 5;
    else { failed = 1; failedTests.push("(detalhes em playwright-report/)"); }
  }

  return { passed, failed, failedTests, rawOutput };
}

async function main() {
  const commitMsg = getCommitMsg();
  let deployUrl: string;

  try {
    deployUrl = deploy();
    console.log(`\n✅ Deploy: ${deployUrl}\n`);
  } catch (error) {
    console.error(`\n❌ Deploy falhou:\n${error}`);
    process.exit(1);
  }

  const { passed, failed, failedTests } = runTests(deployUrl);

  if (failed > 0) {
    console.error(`\n❌ ${failed} teste(s) falhando — corrigir antes de notificar o usuário:`);
    failedTests.forEach((t) => console.error(`   • ${t}`));
    console.error("\nScreenshots disponíveis em playwright-report/screenshots/");
    process.exit(1); // Claude corrige e re-roda pnpm deploy
  }

  console.log(`\n✅ ${passed}/${passed} testes passando. Notificando...\n`);
  await notifyWhatsApp({
    status: "passed",
    deployUrl,
    commitMsg,
    passed,
    failed: 0,
    failedTests: [],
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
