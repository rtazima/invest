"use server";

import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

export async function signInWithOtp(formData: FormData) {
  const email = formData.get("email");
  const next = formData.get("next");
  if (typeof email !== "string" || !email) {
    redirect("/login?error=Email+inválido");
  }

  const siteUrl = process.env["NEXT_PUBLIC_SITE_URL"] ?? "http://localhost:3000";
  const nextPath = typeof next === "string" && next.startsWith("/") ? next : "/dashboard";
  const supabase = await createServerClient();

  // Salva o destino pós-login num cookie — não passa na URL do emailRedirectTo
  // pois query params no emailRedirectTo quebram o PKCE code verifier do Supabase
  if (nextPath !== "/dashboard") {
    const { cookies } = await import("next/headers");
    (await cookies()).set("auth_redirect", nextPath, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60, // 1 hora
      path: "/",
    });
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/login?message=check-email");
}
