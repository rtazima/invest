import { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { MfaVerifyForm } from "@/components/auth/MfaVerifyForm";

export const metadata: Metadata = {
  title: "Verificar 2FA — Invest",
};

export default async function MfaVerifyPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Se já está em aal2, vai direto pro dashboard
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel === "aal2") redirect("/dashboard");

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
          maxWidth: "360px",
          padding: "2rem",
          backgroundColor: "var(--color-surface)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div style={{ marginBottom: "1.5rem" }}>
          <h1
            style={{
              fontSize: "1rem",
              fontWeight: 600,
              color: "var(--color-text)",
              margin: "0 0 0.25rem",
            }}
          >
            Verificação em duas etapas
          </h1>
          <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", margin: 0 }}>
            Digite o código do seu aplicativo autenticador.
          </p>
        </div>
        <Suspense fallback={null}>
          <MfaVerifyForm />
        </Suspense>
      </div>
    </div>
  );
}
