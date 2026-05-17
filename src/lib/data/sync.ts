import { createServerClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database";

export interface InstitutionSyncStatus {
  institution: Enums<"institution">;
  status: "ok" | "warn" | "never";
  completedAt: string | null;
}

export async function getInstitutionSyncStatuses(): Promise<InstitutionSyncStatus[]> {
  const supabase = await createServerClient();

  const institutions: Enums<"institution">[] = ["xp", "btg", "nomad"];

  const { data } = await supabase
    .from("import_batches")
    .select("institution, completed_at")
    .eq("status", "completed")
    .order("completed_at", { ascending: false });

  const latestByInstitution = new Map<string, string>();
  for (const row of data ?? []) {
    if (row.completed_at && !latestByInstitution.has(row.institution)) {
      latestByInstitution.set(row.institution, row.completed_at);
    }
  }

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  return institutions.map((inst) => {
    const completedAt = latestByInstitution.get(inst) ?? null;
    if (!completedAt) return { institution: inst, status: "never", completedAt: null };
    return {
      institution: inst,
      status: completedAt >= oneDayAgo ? "ok" : "warn",
      completedAt,
    };
  });
}
