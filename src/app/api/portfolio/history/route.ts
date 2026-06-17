import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export type HistoryPeriod = "D" | "S" | "M" | "A" | "MAX";

export interface HistoryPoint {
  // "D": ISO datetime ("2026-06-17T12:00:00.000Z")
  // outros: date string ("2026-06-17")
  date: string;
  totalBrl: number;
}

function startDateFor(period: Exclude<HistoryPeriod, "D">): string {
  const d = new Date();
  switch (period) {
    case "S": d.setDate(d.getDate() - 7); break;
    case "M": d.setDate(d.getDate() - 30); break;
    case "A": d.setFullYear(d.getFullYear() - 1); break;
    case "MAX": return "2000-01-01";
  }
  return d.toISOString().split("T")[0]!;
}

async function getIntradayPoints(
  svc: ReturnType<typeof createServiceClient>,
  holderId?: string,
): Promise<HistoryPoint[]> {
  const todayUtc = new Date();
  todayUtc.setUTCHours(0, 0, 0, 0);

  const { data } = await svc
    .from("portfolio_intraday" as never)
    .select("captured_at, total_value_brl, by_holder")
    .gte("captured_at", todayUtc.toISOString())
    .order("captured_at", { ascending: true });

  if (!data) return [];

  return (data as { captured_at: string; total_value_brl: string | number; by_holder: Record<string, number> | null }[])
    .map((row) => ({
      date: row.captured_at,
      totalBrl: holderId
        ? Number(row.by_holder?.[holderId] ?? 0)
        : Number(row.total_value_brl),
    }))
    .filter((p) => p.totalBrl > 0);
}

async function getDailyPoints(
  svc: ReturnType<typeof createServiceClient>,
  period: Exclude<HistoryPeriod, "D">,
  holderId?: string,
): Promise<HistoryPoint[]> {
  const from = startDateFor(period);

  let query = svc
    .from("portfolio_snapshots")
    .select("date, holder_id, total_value_brl")
    .gte("date", from)
    .order("date", { ascending: true });

  if (holderId) query = query.eq("holder_id", holderId);

  const { data } = await query;
  if (!data) return [];

  const byDate = new Map<string, number>();
  for (const row of data) {
    byDate.set(row.date, (byDate.get(row.date) ?? 0) + Number(row.total_value_brl));
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, totalBrl]) => ({ date, totalBrl }));
}

export async function GET(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const period = (req.nextUrl.searchParams.get("period") ?? "M") as HistoryPeriod;
  const holderId = req.nextUrl.searchParams.get("holder") ?? undefined;
  const svc = createServiceClient();

  const points =
    period === "D"
      ? await getIntradayPoints(svc, holderId)
      : await getDailyPoints(svc, period, holderId);

  return NextResponse.json({ points });
}
