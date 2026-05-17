import { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { OnboardingForm } from "@/components/onboarding/OnboardingForm";

export const metadata: Metadata = {
  title: "Configurar perfil — Invest",
};

export default async function OnboardingPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const metaCpf = (user.user_metadata?.["cpf"] as string | undefined) ?? "";
  const hasCpfInMetadata = metaCpf.length === 11;

  // Verifica se o CPF já está linkado a algum holder (pré-cadastrado pelo owner)
  let isMemberClaim = false;
  if (hasCpfInMetadata) {
    const { data: existing } = await supabase
      .from("holders")
      .select("id")
      .eq("cpf", metaCpf)
      .is("user_id", null)
      .maybeSingle();
    isMemberClaim = existing !== null;
  }

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100dvh",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--color-bg)",
        padding: "1rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          padding: "2rem",
          backgroundColor: "var(--color-surface)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div style={{ marginBottom: "1.5rem" }}>
          <h1
            style={{
              fontSize: "1.125rem",
              fontWeight: 700,
              color: "var(--color-text)",
              margin: "0 0 0.25rem",
            }}
          >
            Configurar perfil
          </h1>
          <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", margin: 0 }}>
            {isMemberClaim
              ? "Bem-vindo! Conclua seu perfil para acessar a plataforma."
              : "Vamos configurar sua família e seu perfil."}
          </p>
        </div>
        <Suspense fallback={null}>
          <OnboardingForm
            hasCpfInMetadata={hasCpfInMetadata}
            isMemberClaim={isMemberClaim}
          />
        </Suspense>
      </div>
    </div>
  );
}
