"use client";

import { useState } from "react";

const LABELS: Record<string, string> = {
  fixed_income: "Renda Fixa",
  stocks_br: "Ações BR",
  stocks_intl: "Ações Intl.",
  fiis: "FIIs",
  etf_br: "ETF BR",
  etf_intl: "ETF Intl.",
  funds: "Fundos",
  liquidity: "Liquidez",
};

export interface AllocationTarget {
  asset_class: string;
  target_pct: number;    // 0-100
  tolerance_pct: number; // 0-100
}

interface Props {
  targets: AllocationTarget[];
  actualByClass: Record<string, number>; // 0-100 percentages
  hasData: boolean;
}

type Status = "ok" | "warn" | "out";

function getStatus(deviation: number, tolerance: number): Status {
  const abs = Math.abs(deviation);
  if (abs <= tolerance) return "ok";
  if (abs <= tolerance * 1.5) return "warn";
  return "out";
}

const STATUS: Record<Status, { label: string; color: string; bg: string }> = {
  ok: {
    label: "Enquadrado",
    color: "var(--color-gain)",
    bg: "color-mix(in srgb, var(--color-gain) 14%, transparent)",
  },
  warn: {
    label: "Atenção",
    color: "oklch(0.78 0.14 75)",
    bg: "color-mix(in srgb, oklch(0.78 0.14 75) 14%, transparent)",
  },
  out: {
    label: "Desenquadrado",
    color: "var(--color-crit)",
    bg: "color-mix(in srgb, var(--color-crit) 14%, transparent)",
  },
};

const BAR_W = 160;
const BAR_H = 8;

function RangeBar({
  target,
  tolerance,
  actual,
  status,
  noData,
}: {
  target: number;
  tolerance: number;
  actual: number;
  status: Status;
  noData: boolean;
}) {
  const toX = (pct: number) => Math.max(0, Math.min(BAR_W, (pct / 100) * BAR_W));
  const cfg = STATUS[status];

  const bandX1 = toX(target - tolerance);
  const bandX2 = toX(target + tolerance);
  const targetX = toX(target);
  const actualX = toX(actual);

  return (
    <svg width={BAR_W} height={BAR_H + 6} style={{ overflow: "visible", display: "block", margin: "0 auto" }}>
      {/* Track */}
      <rect x={0} y={3} width={BAR_W} height={BAR_H} rx={4} fill="var(--color-bg-3)" />

      {/* Target band */}
      <rect
        x={bandX1}
        y={3}
        width={Math.max(bandX2 - bandX1, 3)}
        height={BAR_H}
        rx={2}
        fill={noData ? "var(--color-bg-3)" : cfg.bg}
        stroke={noData ? "var(--color-line)" : cfg.color}
        strokeWidth={0.5}
        strokeOpacity={0.5}
      />

      {/* Target center tick */}
      <rect x={targetX - 0.5} y={1} width={1} height={BAR_H + 4} rx={0.5} fill={noData ? "var(--color-line)" : cfg.color} opacity={0.5} />

      {/* Actual marker (hidden when no data) */}
      {!noData && (
        <circle cx={actualX} cy={3 + BAR_H / 2} r={4.5} fill={cfg.color} />
      )}
    </svg>
  );
}

