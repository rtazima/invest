import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Lê destino do cookie (setado em signInWithOtp para evitar quebrar PKCE)
  // ou cai no ?next= da URL como fallback, ou /dashboard
  const cookieStore = await cookies();
  const cookieRedirect = cookieStore.get("auth_redirect")?.value;
  const next = cookieRedirect ?? searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const response = NextResponse.redirect(`${origin}${next}`);
      if (cookieRedirect) {
        response.cookies.delete("auth_redirect");
      }
      return response;
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
