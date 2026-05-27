"use client";

import { updateFamilyMember } from "@/app/(app)/familia/actions";
import type { DBHolder } from "@/types/database";

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
  holder: DBHolder;
}

export function EditMemberForm({ holder }: Props) {
  return (
    <form action={updateFamilyMember} style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
      <input type="hidden" name="holder_id" value={holder.id} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          <label style={labelStyle}>Nome completo</label>
          <input
            name="full_name"
            type="text"
            required
            defaultValue={holder.full_name ?? ""}
            placeholder="Nome conforme CPF"
            style={inputStyle}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          <label style={labelStyle}>Apelido</label>
          <input
            name="nickname"
            type="text"
            required
            defaultValue={holder.name}
            placeholder="Ex: Amora"
            style={inputStyle}
          />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
        <label style={labelStyle}>Data de nascimento</label>
        <input
          name="birth_date"
          type="date"
          defaultValue={holder.birth_date ?? ""}
          style={{ ...inputStyle, maxWidth: "200px" }}
        />
      </div>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          type="submit"
          style={{
            padding: "0.4375rem 0.875rem",
            backgroundColor: "var(--color-brand)",
            border: "none",
            borderRadius: "var(--radius-md)",
            color: "white",
            fontSize: "0.8125rem",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Salvar
        </button>
        <a
          href="/familia"
          style={{
            padding: "0.4375rem 0.875rem",
            backgroundColor: "transparent",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            color: "var(--color-text-muted)",
            fontSize: "0.8125rem",
            fontWeight: 500,
            cursor: "pointer",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          Cancelar
        </a>
      </div>
    </form>
  );
}
