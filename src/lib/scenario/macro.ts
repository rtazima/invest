import Anthropic from "@anthropic-ai/sdk";
import { createUntypedServiceClient } from "@/lib/supabase/untyped";
import {
  fetchMacroSnapshot,
  snapshotToContext,
  brOldestDate,
  type MacroSnapshot,
} from "@/lib/scenario/bcb";
import {
  fetchUsMacroSnapshot,
  usSnapshotToContext,
  usOldestDate,
  type UsMacroSnapshot,
} from "@/lib/scenario/fred";

const claude = new Anthropic();
const MODEL = "claude-opus-4-7";
const AGENT = "macro-scenario";

// Implicação por classe de ativo. As chaves espelham as classes da estratégia
// para que a frente 4 (metas sensíveis ao cenário) consuma direto.
interface ByClass {
  fixed_income_pre: string;
  fixed_income_ipca: string;
  fixed_income_pos: string;
  fiis: string;
  stocks_br: string;
  stocks_intl: string;
  usd: string;
}

interface ScenarioCase {
  probability: number;
  thesis: string;
  premises: string[];
  triggers: string[];
  counter_evidence: string[];
  by_class: ByClass;
}

interface ScenarioOutput {
  base_case: ScenarioCase;
  bull_case: ScenarioCase;
  bear_case: ScenarioCase;
  summary: string;
}

const SYSTEM = `Você é o estrategista-chefe de um family office brasileiro com patrimônio também em dólar (EUA). Escreve para famílias com perfis distintos: titulares arrojados, conservadores com necessidade de liquidez em 30 dias, e horizontes longos de 15+ anos. Sua leitura é concreta, baseada nos dados fornecidos, sem jargão vazio e sem recomendar ativos específicos: você fala de classes de ativo e de cenário, nunca de tickers. Considere o ciclo político brasileiro (eleição presidencial em outubro de 2026, com peso sobre risco fiscal, câmbio e prêmio de risco da bolsa) e o ciclo de juros e inflação dos EUA. Premissas são quantificadas; gatilhos e evidências contrárias são específicos.`;

const BY_CLASS_SCHEMA = {
  type: "object",
  properties: {
    fixed_income_pre: { type: "string", description: "implicação para pré-fixado, 1 frase" },
    fixed_income_ipca: { type: "string", description: "implicação para IPCA+, 1 frase" },
    fixed_income_pos: { type: "string", description: "implicação para pós (CDI/Selic), 1 frase" },
    fiis: { type: "string", description: "implicação para FIIs, 1 frase" },
    stocks_br: { type: "string", description: "implicação para bolsa BR, 1 frase" },
    stocks_intl: { type: "string", description: "implicação para bolsa internacional, 1 frase" },
    usd: { type: "string", description: "implicação para exposição em dólar, 1 frase" },
  },
  required: [
    "fixed_income_pre",
    "fixed_income_ipca",
    "fixed_income_pos",
    "fiis",
    "stocks_br",
    "stocks_intl",
    "usd",
  ],
} as const;

const CASE_SCHEMA = {
  type: "object",
  properties: {
    probability: { type: "number", description: "0 a 100; os três casos somam 100" },
    thesis: { type: "string", description: "2-3 frases sobre o cenário" },
    premises: {
      type: "array",
      items: { type: "string" },
      description: "premissas quantificadas (ex: 'Selic em 12% em 12 meses', 'CPI EUA volta a 3%')",
    },
    triggers: {
      type: "array",
      items: { type: "string" },
      description: "gatilhos que aumentam ou reduzem a probabilidade deste cenário",
    },
    counter_evidence: {
      type: "array",
      items: { type: "string" },
      description: "evidências que contradizem esta tese",
    },
    by_class: BY_CLASS_SCHEMA,
  },
  required: ["probability", "thesis", "premises", "triggers", "counter_evidence", "by_class"],
} as const;

const TOOL = {
  name: "registrar_cenario",
  description: "Registra os três cenários macro (base, otimista, pessimista) com probabilidades que somam 100.",
  input_schema: {
    type: "object" as const,
    properties: {
      base_case: CASE_SCHEMA,
      bull_case: CASE_SCHEMA,
      bear_case: CASE_SCHEMA,
      summary: { type: "string", description: "1-2 frases com a leitura central e o principal risco a monitorar" },
    },
    required: ["base_case", "bull_case", "bear_case", "summary"],
  },
};

function buildPrompt(brContext: string, usContext: string | null, electionNotes: string | null): string {
  return `${brContext}

${usContext ?? "DADOS DE EUA: indisponíveis nesta rodada (sem chave FRED). Trate a leitura internacional com cautela explícita."}

CONTEXTO POLÍTICO/ELEITORAL (mantido pelo usuário):
${electionNotes?.trim() || "Sem notas específicas. Considere o calendário eleitoral de 2026 e o risco fiscal corrente."}

Construa três cenários para os próximos 6 a 12 meses: base, otimista (bull) e pessimista (bear). As probabilidades dos três somam 100. Para cada um: tese curta, premissas quantificadas, gatilhos, evidências contrárias, e a implicação para cada classe de ativo. Chame a tool registrar_cenario com o resultado.`;
}

