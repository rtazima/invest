import Anthropic from "@anthropic-ai/sdk";
import { createServiceClient } from "@/lib/supabase/service";
import { createUntypedServiceClient } from "@/lib/supabase/untyped";

const claude = new Anthropic();
const MODEL = "claude-opus-4-7";
const ATTENTION_DAYS = 10;

interface AttentionItem {
  severity: string;
  title: string;
  description: string;
  generated_by: string;
  ticker: string | null;
}

interface HolderBlock {
  holder_id: string;
  name: string;
  attention: AttentionItem[];
  narrative?: string;
  actions?: string[];
}

interface HouseView {
  house: string;
  report_date: string | null;
  summary: string;
}

// segunda-feira (ISO) da semana de uma data
function mondayOf(d: Date): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - (day - 1));
  return date.toISOString().slice(0, 10);
}

const SYNTH_TOOL = {
  name: "registrar_relatorio",
  description: "Registra o relatório semanal consolidado da família.",
  input_schema: {
    type: "object" as const,
    properties: {
      summary: { type: "string", description: "2-3 frases: leitura central da semana para a família" },
      holders: {
        type: "array",
        description: "um item por titular, na mesma ordem da lista fornecida",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "nome exato do titular como fornecido" },
            narrative: { type: "string", description: "2-3 frases: o que muda para este titular dado o cenário e os pontos de atenção" },
            actions: { type: "array", items: { type: "string" }, description: "0-3 ações concretas a considerar (ou vazio se nada a fazer)" },
          },
          required: ["name", "narrative", "actions"],
        },
      },
    },
    required: ["summary", "holders"],
  },
};

const SYSTEM = `Você é o estrategista de um family office. Escreve um relatório semanal curto e concreto, de colega para colega, sem jargão. Não recomenda ativos específicos por nome; fala de classes, enquadramento e dos pontos de atenção fornecidos. Se um titular não tem pontos de atenção, diga que está enquadrado e sem ação necessária.`;

interface SynthOutput {
  summary: string;
  holders: Array<{ name: string; narrative: string; actions: string[] }>;
}

async function synthesize(
  scenarioSummary: string | null,
  houseViews: HouseView[],
  perHolder: HolderBlock[],
): Promise<SynthOutput | null> {
  const holderContext = perHolder
    .map((h, i) => {
      const items =
        h.attention.length > 0
          ? h.attention.map((a) => `  - [${a.severity}] ${a.title}: ${a.description}`).join("\n")
          : "  - sem pontos de atenção";
      return `${i + 1}. ${h.name}\n${items}`;
    })
    .join("\n\n");

  const houseCtx = houseViews.length
    ? houseViews.map((h) => `- ${h.house.toUpperCase()} (${h.report_date ?? "s/data"}): ${h.summary}`).join("\n")
    : "Sem relatório macro de casa nesta semana.";

  const prompt = `CENÁRIO MACRO ATUAL:
${scenarioSummary ?? "Sem cenário macro registrado."}

VISÃO DAS CASAS:
${houseCtx}

TITULARES E PONTOS DE ATENÇÃO:
${holderContext}

Escreva o relatório semanal chamando a tool registrar_relatorio. Um item por titular, na mesma ordem, usando o nome exato.`;

  const msg = await claude.messages.create({
    model: MODEL,
    max_tokens: 2500,
    system: SYSTEM,
    tools: [SYNTH_TOOL],
    tool_choice: { type: "tool", name: SYNTH_TOOL.name },
    messages: [{ role: "user", content: prompt }],
  });
  const block = msg.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") return null;
  const input = block.input as Partial<SynthOutput>;
  if (typeof input.summary !== "string" || !Array.isArray(input.holders)) return null;
  return { summary: input.summary, holders: input.holders };
}

export interface WeeklyRunResult {
  status: "created" | "skipped" | "empty";
  family_id: string;
  week_start: string;
}

export async function runWeeklyReport(force = false): Promise<WeeklyRunResult[]> {
  const db = createServiceClient();
  const u = createUntypedServiceClient();
  const week_start = mondayOf(new Date());
  const results: WeeklyRunResult[] = [];

  const { data: families } = await u.from("families").select("id");
  if (!families || families.length === 0) return results;

  const { data: scenRows } = await u
    .from("scenario_definitions")
    .select("id, summary")
    .order("generated_at", { ascending: false })
    .limit(1);
  const scenario = (scenRows as Array<{ id: string; summary: string }> | null)?.[0] ?? null;

  const since = new Date(Date.now() - ATTENTION_DAYS * 86_400_000).toISOString();

  for (const family of families as Array<{ id: string }>) {
    if (!force) {
      const { data: existing } = await u
        .from("weekly_reports")
        .select("id")
        .eq("family_id", family.id)
        .eq("week_start", week_start)
        .maybeSingle();
      if (existing) {
        results.push({ status: "skipped", family_id: family.id, week_start });
        continue;
      }
    }

    const { data: holders } = await db.from("holders").select("id, name").eq("family_id", family.id);
    if (!holders || holders.length === 0) continue;
    const holderIds = holders.map((h) => h.id);

    const { data: alerts } = await db
      .from("alerts")
      .select("holder_id, severity, title, description, generated_by, ticker, generated_at")
      .in("holder_id", holderIds)
      .neq("status", "dismissed")
      .gte("generated_at", since)
      .order("severity", { ascending: true });

    const { data: hvRows } = await u
      .from("research_reports")
      .select("house, report_date, scenario_summary")
      .eq("family_id", family.id)
      .eq("report_type", "macro")
      .not("scenario_summary", "is", null)
      .order("ingested_at", { ascending: false })
      .limit(3);
    const houseViews: HouseView[] = (
      (hvRows as Array<{ house: string; report_date: string | null; scenario_summary: string }> | null) ?? []
    ).map((r) => ({ house: r.house, report_date: r.report_date, summary: r.scenario_summary }));

    const perHolder: HolderBlock[] = holders.map((h) => ({
      holder_id: h.id,
      name: h.name as string,
      attention: (alerts ?? [])
        .filter((a) => a.holder_id === h.id)
        .map((a) => ({
          severity: a.severity,
          title: a.title,
          description: a.description,
          generated_by: a.generated_by,
          ticker: a.ticker,
        })),
    }));

    const synth = await synthesize(scenario?.summary ?? null, houseViews, perHolder);
    if (synth) {
      const byName = new Map(synth.holders.map((h) => [h.name.trim().toLowerCase(), h]));
      for (const block of perHolder) {
        const match = byName.get(block.name.trim().toLowerCase());
        block.narrative = match?.narrative;
        block.actions = match?.actions;
      }
    }

    const body = {
      summary: synth?.summary ?? "",
      scenario_summary: scenario?.summary ?? null,
      house_views: houseViews,
      by_holder: perHolder,
    };

    const { error } = await u.from("weekly_reports").insert({
      family_id: family.id,
      scenario_id: scenario?.id ?? null,
      week_start,
      body,
      model: MODEL,
    });
    if (error) {
      console.error(`[weekly-report] insert falhou família ${family.id}: ${error.message}`);
      continue;
    }
    results.push({ status: "created", family_id: family.id, week_start });
  }

  return results;
}
