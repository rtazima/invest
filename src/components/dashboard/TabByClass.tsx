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

function fmt(n: number): string {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface Props {
  summary: ClientPortfolioSummary;
}

export function TabByClass({ summary }: Props) {
  const totalBrl = summary.totalBrl;

  const rows = Object.entries(summary.byAssetClass)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([cls, val]) => {
      const pct = totalBrl > 0 ? (val / totalBrl) * 100 : 0;
      return { cls, val, pct };
    });

  return (
    <table style={{ width: "100%", fontSize: "12.5px", borderCollapse: "collapse" }}>
      <thead>
        <tr
          className="hairline"
          style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-3)" }}
        >
          <th style={{ padding: "8px 8px 8px 16px", textAlign: "left" }}>Classe</th>
          <th style={{ padding: "8px", textAlign: "right" }}>Patrimônio</th>
          <th style={{ padding: "8px", textAlign: "right" }}>Atual%</th>
          <th style={{ padding: "8px 16px 8px 8px", textAlign: "right" }}>Distribuição</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ cls, val, pct }) => {
          const color = ASSET_CLASS_COLORS[cls] ?? "oklch(0.45 0.02 240)";
          const label = ASSET_CLASS_LABELS[cls] ?? cls;

          return (
            <tr
              key={cls}
              className="hairline"
              style={{ cursor: "pointer", transition: "background-color 0.1s" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-bg-3)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
              }}
            >
              <td style={{ padding: "8px 8px 8px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "2px",
                      backgroundColor: color,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontWeight: 500 }}>{label}</span>
                </div>
              </td>
              <td style={{ padding: "8px", textAlign: "right" }}>
                <span className="num" style={{ fontWeight: 500 }}>{fmt(val)}</span>
              </td>
              <td style={{ padding: "8px", textAlign: "right" }}>
                <span className="num" style={{ color: "var(--color-text-2)" }}>
                  {pct.toFixed(2)}%
                </span>
              </td>
              <td style={{ padding: "8px 16px 8px 8px", textAlign: "right" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px" }}>
                  <div
                    style={{
                      width: "128px",
                      height: "6px",
                      borderRadius: "3px",
                      backgroundColor: "var(--color-bg-3)",
                      overflow: "hidden",
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.min(pct, 100)}%`,
                        backgroundColor: color,
                        transition: "width 0.3s",
                      }}
                    />
                  </div>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
