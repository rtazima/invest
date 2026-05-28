"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { upsertStrategy, upsertAllocations, getStrategy } from "@/lib/data/strategies";
import { getHolder } from "@/lib/data/holders";
import type { Enums } from "@/types/database";

interface StrategyFormData {
  risk_profile: Enums<"risk_profile">;
  investment_horizon_years: number | null;
  goal_description: string | null;
  goal_monthly_income: number | null;
  goal_target_age: number | null;
  liquidity_min_pct: number;
  deviation_threshold_pct: number;
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
    restricted_assets: null,
    notes: data.notes,
  });
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

  const prompt = `Você é um consultor de investimentos brasileiro especializado em gestão de patrimônio familiar.

Dados do investidor:
${contextLines}

Sugira uma alocação estratégica de longo prazo. Use apenas as classes listadas. Os target_pct devem somar exatamente 100. Respeite a liquidez mínima de ${(input.liquidity_min_pct * 100).toFixed(0)}%.

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
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text = msg.content[0]?.type === "text" ? msg.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Resposta da IA sem JSON válido.");

  const parsed = JSON.parse(jsonMatch[0]) as AllocationSuggestion;
  if (!Array.isArray(parsed.allocations)) throw new Error("Formato de resposta inválido.");

  // Ensure sum = 100 (correct rounding errors)
  const sum = parsed.allocations.reduce((s, a) => s + a.target_pct, 0);
  if (Math.abs(sum - 100) > 2) throw new Error(`Alocações somam ${sum}% — esperado 100%.`);

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

  revalidatePath(`/holders/${holderId}/strategy`);
  revalidatePath("/dashboard");
}
