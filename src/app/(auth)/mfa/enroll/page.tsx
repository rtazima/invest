import { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { MfaEnrollForm } from "@/components/auth/MfaEnrollForm";

export const metadata: Metadata = {
  title: "Ativar 2FA — Invest",
};

export default async function MfaEnrollPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

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
              fontSize: "1rem",
              fontWeight: 600,
              color: "var(--color-text)",
              margin: "0 0 0.25rem",
            }}
          >
            Autenticação em duas etapas
          </h1>
          <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", margin: 0 }}>
            Configure um autenticador para proteger sua conta.
          </p>
        </div>
        <Suspense fallback={null}>
          <MfaEnrollForm />
        </Suspense>
      </div>
    </div>
  );
}
