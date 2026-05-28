#!/usr/bin/env tsx
/**
 * Script de deploy + regressão visual.
 * Uso: pnpm deploy
 *
 * Variáveis necessárias em .env.local:
 *   E2E_BASE_URL          — URL de produção estável (ex: https://project-cfwnl.vercel.app)
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

// Carrega .env.local manualmente (Next.js não carrega automaticamente fora do servidor)
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
  console.log("🚀 Deployando para Vercel...");
  const result = spawnSync("npx", ["vercel", "--prod", "--yes"], {
    encoding: "utf8",
    stdio: ["inherit", "pipe", "pipe"],
  });

  const output = (result.stdout ?? "") + (result.stderr ?? "");
  console.log(output);

  if (result.status !== 0) {
    throw new Error(`vercel --prod falhou (exit ${result.status})`);
  }

  // Pega a URL do alias de produção (linha "Aliased")
  const aliasMatch = output.match(/Aliased\s+(https?:\/\/\S+)/);
  if (aliasMatch?.[1]) return aliasMatch[1];

  // Fallback: pega a URL de produção direta
  const prodMatch = output.match(/Production\s+(https?:\/\/\S+)/);
  if (prodMatch?.[1]) return prodMatch[1];

  // Fallback final: usa E2E_BASE_URL
  return process.env["E2E_BASE_URL"] ?? "https://project-cfwnl.vercel.app";
}

interface TestResult {
  passed: number;
  failed: number;
  failedTests: string[];
}

function runTests(baseUrl: string): TestResult {
  console.log(`\n🧪 Executando regressão visual em ${baseUrl}...\n`);

  const result = spawnSync(
    "pnpm",
    ["exec", "playwright", "test", "e2e/visual/", "--reporter=json"],
    {
      encoding: "utf8",
      stdio: ["inherit", "pipe", "pipe"],
      env: { ...process.env, E2E_BASE_URL: baseUrl },
    },
  );

  console.log(result.stdout);
  if (result.stderr) console.error(result.stderr);

  // Tenta parsear o JSON do reporter
  let passed = 0;
  let failed = 0;
  const failedTests: string[] = [];

  try {
    // O reporter json do Playwright gera saída JSON no stdout
    const jsonStart = result.stdout.indexOf("{");
    if (jsonStart >= 0) {
      const report = JSON.parse(result.stdout.slice(jsonStart)) as {
        suites?: Array<{
          specs?: Array<{ ok: boolean; title: string }>;
        }>;
      };
      for (const suite of report.suites ?? []) {
        for (const spec of suite.specs ?? []) {
          if (spec.ok) passed++;
          else {
            failed++;
            failedTests.push(spec.title);
          }
        }
      }
    }
  } catch {
    // Se não conseguir parsear, usa exit code
    if (result.status === 0) {
      passed = 5; // número de testes esperados
    } else {
      failed = 1;
      failedTests.push("(não foi possível parsear detalhes)");
    }
  }

  return { passed, failed, failedTests };
}

async function main() {
  const commitMsg = getCommitMsg();
  let deployUrl: string;

  try {
    deployUrl = deploy();
    console.log(`\n✅ Deploy concluído: ${deployUrl}`);
  } catch (error) {
    await notifyWhatsApp({
      status: "deploy_failed",
      commitMsg,
      error: String(error),
    });
    process.exit(1);
  }

  const { passed, failed, failedTests } = runTests(deployUrl);

  await notifyWhatsApp({
    status: failed > 0 ? "failed" : "passed",
    deployUrl,
    commitMsg,
    passed,
    failed,
    failedTests,
  });

  console.log(`\n${failed > 0 ? "❌" : "✅"} ${passed} passando, ${failed} falhando`);
  if (failed > 0) {
    console.log("Testes que falharam:");
    failedTests.forEach((t) => console.log(`  • ${t}`));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