export function AllocationComparison({ targets, actualByClass, hasData }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  const rows = [...targets]
    .sort((a, b) => b.target_pct - a.target_pct)
    .map((t) => {
      const actual = actualByClass[t.asset_class] ?? 0;
      const deviation = actual - t.target_pct;
      const status: Status = hasData ? getStatus(deviation, t.tolerance_pct) : "ok";
      return { ...t, actual, deviation, status };
    });

  const outCount = rows.filter((r) => r.status === "out").length;
  const warnCount = rows.filter((r) => r.status === "warn").length;

  return (
    <div>
      {/* Summary chips */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        {!hasData ? (
          <span style={{ fontSize: "11.5px", color: "var(--color-text-3)" }}>
            Importe posições para ver a comparação com a carteira real.
          </span>
        ) : outCount === 0 && warnCount === 0 ? (
          <span style={{ fontSize: "11.5px", padding: "3px 10px", borderRadius: "20px", backgroundColor: STATUS.ok.bg, color: STATUS.ok.color, fontWeight: 600 }}>
            Portfólio enquadrado
          </span>
        ) : (
          <>
            {outCount > 0 && (
              <span style={{ fontSize: "11.5px", padding: "3px 10px", borderRadius: "20px", backgroundColor: STATUS.out.bg, color: STATUS.out.color, fontWeight: 600 }}>
                {outCount} classe{outCount > 1 ? "s" : ""} desenquadrada{outCount > 1 ? "s" : ""}
              </span>
            )}
            {warnCount > 0 && (
              <span style={{ fontSize: "11.5px", padding: "3px 10px", borderRadius: "20px", backgroundColor: STATUS.warn.bg, color: STATUS.warn.color, fontWeight: 600 }}>
                {warnCount} em atenção
              </span>
            )}
          </>
        )}
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
        <thead>
          <tr
            className="hairline"
            style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-3)" }}
          >
            <th style={{ padding: "6px", textAlign: "left" }}>Classe</th>
            <th style={{ padding: "6px", textAlign: "center" }}>Alvo vs. Real</th>
            <th style={{ padding: "6px", textAlign: "right" }}>Real</th>
            <th style={{ padding: "6px", textAlign: "right" }}>Alvo ± tol.</th>
            <th style={{ padding: "6px", textAlign: "right" }}>Desvio</th>
            <th style={{ padding: "6px", textAlign: "right" }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const cfg = STATUS[row.status];
            return (
              <tr
                key={row.asset_class}
                className="hairline"
                style={{
                  backgroundColor: hovered === row.asset_class ? "var(--color-bg-3)" : "transparent",
                  transition: "background-color 0.1s",
                }}
                onMouseEnter={() => setHovered(row.asset_class)}
                onMouseLeave={() => setHovered(null)}
              >
                <td style={{ padding: "8px 6px", fontWeight: 500, whiteSpace: "nowrap" }}>
                  {LABELS[row.asset_class] ?? row.asset_class}
                </td>

                <td style={{ padding: "8px 6px" }}>
                  <RangeBar
                    target={row.target_pct}
                    tolerance={row.tolerance_pct}
                    actual={row.actual}
                    status={row.status}
                    noData={!hasData}
                  />
                </td>

                <td style={{ padding: "8px 6px", textAlign: "right" }}>
                  <span className="num" style={{ color: hasData ? "var(--color-text)" : "var(--color-text-3)" }}>
                    {hasData ? `${row.actual.toFixed(1)}%` : "—"}
                  </span>
                </td>

                <td style={{ padding: "8px 6px", textAlign: "right", whiteSpace: "nowrap" }}>
                  <span className="num" style={{ color: "var(--color-text-2)" }}>
                    {row.target_pct.toFixed(1)}%
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--color-text-3)", marginLeft: "3px" }}>
                    ±{row.tolerance_pct.toFixed(0)}
                  </span>
                </td>

                <td style={{ padding: "8px 6px", textAlign: "right" }}>
                  {hasData ? (
                    <span className="num" style={{ color: cfg.color, fontWeight: 500 }}>
                      {row.deviation > 0 ? "+" : ""}
                      {row.deviation.toFixed(1)}%
                    </span>
                  ) : (
                    <span style={{ color: "var(--color-text-3)" }}>—</span>
                  )}
                </td>

                <td style={{ padding: "8px 6px", textAlign: "right", whiteSpace: "nowrap" }}>
                  {hasData ? (
                    <span style={{
                      fontSize: "11px",
                      padding: "2px 8px",
                      borderRadius: "20px",
                      backgroundColor: cfg.bg,
                      color: cfg.color,
                      fontWeight: 600,
                    }}>
                      {cfg.label}
                    </span>
                  ) : (
                    <span style={{ fontSize: "11px", color: "var(--color-text-3)" }}>sem dados</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
