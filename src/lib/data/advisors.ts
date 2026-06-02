import { createServerClient } from "@/lib/supabase/server";

export interface FamilyAdvisor {
  id: string;
  family_id: string;
  invited_email: string;
  user_id: string | null;
  role: "advisor_read" | "advisor_write";
  status: "pending" | "active" | "revoked";
  invite_token: string;
  invited_at: string;
  accepted_at: string | null;
}

export async function getAdvisors(familyId: string): Promise<FamilyAdvisor[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("family_advisors")
    .select("id, family_id, invited_email, user_id, role, status, invite_token, invited_at, accepted_at")
    .eq("family_id", familyId)
    .neq("status", "revoked")
    .order("invited_at", { ascending: false });
  if (error) throw new Error(`getAdvisors: ${error.message}`);
  return (data ?? []) as FamilyAdvisor[];
}

export async function getAdvisorByToken(token: string): Promise<FamilyAdvisor | null> {
  const supabase = await createServerClient();
  // Usa RPC com SECURITY DEFINER para funcionar sem autenticação (página pública de convite)
  const { data, error } = await supabase.rpc("get_invite_by_token", { p_token: token });
  if (error) throw new Error(`getAdvisorByToken: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : null;
  return row ? (row as FamilyAdvisor) : null;
}