function isCase(v: unknown): v is ScenarioCase {
  if (!v || typeof v !== "object") return false;
  const c = v as Record<string, unknown>;
  return (
    typeof c["probability"] === "number" &&
    typeof c["thesis"] === "string" &&
    Array.isArray(c["premises"]) &&
    Array.isArray(c["triggers"]) &&
    Array.isArray(c["counter_evidence"]) &&
    !!c["by_class"] &&
    typeof c["by_class"] === "object"
  );
}

function validate(input: unknown): ScenarioOutput | null {
  if (!input || typeof input !== "object") return null;
  const o = input as Record<string, unknown>;
  if (!isCase(o["base_case"]) || !isCase(o["bull_case"]) || !isCase(o["bear_case"])) return null;
  if (typeof o["summary"] !== "string") return null;
  const sum =
    (o["base_case"] as ScenarioCase).probability +
    (o["bull_case"] as ScenarioCase).probability +
    (o["bear_case"] as ScenarioCase).probability;
  // tolera arredondamento do modelo
  if (Math.abs(sum - 100) > 2) return null;
  return input as ScenarioOutput;
}

async function generateScenario(
  brContext: string,
  usContext: string | null,
  electionNotes: string | null,
): Promise<ScenarioOutput | null> {
  const msg = await claude.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: SYSTEM,
    tools: [TOOL],
    tool_choice: { type: "tool", name: TOOL.name },
    messages: [{ role: "user", content: buildPrompt(brContext, usContext, electionNotes) }],
  });
  const block = msg.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") return null;
  return validate(block.input);
}

// 'YYYY-Www' (semana ISO) para idempotência semanal.
function isoWeek(d: Date): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function oldestDataAsOf(br: MacroSnapshot, us: UsMacroSnapshot | null): string {
  const candidates = [brOldestDate(br), us ? usOldestDate(us) : null].filter(
    (d): d is string => d !== null,
  );
  if (candidates.length === 0) return new Date().toISOString();
  candidates.sort();
  // data ISO (YYYY-MM-DD) -> timestamp UTC
  return new Date(`${candidates[0]}T00:00:00Z`).toISOString();
}

export interface MacroRunResult {
  status: "created" | "skipped" | "failed";
  period_ref: string;
  version?: number;
  reason?: string;
}

export async function runMacroScenario(force = false): Promise<MacroRunResult> {
  const supabase = createUntypedServiceClient();
  const period_ref = isoWeek(new Date());

  // Idempotência: não recria cenário para a mesma semana, salvo force.
  if (!force) {
    const { data: existing } = await supabase
      .from("scenario_definitions")
      .select("id")
      .eq("period_ref", period_ref)
      .limit(1)
      .maybeSingle();
    if (existing) return { status: "skipped", period_ref, reason: "cenário da semana já existe" };
  }

  const { data: run } = await supabase
    .from("agent_runs")
    .insert({ agent: AGENT, period_ref, status: "running" })
    .select("id")
    .single();
  const runId = run?.id;

  const finish = async (status: "success" | "failed", result: unknown, error?: string) => {
    if (!runId) return;
    await supabase
      .from("agent_runs")
      .update({ status, finished_at: new Date().toISOString(), result: result ?? null, error: error ?? null })
      .eq("id", runId);
  };

  try {
    const [br, us] = await Promise.all([fetchMacroSnapshot(), fetchUsMacroSnapshot()]);

    // nota eleitoral persiste entre rodadas: carrega a do cenário anterior
    const { data: prev } = await supabase
      .from("scenario_definitions")
      .select("id, version, election_notes")
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const scenario = await generateScenario(
      snapshotToContext(br),
      us ? usSnapshotToContext(us) : null,
      prev?.election_notes ?? null,
    );
    if (!scenario) {
      await finish("failed", null, "saída do modelo não passou na validação de schema");
      return { status: "failed", period_ref, reason: "validação de schema" };
    }

    const version = (prev?.version ?? 0) + 1;
    const { error } = await supabase.from("scenario_definitions").insert({
      version,
      period_ref,
      data_as_of: oldestDataAsOf(br, us),
      inputs: { focus: br.focus, bcb_series: br.series, fred: us, us_available: us !== null },
      election_notes: prev?.election_notes ?? null,
      base_case: scenario.base_case,
      bull_case: scenario.bull_case,
      bear_case: scenario.bear_case,
      summary: scenario.summary,
      model: MODEL,
      prev_id: prev?.id ?? null,
    });
    if (error) {
      await finish("failed", null, error.message);
      return { status: "failed", period_ref, reason: error.message };
    }

    await finish("success", { version });
    return { status: "created", period_ref, version };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "erro desconhecido";
    await finish("failed", null, msg);
    return { status: "failed", period_ref, reason: msg };
  }
}
