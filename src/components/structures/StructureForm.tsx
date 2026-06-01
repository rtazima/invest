"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveStructureAction } from "@/app/(app)/holders/[holderId]/structures/actions";
import type { StructureType, StructureStatus, LegRole, StructureLegInput, StructureWithLegs } from "@/lib/data/structures";

interface Props {
  holderId: string;
  initial?: StructureWithLegs;
}

const TYPE_OPTIONS: Array<{ value: StructureType; label: string }> = [
  { value: "covered_call", label: "Lançamento coberto (Covered Call)" },
  { value: "synthetic_dividend", label: "Dividendo sintético" },
  { value: "collar", label: "Collar" },
  { value: "protective_put", label: "Put de proteção (Protective Put)" },
];

const STATUS_OPTIONS: Array<{ value: StructureStatus; label: string }> = [
  { value: "active", label: "Ativa" },
  { value: "expired", label: "Expirada" },
  { value: "closed", label: "Encerrada" },
];

const ROLE_OPTIONS: Array<{ value: LegRole; label: string }> = [
  { value: "underlying", label: "Ativo subjacente" },
  { value: "short_call", label: "Call vendida (short)" },
  { value: "long_call", label: "Call comprada (long)" },
  { value: "short_put", label: "Put vendida (short)" },
  { value: "long_put", label: "Put comprada (long)" },
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

interface LegDraft {
  id: number;
  role: LegRole;
  ticker: string;
  strike: string;
  expiration_date: string;
  contracts: string;
  premium: string;
}

function legDraftToInput(leg: LegDraft, i: number): StructureLegInput {
  return {
    role: leg.role,
    ticker: leg.ticker.trim().toUpperCase() || null,
    asset_class: null,
    strike: leg.strike ? parseFloat(leg.strike) : null,
    expiration_date: leg.expiration_date || null,
    contracts: leg.contracts ? parseInt(leg.contracts) : null,
    premium: leg.premium ? parseFloat(leg.premium) : null,
    sort_order: i,
  };
}

export function StructureForm({ holderId, initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<StructureType>(initial?.type ?? "covered_call");
  const [status, setStatus] = useState<StructureStatus>(initial?.status ?? "active");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const [legs, setLegs] = useState<LegDraft[]>(() => {
    if (initial?.legs && initial.legs.length > 0) {
      return initial.legs.map((l, i) => ({
        id: i,
        role: l.role,
        ticker: l.ticker ?? "",
        strike: l.strike?.toString() ?? "",
        expiration_date: l.expiration_date ?? "",
        contracts: l.contracts?.toString() ?? "",
        premium: l.premium?.toString() ?? "",
      }));
    }
    return [
      { id: 0, role: "underlying", ticker: "", strike: "", expiration_date: "", contracts: "", premium: "" },
      { id: 1, role: "short_call", ticker: "", strike: "", expiration_date: "", contracts: "", premium: "" },
    ];
  });
  const [nextLegId, setNextLegId] = useState(legs.length);

  function updateLeg(id: number, field: keyof LegDraft, value: string) {
    setLegs((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  }

  function removeLeg(id: number) {
    setLegs((prev) => prev.filter((l) => l.id !== id));
  }

  function addLeg() {
    setLegs((prev) => [
      ...prev,
      { id: nextLegId, role: "short_call", ticker: "", strike: "", expiration_date: "", contracts: "", premium: "" },
    ]);
    setNextLegId((n) => n + 1);
  }

  function handleSubmit() {
    if (!name.trim()) { setError("Nome é obrigatório."); return; }
    if (legs.length === 0) { setError("Adicione pelo menos uma perna."); return; }
    setError("");

    startTransition(async () => {
      try {
        const { structureId } = await saveStructureAction(
          holderId,
          { name: name.trim(), type, status, notes: notes.trim() || null },
          legs.map(legDraftToInput),
          initial?.id,
        );
        router.push(`/holders/${holderId}/structures/${structureId}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao salvar.");
      }
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Cabeçalho */}
      <div
        style={{
          padding: "20px",
          borderRadius: "8px",
          border: "1px solid var(--color-line-2)",
          backgroundColor: "var(--color-bg-2)",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        <div>
          <label style={labelStyle}>Nome da estrutura</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Covered Call PETR4 Jan/27" style={inputStyle} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div>
            <label style={labelStyle}>Tipo</label>
            <select value={type} onChange={(e) => setType(e.target.value as StructureType)} style={inputStyle}>
              {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as StructureStatus)} style={inputStyle}>
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label style={labelStyle}>Observações</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" as const, fontFamily: "inherit" }} />
        </div>
      </div>

      {/* Pernas */}
      <div
        style={{
          padding: "20px",
          borderRadius: "8px",
          border: "1px solid var(--color-line-2)",
          backgroundColor: "var(--color-bg-2)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>Pernas</h2>
          <button onClick={addLeg} style={{ fontSize: "12px", color: "var(--color-text-3)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            + Adicionar
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {legs.map((leg) => (
            <div
              key={leg.id}
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
                  <label style={labelStyle}>Papel</label>
                  <select value={leg.role} onChange={(e) => updateLeg(leg.id, "role", e.target.value)} style={inputStyle}>
                    {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div style={{ width: "110px" }}>
                  <label style={labelStyle}>Ticker</label>
                  <input type="text" value={leg.ticker} onChange={(e) => updateLeg(leg.id, "ticker", e.target.value)} placeholder="PETR4" style={{ ...inputStyle, textTransform: "uppercase" }} />
                </div>
                <button onClick={() => removeLeg(leg.id)} style={{ background: "none", border: "none", color: "var(--color-text-3)", cursor: "pointer", fontSize: "14px", padding: "7px 4px", flexShrink: 0 }}>
                  ✕
                </button>
              </div>

              {leg.role !== "underlying" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "8px" }}>
                  <div>
                    <label style={labelStyle}>Strike</label>
                    <input type="number" value={leg.strike} onChange={(e) => updateLeg(leg.id, "strike", e.target.value)} placeholder="25.50" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Vencimento</label>
                    <input type="date" value={leg.expiration_date} onChange={(e) => updateLeg(leg.id, "expiration_date", e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Contratos</label>
                    <input type="number" value={leg.contracts} onChange={(e) => updateLeg(leg.id, "contracts", e.target.value)} placeholder="100" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle} title="Positivo = recebido; negativo = pago">Prêmio/contrato (R$)</label>
                    <input type="number" step="0.01" value={leg.premium} onChange={(e) => updateLeg(leg.id, "premium", e.target.value)} placeholder="1.50" style={inputStyle} />
                  </div>
                </div>
              )}
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
          {pending ? "Salvando..." : "Salvar estrutura"}
        </button>
      </div>
    </div>
  );
}
