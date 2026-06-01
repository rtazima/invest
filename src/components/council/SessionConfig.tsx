"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSessionAction } from "@/app/(app)/holders/[holderId]/council/actions";
import type { CouncilParticipantInput, CouncilModel } from "@/lib/data/council";

interface Props {
  holderId: string;
  holderName: string;
}

const MODEL_OPTIONS: Array<{ value: CouncilModel; label: string }> = [
  { value: "claude-opus-4-7", label: "Claude Opus 4.7" },
  { value: "gpt-4o", label: "GPT-4o" },
];

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "7px 10px",
  borderRadius: "6px",
  border: "1px solid var(--color-line)",
  backgroundColor: "var(--color-bg)",
  color: "var(--color-text)",
  fontSize: "13px",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "11.5px",
  fontWeight: 500,
  color: "var(--color-text-3)",
  marginBottom: "4px",
};

interface ParticipantDraft {
  id: number;
  name: string;
  type: "llm" | "human";
  model: CouncilModel;
  role_focus: string;
}

const DEFAULT_PARTICIPANTS: ParticipantDraft[] = [
  { id: 1, name: "Claude Opus", type: "llm", model: "claude-opus-4-7", role_focus: "Análise quantitativa e risco" },
  { id: 2, name: "GPT-4o", type: "llm", model: "gpt-4o", role_focus: "Alocação global e diversificação" },
];

export function SessionConfig({ holderId, holderName }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(`Conselho — ${holderName}`);
  const [participants, setParticipants] = useState<ParticipantDraft[]>(DEFAULT_PARTICIPANTS);
  const [nextId, setNextId] = useState(3);
  const [error, setError] = useState("");

  function addParticipant() {
    setParticipants((prev) => [
      ...prev,
      { id: nextId, name: "", type: "llm", model: "claude-opus-4-7", role_focus: "" },
    ]);
    setNextId((n) => n + 1);
  }

  function removeParticipant(id: number) {
    setParticipants((prev) => prev.filter((p) => p.id !== id));
  }

  function updateParticipant(id: number, field: keyof ParticipantDraft, value: string) {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    );
  }

  function handleSubmit() {
    setError("");

    if (!title.trim()) { setError("Título é obrigatório."); return; }
    if (participants.length < 2) { setError("Adicione pelo menos 2 participantes."); return; }

    for (const p of participants) {
      if (!p.name.trim()) { setError("Todos os participantes precisam de um nome."); return; }
    }

    const input: CouncilParticipantInput[] = participants.map((p, i) => ({
      name: p.name.trim(),
      type: p.type,
      model: p.type === "llm" ? p.model : null,
      role_focus: p.role_focus.trim(),
      sort_order: i,
    }));

    startTransition(async () => {
      try {
        const { sessionId } = await createSessionAction(holderId, title.trim(), input);
        router.push(`/holders/${holderId}/council/${sessionId}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao criar sessão.");
      }
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div
        style={{
          padding: "20px",
          borderRadius: "8px",
          border: "1px solid var(--color-line-2)",
          backgroundColor: "var(--color-bg-2)",
        }}
      >
        <label style={{ ...labelStyle, fontSize: "12px" }}>Título da sessão</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={inputStyle}
        />
      </div>

      <div
        style={{
          padding: "20px",
          borderRadius: "8px",
          border: "1px solid var(--color-line-2)",
          backgroundColor: "var(--color-bg-2)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>Participantes</h2>
          {participants.length < 6 && (
            <button
              onClick={addParticipant}
              style={{
                fontSize: "12px",
                color: "var(--color-text-3)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              + Adicionar
            </button>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {participants.map((p) => (
            <div
              key={p.id}
              style={{
                padding: "14px",
                borderRadius: "6px",
                border: "1px solid var(--color-line)",
                backgroundColor: "var(--color-bg)",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Nome</label>
                  <input
                    type="text"
                    value={p.name}
                    onChange={(e) => updateParticipant(p.id, "name", e.target.value)}
                    placeholder="Ex: Claude Opus"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Tipo</label>
                  <select
                    value={p.type}
                    onChange={(e) => updateParticipant(p.id, "type", e.target.value)}
                    style={{ ...inputStyle, width: "110px" }}
                  >
                    <option value="llm">LLM</option>
                    <option value="human">Humano</option>
                  </select>
                </div>
                {p.type === "llm" && (
                  <div>
                    <label style={labelStyle}>Modelo</label>
                    <select
                      value={p.model}
                      onChange={(e) => updateParticipant(p.id, "model", e.target.value)}
                      style={{ ...inputStyle, width: "150px" }}
                    >
                      {MODEL_OPTIONS.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                )}
                <button
                  onClick={() => removeParticipant(p.id)}
                  disabled={participants.length <= 2}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--color-text-3)",
                    cursor: participants.length <= 2 ? "not-allowed" : "pointer",
                    fontSize: "14px",
                    padding: "7px 4px",
                    opacity: participants.length <= 2 ? 0.3 : 1,
                    flexShrink: 0,
                  }}
                >
                  ✕
                </button>
              </div>

              <div>
                <label style={labelStyle}>Foco / papel</label>
                <input
                  type="text"
                  value={p.role_focus}
                  onChange={(e) => updateParticipant(p.id, "role_focus", e.target.value)}
                  placeholder="Ex: Preservação de capital, renda fixa"
                  style={inputStyle}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <p style={{ margin: 0, fontSize: "12.5px", color: "var(--color-crit)" }}>{error}</p>
      )}

      <div style={{ display: "flex", gap: "8px" }}>
        <button
          onClick={() => router.back()}
          style={{
            padding: "9px 16px",
            borderRadius: "6px",
            border: "1px solid var(--color-line)",
            backgroundColor: "transparent",
            color: "var(--color-text-2)",
            fontSize: "13px",
            cursor: "pointer",
          }}
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={pending}
          style={{
            padding: "9px 20px",
            borderRadius: "6px",
            backgroundColor: "var(--color-text)",
            border: "none",
            color: "var(--color-bg)",
            fontSize: "13px",
            fontWeight: 600,
            cursor: pending ? "not-allowed" : "pointer",
            opacity: pending ? 0.7 : 1,
          }}
        >
          {pending ? "Criando..." : "Iniciar conselho"}
        </button>
      </div>
    </div>
  );
}
