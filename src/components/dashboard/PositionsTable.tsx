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

const ASSET_CLASS_FULL: Record<string, string> = {
  fixed_income: "Renda Fixa",
  stocks_br: "Ações BR",
  stocks_intl: "Ações Intl.",
  fiis: "FIIs",
  etf_br: "ETF BR",
  etf_intl: "ETF Intl.",
  funds: "Fundos",
  liquidity: "Liquidez",
};

const CLASS_ORDER = ["fixed_income", "stocks_br", "fiis", "etf_br", "funds", "liquidity", "stocks_intl", "etf_intl"];

const PRESET_NACIONAL = new Set(["fixed_income", "stocks_br", "fiis", "etf_br", "funds", "liquidity"]);
const PRESET_INTL = new Set(["stocks_intl", "etf_intl"]);

function setsEqual(a: Set<string>, b: Set<string>) {
  return a.size === b.size && [...a].every((x) => b.has(x));
}

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

function fmtQty(n: number | null): string {
  if (n === null) return "—";
  if (n === 0) return "0";
  if (Math.abs(n) < 1) return n.toLocaleString("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  if (Math.abs(n) < 100) return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  return fmt0(n);
}

interface Props {
  positions: ClientPosition[];
  totalBrl: number;
}

export function PositionsTable({ positions, totalBrl }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("market_value_brl");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filterClasses, setFilterClasses] = useState<Set<string>>(new Set());
  const [filterHolder, setFilterHolder] = useState<string>("");
  const [filterInst, setFilterInst] = useState<string>("");

  const holders = useMemo(() => {
    const seen = new Map<string, { slug: string; name: string }>();
    for (const p of positions) {
      if (!seen.has(p.holder_slug)) seen.set(p.holder_slug, { slug: p.holder_slug, name: p.holder_name });
    }
    return [...seen.values()];
  }, [positions]);

  const availableClasses = useMemo(
    () => CLASS_ORDER.filter((c) => positions.some((p) => p.asset_class === c)),
    [positions],
  );

  const institutions = useMemo(
    () => [...new Set(positions.map((p) => p.institution))].sort(),
    [positions],
  );

  function toggleClass(cls: string) {
    setFilterClasses((prev) => {
      const next = new Set(prev);
      if (next.has(cls)) next.delete(cls);
      else next.add(cls);
      return next;
    });
  }

  function applyPreset(preset: Set<string>) {
    setFilterClasses((prev) => (setsEqual(prev, preset) ? new Set() : new Set(preset)));
  }

  const isNacional = setsEqual(filterClasses, PRESET_NACIONAL);
  const isIntl = setsEqual(filterClasses, PRESET_INTL);

  const sorted = useMemo(() => {
    const rows = positions.filter((p) => {
      if (filterHolder && p.holder_slug !== filterHolder) return false;
      if (filterClasses.size > 0 && !filterClasses.has(p.asset_class) && !(isIntl && p.currency === "USD")) return false;
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
  }, [positions, sortKey, sortDir, filterClasses, filterHolder, filterInst]);

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

  const hasFilter = filterHolder || filterClasses.size > 0 || filterInst;

  return (
    <div>
      {/* Filtros */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", padding: "8px 0", marginBottom: "4px" }}>

        {/* Linha 1: titular + inst + contador */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "11px", color: "var(--color-text-3)", marginRight: "2px" }}>Titular</span>
          {[{ slug: "", name: "Todos" }, ...holders].map(({ slug, name }) => {
            const active = filterHolder === slug;
            const color = slug ? (HOLDER_COLORS[slug] ?? "var(--color-brand)") : null;
            return (
              <button
                key={slug || "__all__"}
                onClick={() => setFilterHolder(slug)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "4px",
                  padding: "2px 8px", borderRadius: "6px", fontSize: "11.5px",
                  border: `1px solid ${active ? "var(--color-text-3)" : "var(--color-line)"}`,
                  backgroundColor: active ? "var(--color-bg-3)" : "transparent",
                  color: active ? "var(--color-text)" : "var(--color-text-3)",
                  cursor: "pointer",
                }}
              >
                {color && (
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: color, flexShrink: 0 }} />
                )}
                {name}
              </button>
            );
          })}

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px" }}>
            <span className="num" style={{ fontSize: "11.5px", color: "var(--color-text-3)" }}>
              {sorted.length} ativo{sorted.length !== 1 ? "s" : ""}
            </span>
            <select
              value={filterInst}
              onChange={(e) => setFilterInst(e.target.value)}
              style={{
                fontSize: "11.5px", padding: "3px 8px", borderRadius: "6px",
                border: "1px solid var(--color-line)", backgroundColor: "var(--color-bg-2)",
                color: "var(--color-text-2)", cursor: "pointer",
              }}
            >
              <option value="">Todas as inst.</option>
              {institutions.map((i) => (
                <option key={i} value={i}>{i.toUpperCase()}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Linha 2: presets macro + classes individuais */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "11px", color: "var(--color-text-3)", marginRight: "2px" }}>Classe</span>

          {/* Todos */}
          <button
            onClick={() => setFilterClasses(new Set())}
            style={{
              padding: "2px 8px", borderRadius: "6px", fontSize: "11.5px",
              border: `1px solid ${filterClasses.size === 0 ? "var(--color-text-3)" : "var(--color-line)"}`,
              backgroundColor: filterClasses.size === 0 ? "var(--color-bg-3)" : "transparent",
              color: filterClasses.size === 0 ? "var(--color-text)" : "var(--color-text-3)",
              cursor: "pointer",
            }}
          >
            Todas
          </button>

          {/* Preset Nacional */}
          <button
            onClick={() => applyPreset(PRESET_NACIONAL)}
            style={{
              padding: "2px 8px", borderRadius: "6px", fontSize: "11.5px",
              border: `1px solid ${isNacional ? "var(--color-cons)" : "var(--color-line)"}`,
              backgroundColor: isNacional ? "color-mix(in oklch, var(--color-cons) 15%, transparent)" : "transparent",
              color: isNacional ? "var(--color-cons)" : "var(--color-text-3)",
              cursor: "pointer",
            }}
          >
            Nacional
          </button>

          {/* Preset Internacional */}
          <button
            onClick={() => applyPreset(PRESET_INTL)}
            style={{
              padding: "2px 8px", borderRadius: "6px", fontSize: "11.5px",
              border: `1px solid ${isIntl ? "var(--color-brand)" : "var(--color-line)"}`,
              backgroundColor: isIntl ? "var(--color-brand-subtle)" : "transparent",
              color: isIntl ? "var(--color-brand-hi)" : "var(--color-text-3)",
              cursor: "pointer",
            }}
          >
            Internacional
          </button>

          {/* Separador */}
          <span style={{ width: "1px", height: "14px", backgroundColor: "var(--color-line-2)", margin: "0 2px" }} />

          {/* Classes individuais */}
          {availableClasses.map((cls) => {
            const active = filterClasses.has(cls);
            const isIntlClass = cls === "stocks_intl" || cls === "etf_intl";
            return (
              <button
                key={cls}
                onClick={() => toggleClass(cls)}
                style={{
                  padding: "2px 8px", borderRadius: "6px", fontSize: "11.5px",
                  border: `1px solid ${active ? (isIntlClass ? "var(--color-brand)" : "var(--color-text-3)") : "var(--color-line)"}`,
                  backgroundColor: active
                    ? isIntlClass ? "var(--color-brand-subtle)" : "var(--color-bg-3)"
                    : "transparent",
                  color: active
                    ? isIntlClass ? "var(--color-brand-hi)" : "var(--color-text)"
                    : "var(--color-text-3)",
                  cursor: "pointer",
                }}
              >
                {ASSET_CLASS_FULL[cls] ?? cls}
              </button>
            );
          })}

          {hasFilter && (
            <button
              onClick={() => { setFilterClasses(new Set()); setFilterHolder(""); setFilterInst(""); }}
              style={{
                marginLeft: "auto", padding: "2px 8px", borderRadius: "6px", fontSize: "11px",
                border: "1px solid var(--color-line)", backgroundColor: "transparent",
                color: "var(--color-text-3)", cursor: "pointer",
              }}
            >
              Limpar
            </button>
          )}
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
              const portPct = totalBrl > 0 ? (pos.market_value_brl / totalBrl) * 100 : 0;

              return (
                <tr
                  key={pos.id}
                  className="hairline"
                  style={{ transition: "background-color 0.1s" }}
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
                    <span className="num">{fmtQty(pos.quantity)}</span>
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
                      <div className="num" style={{ fontSize: "10.5px", color: "var(--color-text-3)", marginTop: "1px" }}>
                        USD {pos.market_value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
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
          {sorted.length > 0 && (
            <tfoot>
              <tr style={{ borderTop: "1px solid var(--color-line)" }}>
                <td colSpan={6} style={{ padding: "8px 8px 8px 16px", fontSize: "11.5px", color: "var(--color-text-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
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
                    {hasFilter
                      ? `${((sorted.reduce((s, p) => s + p.market_value_brl, 0) / totalBrl) * 100).toFixed(2)}%`
                      : "100,00%"}
                  </span>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
