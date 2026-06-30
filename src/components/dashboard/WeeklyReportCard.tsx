import Link from "next/link";
import type { CSSProperties } from "react";
import type { WeeklyReportView } from "@/lib/reports/data";

const card: CSSProperties = {
  borderRadius: "8px",
  border: "1px solid var(--color-line-2)",
  backgroundColor: "var(--color-bg-2)",
  padding: "16px",
};

function fmtWeek(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function WeeklyReportCard({ report }: { report: WeeklyReportView | null }) {
  if (!report) return null;
  const attentionCount = report.body.by_holder.reduce((s, h) => s + h.attention.length, 0);

  return (
    <section style={card}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
        <h2 style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "var(--color-text)" }}>
          Relatório semanal
        </h2>
        <span style={{ fontSize: "12px", color: "var(--color-text-3)" }}>semana de {fmtWeek(report.week_start)}</span>
      </header>

      {report.body.summary && (
        <p style={{ margin: "10px 0 0", fontSize: "13px", color: "var(--color-text)" }}>{report.body.summary}</p>
      )}

      <div style={{ marginTop: "10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "12px", color: "var(--color-text-3)" }}>
          {attentionCount === 0 ? "Nenhum ponto de atenção" : `${attentionCount} ponto(s) de atenção`}
        </span>
        <Link href="/relatorios" style={{ fontSize: "12px", color: "var(--color-brand)", textDecoration: "none" }}>
          Ver completo →
        </Link>
      </div>
    </section>
  );
}
