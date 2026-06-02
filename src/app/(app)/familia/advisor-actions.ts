"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { sendAdvisorInviteEmail } from "@/lib/email";

export async function inviteAdvisorAction(
  familyId: string,
  email: string,
  role: "advisor_read" | "advisor_write",
): Promise<{ inviteToken: string }> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const { data, error } = await supabase
    .from("family_advisors")
    .insert({
      family_id: familyId,
      invited_email: email.toLowerCase().trim(),
      role,
      invited_by: user.id,
    })
    .select("invite_token")
    .single();

  if (error?.code === "23505") throw new Error("Este email já tem um convite ativo.");
  if (error) throw new Error(`Erro ao criar convite: ${error.message}`);

  const token = data.invite_token as string;
  const siteUrl = process.env["NEXT_PUBLIC_SITE_URL"] ?? "https://invest.tazima.com.br";
  const inviteUrl = `${siteUrl}/invite/accept?token=${token}`;
  const inviterName = user.user_metadata?.["full_name"] ?? user.email ?? "Um usuário";

  // Dispara o email em background — não bloqueia a resposta
  sendAdvisorInviteEmail({ toEmail: email.toLowerCase().trim(), inviterName, role, inviteUrl }).catch(
    (err) => console.error("sendAdvisorInviteEmail falhou:", err),
  );

  revalidatePath("/familia");
  return { inviteToken: token };
}

export async function revokeAdvisorAction(advisorId: string): Promise<void> {
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("family_advisors")
    .update({ status: "revoked" })
    .eq("id", advisorId);
  if (error) throw new Error(`Erro ao revogar acesso: ${error.message}`);
  revalidatePath("/familia");
}
