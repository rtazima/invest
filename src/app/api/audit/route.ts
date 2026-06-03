import { createServerClient } from "@/lib/supabase/server";
import { logAudit, type AuditAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

interface AuditRequestBody {
  action: AuditAction;
  resource?: string;
  metadata?: Record<string, unknown>;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(null, { status: 401 });

    let body: AuditRequestBody;
    try {
      body = await request.json() as AuditRequestBody;
    } catch {
      return new Response(null, { status: 204 });
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      null;
    const ua = request.headers.get("user-agent") ?? null;

    // Determine role: check family_advisors first, then holders
    let userRole: string | null = null;
    const { data: advisor } = await supabase
      .from("family_advisors")
      .select("role")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (advisor) {
      userRole = advisor.role;
    } else {
      const { data: holder } = await supabase
        .from("holders")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      if (holder) userRole = holder.role;
    }

    void logAudit({
      user_id: user.id,
      user_email: user.email ?? null,
      user_role: userRole,
      action: body.action,
      resource: body.resource ?? null,
      metadata: body.metadata ?? {},
      ip_address: ip,
      user_agent: ua,
    });

    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 204 });
  }
}
