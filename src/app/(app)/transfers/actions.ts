"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";

export interface TransferPositionInput {
  holder_id: string;
  asset_name: string;
  ticker: string | null;
  quantity: number;
}

export async function createTransferEvents(
  positions: TransferPositionInput[],
  fromInstitution: string,
  toInstitution: string,
  transferDate: string,
  settlementDate: string,
  notes: string,
): Promise<{ error?: string }> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const rows = positions.map((p) => ({
    holder_id: p.holder_id,
    from_institution: fromInstitution,
    to_institution: toInstitution,
    asset_name: p.asset_name,
    ticker: p.ticker,
    quantity: p.quantity,
    transfer_date: transferDate,
    settlement_date: settlementDate,
    notes: notes || null,
    created_by: user.id,
  }));

  const { error } = await supabase.from("transfer_events").insert(rows);
  if (error) return { error: error.message };

  revalidatePath("/transfers");
  revalidatePath("/dashboard");
  return {};
}

export async function settleTransferEvent(id: string): Promise<{ error?: string }> {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("transfer_events")
    .update({ status: "settled", settled_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/transfers");
  revalidatePath("/dashboard");
  return {};
}

export async function cancelTransferEvent(id: string): Promise<{ error?: string }> {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("transfer_events")
    .update({ status: "cancelled" })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/transfers");
  revalidatePath("/dashboard");
  return {};
}
