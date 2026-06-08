import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ token: null });

  const svc = createServiceClient();
  const { data } = await svc
    .from("family_advisors")
    .select("invite_token")
    .eq("invited_email", user.email.toLowerCase())
    .eq("status", "pending")
    .order("invited_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ token: (data?.invite_token as string) ?? null });
}
