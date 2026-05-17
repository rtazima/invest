"use client";

import { verifyMfa } from "@/app/(auth)/mfa/verify/actions";
import { useSearchParams } from "next/navigation";

export function MfaVerifyForm() {
  const params = useSearchParams();
  const error = params.get("error");

  return (
    <form action={verifyMfa} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
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
        Verificar
      </button>
    </form>
  );
}
