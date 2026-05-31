"use client";

import { useState } from "react";
import type { ClientPortfolioSummary } from "./types";

const ASSET_CLASS_LABELS: Record<string, string> = {
  fixed_income: "Renda Fixa",
  stocks_br: "Renda Variável",
  stocks_intl: "Internacional",
  fiis: "Fundos Imob.",
  etf_br: "ETF BR",
  etf_intl: "ETF Intl.",
  funds: "Fundos",
  liquidity: "Liquidez",
};

const ASSET_CLASS_COLORS: Record<string, string> = {
  fixed_income: "oklch(0.74 0.13 232)",
  stocks_br: "oklch(0.76 0.16 152)",
  fiis: "oklch(0.80 0.15 82)",
  stocks_intl: "oklch(0.68 0.18 300)",
  etf_intl: "oklch(0.68 0.18 300)",
  etf_br: "oklch(0.72 0.14 160)",
  funds: "oklch(0.75 0.12 60)",
  liquidity: "oklch(0.55 0.04 240)",
};

const HOLDER_COLORS: Record<string, string> = {
  rodrigo: "oklch(0.65 0.10 240)",
  grasi: "oklch(0.68 0.13 330)",
  amora: "oklch(0.72 0.15 60)",
  benicio: "oklch(0.70 0.13 160)",
};

const CIRCUMFERENCE = 2 * Math.PI * 54;

