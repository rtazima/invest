"use client";

import { useState } from "react";
import type { ClientPosition } from "./types";

interface Group {
  id: string;
  label: string;
  sublabel: string;
  color: string;
  positions: ClientPosition[];
  total: number;
}

const ASSET_CLASS_LABELS: Record<string, string> = {
  fixed_income: "Renda Fixa",
  stocks_br: "Ações BR",
  fiis: "FIIs",
  etf_br: "ETF BR",
  etf_intl: "ETF Intl.",
  stocks_intl: "Internacional",
  funds: "Fundos",
  liquidity: "Liquidez",
};

const INDEXER_LABELS: Record<string, string> = {
  cdi: "CDI",
  selic: "Selic",
  ipca: "IPCA",
  igpm: "IGP-M",
  prefixado: "Pré",
};

function fmt(n: number): string {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtFull(n: number): string {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pctStr(part: number, total: number): string {
  if (total === 0) return "—";
  return (part / total * 100).toFixed(1) + "%";
}

function buildGroups(positions: ClientPosition[]): Group[] {
  const posFixado:      Group = { id: "pos_fixado",    label: "Pós-fixado",     sublabel: "CDI · Selic",          color: "oklch(0.62 0.14 232)", positions: [], total: 0 };
  const inflacao:       Group = { id: "inflacao",      label: "Inflação",       sublabel: "IPCA · IGP-M",         color: "oklch(0.72 0.16 30)",  positions: [], total: 0 };
  const prefixado:      Group = { id: "prefixado",     label: "Prefixado",      sublabel: "Taxa fixa",            color: "oklch(0.76 0.15 72)",  positions: [], total: 0 };
  const rv:             Group = { id: "rv",            label: "Renda Variável", sublabel: "Ações · FIIs · ETFs",  color: "oklch(0.68 0.18 152)", positions: [], total: 0 };
  const fundos:         Group = { id: "fundos",        label: "Fundos",         sublabel: "Multimercado · Crédito", color: "oklch(0.73 0.12 60)", positions: [], total: 0 };
  const internacional:  Group = { id: "internacional", label: "Internacional",  sublabel: "USD · Globais",        color: "oklch(0.65 0.18 300)", positions: [], total: 0 };

  for (const p of positions) {
    let target: Group;

    if (p.currency === "USD" || ["stocks_intl", "etf_intl"].includes(p.asset_class)) {
      target = internacional;
    } else if (p.asset_class === "funds") {
      target = fundos;
    } else if (["stocks_br", "fiis", "etf_br"].includes(p.asset_class)) {
      target = rv;
    } else if (p.asset_class === "fixed_income") {
      if (p.indexer === "prefixado") target = prefixado;
      else if (p.indexer === "ipca" || p.indexer === "igpm") target = inflacao;
      else target = posFixado;
    } else {
      target = posFixado;
    }

    target.positions.push(p);
    target.total += p.market_value_brl;
  }

  return [posFixado, inflacao, prefixado, rv, fundos, internacional].filter((g) => g.total > 0);
}

interface Props {
  positions: ClientPosition[];
  totalBrl: number;
}

export function TabByIndexer({ positions, totalBrl }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const groups = buildGroups(positions);

  return (
    <table style={{ width: "100%", fontSize: "12.5px", borderCollapse: "collapse" }}>
      <thead>
        <tr
          className="hairline"
          style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-3)" }}
        >
          <th style={{ padding: "8px 8px 8px 16px", textAlign: "left" }}>Bloco</th>
          <th style={{ padding: "8px", textAlign: "right" }}>Patrimônio</th>
          <th style={{ padding: "8px", textAlign: "right" }}>%</th>
          <th style={{ padding: "8px 16px 8px 8px", textAlign: "right" }}>Distribuição</th>
        </tr>
      </thead>
      <tbody>
        {groups.map((g) => {
          const pct = totalBrl > 0 ? (g.total / totalBrl) * 100 : 0;
          const isOpen = expanded === g.id;

          return (
            <>
              <tr
                key={g.id}
                className="hairline"
                style={{ cursor: "pointer", transition: "background-color 0.1s" }}
                onClick={() => setExpanded(isOpen ? null : g.id)}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-bg-3)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = isOpen ? "var(--color-bg-3)" : "transparent"; }}
              >
                <td style={{ padding: "10px 8px 10px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        width: "8px", height: "8px", borderRadius: "2px",
                        backgroundColor: g.color, flexShrink: 0,
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: 500 }}>{g.label}</div>
                      <div style={{ fontSize: "11px", color: "var(--color-text-3)", marginTop: "1px" }}>
                        {g.sublabel}
                      </div>
                    </div>
                    <span style={{ marginLeft: "4px", fontSize: "10px", color: "var(--color-text-3)" }}>
                      {isOpen ? "▲" : "▼"}
                    </span>
                  </div>
                </td>
                <td style={{ padding: "10px 8px", textAlign: "right" }}>
                  <span className="num pv" style={{ fontWeight: 500 }}>R$ {fmt(g.total)}</span>
                </td>
                <td style={{ padding: "10px 8px", textAlign: "right" }}>
                  <span className="num" style={{ color: "var(--color-text-2)" }}>
                    {pct.toFixed(1)}%
                  </span>
                </td>
                <td style={{ padding: "10px 16px 10px 8px", textAlign: "right" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                    <div style={{ width: "128px", height: "6px", borderRadius: "3px", backgroundColor: "var(--color-bg-3)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, backgroundColor: g.color, transition: "width 0.3s" }} />
                    </div>
                  </div>
                </td>
              </tr>

              {isOpen && g.positions
                .sort((a, b) => b.market_value_brl - a.market_value_brl)
                .map((p) => {
                  const tag = p.indexer
                    ? (INDEXER_LABELS[p.indexer] ?? p.indexer)
                    : (ASSET_CLASS_LABELS[p.asset_class] ?? p.asset_class);

                  return (
                    <tr
                      key={p.id}
                      style={{ backgroundColor: "var(--color-bg-3)" }}
                    >
                      <td style={{ padding: "6px 8px 6px 36px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "11px", color: "var(--color-text-3)", fontFamily: "var(--font-mono)" }}>
                            {p.ticker ?? "—"}
                          </span>
                          <span style={{ color: "var(--color-text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "260px" }}>
                            {p.name}
                          </span>
                          <span style={{
                            fontSize: "10px", padding: "1px 5px", borderRadius: "3px",
                            backgroundColor: "var(--color-bg-2)", color: "var(--color-text-3)",
                            border: "1px solid var(--color-line-2)", flexShrink: 0,
                          }}>
                            {tag}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "right" }}>
                        <span className="num pv" style={{ fontSize: "12px" }}>R$ {fmtFull(p.market_value_brl)}</span>
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "right" }}>
                        <span className="num" style={{ fontSize: "11px", color: "var(--color-text-3)" }}>
                          {pctStr(p.market_value_brl, totalBrl)}
                        </span>
                      </td>
                      <td style={{ padding: "6px 16px 6px 8px" }} />
                    </tr>
                  );
                })}
            </>
          );
        })}
      </tbody>
      {groups.length > 0 && (
        <tfoot>
          <tr style={{ borderTop: "1px solid var(--color-line)" }}>
            <td style={{ padding: "8px 8px 8px 16px", fontSize: "11.5px", color: "var(--color-text-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Total
            </td>
            <td style={{ padding: "8px", textAlign: "right" }}>
              <span className="num pv" style={{ fontWeight: 600, fontSize: "13px" }}>R$ {fmt(totalBrl)}</span>
            </td>
            <td style={{ padding: "8px", textAlign: "right" }}>
              <span className="num" style={{ fontWeight: 600, fontSize: "13px", color: "var(--color-text-2)" }}>100%</span>
            </td>
            <td style={{ padding: "8px 16px 8px 8px" }} />
          </tr>
        </tfoot>
      )}
    </table>
  );
}
