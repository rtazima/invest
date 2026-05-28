import { createServerClient } from "@/lib/supabase/server";

export interface AlertMute {
  id: string;
  family_id: string;
  ticker: string | null;
  alert_type: string | null;
  muted_until: string | null;
  created_at: string;
}

async function getFamilyId(supabase: Awaited<ReturnType<typeof createServerClient>>): Promise<string> {
  const { data, error } = await supabase.rpc("my_family_id");
  if (error) throw new Error(`getFamilyId: ${error.message}`);
  return data as string;
}

export async function getActiveMutes(): Promise<AlertMute[]> {
  const supabase = await createServerClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("alert_mutes")
    .select("*")
    .or(`muted_until.is.null,muted_until.gt.${now}`);

  // Usuário sem família retorna array vazio (sem erro)
  if (error) return [];
  return (data ?? []) as AlertMute[];
}

export async function createMute(
  ticker: string | null,
  alertType: string | null,
  days: number | null,
): Promise<void> {
  const supabase = await createServerClient();
  const familyId = await getFamilyId(supabase);
  const mutedUntil = days
    ? new Date(Date.now() + days * 86_400_000).toISOString()
    : null;

  const { error } = await supabase.from("alert_mutes").insert({
    family_id: familyId,
    ticker,
    alert_type: alertType,
    muted_until: mutedUntil,
  });

  if (error) throw new Error(`createMute: ${error.message}`);
}

export async function deleteMute(id: string): Promise<void> {
  const supabase = await createServerClient();
  const { error } = await supabase.from("alert_mutes").delete().eq("id", id);
  if (error) throw new Error(`deleteMute: ${error.message}`);
}

export function isAlertMuted(
  alert: { ticker: string | null; generated_by: string },
  mutes: AlertMute[],
): boolean {
  const now = new Date();
  return mutes.some((m) => {
    if (m.muted_until && new Date(m.muted_until) < now) return false;
    const tickerMatch = !m.ticker || m.ticker === alert.ticker;
    const typeMatch = !m.alert_type || m.alert_type === alert.generated_by;
    return tickerMatch && typeMatch;
  });
}
