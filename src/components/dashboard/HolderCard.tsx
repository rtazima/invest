import type { ClientHolderSummary } from "./types";

const HOLDER_COLORS: Record<string, string> = {
  rodrigo: "oklch(0.65 0.10 240)",
  grasi: "oklch(0.68 0.13 330)",
  amora: "oklch(0.72 0.15 60)",
  benicio: "oklch(0.70 0.13 160)",
};

const HOLDER_METAS: Record<string, string> = {
  rodrigo: "renda passiva",
  grasi: "liq. 30d ok",
  amora: "R$12k/mês 18a",
  benicio: "R$12k/mês 18a",
};

function fmtBrl(n: number): [string, string] {
  const s = n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const [int = "0", dec = "00"] = s.split(",");
  return [int, `,${dec}`];
}

function demoSparkPath(): string {
  const pts = [0, 4, 2, 6, 3, 8, 5, 9, 7, 10, 8, 12];
  const maxY = Math.max(...pts);
  const w = 64;
  const h = 32;
  return pts
    .map((y, i) => {
      const x = (i / (pts.length - 1)) * w;
      const yy = h - (y / maxY) * (h * 0.8) - h * 0.05;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${yy.toFixed(1)}`;
    })
    .join(" ");
}

const RISK_LABELS: Record<string, string> = {
  conservative: "Conservador",
  moderate: "Moderado",
  aggressive: "Arrojado",
};

interface Props {
  holder: ClientHolderSummary;
  todayPct?: number;
}

export function HolderCard({ holder, todayPct = 0 }: Props) {
  const color = HOLDER_COLORS[holder.slug] ?? "var(--color-brand)";
  const meta = HOLDER_METAS[holder.slug] ?? "";
  const [int, dec] = fmtBrl(holder.totalBrl);
  const spark = demoSparkPath();
  const positive = todayPct >= 0;

  const initials = holder.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      style={{
        borderRadius: "8px",
        border: "1px solid var(--color-line-2)",
        backgroundColor: "var(--color-bg-2)",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <div
          style={{
            width: "20px",
            height: "20px",
            borderRadius: "50%",
            backgroundColor: color,
            display: "grid",
            placeItems: "center",
            fontSize: "10px",
            fontWeight: 500,
            color: "var(--color-bg)",
            flexShrink: 0,
          }}
        >
          {initials}
        </div>
        <span style={{ fontSize: "12.5px", fontWeight: 500 }}>{holder.name}</span>
        <span style={{ fontSize: "10.5px", color: "var(--color-text-3)", marginLeft: "auto" }}>
          {RISK_LABELS[holder.role] ?? "Arrojado"}
        </span>
      </div>

      {/* Patrimônio */}
      <div style={{ display: "flex", alignItems: "baseline", gap: "1px" }}>
        <span className="num" style={{ fontSize: "20px", letterSpacing: "-0.015em", fontWeight: 500 }}>{int}</span>
        <span className="num" style={{ fontSize: "14px", color: "var(--color-text-3)" }}>{dec}</span>
      </div>

      {/* Sub-linha */}
      <div className="num" style={{ fontSize: "11px", display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ color: positive ? "var(--color-gain)" : "var(--color-loss)" }}>
          {positive ? "+" : "−"}{Math.abs(todayPct).toFixed(2)}%
        </span>
        {meta && <span style={{ color: "var(--color-text-3)" }}>{meta}</span>}
      </div>

      {/* Sparkline */}
      <div style={{ margin: "auto -16px -16px", marginTop: "4px" }}>
        <svg viewBox="0 0 64 32" width="100%" height="40" preserveAspectRatio="none">
          <path
            d={`${spark} L64,32 L0,32 Z`}
            fill={`color-mix(in oklch, ${color} 14%, transparent)`}
          />
          <path d={spark} fill="none" stroke={color} strokeWidth="1.25" />
        </svg>
      </div>
    </div>
  );
}
