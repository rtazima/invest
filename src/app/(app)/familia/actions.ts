"use server";

import { revalidatePath } from "next/cache";
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

export async function addFamilyMember(formData: FormData) {
  const cpfRaw = formData.get("cpf");
  const fullName = formData.get("full_name");
  const nickname = formData.get("nickname");
  const familyId = formData.get("family_id");
  const birthYear = formData.get("birth_year");
  const isMinor = formData.get("is_minor") === "true";

  if (typeof cpfRaw !== "string" || !validateCPF(cpfRaw)) {
    redirect("/familia?error=CPF+inválido");
  }
  if (typeof fullName !== "string" || fullName.trim().length < 3) {
    redirect("/familia?error=Nome+completo+obrigatório");
  }
  if (typeof nickname !== "string" || nickname.trim().length < 2) {
    redirect("/familia?error=Apelido+obrigatório");
  }
  if (typeof familyId !== "string" || !familyId) {
    redirect("/familia?error=Família+não+encontrada");
  }

  const cpf = normalizeCPF(cpfRaw);
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verifica se o CPF já existe
  const { data: existing } = await supabase
    .from("holders")
    .select("id")
    .eq("cpf", cpf)
    .maybeSingle();

  if (existing) {
    redirect("/familia?error=CPF+já+cadastrado+na+plataforma");
  }

  const slug = toSlug(nickname.trim());

  const { error } = await supabase.from("holders").insert({
    cpf,
    full_name: fullName.trim(),
    name: nickname.trim(),
    slug,
    family_id: familyId,
    role: "member",
    is_minor: isMinor,
    birth_year: birthYear ? parseInt(String(birthYear)) : null,
  });

  if (error) {
    redirect(`/familia?error=${encodeURIComponent(error.message)}`);
  }

  // Registra CPF em family_cpfs para auto-link no cadastro
  await supabase.from("family_cpfs").insert({
    family_id: familyId,
    cpf,
    added_by: user.id,
  });

  revalidatePath("/familia");
  redirect("/familia");
}
