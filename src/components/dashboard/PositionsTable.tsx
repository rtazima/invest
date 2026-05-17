"use client";

import { useState, useMemo } from "react";
import type { ClientPosition } from "./types";
import { PnlValue } from "@/components/ui/PnlValue";

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
}

export function PositionsTable({ positions }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("market_value_brl");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filterClass, setFilterClass] = useState<string>("");
  const [filterInst, setFilterInst] = useState<string>("");

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
        }}
      >
        <span className="num" style={{ fontSize: "11.5px", color: "var(--color-text-3)" }}>
          {sorted.length} ativo{sorted.length !== 1 ? "s" : ""} · ordenado por valor
        </span>
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
              <th style={{ ...thStyle(), textAlign: "left", paddingLeft: "16px" }} onClick={() => toggleSort("name")}>
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
              const totalBrl = positions.reduce((s, p) => s + p.market_value_brl, 0);
              const portPct = totalBrl > 0 ? (pos.market_value_brl / totalBrl) * 100 : 0;

              return (
                <tr
                  key={pos.id}
                  className="hairline"
                  style={{ transition: "background-color 0.1s", cursor: "pointer" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-bg-3)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                  }}
                >
                  {/* Ativo */}
                  <td style={{ padding: "8px", paddingLeft: "16px", whiteSpace: "nowrap" }}>
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
                <td colSpan={10} style={{ padding: "32px", textAlign: "center", color: "var(--color-text-3)" }}>
                  Nenhuma posição encontrada
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
