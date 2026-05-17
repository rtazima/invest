"use client";

import { signInWithOtp } from "@/app/(auth)/login/actions";
import { useSearchParams } from "next/navigation";

export function LoginForm() {
  const params = useSearchParams();
  const message = params.get("message");
  const error = params.get("error");

  if (message === "check-email") {
    return (
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            backgroundColor: "var(--color-gain-subtle)",
            border: "1px solid var(--color-gain)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1rem",
            fontSize: "20px",
          }}
        >
          ✉
        </div>
        <p style={{ color: "var(--color-text)", fontWeight: 500, marginBottom: "0.5rem" }}>
          Link enviado
        </p>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
          Verifique seu e-mail e clique no link para entrar.
        </p>
      </div>
    );
  }

  return (
    <form action={signInWithOtp} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {error && (
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

      <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
        <label
          htmlFor="email"
          style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", fontWeight: 500 }}
        >
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="rodrigo@tazima.com.br"
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
        Enviar link de acesso
      </button>

      <p style={{ fontSize: "0.75rem", color: "var(--color-text-faint)", textAlign: "center" }}>
        Sem senha — acesso via magic link no e-mail.
      </p>
    </form>
  );
}
