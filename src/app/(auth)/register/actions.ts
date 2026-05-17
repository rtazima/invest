"use server";

import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { validateCPF, normalizeCPF } from "@/lib/cpf";

export async function registerWithOtp(formData: FormData) {
  const email = formData.get("email");
  const cpfRaw = formData.get("cpf");

  if (typeof email !== "string" || !email) {
    redirect("/register?error=Email+inválido");
  }
  if (typeof cpfRaw !== "string" || !validateCPF(cpfRaw)) {
    redirect("/register?error=CPF+inválido");
  }

  const cpf = normalizeCPF(cpfRaw);
  const siteUrl = process.env["NEXT_PUBLIC_SITE_URL"] ?? "http://localhost:3000";
  const supabase = await createServerClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback`,
      data: { cpf },
    },
  });

  if (error) {
    redirect(`/register?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/register?message=check-email");
}
