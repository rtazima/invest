"use client";

import { useState } from "react";

const ASSET_CLASS_LABELS: Record<string, string> = {
  fixed_income: "Renda Fixa",
  stocks_br: "Renda Var.",
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

const CIRCUMFERENCE = 2 * Math.PI * 54;

interface Props {
  byAssetClass: Record<string, number>;
  totalBrl: number;
}

export function AllocationDonut({ byAssetClass, totalBrl }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  if (totalBrl === 0) return null;

  const entries = Object.entries(byAssetClass)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a);

  const segments: Array<{ key: string; pct: number; color: string; label: string }> = entries.map(
    ([key, val]) => ({
      key,
      pct: val / totalBrl,
      color: ASSET_CLASS_COLORS[key] ?? "oklch(0.45 0.02 240)",
      label: ASSET_CLASS_LABELS[key] ?? key,
    }),
  );

  let offset = 0;
  const arcs = segments.map((seg) => {
    const arc = seg.pct * CIRCUMFERENCE;
    const dashOffset = CIRCUMFERENCE - offset;
    offset += arc;
    return { ...seg, arc, dashOffset };
  });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
      {/* Donut */}
      <svg viewBox="-80 -80 160 160" width="140" height="140" style={{ flexShrink: 0 }}>
        <circle r="54" fill="none" stroke="var(--color-line)" strokeWidth="18" />
        {arcs.map((seg) => (
          <circle
            key={seg.key}
            r="54"
            fill="none"
            stroke={seg.color}
            strokeWidth={hovered === seg.key ? 26 : 18}
            strokeDasharray={`${seg.arc.toFixed(2)} ${(CIRCUMFERENCE - seg.arc).toFixed(2)}`}
            strokeDashoffset={seg.dashOffset.toFixed(2)}
            transform="rotate(-90)"
            style={{ transition: "stroke-width 0.15s ease, opacity 0.15s ease", cursor: "pointer" }}
            onMouseEnter={() => setHovered(seg.key)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </svg>

      {/* Legenda */}
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
        {segments.map((seg) => (
          <li
            key={seg.key}
            style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11.5px" }}
            onMouseEnter={() => setHovered(seg.key)}
            onMouseLeave={() => setHovered(null)}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "2px",
                backgroundColor: seg.color,
                flexShrink: 0,
              }}
            />
            <span style={{ color: hovered === seg.key ? "var(--color-text)" : "var(--color-text-2)" }}>
              {seg.label}
            </span>
            <span className="num" style={{ marginLeft: "auto", color: "var(--color-text-3)" }}>
              {(seg.pct * 100).toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
