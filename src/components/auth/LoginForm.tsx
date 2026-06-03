"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { setAuthRedirectCookie } from "@/app/(auth)/login/actions";

const SITE_URL = process.env["NEXT_PUBLIC_SITE_URL"] ?? "http://localhost:3000";

export function LoginForm() {
  const params = useSearchParams();
  const errorParam = params.get("error");
  const prefillEmail = params.get("email") ?? "";
  const next = params.get("next") ?? "";

  const [email, setEmail] = useState(prefillEmail);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(errorParam ?? "");
  const [pending, startTransition] = useTransition();

  if (sent) {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: "40px", height: "40px", borderRadius: "50%",
          backgroundColor: "var(--color-gain-subtle)", border: "1px solid var(--color-gain)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 1rem", fontSize: "20px",
        }}>
          ✉
        </div>
        <p style={{ color: "var(--color-text)", fontWeight: 500, marginBottom: "0.5rem" }}>
          Link de acesso enviado
        </p>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
          Verifique seu e-mail e clique no link para entrar.
        </p>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) { setError("Informe o e-mail."); return; }
    setError("");

    startTransition(async () => {
      const nextPath = next || "/dashboard";

      if (nextPath !== "/dashboard") {
        await setAuthRedirectCookie(nextPath);
      }

      const supabase = createClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${SITE_URL}/auth/callback` },
      });

      if (otpError) {
        setError(otpError.message);
      } else {
        setSent(true);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {error && (
        <p style={{
          padding: "0.625rem 0.75rem",
          backgroundColor: "var(--color-critical-subtle)",
          border: "1px solid var(--color-critical)",
          borderRadius: "var(--radius-md)",
          color: "var(--color-critical)",
          fontSize: "0.8125rem",
        }}>
          {error}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
        <label htmlFor="email" style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", fontWeight: 500 }}>
          E-mail
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          style={{
            padding: "0.5rem 0.75rem",
            backgroundColor: "var(--color-bg)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            color: "var(--color-text)",
            fontSize: "0.875rem",
            outline: "none",
          }}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        style={{
          padding: "0.5rem 1rem",
          backgroundColor: "var(--color-brand)",
          border: "none",
          borderRadius: "var(--radius-md)",
          color: "white",
          fontSize: "0.875rem",
          fontWeight: 500,
          cursor: pending ? "not-allowed" : "pointer",
          opacity: pending ? 0.7 : 1,
        }}
      >
        {pending ? "Enviando..." : "Enviar link de acesso"}
      </button>

      <p style={{ fontSize: "0.75rem", color: "var(--color-text-faint)", textAlign: "center" }}>
        Sem senha — acesso via magic link no e-mail.
      </p>

      <p style={{ fontSize: "0.75rem", color: "var(--color-text-faint)", textAlign: "center" }}>
        Primeiro acesso?{" "}
        <a href="/register" style={{ color: "var(--color-brand)", textDecoration: "none" }}>
          Criar conta
        </a>
      </p>
    </form>
  );
}
