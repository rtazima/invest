"use client";

import { completeOnboarding } from "@/app/onboarding/actions";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { formatCPF } from "@/lib/cpf";

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
  fontWeight: 500 as const,
};

interface Props {
  hasCpfInMetadata: boolean;
  isMemberClaim: boolean;
}

export function OnboardingForm({ hasCpfInMetadata, isMemberClaim }: Props) {
  const params = useSearchParams();
  const error = params.get("error");
  const [cpfDisplay, setCpfDisplay] = useState("");

  return (
    <form
      action={completeOnboarding}
      style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
    >
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

      {isMemberClaim && (
        <p
          style={{
            padding: "0.625rem 0.75rem",
            backgroundColor: "var(--color-gain-subtle)",
            border: "1px solid var(--color-gain)",
            borderRadius: "var(--radius-md)",
            color: "var(--color-gain)",
            fontSize: "0.8125rem",
          }}
        >
          CPF encontrado na família. Complete seus dados para continuar.
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
        <label htmlFor="full_name" style={labelStyle}>Nome completo</label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          required
          autoComplete="name"
          placeholder="Nome conforme CPF"
          style={inputStyle}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
        <label htmlFor="nickname" style={labelStyle}>Apelido (exibido na plataforma)</label>
        <input
          id="nickname"
          name="nickname"
          type="text"
          required
          placeholder="Ex: Rodrigo"
          style={inputStyle}
        />
      </div>

      {!isMemberClaim && !hasCpfInMetadata && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          <label htmlFor="cpf" style={labelStyle}>CPF</label>
          <input
            id="cpf"
            name="cpf"
            type="text"
            required
            inputMode="numeric"
            placeholder="000.000.000-00"
            value={cpfDisplay}
            maxLength={14}
            onChange={(e) => setCpfDisplay(formatCPF(e.target.value))}
            style={inputStyle}
          />
        </div>
      )}

      {!isMemberClaim && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          <label htmlFor="family_name" style={labelStyle}>Nome da família (opcional)</label>
          <input
            id="family_name"
            name="family_name"
            type="text"
            placeholder="Ex: Família Tazima"
            style={inputStyle}
          />
          <span style={{ fontSize: "0.75rem", color: "var(--color-text-faint)" }}>
            Se em branco, usamos &quot;Família + apelido&quot;.
          </span>
        </div>
      )}

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
          marginTop: "0.5rem",
        }}
      >
        Continuar
      </button>
    </form>
  );
}
