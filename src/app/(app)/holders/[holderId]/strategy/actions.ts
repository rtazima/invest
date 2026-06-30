"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import {
  upsertStrategy,
  upsertAllocations,
  getStrategy,
  recordStrategyVersion,
  updatePolicyLimits,
  getStrategyVersions,
} from "@/lib/data/strategies";
import { getHolder } from "@/lib/data/holders";
import { getLatestScenario } from "@/lib/scenario/data";
import { validateProposedAllocations } from "@/lib/policy/validate";
import type { Enums } from "@/types/database";

interface StrategyFormData {
  risk_profile: Enums<"risk_profile">;
  investment_horizon_years: number | null;
  goal_description: string | null;
  goal_monthly_income: number | null;
  goal_target_age: number | null;
  liquidity_min_pct: number;
  deviation_threshold_pct: number;
  max_loss_pct: number | null;
  max_single_asset_pct: number | null;
  restricted_assets: string[] | null;
  notes: string | null;
}

export async function saveStrategyAction(holderId: string, data: StrategyFormData) {
  await upsertStrategy(holderId, {
    risk_profile: data.risk_profile,
    investment_horizon_years: data.investment_horizon_years,
    goal_description: data.goal_description,
    goal_monthly_income: data.goal_monthly_income,
    goal_target_age: data.goal_target_age,
    liquidity_min_pct: data.liquidity_min_pct,
    deviation_threshold_pct: data.deviation_threshold_pct,
    restricted_assets: data.restricted_assets,
    notes: data.notes,
  });
  await updatePolicyLimits(holderId, data.max_loss_pct, data.max_single_asset_pct);
  await recordStrategyVersion(holderId);
  revalidatePath(`/holders/${holderId}/strategy`);
  revalidatePath("/holders");
}

export interface AllocationSuggestion {
  allocations: Array<{ asset_class: string; target_pct: number; tolerance_pct: number }>;
  reasoning: string;
}

interface SuggestInput {
  risk_profile: string;
  investment_horizon_years: number | null;
  goal_description: string | null;
  goal_monthly_income: number | null;
  goal_target_age: number | null;
  liquidity_min_pct: number;
  notes: string | null;
}

const ASSET_CLASS_NAMES: Record<string, string> = {
  fixed_income: "Renda Fixa",
  stocks_br: "Ações Brasileiras",
  stocks_intl: "Ações Internacionais",
  fiis: "Fundos Imobiliários (FIIs)",
  etf_br: "ETF Brasileiro",
  etf_intl: "ETF Internacional",
  funds: "Fundos de Investimento",
  liquidity: "Liquidez / Caixa",
};

const PROFILE_LABELS: Record<string, string> = {
  conservative: "Conservador",
  moderate: "Moderado",
  aggressive: "Arrojado",
};

