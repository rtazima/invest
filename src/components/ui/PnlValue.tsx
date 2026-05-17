interface Props {
  value: number;
  pct?: number;
  showSign?: boolean;
}

function fmt(n: number): string {
  return Math.abs(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function PnlValue({ value, pct, showSign = true }: Props) {
  const positive = value >= 0;
  const color = positive ? "var(--color-gain)" : "var(--color-loss)";
  const sign = positive ? "+" : "−";

  return (
    <span className="num" style={{ color, display: "inline-flex", gap: "4px" }}>
      {showSign && sign}
      {fmt(value)}
      {pct !== undefined && (
        <span style={{ color: "color-mix(in oklch, currentColor 70%, transparent)" }}>
          {positive ? "+" : "−"}{Math.abs(pct).toFixed(2)}%
        </span>
      )}
    </span>
  );
}
