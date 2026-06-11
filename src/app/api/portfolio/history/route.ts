import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export type HistoryPeriod = "D" | "S" | "M" | "A" | "MAX";

function startDateFor(period: HistoryPeriod): string | null {
  const d = new Date();
  switch (period) {
    case "D":
      d.setDate(d.getDate() - 3); // 3 dias para cobrir fins de semana sem snapshot
      break;
    case "S":
      d.setDate(d.getDate() - 7);
      break;
    case "M":
      d.setDate(d.getDate() - 30);
      break;
    case "A":
      d.setFullYear(d.getFullYear() - 1);
      break;
    case "MAX":
      return null;
  }
  return d.toISOString().split("T")[0]!;
}

export interface HistoryPoint {
  date: string;
  totalBrl: number;
}

export async function GET(req: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const period = (req.nextUrl.searchParams.get("period") ?? "M") as HistoryPeriod;
  const holderId = req.nextUrl.searchParams.get("holder") ?? undefined;

  const from = startDateFor(period);

  let query = supabase
    .from("portfolio_snapshots")
    .select("date, holder_id, total_value_brl")
    .order("date", { ascending: true });

  if (from) query = query.gte("date", from);
  if (holderId) query = query.eq("holder_id", holderId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Agrega por data (soma todos os titulares, a menos que holder_id seja filtrado)
  const byDate = new Map<string, number>();
  for (const row of data ?? []) {
    byDate.set(row.date, (byDate.get(row.date) ?? 0) + Number(row.total_value_brl));
  }

  const points: HistoryPoint[] = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, totalBrl]) => ({ date, totalBrl }));

  return NextResponse.json({ points });
}
