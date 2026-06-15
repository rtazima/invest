import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const maxDuration = 30;

function authorized(req: NextRequest): boolean {
  return req.headers.get("x-agent-secret") === process.env["AGENT_SECRET"];
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const svc = createServiceClient();

    // Verifica se já existe um snapshot nos últimos 14 minutos
    const { data: recent } = await svc
      .from("portfolio_intraday" as never)
      .select("id, captured_at")
      .order("captured_at", { ascending: false })
      .limit(1);

    const lastCapture = (recent as { id: number; captured_at: string }[] | null)?.[0]?.captured_at;
    if (lastCapture) {
      const msSince = Date.now() - new Date(lastCapture).getTime();
      if (msSince < 14 * 60 * 1000) {
        return NextResponse.json({ skipped: true, msSince });
      }
    }

    // Replica a lógica de dedup de batches de /api/prices/current
    const { data: batches } = await svc
      .from("import_batches")
      .select("id, holder_id, institution, source, filename, completed_at")
      .eq("status", "completed")
      .order("completed_at", { ascending: false });

    if (!batches || batches.length === 0) {
      return NextResponse.json({ stored: false, reason: "no_batches" });
    }

    const pluggyLatest = new Map<string, string>();
    const supplementLatest = new Map<string, string>();
    for (const b of batches) {
      const hk = `${b.holder_id}:${b.institution}`;
      if (b.source === "pluggy" && !pluggyLatest.has(hk)) pluggyLatest.set(hk, b.id);
      if (b.source === "csv_supplement" && !supplementLatest.has(hk)) supplementLatest.set(hk, b.id);
    }
    const selected = new Map<string, string>();
    for (const b of batches) {
      const hk = `${b.holder_id}:${b.institution}`;
      const pluggyId = pluggyLatest.get(hk);
      if (b.source === "csv_supplement") {
        if (supplementLatest.get(hk) === b.id) selected.set(`${hk}:supplement`, b.id);
      } else if (pluggyId !== undefined) {
        if (b.id === pluggyId) selected.set(hk, b.id);
      } else {
        const key = `${hk}:${b.filename ?? ""}`;
        if (!selected.has(key)) selected.set(key, b.id);
      }
    }

    const batchIds = [...selected.values()];
    if (batchIds.length === 0) {
      return NextResponse.json({ stored: false, reason: "no_active_batches" });
    }

    const { data: positions } = await svc
      .from("positions")
      .select("market_value_brl, currency, exchange_rate")
      .in("batch_id", batchIds);

    let total = 0;
    let fxRate: number | null = null;
    for (const p of positions ?? []) {
      total += Number(p.market_value_brl ?? 0);
      if (p.currency === "USD" && p.exchange_rate) fxRate = Number(p.exchange_rate);
    }

    await (svc.from("portfolio_intraday" as never) as ReturnType<typeof svc.from>).insert({
      total_value_brl: total,
      fx_rate: fxRate,
    } as never);

    // Limpa snapshots com mais de 7 dias (roda 10% das vezes para não impactar)
    if (Math.random() < 0.1) {
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      await svc.from("portfolio_intraday" as never).delete().lt("captured_at", cutoff);
    }

    return NextResponse.json({ stored: true, totalBrl: total, fxRate });
  } catch (err) {
    console.error("[portfolio/intraday-snapshot]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro inesperado" },
      { status: 500 },
    );
  }
}
