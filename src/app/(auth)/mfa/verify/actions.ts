"use server";

import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

export async function verifyMfa(formData: FormData) {
  const code = formData.get("code");

  if (typeof code !== "string" || code.length !== 6) {
    redirect("/mfa/verify?error=Código+deve+ter+6+dígitos");
  }

  const supabase = await createServerClient();

  // Busca o fator TOTP cadastrado
  const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
  if (listError || !factors.totp[0]) {
    redirect("/mfa/enroll");
  }

  const factorId = factors.totp[0].id;

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });

  if (error) {
    redirect(`/mfa/verify?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard");
}
