"use client";

import { useState, useTransition } from "react";
import { createTransferEvents, type TransferPositionInput } from "@/app/(app)/transfers/actions";

const INSTITUTIONS = ["btg", "xp", "nomad"] as const;
type Institution = (typeof INSTITUTIONS)[number];

export interface TransferablePosition {
  id: string;
  holder_id: string;
  holder_name: string;
  institution: string;
  asset_name: string;
  ticker: string | null;
  quantity: number;
  market_value_brl: number;
}

interface Props {
  positions: TransferablePosition[];
  onClose: () => void;
  onSuccess: () => void;
}

function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return result;
}

function fmt(n: number): string {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function TransferModal({ positions, onClose, onSuccess }: Props) {
  const fromInstitution = positions[0]?.institution ?? "";
  const availableDestinations = INSTITUTIONS.filter((i) => i !== fromInstitution);

  const [toInstitution, setToInstitution] = useState<Institution>(availableDestinations[0] ?? "xp");
  const [transferDate, setTransferDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [settlementDate, setSettlementDate] = useState(() =>
    addBusinessDays(new Date(), 2).toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>(
    Object.fromEntries(positions.map((p) => [p.id, p.quantity])),
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleQtyChange(posId: string, value: string) {
    const n = parseFloat(value);
    if (!isNaN(n) && n > 0) {
      const max = positions.find((p) => p.id === posId)?.quantity ?? n;
      setQuantities((prev) => ({ ...prev, [posId]: Math.min(n, max) }));
    }
  }

  function handleSubmit() {
    setError(null);
    const inputs: TransferPositionInput[] = positions.map((p) => ({
      holder_id: p.holder_id,
      asset_name: p.asset_name,
      ticker: p.ticker,
      quantity: quantities[p.id] ?? p.quantity,
    }));

    startTransition(async () => {
      const result = await createTransferEvents(
        inputs,
        fromInstitution,
        toInstitution,
        transferDate,
        settlementDate,
        notes,
      );
      if (result.error) {
        setError(result.error);
      } else {
        onSuccess();
      }
    });
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "7px 10px",
    borderRadius: "6px",
    border: "1px solid var(--color-line)",
    backgroundColor: "var(--color-bg-2)",
    color: "var(--color-text)",
    fontSize: "13px",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "11px",
    color: "var(--color-text-3)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: "4px",
    display: "block",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          backgroundColor: "var(--color-bg)",
          border: "1px solid var(--color-line)",
          borderRadius: "10px",
          padding: "24px",
          width: "min(560px, 95vw)",
          maxHeight: "90vh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: "15px" }}>Transferência de custódia</div>
            <div style={{ fontSize: "12px", color: "var(--color-text-3)", marginTop: "2px" }}>
              {fromInstitution.toUpperCase()} → {toInstitution.toUpperCase()}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--color-text-3)",
              fontSize: "18px",
              lineHeight: 1,
              padding: "4px",
            }}
          >
            ×
          </button>
        </div>

        {/* Posições */}
        <div>
          <span style={labelStyle}>Ativos ({positions.length})</span>
          <div
            style={{
              border: "1px solid var(--color-line)",
              borderRadius: "6px",
              overflow: "hidden",
            }}
          >
            {positions.map((pos, idx) => (
              <div
                key={pos.id}
                style={{
                  padding: "10px 12px",
                  borderTop: idx > 0 ? "1px solid var(--color-line)" : "none",
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 500 }}>
                    {pos.ticker ?? pos.asset_name.split(" ").slice(0, 3).join(" ")}
                  </div>
                  <div style={{ fontSize: "11.5px", color: "var(--color-text-3)" }}>
                    {pos.holder_name} · R$ {fmt(pos.market_value_brl)}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "11.5px", color: "var(--color-text-3)" }}>Qtd</span>
                  <input
                    type="number"
                    min={0.0001}
                    max={pos.quantity}
                    step="any"
                    value={quantities[pos.id] ?? pos.quantity}
                    onChange={(e) => handleQtyChange(pos.id, e.target.value)}
                    style={{
                      ...inputStyle,
                      width: "90px",
                      textAlign: "right",
                      fontFamily: "var(--font-mono)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Destino */}
        <div>
          <label style={labelStyle}>Destino</label>
          <select
            value={toInstitution}
            onChange={(e) => setToInstitution(e.target.value as Institution)}
            style={inputStyle}
          >
            {availableDestinations.map((inst) => (
              <option key={inst} value={inst}>
                {inst.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Datas */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div>
            <label style={labelStyle}>Data da transferência</label>
            <input
              type="date"
              value={transferDate}
              onChange={(e) => setTransferDate(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Data de liquidação (T+2)</label>
            <input
              type="date"
              value={settlementDate}
              onChange={(e) => setSettlementDate(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Notas */}
        <div>
          <label style={labelStyle}>Observações (opcional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="ex.: transferência por planejamento tributário"
            rows={2}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>

        {error && (
          <div
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              backgroundColor: "oklch(0.25 0.05 20)",
              border: "1px solid oklch(0.45 0.15 20)",
              fontSize: "12.5px",
              color: "var(--color-loss)",
            }}
          >
            {error}
          </div>
        )}

        {/* Ações */}
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            disabled={isPending}
            style={{
              padding: "8px 16px",
              borderRadius: "6px",
              border: "1px solid var(--color-line)",
              backgroundColor: "transparent",
              color: "var(--color-text-2)",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            style={{
              padding: "8px 16px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: "var(--color-text)",
              color: "var(--color-bg)",
              cursor: isPending ? "not-allowed" : "pointer",
              fontSize: "13px",
              fontWeight: 500,
              opacity: isPending ? 0.6 : 1,
            }}
          >
            {isPending ? "Registrando..." : `Registrar transferência`}
          </button>
        </div>
      </div>
    </div>
  );
}
