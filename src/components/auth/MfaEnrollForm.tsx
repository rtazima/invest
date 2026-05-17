"use client";

import { useEffect, useState } from "react";
import { completeMfaEnroll } from "@/app/(auth)/mfa/enroll/actions";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";

interface EnrollData {
  factorId: string;
  totpUri: string;
  secret: string;
}

export function MfaEnrollForm() {
  const params = useSearchParams();
  const error = params.get("error");
  const [enrollData, setEnrollData] = useState<EnrollData | null>(null);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.mfa
      .enroll({ factorType: "totp", friendlyName: "Invest App" })
      .then(({ data, error: err }) => {
        if (err || !data) {
          setEnrollError(err?.message ?? "Erro ao iniciar cadastro MFA");
        } else {
          setEnrollData({
            factorId: data.id,
            totpUri: data.totp.uri,
            secret: data.totp.secret,
          });
        }
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", textAlign: "center" }}>
        Gerando código QR…
      </p>
    );
  }

  if (enrollError) {
    return (
      <p
        style={{
          padding: "0.625rem 0.75rem",
          backgroundColor: "var(--color-critical-subtle)",
          border: "1px solid var(--color-critical)",
          borderRadius: "var(--radius-md)",
          color: "var(--color-critical)",
          fontSize: "0.8125rem",
        }}
      >
        {enrollError}
      </p>
    );
  }

  if (!enrollData) return null;

  return (
    <form action={completeMfaEnroll} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <input type="hidden" name="factorId" value={enrollData.factorId} />

      {/* Instruções */}
      <ol
        style={{
          margin: 0,
          paddingLeft: "1.25rem",
          color: "var(--color-text-muted)",
          fontSize: "0.8125rem",
          lineHeight: 1.6,
          display: "flex",
          flexDirection: "column",
          gap: "0.25rem",
        }}
      >
        <li>Abra Google Authenticator, Authy ou similar</li>
        <li>Adicione conta manualmente com a chave abaixo</li>
        <li>Digite o código de 6 dígitos gerado</li>
      </ol>

      {/* Chave secreta */}
      <div
        style={{
          backgroundColor: "var(--color-bg)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
          padding: "0.75rem",
        }}
      >
        <p style={{ fontSize: "0.75rem", color: "var(--color-text-faint)", marginBottom: "0.375rem" }}>
          Chave secreta
        </p>
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.8125rem",
            color: "var(--color-text)",
            letterSpacing: "0.05em",
            wordBreak: "break-all",
            userSelect: "all",
          }}
        >
          {enrollData.secret}
        </p>
      </div>

      {(error ?? null) && (
        <p
          style={{
            padding: "0.625rem 0.75rem",
            backgroundColor: "var(--color-critical-subtle)",
            border: "1px solid var(--color-critical)",
            borderRadius: "var(--radius-md)",
            color: "var(--color-critical)",
            fontSize: "0.8125rem",
          }}
        >
          {error}
        </p>
      )}

      {/* Código TOTP */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
        <label
          htmlFor="code"
          style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", fontWeight: 500 }}
        >
          Código do autenticador
        </label>
        <input
          id="code"
          name="code"
          type="text"
          required
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          autoComplete="one-time-code"
          placeholder="000000"
          style={{
            padding: "0.5rem 0.75rem",
            backgroundColor: "var(--color-bg)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            color: "var(--color-text)",
            fontSize: "1.25rem",
            letterSpacing: "0.3em",
            fontFamily: "var(--font-mono)",
            textAlign: "center",
            outline: "none",
          }}
        />
      </div>

      <button
        type="submit"
        style={{
          padding: "0.5rem 1rem",
          backgroundColor: "var(--color-brand)",
          border: "none",
          borderRadius: "var(--radius-md)",
          color: "white",
          fontSize: "0.875rem",
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        Ativar autenticação em duas etapas
      </button>
    </form>
  );
}
