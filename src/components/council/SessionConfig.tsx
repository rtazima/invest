"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSessionAction } from "@/app/(app)/holders/[holderId]/council/actions";
import type { CouncilParticipantInput, CouncilMode } from "@/lib/data/council";

interface Props {
  holderId: string;
  holderName: string;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
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

const DEFAULT_PARTICIPANTS: CouncilParticipantInput[] = [
  { name: "Claude Opus", type: "llm", model: "claude-opus-4-7", role_focus: "risco e preservação de capital", sort_order: 0 },
  { name: "GPT-4o", type: "llm", model: "gpt-4o", role_focus: "crescimento e alocação estratégica", sort_order: 1 },
];

export function SessionConfig({ holderId, holderName }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<CouncilMode>("user_first");
  const [initialPrompt, setInitialPrompt] = useState("");
  const [maxRounds, setMaxRounds] = useState(5);
  const [participants, setParticipants] = useState<CouncilParticipantInput[]>(DEFAULT_PARTICIPANTS);

  function updateParticipant(idx: number, field: keyof CouncilParticipantInput, value: string) {
    setParticipants((prev) => prev.map((p, i) => {
      if (i !== idx) return p;
      if (field === "type") {
        return { ...p, type: value as "llm" | "human", model: value === "human" ? null : "claude-opus-4-7" };
      }
      return { ...p, [field]: value };
    }));
  }

  function addParticipant() {
    if (participants.length >= 6) return;
    setParticipants((prev) => [
      ...prev,
      { name: "", type: "llm", model: "claude-opus-4-7", role_focus: "", sort_order: prev.length },
    ]);
  }

  function removeParticipant(idx: number) {
    if (participants.length <= 2) return;
    setParticipants((prev) => prev.filter((_, i) => i !== idx).map((p, i) => ({ ...p, sort_order: i })));
  }

  function handleSubmit() {
    if (!title.trim()) { setError("Título é obrigatório."); return; }
    if (!initialPrompt.trim()) { setError("O ponto de partida do debate é obrigatório."); return; }
    if (participants.some((p) => !p.name.trim())) { setError("Todos os participantes precisam de nome."); return; }
    if (participants.filter((p) => p.type === "llm").length < 1) { setError("Adicione pelo menos 1 LLM."); return; }
    setError("");

    startTransition(async () => {
      try {
        const { sessionId } = await createSessionAction(holderId, title, mode, initialPrompt, maxRounds, participants);
        router.push(`/holders/${holderId}/council/${sessionId}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao criar sessão.");
      }
    });
  }

  const promptLabel = mode === "advisor_first" ? "Recomendação do assessor" : "O que você quer debater";
  const promptPlaceholder = mode === "advisor_first"
    ? "Cole ou escreva aqui o que o assessor está recomendando..."
    : "Descreva o que está pensando em investir ou a decisão que está avaliando...";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ padding: "20px", borderRadius: "8px", border: "1px solid var(--color-line-2)", backgroundColor: "var(--color-bg-2)", display: "flex", flexDirection: "column", gap: "14px" }}>
        <div>
          <label style={labelStyle}>Título da sessão</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`Conselho ${holderName} — Junho/26`} style={inputStyle} />
        </div>

        <div>
          <label style={labelStyle}>Modo</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {([
              { value: "user_first" as CouncilMode, label: "Eu tenho uma ideia", desc: "Você propõe, as LLMs debatem" },
              { value: "advisor_first" as CouncilMode, label: "Assessor propõe algo", desc: "Texto do assessor como ponto de partida" },
            ]).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setMode(opt.value)}
                style={{
                  padding: "12px",
                  borderRadius: "6px",
                  border: `1px solid ${mode === opt.value ? "var(--color-text)" : "var(--color-line)"}`,
                  backgroundColor: mode === opt.value ? "var(--color-text)" : "transparent",
                  color: mode === opt.value ? "var(--color-bg)" : "var(--color-text-2)",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div style={{ fontSize: "13px", fontWeight: 600 }}>{opt.label}</div>
                <div style={{ fontSize: "11.5px", marginTop: "2px", opacity: 0.75 }}>{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={labelStyle}>{promptLabel}</label>
          <textarea
            value={initialPrompt}
            onChange={(e) => setInitialPrompt(e.target.value)}
            rows={5}
            placeholder={promptPlaceholder}
            style={{ ...inputStyle, resize: "vertical" as const, fontFamily: "inherit", lineHeight: "1.5" }}
          />
        </div>

        <div style={{ width: "160px" }}>
          <label style={labelStyle}>Máx. de rodadas</label>
          <select value={maxRounds} onChange={(e) => setMaxRounds(Number(e.target.value))} style={inputStyle}>
            {[3, 5, 7, 10].map((n) => <option key={n} value={n}>{n} rodadas</option>)}
          </select>
        </div>
      </div>

      <div style={{ padding: "20px", borderRadius: "8px", border: "1px solid var(--color-line-2)", backgroundColor: "var(--color-bg-2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
          <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>Participantes</h2>
          {participants.length < 6 && (
            <button onClick={addParticipant} style={{ fontSize: "12px", color: "var(--color-text-3)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              + Adicionar
            </button>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {participants.map((p, idx) => (
            <div key={idx} style={{ padding: "12px", borderRadius: "6px", border: "1px solid var(--color-line)", backgroundColor: "var(--color-bg)", display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 110px auto", gap: "8px", alignItems: "end" }}>
                <div>
                  <label style={labelStyle}>Nome</label>
                  <input type="text" value={p.name} onChange={(e) => updateParticipant(idx, "name", e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Tipo</label>
                  <select value={p.type} onChange={(e) => updateParticipant(idx, "type", e.target.value)} style={inputStyle}>
                    <option value="llm">LLM</option>
                    <option value="human">Humano</option>
                  </select>
                </div>
                {p.type === "llm" && (
                  <div>
                    <label style={labelStyle}>Modelo</label>
                    <select value={p.model ?? ""} onChange={(e) => updateParticipant(idx, "model", e.target.value)} style={inputStyle}>
                      <option value="claude-opus-4-7">Claude Opus</option>
                      <option value="gpt-4o">GPT-4o</option>
                    </select>
                  </div>
                )}
                <button
                  onClick={() => removeParticipant(idx)}
                  disabled={participants.length <= 2}
                  style={{ background: "none", border: "none", color: "var(--color-text-3)", cursor: participants.length <= 2 ? "not-allowed" : "pointer", fontSize: "14px", padding: "7px 4px", alignSelf: "flex-end", opacity: participants.length <= 2 ? 0.3 : 1 }}
                >
                  ✕
                </button>
              </div>
              <div>
                <label style={labelStyle}>Foco / perspectiva</label>
                <input type="text" value={p.role_focus} onChange={(e) => updateParticipant(idx, "role_focus", e.target.value)} placeholder="ex: risco e preservação de capital" style={inputStyle} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && <p style={{ margin: 0, fontSize: "12.5px", color: "var(--color-crit)" }}>{error}</p>}

      <div style={{ display: "flex", gap: "8px" }}>
        <button onClick={() => router.back()} style={{ padding: "9px 16px", borderRadius: "6px", border: "1px solid var(--color-line)", backgroundColor: "transparent", color: "var(--color-text-2)", fontSize: "13px", cursor: "pointer" }}>
          Cancelar
        </button>
        <button onClick={handleSubmit} disabled={pending} style={{ padding: "9px 20px", borderRadius: "6px", backgroundColor: "var(--color-text)", border: "none", color: "var(--color-bg)", fontSize: "13px", fontWeight: 600, cursor: pending ? "not-allowed" : "pointer", opacity: pending ? 0.7 : 1 }}>
          {pending ? "Criando..." : "Criar sessão"}
        </button>
      </div>
    </div>
  );
}
