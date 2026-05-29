import type { ClientPortfolioSummary } from "./types";

const HOLDER_COLORS: Record<string, string> = {
  rodrigo: "oklch(0.65 0.10 240)",
  grasi: "oklch(0.68 0.13 330)",
  amora: "oklch(0.72 0.15 60)",
  benicio: "oklch(0.70 0.13 160)",
};

const HOLDER_METAS: Record<string, string> = {
  rodrigo: "82% / 100%",
  grasi: "liq. 30d ok",
  amora: "17% / R$12k/mês 18a",
  benicio: "18% / R$12k/mês 18a",
};

const RISK_LABELS: Record<string, string> = {
  conservative: "Conservador",
  moderate: "Moderado",
  aggressive: "Arrojado",
};

function fmt(n: number): string {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface Props {
  summary: ClientPortfolioSummary;
}

export function TabByHolder({ summary }: Props) {
  return (
    <table style={{ width: "100%", fontSize: "12.5px", borderCollapse: "collapse" }}>
      <thead>
        <tr
          className="hairline"
          style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-3)" }}
        >
          <th style={{ padding: "8px 8px 8px 16px", textAlign: "left" }}>Titular</th>
          <th style={{ padding: "8px", textAlign: "left" }}>Perfil</th>
          <th style={{ padding: "8px", textAlign: "left" }}>Instituições</th>
          <th style={{ padding: "8px", textAlign: "right" }}>Patrimônio</th>
          <th style={{ padding: "8px", textAlign: "right" }}>30d%</th>
          <th style={{ padding: "8px", textAlign: "right" }}>12m%</th>
          <th style={{ padding: "8px 16px 8px 8px", textAlign: "right" }}>Meta</th>
        </tr>
      </thead>
      <tbody>
        {summary.byHolder.map((h) => {
          const color = HOLDER_COLORS[h.slug] ?? "var(--color-brand)";
          const institutions = Object.keys(h.byInstitution)
            .map((i) => i.toUpperCase())
            .join(" · ");
          const meta = HOLDER_METAS[h.slug] ?? "";

          return (
            <tr
              key={h.id}
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
                  <div
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      backgroundColor: color,
                      display: "grid",
                      placeItems: "center",
                      fontSize: "11px",
                      fontWeight: 500,
                      color: "var(--color-bg)",
                      flexShrink: 0,
                    }}
                  >
                    {h.name[0]}
                  </div>
                  <span style={{ fontWeight: 500 }}>{h.name}</span>
                </div>
              </td>
              <td style={{ padding: "8px", color: "var(--color-text-2)" }}>
                {RISK_LABELS[h.role] ?? "Arrojado"}
              </td>
              <td style={{ padding: "8px", color: "var(--color-text-2)", fontSize: "11.5px" }}>
                {institutions}
              </td>
              <td style={{ padding: "8px", textAlign: "right" }}>
                <span className="num pv" style={{ fontWeight: 500 }}>
                  {fmt(h.totalBrl)}
                </span>
              </td>
              <td style={{ padding: "8px", textAlign: "right" }}>
                <span className="num" style={{ color: "var(--color-gain)" }}>+2,43%</span>
              </td>
              <td style={{ padding: "8px", textAlign: "right" }}>
                <span className="num" style={{ color: "var(--color-gain)" }}>+11,82%</span>
              </td>
              <td style={{ padding: "8px 16px 8px 8px", textAlign: "right" }}>
                <span className="num" style={{ fontSize: "11.5px", color: "var(--color-text-2)" }}>
                  {meta}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
