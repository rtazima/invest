"use client";

import { registerWithOtp } from "@/app/(auth)/register/actions";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { formatCPF } from "@/lib/cpf";
import Link from "next/link";

const inputStyle = {
  padding: "0.5rem 0.75rem",
  backgroundColor: "var(--color-bg)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  color: "var(--color-text)",
  fontSize: "0.875rem",
  outline: "none",
  width: "100%",
  boxSizing: "border-box" as const,
};

const labelStyle = {
  fontSize: "0.8125rem",
  color: "var(--color-text-muted)",
  fontWeight: 500,
};

export function RegisterForm() {
  const params = useSearchParams();
  const message = params.get("message");
  const error = params.get("error");
  const [cpfDisplay, setCpfDisplay] = useState("");

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
          Verifique seu e-mail e clique no link para continuar o cadastro.
        </p>
      </div>
    );
  }

  return (
    <form action={registerWithOtp} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
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
        <label htmlFor="email" style={labelStyle}>E-mail</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="seuemail@exemplo.com"
          style={inputStyle}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
        <label htmlFor="cpf" style={labelStyle}>CPF</label>
        <input
          id="cpf"
          name="cpf"
          type="text"
          required
          inputMode="numeric"
          autoComplete="off"
          placeholder="000.000.000-00"
          value={cpfDisplay}
          maxLength={14}
          onChange={(e) => setCpfDisplay(formatCPF(e.target.value))}
          style={inputStyle}
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
        Criar conta
      </button>

      <p style={{ fontSize: "0.75rem", color: "var(--color-text-faint)", textAlign: "center" }}>
        Já tem conta?{" "}
        <Link
          href="/login"
          style={{ color: "var(--color-brand)", textDecoration: "none" }}
        >
          Entrar
        </Link>
      </p>
    </form>
  );
}