export async function suggestAllocationsAction(
  holderId: string,
  input: SuggestInput,
): Promise<AllocationSuggestion> {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada.");

  const holder = await getHolder(holderId);
  const holderName = holder?.name ?? "Investidor";

  const contextLines = [
    `Titular: ${holderName}`,
    `Perfil de risco: ${PROFILE_LABELS[input.risk_profile] ?? input.risk_profile}`,
    input.investment_horizon_years
      ? `Horizonte: ${input.investment_horizon_years} anos`
      : null,
    input.goal_description ? `Objetivo: ${input.goal_description}` : null,
    input.goal_monthly_income
      ? `Meta de renda passiva: R$ ${input.goal_monthly_income.toLocaleString("pt-BR")}/mês`
      : null,
    input.goal_target_age
      ? `Idade-alvo: ${input.goal_target_age} anos`
      : null,
    `Liquidez mínima obrigatória: ${(input.liquidity_min_pct * 100).toFixed(0)}%`,
    input.notes ? `Observações: ${input.notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const classesList = Object.entries(ASSET_CLASS_NAMES)
    .map(([v, l]) => `- ${v}: ${l}`)
    .join("\n");

  const scenario = await getLatestScenario();
  const scenarioBlock =
    scenario && scenario.freshness !== "unavailable"
      ? `\n\nCENÁRIO MACRO ATUAL (use para calibrar a alocação tática dentro do perfil, sem fugir dele):\n${scenario.summary}\nImplicações no cenário base — pré: ${scenario.base.by_class.fixed_income_pre} IPCA+: ${scenario.base.by_class.fixed_income_ipca} pós: ${scenario.base.by_class.fixed_income_pos} FIIs: ${scenario.base.by_class.fiis} bolsa BR: ${scenario.base.by_class.stocks_br} bolsa intl: ${scenario.base.by_class.stocks_intl} dólar: ${scenario.base.by_class.usd}`
      : "";

  const prompt = `Você é um consultor de investimentos brasileiro especializado em gestão de patrimônio familiar.

Dados do investidor:
${contextLines}${scenarioBlock}

Sugira uma alocação estratégica de longo prazo coerente com o perfil e com o cenário macro acima. Use apenas as classes listadas. Os target_pct devem somar exatamente 100. Respeite a liquidez mínima de ${(input.liquidity_min_pct * 100).toFixed(0)}%.

Classes disponíveis:
${classesList}

Responda APENAS com JSON válido, sem texto adicional:
{
  "allocations": [
    { "asset_class": "fixed_income", "target_pct": 30, "tolerance_pct": 5 },
    ...
  ],
  "reasoning": "Explicação em 2-3 frases."
}

Regras: inclua só classes relevantes para o perfil; tolerance_pct entre 3-10; soma de target_pct = 100 exatamente.`;

  const client = new Anthropic({ apiKey });
  const msg = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text = msg.content[0]?.type === "text" ? msg.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Resposta da IA sem JSON válido.");

  const parsed = JSON.parse(jsonMatch[0]) as AllocationSuggestion;
  if (!Array.isArray(parsed.allocations)) throw new Error("Formato de resposta inválido.");

  // Motor determinístico valida a sugestão da IA contra a política. Nenhuma
  // sugestão com violação crítica (soma, liquidez mínima, classe restrita) passa.
  const violations = validateProposedAllocations(
    {
      liquidity_min_pct: input.liquidity_min_pct,
      restricted_assets: null,
      max_loss_pct: null,
      max_single_asset_pct: null,
    },
    parsed.allocations,
  );
  const critical = violations.filter((v) => v.severity === "critical");
  if (critical.length > 0) {
    throw new Error(`Sugestão viola a política: ${critical.map((v) => v.message).join(" ")}`);
  }

  return parsed;
}

export async function saveAllocationsAction(
  holderId: string,
  allocations: Array<{
    asset_class: string;
    target_pct: string;
    tolerance_pct: string;
  }>,
) {
  const strategy = await getStrategy(holderId);
  if (!strategy) throw new Error("Estratégia não encontrada. Salve o perfil primeiro.");

  await upsertAllocations(
    strategy.id,
    allocations.map((a) => ({
      asset_class: a.asset_class as Enums<"asset_class">,
      target_pct: parseFloat(a.target_pct),
      tolerance_pct: parseFloat(a.tolerance_pct),
      rationale: null,
    })),
  );

  await recordStrategyVersion(holderId);
  revalidatePath(`/holders/${holderId}/strategy`);
  revalidatePath("/dashboard");
}

// Reverte a política para uma versão anterior (rollback auditável).
export async function revertStrategyAction(holderId: string, versionId: string) {
  const versions = await getStrategyVersions(holderId);
  const version = versions.find((v) => v.id === versionId);
  if (!version) throw new Error("Versão não encontrada.");
  const s = version.snapshot;

  await upsertStrategy(holderId, {
    risk_profile: s.risk_profile,
    investment_horizon_years: s.investment_horizon_years,
    goal_description: s.goal_description,
    goal_monthly_income: s.goal_monthly_income,
    goal_target_age: s.goal_target_age,
    liquidity_min_pct: s.liquidity_min_pct,
    deviation_threshold_pct: s.deviation_threshold_pct,
    restricted_assets: s.restricted_assets,
    notes: s.notes,
  });
  await updatePolicyLimits(holderId, s.max_loss_pct ?? null, s.max_single_asset_pct ?? null);

  const strategy = await getStrategy(holderId);
  if (strategy && Array.isArray(s.allocations)) {
    await upsertAllocations(
      strategy.id,
      s.allocations.map((a) => ({
        asset_class: a.asset_class,
        target_pct: a.target_pct,
        tolerance_pct: a.tolerance_pct,
        rationale: a.rationale ?? null,
      })),
    );
  }

  await recordStrategyVersion(holderId);
  revalidatePath(`/holders/${holderId}/strategy`);
  revalidatePath("/dashboard");
}
