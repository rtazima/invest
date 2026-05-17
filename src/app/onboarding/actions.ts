"use server";

import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { validateCPF, normalizeCPF } from "@/lib/cpf";

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export async function completeOnboarding(formData: FormData) {
  const fullName = formData.get("full_name");
  const nickname = formData.get("nickname");
  const familyName = formData.get("family_name");
  const cpfRaw = formData.get("cpf");

  if (typeof fullName !== "string" || fullName.trim().length < 3) {
    redirect("/onboarding?error=Nome+completo+obrigatório");
  }
  if (typeof nickname !== "string" || nickname.trim().length < 2) {
    redirect("/onboarding?error=Apelido+obrigatório");
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Tenta vincular a um holder existente pelo CPF em user_metadata
  const { data: claimedHolderId } = await supabase.rpc("claim_holder_by_cpf");

  if (claimedHolderId) {
    // Membro que foi pré-cadastrado pelo owner — atualiza nome
    await supabase
      .from("holders")
      .update({ full_name: fullName.trim(), name: nickname.trim() })
      .eq("id", claimedHolderId);
  } else {
    // Novo owner — valida CPF do formulário (não estava em metadata ainda)
    const cpfInput = typeof cpfRaw === "string" ? cpfRaw : "";
    const metaCpf = (user.user_metadata?.["cpf"] as string | undefined) ?? "";
    const cpf = metaCpf || normalizeCPF(cpfInput);

    if (!validateCPF(cpf)) {
      redirect("/onboarding?error=CPF+inválido+ou+ausente");
    }

    const name = typeof familyName === "string" && familyName.trim()
      ? familyName.trim()
      : `Família ${nickname.trim()}`;

    // Cria família
    const { data: family, error: famErr } = await supabase
      .from("families")
      .insert({ name, owner_user_id: user.id })
      .select("id")
      .single();

    if (famErr || !family) {
      redirect(`/onboarding?error=${encodeURIComponent(famErr?.message ?? "Erro ao criar família")}`);
    }

    const slug = toSlug(nickname.trim());

    // Cria holder do owner
    const { error: holderErr } = await supabase.from("holders").insert({
      cpf,
      full_name: fullName.trim(),
      name: nickname.trim(),
      slug,
      family_id: family.id,
      user_id: user.id,
      role: "owner",
    });

    if (holderErr) {
      redirect(`/onboarding?error=${encodeURIComponent(holderErr.message)}`);
    }
  }

  // Marca onboarding como concluído em user_metadata
  await supabase.auth.updateUser({ data: { onboarded: true } });

  redirect("/mfa/enroll");
}
