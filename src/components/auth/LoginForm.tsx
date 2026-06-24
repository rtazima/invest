"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const params = useSearchParams();
  const errorParam = params.get("error");
  const prefillEmail = params.get("email") ?? "";
  const next = params.get("next") ?? "";

  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(errorParam ?? "");
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError("Informe e-mail e senha.");
      return;
    }
    setError("");

    startTransition(async () => {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        setError(signInError.message);
        return;
      }
      // Navegação completa para o middleware/SSR enxergar os cookies de sessão.
      window.location.assign(next || "/dashboard");
    });
  }

  const inputStyle: React.CSSProperties = {
    padding: "0.5rem 0.75rem",
    backgroundColor: "var(--color-bg)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    color: "var(--color-text)",
    fontSize: "0.875rem",
    outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: "0.8125rem",
    color: "var(--color-text-muted)",
    fontWeight: 500,
  };

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
        <label htmlFor="email" style={labelStyle}>E-mail</label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          style={inputStyle}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
        <label htmlFor="password" style={labelStyle}>Senha</label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          style={inputStyle}
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
        {pending ? "Entrando..." : "Entrar"}
      </button>

      <p style={{ fontSize: "0.75rem", color: "var(--color-text-faint)", textAlign: "center" }}>
        Primeiro acesso?{" "}
        <a href="/register" style={{ color: "var(--color-brand)", textDecoration: "none" }}>
          Criar conta
        </a>
      </p>
    </form>
  );
}
