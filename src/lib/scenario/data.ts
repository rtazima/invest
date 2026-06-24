import { createUntypedServerClient } from "@/lib/supabase/untyped";

export type Freshness = "current" | "stale" | "unavailable";

export interface ScenarioCaseView {
  probability: number;
  thesis: string;
  premises: string[];
  triggers: string[];
  counter_evidence: string[];
  by_class: Record<string, string>;
}

export interface ScenarioView {
  version: number;
  generatedAt: string;
  dataAsOf: string;
  summary: string;
  electionNotes: string | null;
  base: ScenarioCaseView;
  bull: ScenarioCaseView;
  bear: ScenarioCaseView;
  freshness: Freshness;
  ageDays: number;
  usAvailable: boolean;
}

interface ScenarioRow {
  version: number;
  generated_at: string;
  data_as_of: string;
  summary: string;
  election_notes: string | null;
  base_case: ScenarioCaseView;
  bull_case: ScenarioCaseView;
  bear_case: ScenarioCaseView;
  inputs: { us_available?: boolean } | null;
}

interface RunRow {
  status: string;
}

const STALE_DAYS = 8; // mais de uma rodada Focus perdida
const UNAVAILABLE_DAYS = 15;

export function computeFreshness(ageDays: number, lastTwoFailed: boolean): Freshness {
  if (lastTwoFailed || ageDays > UNAVAILABLE_DAYS) return "unavailable";
  if (ageDays >= STALE_DAYS) return "stale";
  return "current";
}

export async function getLatestScenario(): Promise<ScenarioView | null> {
  const db = await createUntypedServerClient();

  const { data: rows } = await db
    .from("scenario_definitions")
    .select(
      "version, generated_at, data_as_of, summary, election_notes, base_case, bull_case, bear_case, inputs",
    )
    .order("generated_at", { ascending: false })
    .limit(1);

  const row = (rows as ScenarioRow[] | null)?.[0];
  if (!row) return null;

  // regra de frescor: deriva do dado obrigatório mais antigo, e duas falhas seguidas tornam indisponível
  const { data: runRows } = await db
    .from("agent_runs")
    .select("status")
    .eq("agent", "macro-scenario")
    .order("started_at", { ascending: false })
    .limit(2);
  const lastTwo = (runRows as RunRow[] | null) ?? [];
  const lastTwoFailed = lastTwo.length === 2 && lastTwo.every((r) => r.status === "failed");

  const ageMs = Date.now() - new Date(row.data_as_of).getTime();
  const ageDays = Math.floor(ageMs / 86_400_000);

  return {
    version: row.version,
    generatedAt: row.generated_at,
    dataAsOf: row.data_as_of,
    summary: row.summary,
    electionNotes: row.election_notes,
    base: row.base_case,
    bull: row.bull_case,
    bear: row.bear_case,
    freshness: computeFreshness(ageDays, lastTwoFailed),
    ageDays,
    usAvailable: row.inputs?.us_available ?? false,
  };
}
