"use client";

import { addFamilyMember } from "@/app/(app)/familia/actions";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { formatCPF } from "@/lib/cpf";
import { Suspense } from "react";

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

function AddMemberFormInner({ familyId }: { familyId: string }) {
  const params = useSearchParams();
  const error = params.get("error");
  const [cpfDisplay, setCpfDisplay] = useState("");
  const [isMinor, setIsMinor] = useState(false);

  return (
    <form action={addFamilyMember} style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
      <input type="hidden" name="family_id" value={familyId} />
      <input type="hidden" name="is_minor" value={String(isMinor)} />

      {error && (
        <p
          style={{
            padding: "0.5rem 0.75rem",
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          <label htmlFor="member_cpf" style={labelStyle}>CPF</label>
          <input
            id="member_cpf"
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

        <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          <label htmlFor="member_birth_year" style={labelStyle}>Ano de nasc.</label>
          <input
            id="member_birth_year"
            name="birth_year"
            type="number"
            min="1900"
            max="2025"
            placeholder="Ex: 2000"
            style={inputStyle}
          />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
        <label htmlFor="member_full_name" style={labelStyle}>Nome completo</label>
        <input
          id="member_full_name"
          name="full_name"
          type="text"
          required
          placeholder="Nome conforme CPF"
          style={inputStyle}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
        <label htmlFor="member_nickname" style={labelStyle}>Apelido</label>
        <input
          id="member_nickname"
          name="nickname"
          type="text"
          required
          placeholder="Ex: Amora"
          style={inputStyle}
        />
      </div>

      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontSize: "0.8125rem",
          color: "var(--color-text-muted)",
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={isMinor}
          onChange={(e) => setIsMinor(e.target.checked)}
        />
        Menor de idade
      </label>

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
          alignSelf: "flex-start",
        }}
      >
        Adicionar membro
      </button>
    </form>
  );
}

export function AddMemberForm({ familyId }: { familyId: string }) {
  return (
    <Suspense fallback={null}>
      <AddMemberFormInner familyId={familyId} />
    </Suspense>
  );
}
