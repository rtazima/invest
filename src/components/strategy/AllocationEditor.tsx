"use client";

import { useState } from "react";
import type { DBStrategyAllocation } from "@/types/database";
import type { Enums } from "@/types/database";

const NATIONAL_CLASSES: Array<{ value: Enums<"asset_class">; label: string }> = [
  { value: "fixed_income", label: "Renda Fixa" },
  { value: "stocks_br", label: "Ações BR" },
  { value: "fiis", label: "FIIs" },
  { value: "etf_br", label: "ETF BR" },
  { value: "funds", label: "Fundos" },
  { value: "liquidity", label: "Liquidez" },
];

const INTL_CLASSES: Array<{ value: Enums<"asset_class">; label: string }> = [
  { value: "stocks_intl", label: "Ações Intl." },
  { value: "etf_intl", label: "ETF Intl." },
];

const NATIONAL_SET = new Set<string>(NATIONAL_CLASSES.map((c) => c.value));

interface SubRow {
  asset_class: Enums<"asset_class">;
  sub_pct: string;       // % within geo bucket (0-100)
  tolerance_pct: string; // absolute portfolio tolerance (0-100)
}

interface AllocationRow {
  asset_class: Enums<"asset_class">;
  target_pct: string;
  tolerance_pct: string;
}

interface Suggestion {
  allocations: Array<{ asset_class: string; target_pct: number; tolerance_pct: number }>;
  reasoning: string;
}

interface Props {
  initial: DBStrategyAllocation[];
  onSave: (rows: AllocationRow[]) => Promise<void>;
  onSuggest?: () => Promise<Suggestion>;
}

function initState(initial: DBStrategyAllocation[]): {
  nationalPct: string;
  nationalRows: SubRow[];
  intlRows: SubRow[];
} {
  if (initial.length === 0) {
    return {
      nationalPct: "80",
      nationalRows: [
        { asset_class: "fixed_income" as Enums<"asset_class">, sub_pct: "60", tolerance_pct: "5" },
        { asset_class: "stocks_br" as Enums<"asset_class">, sub_pct: "40", tolerance_pct: "5" },
      ],
      intlRows: [
        { asset_class: "stocks_intl" as Enums<"asset_class">, sub_pct: "100", tolerance_pct: "5" },
      ],
    };
  }

  const nat = initial.filter((a) => NATIONAL_SET.has(a.asset_class));
  const intl = initial.filter((a) => !NATIONAL_SET.has(a.asset_class));
  const natTotal = nat.reduce((s, a) => s + a.target_pct, 0);
  const intlTotal = intl.reduce((s, a) => s + a.target_pct, 0);

  return {
    nationalPct: (natTotal * 100).toFixed(1),
    nationalRows:
      nat.length > 0
        ? nat.map((a) => ({
            asset_class: a.asset_class,
            sub_pct: natTotal > 0 ? ((a.target_pct / natTotal) * 100).toFixed(1) : "0",
            tolerance_pct: (a.tolerance_pct * 100).toFixed(1),
          }))
        : [{ asset_class: "fixed_income" as Enums<"asset_class">, sub_pct: "100", tolerance_pct: "5" }],
    intlRows: intl.map((a) => ({
      asset_class: a.asset_class,
      sub_pct: intlTotal > 0 ? ((a.target_pct / intlTotal) * 100).toFixed(1) : "0",
      tolerance_pct: (a.tolerance_pct * 100).toFixed(1),
    })),
  };
}

const inputStyleBase: React.CSSProperties = {
  padding: "4px 8px",
  borderRadius: "6px",
  border: "1px solid var(--color-line)",
  backgroundColor: "var(--color-bg)",
  color: "var(--color-text)",
  fontSize: "12.5px",
  fontFamily: "var(--font-mono)",
};

interface SubTableProps {
  title: string;
  geoPct: number;
  rows: SubRow[];
  classes: Array<{ value: Enums<"asset_class">; label: string }>;
  subTotal: number;
  subValid: boolean;
  onUpdate: (i: number, field: keyof SubRow, value: string) => void;
  onRemove: (i: number) => void;
  onAdd: () => void;
  canAdd: boolean;
}

