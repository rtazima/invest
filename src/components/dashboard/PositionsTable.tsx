"use client";

import { useState, useMemo } from "react";
import type { ClientPosition } from "./types";
import { PnlValue } from "@/components/ui/PnlValue";
import { TransferModal, type TransferablePosition } from "@/components/transfers/TransferModal";

const ASSET_CLASS_LABELS: Record<string, string> = {
  fixed_income: "RF",
  stocks_br: "RV",
  stocks_intl: "Int",
  fiis: "FII",
  etf_br: "ETF",
  etf_intl: "Int",
  funds: "Fund",
  liquidity: "Liq",
};

const STRUCTURE_TYPE_LABELS: Record<string, string> = {
  covered_call: "CC",
  synthetic_dividend: "SD",
  collar: "Collar",
  protective_put: "PP",
};

const STRUCTURE_TYPE_COLORS: Record<string, string> = {
  covered_call: "oklch(0.65 0.15 200)",
  synthetic_dividend: "oklch(0.62 0.18 145)",
  collar: "oklch(0.62 0.14 50)",
  protective_put: "oklch(0.60 0.16 20)",
};

const HOLDER_COLORS: Record<string, string> = {
  rodrigo: "oklch(0.65 0.10 240)",
  grasi: "oklch(0.68 0.13 330)",
  amora: "oklch(0.72 0.15 60)",
  benicio: "oklch(0.70 0.13 160)",
};

type SortKey = "name" | "market_value_brl" | "pnl" | "pnl_pct";
type SortDir = "asc" | "desc";

