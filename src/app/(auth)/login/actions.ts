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

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(nextPath)}`,
    },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/login?message=check-email");
}