function SubTable({
  title,
  geoPct,
  rows,
  classes,
  subTotal,
  subValid,
  onUpdate,
  onRemove,
  onAdd,
  canAdd,
}: SubTableProps) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "6px" }}>
        <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text)" }}>{title}</span>
        <span style={{ fontSize: "11.5px", color: "var(--color-text-3)" }}>
          {geoPct.toFixed(1)}% do portfólio
        </span>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
        <thead>
          <tr
            className="hairline"
            style={{
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--color-text-3)",
            }}
          >
            <th style={{ padding: "5px 6px", textAlign: "left" }}>Classe</th>
            <th style={{ padding: "5px 6px", textAlign: "right" }}>Sub%</th>
            <th style={{ padding: "5px 6px", textAlign: "right" }}>Tolerância%</th>
            <th style={{ padding: "5px 6px", textAlign: "right" }}>~Total</th>
            <th style={{ padding: "5px 6px", width: "28px" }} />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const absApprox = geoPct > 0 ? (geoPct * (parseFloat(row.sub_pct) || 0)) / 100 : 0;
            return (
              <tr key={i} className="hairline">
                <td style={{ padding: "5px 6px" }}>
                  <select
                    value={row.asset_class}
                    onChange={(e) => onUpdate(i, "asset_class", e.target.value)}
                    style={{ ...inputStyleBase, fontFamily: "inherit", width: "100%", boxSizing: "border-box" }}
                  >
                    {classes.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: "5px 6px" }}>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={row.sub_pct}
                    onChange={(e) => onUpdate(i, "sub_pct", e.target.value)}
                    style={{ ...inputStyleBase, textAlign: "right", width: "72px" }}
                  />
                </td>
                <td style={{ padding: "5px 6px" }}>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    step="0.1"
                    value={row.tolerance_pct}
                    onChange={(e) => onUpdate(i, "tolerance_pct", e.target.value)}
                    style={{ ...inputStyleBase, textAlign: "right", width: "72px" }}
                  />
                </td>
                <td style={{ padding: "5px 6px", textAlign: "right", whiteSpace: "nowrap" }}>
                  <span className="num" style={{ fontSize: "12px", color: "var(--color-text-3)" }}>
                    {absApprox.toFixed(1)}%
                  </span>
                </td>
                <td style={{ padding: "5px 6px" }}>
                  <button
                    onClick={() => onRemove(i)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--color-text-3)",
                      cursor: "pointer",
                      fontSize: "12px",
                      padding: 0,
                    }}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td style={{ padding: "6px", fontSize: "11.5px", color: "var(--color-text-3)" }}>Total</td>
            <td style={{ padding: "6px", textAlign: "right" }}>
              <span
                className="num"
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: subValid ? "var(--color-gain)" : "var(--color-crit)",
                }}
              >
                {subTotal.toFixed(1)}%
              </span>
            </td>
            <td colSpan={3} />
          </tr>
        </tfoot>
      </table>

      {canAdd && (
        <button
          onClick={onAdd}
          style={{
            marginTop: "6px",
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
    </div>
  );
}

export function AllocationEditor({ initial, onSave, onSuggest }: Props) {
  const [nationalPct, setNationalPct] = useState(() => initState(initial).nationalPct);
  const [nationalRows, setNationalRows] = useState<SubRow[]>(() => initState(initial).nationalRows);
  const [intlRows, setIntlRows] = useState<SubRow[]>(() => initState(initial).intlRows);

  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [reasoning, setReasoning] = useState<string | null>(null);
  const [error, setError] = useState("");

  const natPct = Math.min(100, Math.max(0, parseFloat(nationalPct) || 0));
  const intlPct = Math.round((100 - natPct) * 10) / 10;

  const natSubTotal = nationalRows.reduce((s, r) => s + (parseFloat(r.sub_pct) || 0), 0);
  const intlSubTotal = intlRows.reduce((s, r) => s + (parseFloat(r.sub_pct) || 0), 0);
  const natValid = natPct === 0 || Math.abs(natSubTotal - 100) < 0.06;
  const intlValid = intlPct === 0 || intlRows.length === 0 || Math.abs(intlSubTotal - 100) < 0.06;

  function updateNatRow(i: number, field: keyof SubRow, value: string) {
    setNationalRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  }

  function updateIntlRow(i: number, field: keyof SubRow, value: string) {
    setIntlRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  }

  function addNatRow() {
    const used = new Set<string>(nationalRows.map((r) => r.asset_class));
    const available = NATIONAL_CLASSES.find((c) => !used.has(c.value));
    if (!available) return;
    setNationalRows((prev) => [
      ...prev,
      { asset_class: available.value, sub_pct: "0", tolerance_pct: "5" },
    ]);
  }

  function addIntlRow() {
    const used = new Set<string>(intlRows.map((r) => r.asset_class));
    const available = INTL_CLASSES.find((c) => !used.has(c.value));
    if (!available) return;
    setIntlRows((prev) => [
      ...prev,
      { asset_class: available.value, sub_pct: "0", tolerance_pct: "5" },
    ]);
  }

  function buildSaveRows(): AllocationRow[] {
    const natFrac = natPct / 100;
    const intlFrac = intlPct / 100;
    const result: AllocationRow[] = [];
    for (const row of nationalRows) {
      const abs = natFrac * ((parseFloat(row.sub_pct) || 0) / 100);
      result.push({
        asset_class: row.asset_class,
        target_pct: abs.toFixed(4),
        tolerance_pct: ((parseFloat(row.tolerance_pct) || 0) / 100).toFixed(4),
      });
    }
    for (const row of intlRows) {
      const abs = intlFrac * ((parseFloat(row.sub_pct) || 0) / 100);
      result.push({
        asset_class: row.asset_class,
        target_pct: abs.toFixed(4),
        tolerance_pct: ((parseFloat(row.tolerance_pct) || 0) / 100).toFixed(4),
      });
    }
    return result;
  }

  async function handleSave() {
    const errors: string[] = [];
    if (!natValid) errors.push(`Sub-alocação nacional soma ${natSubTotal.toFixed(1)}% (esperado 100%).`);
    if (!intlValid) errors.push(`Sub-alocação internacional soma ${intlSubTotal.toFixed(1)}% (esperado 100%).`);
    if (errors.length > 0) {
      setError(errors.join(" "));
      return;
    }
    setError("");
    setSaving(true);
    try {
      await onSave(buildSaveRows());
    } finally {
      setSaving(false);
    }
  }

  async function handleSuggest() {
    if (!onSuggest) return;
    setSuggesting(true);
    setError("");
    setReasoning(null);
    try {
      const result = await onSuggest();
      const nat = result.allocations.filter((a) => NATIONAL_SET.has(a.asset_class));
      const intl = result.allocations.filter((a) => !NATIONAL_SET.has(a.asset_class));
      const natTotal = nat.reduce((s, a) => s + a.target_pct, 0);
      const intlTotal = intl.reduce((s, a) => s + a.target_pct, 0);
      setNationalPct(natTotal.toFixed(1));
      setNationalRows(
        nat.map((a) => ({
          asset_class: a.asset_class as Enums<"asset_class">,
          sub_pct: natTotal > 0 ? ((a.target_pct / natTotal) * 100).toFixed(1) : "0",
          tolerance_pct: a.tolerance_pct.toString(),
        })),
      );
      setIntlRows(
        intl.map((a) => ({
          asset_class: a.asset_class as Enums<"asset_class">,
          sub_pct: intlTotal > 0 ? ((a.target_pct / intlTotal) * 100).toFixed(1) : "0",
          tolerance_pct: a.tolerance_pct.toString(),
        })),
      );
      setReasoning(result.reasoning);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao gerar sugestão.");
    } finally {
      setSuggesting(false);
    }
  }

  return (
    <div>
      {/* Geo split */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "16px",
          alignItems: "center",
          marginBottom: "20px",
          padding: "12px 16px",
          borderRadius: "6px",
          backgroundColor: "var(--color-bg-3)",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontWeight: 600,
            color: "var(--color-text-2)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Distribuição geográfica
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <label style={{ fontSize: "12px", color: "var(--color-text-3)" }}>Nacional</label>
          <input
            type="number"
            min="0"
            max="100"
            step="1"
            value={nationalPct}
            onChange={(e) => setNationalPct(e.target.value)}
            style={{ ...inputStyleBase, width: "62px", textAlign: "right" }}
          />
          <span style={{ fontSize: "12px", color: "var(--color-text-3)" }}>%</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <label style={{ fontSize: "12px", color: "var(--color-text-3)" }}>Internacional</label>
          <span
            className="num"
            style={{
              display: "inline-block",
              width: "62px",
              textAlign: "right",
              fontSize: "12.5px",
              color: "var(--color-text-2)",
              padding: "4px 8px",
              backgroundColor: "var(--color-bg-2)",
              borderRadius: "6px",
              border: "1px solid var(--color-line-2)",
            }}
          >
            {intlPct.toFixed(1)}
          </span>
          <span style={{ fontSize: "12px", color: "var(--color-text-3)" }}>%</span>
        </div>
      </div>

      <SubTable
        title="Nacional"
        geoPct={natPct}
        rows={nationalRows}
        classes={NATIONAL_CLASSES}
        subTotal={natSubTotal}
        subValid={natValid}
        onUpdate={updateNatRow}
        onRemove={(i) => setNationalRows((prev) => prev.filter((_, idx) => idx !== i))}
        onAdd={addNatRow}
        canAdd={nationalRows.length < NATIONAL_CLASSES.length}
      />

      <SubTable
        title="Internacional"
        geoPct={intlPct}
        rows={intlRows}
        classes={INTL_CLASSES}
        subTotal={intlSubTotal}
        subValid={intlValid}
        onUpdate={updateIntlRow}
        onRemove={(i) => setIntlRows((prev) => prev.filter((_, idx) => idx !== i))}
        onAdd={addIntlRow}
        canAdd={intlRows.length < INTL_CLASSES.length}
      />

      {error && (
        <p style={{ margin: "8px 0 0", fontSize: "12px", color: "var(--color-crit)" }}>{error}</p>
      )}

      {reasoning && (
        <div
          style={{
            marginTop: "12px",
            padding: "10px 14px",
            borderRadius: "6px",
            border: "1px solid var(--color-line-2)",
            backgroundColor: "var(--color-bg-3)",
            fontSize: "12.5px",
            color: "var(--color-text-2)",
            display: "flex",
            gap: "8px",
            alignItems: "flex-start",
          }}
        >
          <span
            style={{
              flexShrink: 0,
              color: "var(--color-text-3)",
              fontWeight: 600,
              fontSize: "11px",
              paddingTop: "1px",
            }}
          >
            IA
          </span>
          <span>{reasoning}</span>
          <button
            onClick={() => setReasoning(null)}
            style={{
              marginLeft: "auto",
              flexShrink: 0,
              background: "none",
              border: "none",
              color: "var(--color-text-3)",
              cursor: "pointer",
              fontSize: "12px",
              padding: 0,
            }}
          >
            ✕
          </button>
        </div>
      )}

      <div style={{ marginTop: "16px", display: "flex", gap: "8px", alignItems: "center" }}>
        {onSuggest && (
          <button
            onClick={handleSuggest}
            disabled={suggesting || saving}
            style={{
              padding: "8px 16px",
              borderRadius: "6px",
              border: "1px solid var(--color-line)",
              backgroundColor: "transparent",
              color: suggesting ? "var(--color-text-3)" : "var(--color-text-2)",
              fontSize: "13px",
              fontWeight: 500,
              cursor: suggesting || saving ? "not-allowed" : "pointer",
              opacity: suggesting ? 0.7 : 1,
            }}
          >
            {suggesting ? "Gerando sugestão..." : "Sugerir com IA"}
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saving || suggesting}
          style={{
            padding: "8px 20px",
            borderRadius: "6px",
            backgroundColor: "var(--color-text)",
            border: "none",
            color: "var(--color-bg)",
            fontSize: "13px",
            fontWeight: 600,
            cursor: saving || suggesting ? "not-allowed" : "pointer",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "Salvando..." : "Salvar alocações"}
        </button>
      </div>
    </div>
  );
}
