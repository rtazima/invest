import { createUntypedServerClient } from "@/lib/supabase/untyped";

export interface ResearchObservationView {
  id: string;
  ticker: string | null;
  asset_name: string | null;
  rating: string | null;
  rating_canonical: string | null;
  target_price: number | null;
  currency: string | null;
  horizon: string | null;
  rationale: string | null;
  confidence: number | null;
  source_page: number | null;
  needs_review: boolean;
}

export interface ResearchReportView {
  id: string;
  house: string;
  report_type: string | null;
  report_date: string | null;
  title: string | null;
  scenario_summary: string | null;
  top_picks: string[];
  status: string;
  ingested_at: string;
  observations: ResearchObservationView[];
}

interface ReportRow {
  id: string;
  house: string;
  report_type: string | null;
  report_date: string | null;
  title: string | null;
  scenario_summary: string | null;
  top_picks: string[] | null;
  status: string;
  ingested_at: string;
}

export async function getResearchReports(): Promise<ResearchReportView[]> {
  const db = await createUntypedServerClient();

  const { data: reportsData } = await db
    .from("research_reports")
    .select("id, house, report_type, report_date, title, scenario_summary, top_picks, status, ingested_at")
    .order("ingested_at", { ascending: false })
    .limit(50);

  const reports = (reportsData as ReportRow[] | null) ?? [];
  if (reports.length === 0) return [];

  const ids = reports.map((r) => r.id);
  const { data: obsData } = await db
    .from("research_observations")
    .select(
      "id, report_id, ticker, asset_name, rating, rating_canonical, target_price, currency, horizon, rationale, confidence, source_page, needs_review",
    )
    .in("report_id", ids)
    .order("confidence", { ascending: false });

  const obsByReport = new Map<string, ResearchObservationView[]>();
  for (const o of (obsData as (ResearchObservationView & { report_id: string })[] | null) ?? []) {
    const list = obsByReport.get(o.report_id) ?? [];
    list.push(o);
    obsByReport.set(o.report_id, list);
  }

  return reports.map((r) => ({
    id: r.id,
    house: r.house,
    report_type: r.report_type,
    report_date: r.report_date,
    title: r.title,
    scenario_summary: r.scenario_summary,
    top_picks: r.top_picks ?? [],
    status: r.status,
    ingested_at: r.ingested_at,
    observations: obsByReport.get(r.id) ?? [],
  }));
}

export interface HouseView {
  id: string;
  house: string;
  report_date: string | null;
  title: string | null;
  summary: string;
}

interface HouseViewRow {
  id: string;
  house: string;
  report_date: string | null;
  title: string | null;
  scenario_summary: string | null;
  ingested_at: string;
}

// Visão macro das casas, por família. Alimenta o card de cenário ao lado do dado
// público do BCB/FRED. Per-família: o research de uma família nunca aparece em outra.
export async function getRecentHouseViews(limit = 4): Promise<HouseView[]> {
  const db = await createUntypedServerClient();
  const { data } = await db
    .from("research_reports")
    .select("id, house, report_date, title, scenario_summary, ingested_at")
    .eq("report_type", "macro")
    .not("scenario_summary", "is", null)
    .order("ingested_at", { ascending: false })
    .limit(limit);

  return ((data as HouseViewRow[] | null) ?? [])
    .filter((r) => r.scenario_summary && r.scenario_summary.trim())
    .map((r) => ({
      id: r.id,
      house: r.house,
      report_date: r.report_date,
      title: r.title,
      summary: r.scenario_summary as string,
    }));
}
