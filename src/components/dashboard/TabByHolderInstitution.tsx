import type { ClientPortfolioSummary } from "./types";

const HOLDER_COLORS: Record<string, string> = {
  rodrigo: "oklch(0.65 0.10 240)",
  grasi: "oklch(0.68 0.13 330)",
  amora: "oklch(0.72 0.15 60)",
  benicio: "oklch(0.70 0.13 160)",
};

const INST_LABELS: Record<string, string> = {
  xp: "XP",
  btg: "BTG",
  nomad: "Nomad",
  mercadopago: "Mercado Pago",
};

function fmt(n: number): string {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function pct(part: number, total: number): string {
  if (total === 0) return "—";
  return (part / total * 100).toFixed(1) + "%";
}

interface Props {
  summary: ClientPortfolioSummary;
}

export function TabByHolderInstitution({ summary }: Props) {
  const { byHolder, totalBrl } = summary;

  // Coleta todas as instituições que aparecem em pelo menos um titular
  const instSet = new Set<string>();
  for (const h of byHolder) {
    for (const inst of Object.keys(h.byInstitution)) {
      if ((h.byInstitution[inst] ?? 0) > 0) instSet.add(inst);
    }
  }
  const institutions = Array.from(instSet).sort();

  // Totais por instituição (coluna)
  const instTotals: Record<string, number> = {};
  for (const inst of institutions) {
    instTotals[inst] = byHolder.reduce((acc, h) => acc + (h.byInstitution[inst] ?? 0), 0);
  }

  const thStyle: React.CSSProperties = {
    padding: "8px 16px",
    textAlign: "right",
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "var(--color-text-3)",
    fontWeight: 500,
    whiteSpace: "nowrap",
  };

  const tdBase: React.CSSProperties = {
    padding: "10px 16px",
    textAlign: "right",
    fontSize: "12.5px",
    verticalAlign: "top",
  };

  const dividerRow: React.CSSProperties = {
    borderTop: "1px solid var(--color-line-2)",
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", fontSize: "12.5px", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--color-line-2)" }}>
            <th style={{ ...thStyle, textAlign: "left", padding: "8px 8px 8px 20px" }}>
              Titular
            </th>
            {institutions.map((inst) => (
              <th key={inst} style={thStyle}>
                {INST_LABELS[inst] ?? inst.toUpperCase()}
              </th>
            ))}
            <th style={{ ...thStyle, color: "var(--color-text-2)" }}>Total</th>
          </tr>
        </thead>

        <tbody>
          {byHolder.map((h) => {
            const color = HOLDER_COLORS[h.slug] ?? "var(--color-brand)";
            return (
              <tr
                key={h.id}
                style={dividerRow}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-bg-3)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
              >
                {/* Titular */}
                <td style={{ ...tdBase, textAlign: "left", padding: "10px 8px 10px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                    <div
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "50%",
                        backgroundColor: color,
                        display: "grid",
                        placeItems: "center",
                        fontSize: "10px",
                        fontWeight: 600,
                        color: "var(--color-bg)",
                        flexShrink: 0,
                      }}
                    >
                      {h.name[0]}
                    </div>
                    <span style={{ fontWeight: 500 }}>{h.name}</span>
                  </div>
                </td>

                {/* Células por instituição */}
                {institutions.map((inst) => {
                  const val = h.byInstitution[inst] ?? 0;
                  return (
                    <td key={inst} style={tdBase}>
                      {val > 0 ? (
                        <div>
                          <div className="num pv" style={{ fontWeight: 500 }}>
                            R$ {fmt(val)}
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--color-text-3)", marginTop: "2px" }}>
                            {pct(val, totalBrl)}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: "var(--color-line)" }}>—</span>
                      )}
                    </td>
                  );
                })}

                {/* Total do titular */}
                <td style={tdBase}>
                  <div>
                    <div className="num pv" style={{ fontWeight: 600, color: "var(--color-text)" }}>
                      R$ {fmt(h.totalBrl)}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--color-text-3)", marginTop: "2px" }}>
                      {pct(h.totalBrl, totalBrl)}
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>

        {/* Linha de totais */}
        <tfoot>
          <tr style={{ borderTop: "2px solid var(--color-line-2)", backgroundColor: "var(--color-bg-3)" }}>
            <td style={{ ...tdBase, textAlign: "left", padding: "10px 8px 10px 20px", fontWeight: 600, color: "var(--color-text-2)", fontSize: "12px" }}>
              Total
            </td>
            {institutions.map((inst) => (
              <td key={inst} style={tdBase}>
                <div>
                  <div className="num pv" style={{ fontWeight: 600 }}>
                    R$ {fmt(instTotals[inst] ?? 0)}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--color-text-3)", marginTop: "2px" }}>
                    {pct(instTotals[inst] ?? 0, totalBrl)}
                  </div>
                </div>
              </td>
            ))}
            <td style={tdBase}>
              <div>
                <div className="num pv" style={{ fontWeight: 700, color: "var(--color-text)" }}>
                  R$ {fmt(totalBrl)}
                </div>
                <div style={{ fontSize: "11px", color: "var(--color-text-3)", marginTop: "2px" }}>
                  100%
                </div>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
