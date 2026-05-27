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

function computeIsMinor(birthDate: string | null): boolean {
  if (!birthDate) return false;
  const dob = new Date(birthDate);
  const cutoff = new Date(dob.getFullYear() + 18, dob.getMonth(), dob.getDate());
  return new Date() < cutoff;
}

export async function addFamilyMember(formData: FormData) {
  const cpfRaw = formData.get("cpf");
  const fullName = formData.get("full_name");
  const nickname = formData.get("nickname");
  const familyId = formData.get("family_id");
  const birthDate = formData.get("birth_date");

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

  const { data: existing } = await supabase
    .from("holders")
    .select("id")
    .eq("cpf", cpf)
    .maybeSingle();

  if (existing) {
    redirect("/familia?error=CPF+já+cadastrado+na+plataforma");
  }

  const slug = toSlug(nickname.trim());
  const birthDateValue = typeof birthDate === "string" && birthDate ? birthDate : null;

  const { error } = await supabase.from("holders").insert({
    cpf,
    full_name: fullName.trim(),
    name: nickname.trim(),
    slug,
    family_id: familyId,
    role: "member",
    birth_date: birthDateValue,
  });

  if (error) {
    redirect(`/familia?error=${encodeURIComponent(error.message)}`);
  }

  await supabase.from("family_cpfs").insert({
    family_id: familyId,
    cpf,
    added_by: user.id,
  });

  revalidatePath("/familia");
  redirect("/familia");
}

export async function updateFamilyMember(formData: FormData) {
  const holderId = formData.get("holder_id");
  const fullName = formData.get("full_name");
  const nickname = formData.get("nickname");
  const birthDate = formData.get("birth_date");

  if (typeof holderId !== "string" || !holderId) {
    redirect("/familia?error=Titular+não+encontrado");
  }
  if (typeof fullName !== "string" || fullName.trim().length < 3) {
    redirect("/familia?error=Nome+completo+obrigatório");
  }
  if (typeof nickname !== "string" || nickname.trim().length < 2) {
    redirect("/familia?error=Apelido+obrigatório");
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const birthDateValue = typeof birthDate === "string" && birthDate ? birthDate : null;
  const slug = toSlug(nickname.trim());

  const { error } = await supabase
    .from("holders")
    .update({
      full_name: fullName.trim(),
      name: nickname.trim(),
      slug,
      birth_date: birthDateValue,
    })
    .eq("id", holderId);

  if (error) {
    redirect(`/familia?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/familia");
  redirect("/familia");
}

export async function deleteFamilyMember(formData: FormData) {
  const holderId = formData.get("holder_id");

  if (typeof holderId !== "string" || !holderId) {
    redirect("/familia?error=Titular+não+encontrado");
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verifica se tem posições cadastradas
  const { count } = await supabase
    .from("positions")
    .select("id", { count: "exact", head: true })
    .eq("holder_id", holderId);

  if (count && count > 0) {
    redirect("/familia?error=Titular+tem+posições+cadastradas.+Remova+as+posições+primeiro.");
  }

  const { error } = await supabase
    .from("holders")
    .delete()
    .eq("id", holderId);

  if (error) {
    redirect(`/familia?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/familia");
  revalidatePath("/dashboard");
  redirect("/familia");
}

export { computeIsMinor };
