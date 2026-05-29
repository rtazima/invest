import type { ClientPortfolioSummary } from "./types";
import type { InstitutionSyncStatus } from "@/lib/data/sync";
import { formatDatetimeBR } from "@/lib/dates";

function fmt(n: number): string {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface Props {
  summary: ClientPortfolioSummary;
  syncStatuses: InstitutionSyncStatus[];
}

export function TabByInstitution({ summary, syncStatuses }: Props) {
  const totalBrl = summary.totalBrl;
  const byInst = summary.byInstitution;

  const syncMap = new Map(syncStatuses.map((s) => [s.institution, s]));

  const rows = Object.entries(byInst)
    .sort(([, a], [, b]) => b - a)
    .map(([inst, val]) => ({
      inst,
      val,
      pct: totalBrl > 0 ? (val / totalBrl) * 100 : 0,
      sync: syncMap.get(inst as never),
    }));

  return (
    <table style={{ width: "100%", fontSize: "12.5px", borderCollapse: "collapse" }}>
      <thead>
        <tr
          className="hairline"
          style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-3)" }}
        >
          <th style={{ padding: "8px 8px 8px 16px", textAlign: "left" }}>Instituição</th>
          <th style={{ padding: "8px", textAlign: "left" }}>Tipo</th>
          <th style={{ padding: "8px", textAlign: "left" }}>Sync</th>
          <th style={{ padding: "8px", textAlign: "right" }}>Patrimônio</th>
          <th style={{ padding: "8px 16px 8px 8px", textAlign: "right" }}>% Port.</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ inst, val, pct, sync }) => {
          const isOk = sync?.status === "ok";
          const isNever = !sync || sync.status === "never";

          return (
            <tr
              key={inst}
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
                    className="dot"
                    style={{
                      backgroundColor: isOk
                        ? "var(--color-gain)"
                        : isNever
                          ? "var(--color-text-3)"
                          : "var(--color-warn)",
                    }}
                  />
                  <span style={{ fontWeight: 500 }}>{inst.toUpperCase()}</span>
                </div>
              </td>
              <td style={{ padding: "8px", color: "var(--color-text-2)" }}>
                {inst === "nomad" ? "Banco EUA" : "Corretora BR"}
              </td>
              <td style={{ padding: "8px" }}>
                <span
                  className="num"
                  style={{
                    fontSize: "11.5px",
                    color: isOk ? "var(--color-text-2)" : isNever ? "var(--color-text-3)" : "var(--color-warn)",
                  }}
                >
                  {isNever
                    ? "nunca sincronizado"
                    : isOk
                      ? `${formatDatetimeBR(sync?.completedAt ?? null)} · ok`
                      : `${formatDatetimeBR(sync?.completedAt ?? null)} · expirado`}
                </span>
              </td>
              <td style={{ padding: "8px", textAlign: "right" }}>
                <span className="num pv" style={{ fontWeight: 500 }}>{fmt(val)}</span>
              </td>
              <td style={{ padding: "8px 16px 8px 8px", textAlign: "right" }}>
                <span className="num" style={{ color: "var(--color-text-2)" }}>
                  {pct.toFixed(2)}%
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
      {rows.length > 0 && (
        <tfoot>
          <tr style={{ borderTop: "1px solid var(--color-line)" }}>
            <td colSpan={3} style={{ padding: "8px 8px 8px 16px", fontSize: "11.5px", color: "var(--color-text-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Total
            </td>
            <td style={{ padding: "8px", textAlign: "right" }}>
              <span className="num pv" style={{ fontWeight: 600, fontSize: "13px" }}>{fmt(totalBrl)}</span>
            </td>
            <td style={{ padding: "8px 16px 8px 8px", textAlign: "right" }}>
              <span className="num" style={{ fontWeight: 600, fontSize: "13px", color: "var(--color-text-2)" }}>100,00%</span>
            </td>
          </tr>
        </tfoot>
      )}
    </table>
  );
}
