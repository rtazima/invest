import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getResearchReports, type ResearchReportView } from "@/lib/research/data";
import { ResearchUpload } from "@/components/research/ResearchUpload";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Research — Invest" };

const RATING_LABEL: Record<string, string> = {
  buy: "Compra",
  hold: "Manter",
  sell: "Venda",
  neutral: "Neutro",
  unknown: "—",
};
const RATING_COLOR: Record<string, string> = {
  buy: "var(--color-gain)",
  sell: "var(--color-loss)",
  hold: "var(--color-text-2)",
  neutral: "var(--color-text-2)",
  unknown: "var(--color-text-3)",
};

function fmtDate(d: string | null): string {
  return d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "sem data";
}

function ReportCard({ report }: { report: ResearchReportView }) {
  return (
    <section
      style={{
        borderRadius: "8px",
        border: "1px solid var(--color-line-2)",
        backgroundColor: "var(--color-bg-2)",
        padding: "16px",
      }}
    >
      <header style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 600,
            textTransform: "uppercase",
            color: "var(--color-text)",
            backgroundColor: "var(--color-bg-3)",
            borderRadius: "4px",
            padding: "2px 8px",
          }}
        >
          {report.house}
        </span>
        <span style={{ fontSize: "13px", color: "var(--color-text)", fontWeight: 500 }}>
          {report.title ?? report.report_type ?? "Relatório"}
        </span>
        <span style={{ fontSize: "12px", color: "var(--color-text-3)" }}>{fmtDate(report.report_date)}</span>
        {report.status === "needs_review" && (
          <span style={{ fontSize: "11px", color: "var(--color-warn)" }}>revisar</span>
        )}
      </header>

      {report.scenario_summary && (
        <p style={{ margin: "10px 0 0", fontSize: "13px", color: "var(--color-text-2)" }}>{report.scenario_summary}</p>
      )}

      {report.top_picks.length > 0 && (
        <p style={{ margin: "10px 0 0", fontSize: "12px", color: "var(--color-text-3)" }}>
          <span style={{ color: "var(--color-text-2)" }}>Top picks:</span> {report.top_picks.join(", ")}
        </p>
      )}

      {report.observations.length > 0 && (
        <table style={{ width: "100%", marginTop: "12px", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr style={{ color: "var(--color-text-3)", textAlign: "left" }}>
              <th style={{ padding: "4px 8px", fontWeight: 500 }}>Ativo</th>
              <th style={{ padding: "4px 8px", fontWeight: 500 }}>Rating</th>
              <th style={{ padding: "4px 8px", fontWeight: 500, textAlign: "right" }}>Preço-alvo</th>
              <th style={{ padding: "4px 8px", fontWeight: 500, textAlign: "right" }}>Confiança</th>
            </tr>
          </thead>
          <tbody>
            {report.observations.map((o) => {
              const canon = o.rating_canonical ?? "unknown";
              return (
                <tr key={o.id} style={{ borderTop: "1px solid var(--color-line-2)" }}>
                  <td style={{ padding: "5px 8px", color: "var(--color-text)" }}>
                    {o.ticker ?? o.asset_name ?? "—"}
                    {o.needs_review && (
                      <span style={{ color: "var(--color-warn)", marginLeft: "6px", fontSize: "11px" }}>?</span>
                    )}
                  </td>
                  <td style={{ padding: "5px 8px", color: RATING_COLOR[canon] }}>
                    {o.rating ?? RATING_LABEL[canon]}
                  </td>
                  <td
                    style={{
                      padding: "5px 8px",
                      textAlign: "right",
                      fontFamily: "var(--font-mono, monospace)",
                      color: "var(--color-text)",
                    }}
                  >
                    {o.target_price !== null
                      ? `${o.currency ?? ""} ${o.target_price.toLocaleString("pt-BR")}`.trim()
                      : "—"}
                  </td>
                  <td
                    style={{
                      padding: "5px 8px",
                      textAlign: "right",
                      color: "var(--color-text-3)",
                      fontFamily: "var(--font-mono, monospace)",
                    }}
                  >
                    {o.confidence !== null ? `${Math.round(o.confidence * 100)}%` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default async function ResearchPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const reports = await getResearchReports();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "900px" }}>
      <div>
        <h1 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "var(--color-text)" }}>Research</h1>
        <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--color-text-3)" }}>
          Suba os relatórios da XP e BTG. O conteúdo é extraído e fica isolado na sua família.
        </p>
      </div>

      <ResearchUpload />

      {reports.length === 0 ? (
        <p style={{ fontSize: "13px", color: "var(--color-text-3)" }}>Nenhum relatório importado ainda.</p>
      ) : (
        reports.map((r) => <ReportCard key={r.id} report={r} />)
      )}
    </div>
  );
}
