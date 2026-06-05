import { createServerClient } from "@/lib/supabase/server";

export interface TransferEvent {
  id: string;
  holder_id: string;
  holder_name: string;
  from_institution: string;
  to_institution: string;
  asset_name: string;
  ticker: string | null;
  quantity: number;
  transfer_date: string;
  settlement_date: string;
  status: "pending" | "settled" | "cancelled";
  settled_at: string | null;
  notes: string | null;
  created_at: string;
}

export async function getTransferEvents(): Promise<TransferEvent[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("transfer_events")
    .select("*, holders(name)")
    .order("transfer_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(`getTransferEvents: ${error.message}`);

  return (data ?? []).map((r) => ({
    id: r.id,
    holder_id: r.holder_id,
    holder_name: (r.holders as { name: string } | null)?.name ?? "—",
    from_institution: r.from_institution,
    to_institution: r.to_institution,
    asset_name: r.asset_name,
    ticker: r.ticker,
    quantity: Number(r.quantity),
    transfer_date: r.transfer_date,
    settlement_date: r.settlement_date,
    status: r.status as TransferEvent["status"],
    settled_at: r.settled_at,
    notes: r.notes,
    created_at: r.created_at,
  }));
}

export async function countPendingTransfers(): Promise<number> {
  const supabase = await createServerClient();
  const today = new Date().toISOString().slice(0, 10);

  const { count, error } = await supabase
    .from("transfer_events")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending")
    .gte("settlement_date", today);

  if (error) return 0;
  return count ?? 0;
}

export interface ActiveTransfer {
  holder_id: string;
  from_institution: string;
  ticker: string | null;
  asset_name: string;
  quantity: number;
}

export async function getActiveTransfers(): Promise<ActiveTransfer[]> {
  const supabase = await createServerClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("transfer_events")
    .select("holder_id, from_institution, ticker, asset_name, quantity")
    .eq("status", "pending")
    .gte("settlement_date", today);

  if (error) return [];

  return (data ?? []).map((r) => ({
    holder_id: r.holder_id,
    from_institution: r.from_institution,
    ticker: r.ticker,
    asset_name: r.asset_name,
    quantity: Number(r.quantity),
  }));
}