function fmt(n: number): string {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface Props {
  summary: ClientPortfolioSummary;
}

export function TabByClass({ summary }: Props) {
  const [selectedHolder, setSelectedHolder] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const holder = selectedHolder
    ? summary.byHolder.find((h) => h.id === selectedHolder) ?? null
    : null;

  const byAssetClass = holder ? holder.byAssetClass : summary.byAssetClass;
  const totalBrl = holder ? holder.totalBrl : summary.totalBrl;

  if (totalBrl === 0) return null;

  const rows = Object.entries(byAssetClass)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([cls, val]) => ({
      cls,
      val,
      pct: totalBrl > 0 ? (val / totalBrl) * 100 : 0,
      color: ASSET_CLASS_COLORS[cls] ?? "oklch(0.45 0.02 240)",
      label: ASSET_CLASS_LABELS[cls] ?? cls,
    }));

  // Donut arcs
  let offset = 0;
  const arcs = rows.map((r) => {
    const arc = (r.pct / 100) * CIRCUMFERENCE;
    const dashOffset = CIRCUMFERENCE - offset;
    offset += arc;
    return { ...r, arc, dashOffset };
  });

  const pillBase: React.CSSProperties = {
    padding: "3px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    border: "1px solid",
    cursor: "pointer",
    background: "none",
    transition: "background-color 0.1s, color 0.1s, border-color 0.1s",
  };

  return (
    <div>
      {/* Seletor de titular */}
      <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--color-line-2)", display: "flex", gap: "6px", flexWrap: "wrap" }}>
        <button
          onClick={() => setSelectedHolder(null)}
          style={{
            ...pillBase,
            backgroundColor: selectedHolder === null ? "var(--color-text)" : "transparent",
            color: selectedHolder === null ? "var(--color-bg)" : "var(--color-text-2)",
            borderColor: selectedHolder === null ? "var(--color-text)" : "var(--color-line)",
          }}
        >
          Todos
        </button>
        {summary.byHolder.map((h) => {
          const active = selectedHolder === h.id;
          const color = HOLDER_COLORS[h.slug] ?? "var(--color-brand)";
          return (
            <button
              key={h.id}
              onClick={() => setSelectedHolder(active ? null : h.id)}
              style={{
                ...pillBase,
                backgroundColor: active ? color : "transparent",
                color: active ? "var(--color-bg)" : "var(--color-text-2)",
                borderColor: active ? color : "var(--color-line)",
              }}
            >
              {h.name}
            </button>
          );
        })}
      </div>

      {/* Donut */}
      <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid var(--color-line-2)", display: "flex", alignItems: "center", gap: "32px" }}>
        <svg viewBox="-80 -80 160 160" width="148" height="148" style={{ flexShrink: 0 }}>
          <circle r="54" fill="none" stroke="var(--color-line-2)" strokeWidth="18" />
          {arcs.map((seg) => (
            <circle
              key={seg.cls}
              r="54"
              fill="none"
              stroke={seg.color}
              strokeWidth={hovered === seg.cls ? 26 : 18}
              strokeDasharray={`${seg.arc.toFixed(2)} ${(CIRCUMFERENCE - seg.arc).toFixed(2)}`}
              strokeDashoffset={seg.dashOffset.toFixed(2)}
              transform="rotate(-90)"
              style={{ transition: "stroke-width 0.15s ease", cursor: "pointer" }}
              onMouseEnter={() => setHovered(seg.cls)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
          {hovered && (() => {
            const seg = arcs.find((s) => s.cls === hovered);
            if (!seg) return null;
            return (
              <>
                <text textAnchor="middle" dy="-6" style={{ fontSize: "13px", fill: "var(--color-text)", fontWeight: 600 }}>
                  {seg.pct.toFixed(1)}%
                </text>
                <text textAnchor="middle" dy="10" style={{ fontSize: "9px", fill: "var(--color-text-3)" }}>
                  {seg.label}
                </text>
              </>
            );
          })()}
        </svg>

        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
          {rows.map((seg) => (
            <li
              key={seg.cls}
              style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11.5px" }}
              onMouseEnter={() => setHovered(seg.cls)}
              onMouseLeave={() => setHovered(null)}
            >
              <span style={{ width: "8px", height: "8px", borderRadius: "2px", backgroundColor: seg.color, flexShrink: 0 }} />
              <span style={{ color: hovered === seg.cls ? "var(--color-text)" : "var(--color-text-2)", transition: "color 0.1s" }}>
                {seg.label}
              </span>
              <span className="num" style={{ marginLeft: "auto", color: "var(--color-text-3)" }}>
                {seg.pct.toFixed(1)}%
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Tabela */}
      <table style={{ width: "100%", fontSize: "12.5px", borderCollapse: "collapse" }}>
        <thead>
          <tr
            className="hairline"
            style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-3)" }}
          >
            <th style={{ padding: "8px 8px 8px 16px", textAlign: "left" }}>Classe</th>
            <th style={{ padding: "8px", textAlign: "right" }}>Patrimônio</th>
            <th style={{ padding: "8px", textAlign: "right" }}>%</th>
            <th style={{ padding: "8px 16px 8px 8px", textAlign: "right" }}>Distribuição</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ cls, val, pct, color, label }) => (
            <tr
              key={cls}
              className="hairline"
              style={{ transition: "background-color 0.1s" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-bg-3)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
            >
              <td style={{ padding: "8px 8px 8px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "2px", backgroundColor: color, flexShrink: 0 }} />
                  <span style={{ fontWeight: 500 }}>{label}</span>
                </div>
              </td>
              <td style={{ padding: "8px", textAlign: "right" }}>
                <span className="num pv" style={{ fontWeight: 500 }}>{fmt(val)}</span>
              </td>
              <td style={{ padding: "8px", textAlign: "right" }}>
                <span className="num" style={{ color: "var(--color-text-2)" }}>{pct.toFixed(1)}%</span>
              </td>
              <td style={{ padding: "8px 16px 8px 8px", textAlign: "right" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                  <div style={{ width: "128px", height: "6px", borderRadius: "3px", backgroundColor: "var(--color-bg-3)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, backgroundColor: color, transition: "width 0.3s" }} />
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
        {rows.length > 0 && (
          <tfoot>
            <tr style={{ borderTop: "1px solid var(--color-line)" }}>
              <td style={{ padding: "8px 8px 8px 16px", fontSize: "11.5px", color: "var(--color-text-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Total
              </td>
              <td style={{ padding: "8px", textAlign: "right" }}>
                <span className="num pv" style={{ fontWeight: 600, fontSize: "13px" }}>{fmt(totalBrl)}</span>
              </td>
              <td style={{ padding: "8px", textAlign: "right" }}>
                <span className="num" style={{ fontWeight: 600, fontSize: "13px", color: "var(--color-text-2)" }}>100%</span>
              </td>
              <td style={{ padding: "8px 16px 8px 8px" }} />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
