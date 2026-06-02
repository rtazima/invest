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
  const { data, error } = await supabase
    .from("family_advisors")
    .select("id, family_id, invited_email, user_id, role, status, invite_token, invited_at, accepted_at")
    .eq("invite_token", token)
    .single();
  if (error?.code === "PGRST116") return null;
  if (error) throw new Error(`getAdvisorByToken: ${error.message}`);
  return data as FamilyAdvisor;
}