function fmt(n: number | null): string {
  if (n === null) return "—";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmt0(n: number | null): string {
  if (n === null) return "—";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

interface Props {
  positions: ClientPosition[];
  totalBrl: number;
}

export function PositionsTable({ positions, totalBrl }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("market_value_brl");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filterClass, setFilterClass] = useState<string>("");
  const [filterInst, setFilterInst] = useState<string>("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [transferOpen, setTransferOpen] = useState(false);

  const classes = useMemo(
    () => [...new Set(positions.map((p) => p.asset_class))].sort(),
    [positions],
  );
  const institutions = useMemo(
    () => [...new Set(positions.map((p) => p.institution))].sort(),
    [positions],
  );

  const sorted = useMemo(() => {
    const rows = positions.filter((p) => {
      if (filterClass && p.asset_class !== filterClass) return false;
      if (filterInst && p.institution !== filterInst) return false;
      return true;
    });

    rows.sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv, "pt-BR") : bv.localeCompare(av, "pt-BR");
      }
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });

    return rows;
  }, [positions, sortKey, sortDir, filterClass, filterInst]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === sorted.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sorted.map((p) => p.id)));
    }
  }

  const selectedPositions = sorted.filter((p) => selected.has(p.id));

  // Validate selection: all must be from the same institution for a custody transfer
  const selectedInstitutions = new Set(selectedPositions.map((p) => p.institution));
  const canTransfer = selected.size > 0 && selectedInstitutions.size === 1;

  function handleTransferSuccess() {
    setTransferOpen(false);
    setSelected(new Set());
  }

  const transferablePositions: TransferablePosition[] = selectedPositions.map((p) => ({
    id: p.id,
    holder_id: p.holder_id,
    holder_name: p.holder_name,
    institution: p.institution,
    asset_name: p.name,
    ticker: p.ticker,
    quantity: p.quantity,
    market_value_brl: p.market_value_brl,
  }));

  const thStyle = (key?: SortKey): React.CSSProperties => ({
    padding: "8px",
    textAlign: "right" as const,
    fontSize: "11px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    color: key && key === sortKey ? "var(--color-text)" : "var(--color-text-3)",
    cursor: key ? "pointer" : "default",
    userSelect: "none" as const,
    whiteSpace: "nowrap" as const,
  });

  return (
    <div>
      {/* Sub-header + filtros */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 0",
          marginBottom: "4px",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span className="num" style={{ fontSize: "11.5px", color: "var(--color-text-3)" }}>
            {sorted.length} ativo{sorted.length !== 1 ? "s" : ""}
          </span>
          {selected.size > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "11.5px", color: "var(--color-text-2)" }}>
                {selected.size} selecionado{selected.size !== 1 ? "s" : ""}
              </span>
              {!canTransfer && selected.size > 0 && (
                <span style={{ fontSize: "11px", color: "var(--color-warn)" }}>
                  (instituições diferentes)
                </span>
              )}
              {canTransfer && (
                <button
                  onClick={() => setTransferOpen(true)}
                  style={{
                    padding: "4px 12px",
                    borderRadius: "5px",
                    border: "1px solid var(--color-line)",
                    backgroundColor: "var(--color-bg-2)",
                    color: "var(--color-text)",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: 500,
                  }}
                >
                  Transferir custódia
                </button>
              )}
              <button
                onClick={() => setSelected(new Set())}
                style={{
                  padding: "3px 8px",
                  borderRadius: "5px",
                  border: "1px solid var(--color-line)",
                  backgroundColor: "transparent",
                  color: "var(--color-text-3)",
                  cursor: "pointer",
                  fontSize: "11.5px",
                }}
              >
                Limpar
              </button>
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            style={{
              fontSize: "11.5px",
              padding: "3px 8px",
              borderRadius: "6px",
              border: "1px solid var(--color-line)",
              backgroundColor: "var(--color-bg-2)",
              color: "var(--color-text-2)",
              cursor: "pointer",
            }}
          >
            <option value="">Todas as classes</option>
            {classes.map((c) => (
              <option key={c} value={c}>
                {ASSET_CLASS_LABELS[c] ?? c}
              </option>
            ))}
          </select>
          <select
            value={filterInst}
            onChange={(e) => setFilterInst(e.target.value)}
            style={{
              fontSize: "11.5px",
              padding: "3px 8px",
              borderRadius: "6px",
              border: "1px solid var(--color-line)",
              backgroundColor: "var(--color-bg-2)",
              color: "var(--color-text-2)",
              cursor: "pointer",
            }}
          >
            <option value="">Todas as inst.</option>
            {institutions.map((i) => (
              <option key={i} value={i}>
                {i.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", fontSize: "12.5px", borderCollapse: "collapse" }}>
          <thead>
            <tr className="hairline" style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {/* Checkbox all */}
              <th style={{ padding: "8px 4px 8px 16px", width: "28px" }}>
                <input
                  type="checkbox"
                  checked={sorted.length > 0 && selected.size === sorted.length}
                  ref={(el) => {
                    if (el) el.indeterminate = selected.size > 0 && selected.size < sorted.length;
                  }}
                  onChange={toggleAll}
                  style={{ cursor: "pointer", accentColor: "var(--color-text)" }}
                />
              </th>
              <th style={{ ...thStyle(), textAlign: "left" }} onClick={() => toggleSort("name")}>
                Ativo
              </th>
              <th style={{ ...thStyle(), textAlign: "left" }}>Titular</th>
              <th style={{ ...thStyle(), textAlign: "left" }}>Inst.</th>
              <th style={thStyle()}>Qtd</th>
              <th style={thStyle()}>Preço médio</th>
              <th style={thStyle()}>Preço atual</th>
              <th
                style={{ ...thStyle("market_value_brl"), paddingRight: "8px" }}
                onClick={() => toggleSort("market_value_brl")}
              >
                Valor {sortKey === "market_value_brl" ? (sortDir === "desc" ? "↓" : "↑") : ""}
              </th>
              <th style={thStyle("pnl")} onClick={() => toggleSort("pnl")}>
                P&L {sortKey === "pnl" ? (sortDir === "desc" ? "↓" : "↑") : ""}
              </th>
              <th style={thStyle("pnl_pct")} onClick={() => toggleSort("pnl_pct")}>
                P&L % {sortKey === "pnl_pct" ? (sortDir === "desc" ? "↓" : "↑") : ""}
              </th>
              <th style={{ ...thStyle(), paddingRight: "16px" }}>% Port.</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((pos) => {
              const holderColor = HOLDER_COLORS[pos.holder_slug] ?? "var(--color-brand)";
              const portPct = totalBrl > 0 ? (pos.market_value_brl / totalBrl) * 100 : 0;
              const isSelected = selected.has(pos.id);

              return (
                <tr
                  key={pos.id}
                  className="hairline"
                  style={{
                    transition: "background-color 0.1s",
                    cursor: "pointer",
                    backgroundColor: isSelected ? "var(--color-bg-3)" : "transparent",
                  }}
                  onClick={() => toggleSelect(pos.id)}
                  onMouseEnter={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-bg-3)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                  }}
                >
                  {/* Checkbox */}
                  <td style={{ padding: "8px 4px 8px 16px" }} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(pos.id)}
                      style={{ cursor: "pointer", accentColor: "var(--color-text)" }}
                    />
                  </td>

                  {/* Ativo */}
                  <td style={{ padding: "8px", whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span className="num" style={{ fontWeight: 500 }}>
                        {pos.ticker ?? pos.name.split(" ").slice(0, 2).join(" ")}
                      </span>
                      <span className="pill">{ASSET_CLASS_LABELS[pos.asset_class] ?? pos.asset_class}</span>
                      {pos.is_stale_quota && (
                        <span className="pill" style={{ color: "var(--color-warn)" }}>
                          D+1
                        </span>
                      )}
                      {pos.structures?.map((s) => (
                        <span
                          key={s.id}
                          className="pill"
                          title={`${s.name} — ${s.role}`}
                          style={{
                            color: STRUCTURE_TYPE_COLORS[s.type] ?? "var(--color-text-2)",
                            borderColor: STRUCTURE_TYPE_COLORS[s.type] ?? "var(--color-line)",
                            fontSize: "10px",
                          }}
                        >
                          {STRUCTURE_TYPE_LABELS[s.type] ?? s.type}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* Titular */}
                  <td style={{ padding: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <span
                        style={{
                          width: "16px",
                          height: "16px",
                          borderRadius: "50%",
                          backgroundColor: holderColor,
                          display: "grid",
                          placeItems: "center",
                          fontSize: "9px",
                          fontWeight: 500,
                          color: "var(--color-bg)",
                          flexShrink: 0,
                        }}
                      >
                        {pos.holder_name[0]}
                      </span>
                      <span style={{ color: "var(--color-text-2)" }}>{pos.holder_name}</span>
                    </div>
                  </td>

                  {/* Instituição */}
                  <td style={{ padding: "8px", color: "var(--color-text-2)" }}>
                    {pos.institution.toUpperCase()}
                  </td>

                  {/* Qtd */}
                  <td style={{ padding: "8px", textAlign: "right" }}>
                    <span className="num">{fmt0(pos.quantity)}</span>
                  </td>

                  {/* Preço médio */}
                  <td style={{ padding: "8px", textAlign: "right" }}>
                    <span className="num" style={{ color: "var(--color-text-2)" }}>
                      {fmt(pos.avg_price)}
                    </span>
                  </td>

                  {/* Preço atual */}
                  <td style={{ padding: "8px", textAlign: "right" }}>
                    <span className="num">{fmt(pos.current_price)}</span>
                  </td>

                  {/* Valor de mercado */}
                  <td style={{ padding: "8px", paddingRight: "8px", textAlign: "right" }}>
                    <span className="num" style={{ fontWeight: 500 }}>
                      {fmt(pos.market_value_brl)}
                    </span>
                    {pos.currency === "USD" && (
                      <span style={{ fontSize: "10.5px", color: "var(--color-text-3)", marginLeft: "4px" }}>
                        USD
                      </span>
                    )}
                  </td>

                  {/* P&L */}
                  <td style={{ padding: "8px", textAlign: "right" }}>
                    {pos.pnl !== null ? <PnlValue value={pos.pnl} /> : <span style={{ color: "var(--color-text-3)" }}>—</span>}
                  </td>

                  {/* P&L % */}
                  <td style={{ padding: "8px", textAlign: "right" }}>
                    {pos.pnl_pct !== null ? (
                      <span className="num" style={{ color: pos.pnl_pct >= 0 ? "var(--color-gain)" : "var(--color-loss)" }}>
                        {pos.pnl_pct >= 0 ? "+" : "−"}
                        {Math.abs(pos.pnl_pct * 100).toFixed(2)}%
                      </span>
                    ) : (
                      <span style={{ color: "var(--color-text-3)" }}>—</span>
                    )}
                  </td>

                  {/* % Port */}
                  <td style={{ padding: "8px", paddingRight: "16px", textAlign: "right" }}>
                    <span className="num" style={{ color: "var(--color-text-2)" }}>
                      {portPct.toFixed(2)}%
                    </span>
                  </td>
                </tr>
              );
            })}

            {sorted.length === 0 && (
              <tr>
                <td colSpan={11} style={{ padding: "32px", textAlign: "center", color: "var(--color-text-3)" }}>
                  Nenhuma posição encontrada
                </td>
              </tr>
            )}
          </tbody>
          {sorted.length > 0 && (
            <tfoot>
              <tr style={{ borderTop: "1px solid var(--color-line)" }}>
                <td colSpan={7} style={{ padding: "8px 8px 8px 16px", fontSize: "11.5px", color: "var(--color-text-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Total ({sorted.length} ativo{sorted.length !== 1 ? "s" : ""})
                </td>
                <td style={{ padding: "8px", paddingRight: "8px", textAlign: "right" }}>
                  <span className="num pv" style={{ fontWeight: 600, fontSize: "13px" }}>
                    {fmt(sorted.reduce((s, p) => s + p.market_value_brl, 0))}
                  </span>
                </td>
                <td colSpan={2} />
                <td style={{ padding: "8px", paddingRight: "16px", textAlign: "right" }}>
                  <span className="num" style={{ fontWeight: 600, fontSize: "13px", color: "var(--color-text-2)" }}>
                    {filterClass || filterInst
                      ? `${((sorted.reduce((s, p) => s + p.market_value_brl, 0) / totalBrl) * 100).toFixed(2)}%`
                      : "100,00%"}
                  </span>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {transferOpen && (
        <TransferModal
          positions={transferablePositions}
          onClose={() => setTransferOpen(false)}
          onSuccess={handleTransferSuccess}
        />
      )}
    </div>
  );
}
