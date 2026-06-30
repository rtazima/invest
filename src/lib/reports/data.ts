import { createUntypedServerClient } from "@/lib/supabase/untyped";

export interface WeeklyAttentionItem {
  severity: string;
  title: string;
  description: string;
  generated_by: string;
  ticker: string | null;
}

export interface WeeklyHolderBlock {
  holder_id: string;
  name: string;
  attention: WeeklyAttentionItem[];
  narrative?: string;
  actions?: string[];
}

export interface WeeklyHouseView {
  house: string;
  report_date: string | null;
  summary: string;
}

export interface WeeklyReportBody {
  summary: string;
  scenario_summary: string | null;
  house_views: WeeklyHouseView[];
  by_holder: WeeklyHolderBlock[];
}

export interface WeeklyReportView {
  id: string;
  week_start: string;
  generated_at: string;
  body: WeeklyReportBody;
}

interface ReportRow {
  id: string;
  week_start: string;
  generated_at: string;
  body: WeeklyReportBody;
}

export async function getWeeklyReports(limit = 12): Promise<WeeklyReportView[]> {
  const db = await createUntypedServerClient();
  const { data } = await db
    .from("weekly_reports")
    .select("id, week_start, generated_at, body")
    .order("week_start", { ascending: false })
    .limit(limit);
  return ((data as ReportRow[] | null) ?? []).map((r) => ({
    id: r.id,
    week_start: r.week_start,
    generated_at: r.generated_at,
    body: r.body,
  }));
}

export async function getLatestWeeklyReport(): Promise<WeeklyReportView | null> {
  const reports = await getWeeklyReports(1);
  return reports[0] ?? null;
}
