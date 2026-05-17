"use client";

import { useState } from "react";
import type { DBStrategyAllocation } from "@/types/database";
import type { Enums } from "@/types/database";

const ASSET_CLASSES: Array<{ value: Enums<"asset_class">; label: string }> = [
  { value: "fixed_income", label: "Renda Fixa" },
  { value: "stocks_br", label: "Ações BR" },
  { value: "stocks_intl", label: "Ações Intl." },
  { value: "fiis", label: "FIIs" },
  { value: "etf_br", label: "ETF BR" },
  { value: "etf_intl", label: "ETF Intl." },
  { value: "funds", label: "Fundos" },
  { value: "liquidity", label: "Liquidez" },
];

interface AllocationRow {
  asset_class: Enums<"asset_class">;
  target_pct: string;
  tolerance_pct: string;
}

interface Props {
  initial: DBStrategyAllocation[];
  onSave: (rows: AllocationRow[]) => Promise<void>;
}

export function AllocationEditor({ initial, onSave }: Props) {
  const [rows, setRows] = useState<AllocationRow[]>(
    initial.length > 0
      ? initial.map((a) => ({
          asset_class: a.asset_class,
          target_pct: (a.target_pct * 100).toFixed(1),
          tolerance_pct: (a.tolerance_pct * 100).toFixed(1),
        }))
      : ASSET_CLASSES.slice(0, 3).map((a) => ({
          asset_class: a.value,
          target_pct: "0",
          tolerance_pct: "5",
        })),
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const total = rows.reduce((s, r) => s + (parseFloat(r.target_pct) || 0), 0);
  const isValid = Math.abs(total - 100) < 0.01;

  function updateRow(i: number, field: keyof AllocationRow, value: string) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  }

  function addRow() {
    const used = new Set(rows.map((r) => r.asset_class));
    const available = ASSET_CLASSES.find((a) => !used.has(a.value));
    if (!available) return;
    setRows((prev) => [
      ...prev,
      { asset_class: available.value, target_pct: "0", tolerance_pct: "5" },
    ]);
  }

  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    if (!isValid) {
      setError(`A soma das alocações é ${total.toFixed(1)}%. Deve ser 100%.`);
      return;
    }
    setError("");
    setSaving(true);
    try {
      await onSave(
        rows.map((r) => ({
          asset_class: r.asset_class,
          target_pct: (parseFloat(r.target_pct) / 100).toFixed(4),
          tolerance_pct: (parseFloat(r.tolerance_pct) / 100).toFixed(4),
        })) as AllocationRow[],
      );
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    padding: "4px 8px",
    borderRadius: "6px",
    border: "1px solid var(--color-line)",
    backgroundColor: "var(--color-bg)",
    color: "var(--color-text)",
    fontSize: "12.5px",
    width: "100%",
    fontFamily: "var(--font-mono)",
  };

  return (
    <div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
        <thead>
          <tr className="hairline" style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-3)" }}>
            <th style={{ padding: "6px", textAlign: "left" }}>Classe</th>
            <th style={{ padding: "6px", textAlign: "right" }}>Alvo%</th>
            <th style={{ padding: "6px", textAlign: "right" }}>Tolerância%</th>
            <th style={{ padding: "6px", width: "32px" }} />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="hairline">
              <td style={{ padding: "6px" }}>
                <select
                  value={row.asset_class}
                  onChange={(e) => updateRow(i, "asset_class", e.target.value)}
                  style={{ ...inputStyle, fontFamily: "inherit" }}
                >
                  {ASSET_CLASSES.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </td>
              <td style={{ padding: "6px" }}>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={row.target_pct}
                  onChange={(e) => updateRow(i, "target_pct", e.target.value)}
                  style={{ ...inputStyle, textAlign: "right" }}
                />
              </td>
              <td style={{ padding: "6px" }}>
                <input
                  type="number"
                  min="0"
                  max="50"
                  step="0.1"
                  value={row.tolerance_pct}
                  onChange={(e) => updateRow(i, "tolerance_pct", e.target.value)}
                  style={{ ...inputStyle, textAlign: "right" }}
                />
              </td>
              <td style={{ padding: "6px" }}>
                <button
                  onClick={() => removeRow(i)}
                  style={{ background: "none", border: "none", color: "var(--color-text-3)", cursor: "pointer", fontSize: "12px" }}
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td style={{ padding: "8px 6px", fontSize: "11.5px", color: "var(--color-text-3)" }}>Total</td>
            <td style={{ padding: "8px 6px", textAlign: "right" }}>
              <span
                className="num"
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: isValid ? "var(--color-gain)" : "var(--color-crit)",
                }}
              >
                {total.toFixed(1)}%
              </span>
            </td>
            <td colSpan={2} />
          </tr>
        </tfoot>
      </table>

      {rows.length < ASSET_CLASSES.length && (
        <button
          onClick={addRow}
          style={{
            marginTop: "8px",
            fontSize: "12px",
            color: "var(--color-text-3)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px 0",
          }}
        >
          + Adicionar classe
        </button>
      )}

      {error && (
        <p style={{ margin: "8px 0 0", fontSize: "12px", color: "var(--color-crit)" }}>{error}</p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          marginTop: "16px",
          padding: "8px 20px",
          borderRadius: "6px",
          backgroundColor: "var(--color-text)",
          border: "none",
          color: "var(--color-bg)",
          fontSize: "13px",
          fontWeight: 600,
          cursor: saving ? "not-allowed" : "pointer",
          opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? "Salvando..." : "Salvar alocações"}
      </button>
    </div>
  );
}
