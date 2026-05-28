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

const NATIONAL_SET = new Set([
  "fixed_income",
  "stocks_br",
  "fiis",
  "etf_br",
  "funds",
  "liquidity",
]);

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

function worstStatus(statuses: Status[]): Status {
  if (statuses.includes("out")) return "out";
  if (statuses.includes("warn")) return "warn";
  return "ok";
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
      <rect x={0} y={3} width={BAR_W} height={BAR_H} rx={4} fill="var(--color-bg-3)" />
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
      <rect
        x={targetX - 0.5}
        y={1}
        width={1}
        height={BAR_H + 4}
        rx={0.5}
        fill={noData ? "var(--color-line)" : cfg.color}
        opacity={0.5}
      />
      {!noData && (
        <circle cx={actualX} cy={3 + BAR_H / 2} r={4.5} fill={cfg.color} />
      )}
    </svg>
  );
}

interface RowData {
  asset_class: string;
  target_pct: number;
  tolerance_pct: number;
  actual: number;
  deviation: number;
  status: Status;
}

function GeoGroupRow({
  label,
  targetSum,
  actualSum,
  status,
  hasData,
}: {
  label: string;
  targetSum: number;
  actualSum: number;
  status: Status;
  hasData: boolean;
}) {
  const deviation = actualSum - targetSum;
  const cfg = STATUS[status];

  return (
    <tr style={{ backgroundColor: "var(--color-bg-3)" }}>
      <td
        colSpan={2}
        style={{
          padding: "6px",
          fontSize: "11px",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--color-text-2)",
        }}
      >
        {label}
      </td>
      <td style={{ padding: "6px", textAlign: "right" }}>
        <span
          className="num"
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: hasData ? "var(--color-text)" : "var(--color-text-3)",
          }}
        >
          {hasData ? `${actualSum.toFixed(1)}%` : "—"}
        </span>
      </td>
      <td style={{ padding: "6px", textAlign: "right" }}>
        <span className="num" style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text-2)" }}>
          {targetSum.toFixed(1)}%
        </span>
      </td>
      <td style={{ padding: "6px", textAlign: "right" }}>
        {hasData ? (
          <span className="num" style={{ fontSize: "12px", fontWeight: 600, color: cfg.color }}>
            {deviation > 0 ? "+" : ""}
            {deviation.toFixed(1)}%
          </span>
        ) : (
          <span style={{ color: "var(--color-text-3)" }}>—</span>
        )}
      </td>
      <td style={{ padding: "6px", textAlign: "right" }}>
        {hasData ? (
          <span
            style={{
              fontSize: "11px",
              padding: "2px 8px",
              borderRadius: "20px",
              backgroundColor: cfg.bg,
              color: cfg.color,
              fontWeight: 600,
            }}
          >
            {cfg.label}
          </span>
        ) : (
          <span style={{ fontSize: "11px", color: "var(--color-text-3)" }}>sem dados</span>
        )}
      </td>
    </tr>
  );
}

function ClassRow({
  row,
  hasData,
  hovered,
  setHovered,
}: {
  row: RowData;
  hasData: boolean;
  hovered: string | null;
  setHovered: (v: string | null) => void;
}) {
  const cfg = STATUS[row.status];
  return (
    <tr
      className="hairline"
      style={{
        backgroundColor: hovered === row.asset_class ? "var(--color-bg-3)" : "transparent",
        transition: "background-color 0.1s",
      }}
      onMouseEnter={() => setHovered(row.asset_class)}
      onMouseLeave={() => setHovered(null)}
    >
      <td style={{ padding: "8px 6px 8px 16px", fontWeight: 500, whiteSpace: "nowrap" }}>
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
          <span
            style={{
              fontSize: "11px",
              padding: "2px 8px",
              borderRadius: "20px",
              backgroundColor: cfg.bg,
              color: cfg.color,
              fontWeight: 600,
            }}
          >
            {cfg.label}
          </span>
        ) : (
          <span style={{ fontSize: "11px", color: "var(--color-text-3)" }}>sem dados</span>
        )}
      </td>
    </tr>
  );
}

export function AllocationComparison({ targets, actualByClass, hasData }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  const rows: RowData[] = targets.map((t) => {
    const actual = actualByClass[t.asset_class] ?? 0;
    const deviation = actual - t.target_pct;
    const status: Status = hasData ? getStatus(deviation, t.tolerance_pct) : "ok";
    return { ...t, actual, deviation, status };
  });

  const natRows = [...rows]
    .filter((r) => NATIONAL_SET.has(r.asset_class))
    .sort((a, b) => b.target_pct - a.target_pct);
  const intlRows = [...rows]
    .filter((r) => !NATIONAL_SET.has(r.asset_class))
    .sort((a, b) => b.target_pct - a.target_pct);

  const natTargetSum = natRows.reduce((s, r) => s + r.target_pct, 0);
  const natActualSum = natRows.reduce((s, r) => s + r.actual, 0);
  const intlTargetSum = intlRows.reduce((s, r) => s + r.target_pct, 0);
  const intlActualSum = intlRows.reduce((s, r) => s + r.actual, 0);

  const natStatus = hasData ? worstStatus(natRows.map((r) => r.status)) : "ok";
  const intlStatus = hasData ? worstStatus(intlRows.map((r) => r.status)) : "ok";

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
          <span
            style={{
              fontSize: "11.5px",
              padding: "3px 10px",
              borderRadius: "20px",
              backgroundColor: STATUS.ok.bg,
              color: STATUS.ok.color,
              fontWeight: 600,
            }}
          >
            Portfólio enquadrado
          </span>
        ) : (
          <>
            {outCount > 0 && (
              <span
                style={{
                  fontSize: "11.5px",
                  padding: "3px 10px",
                  borderRadius: "20px",
                  backgroundColor: STATUS.out.bg,
                  color: STATUS.out.color,
                  fontWeight: 600,
                }}
              >
                {outCount} classe{outCount > 1 ? "s" : ""} desenquadrada{outCount > 1 ? "s" : ""}
              </span>
            )}
            {warnCount > 0 && (
              <span
                style={{
                  fontSize: "11.5px",
                  padding: "3px 10px",
                  borderRadius: "20px",
                  backgroundColor: STATUS.warn.bg,
                  color: STATUS.warn.color,
                  fontWeight: 600,
                }}
              >
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
            style={{
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--color-text-3)",
            }}
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
          {natRows.length > 0 && (
            <>
              <GeoGroupRow
                label="Nacional"
                targetSum={natTargetSum}
                actualSum={natActualSum}
                status={natStatus}
                hasData={hasData}
              />
              {natRows.map((row) => (
                <ClassRow
                  key={row.asset_class}
                  row={row}
                  hasData={hasData}
                  hovered={hovered}
                  setHovered={setHovered}
                />
              ))}
            </>
          )}

          {intlRows.length > 0 && (
            <>
              <GeoGroupRow
                label="Internacional"
                targetSum={intlTargetSum}
                actualSum={intlActualSum}
                status={intlStatus}
                hasData={hasData}
              />
              {intlRows.map((row) => (
                <ClassRow
                  key={row.asset_class}
                  row={row}
                  hasData={hasData}
                  hovered={hovered}
                  setHovered={setHovered}
                />
              ))}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}
