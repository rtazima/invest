"use server";

import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

export async function completeMfaEnroll(formData: FormData) {
  const factorId = formData.get("factorId");
  const code = formData.get("code");

  if (typeof factorId !== "string" || typeof code !== "string") {
    redirect("/mfa/enroll?error=Dados+inválidos");
  }

  const supabase = await createServerClient();

  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId,
    code,
  });

  if (error) {
    redirect(`/mfa/enroll?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard");
}
