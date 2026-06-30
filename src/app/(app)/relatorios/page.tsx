import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getWeeklyReports } from "@/lib/reports/data";
import { WeeklyReportFull } from "@/components/reports/WeeklyReportFull";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Relatórios — Invest" };

export default async function RelatoriosPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const reports = await getWeeklyReports();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "820px" }}>
      <div>
        <h1 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "var(--color-text)" }}>
          Relatórios semanais
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--color-text-3)" }}>
          Leitura consolidada por semana: cenário, visão das casas e pontos de atenção por titular.
        </p>
      </div>

      {reports.length === 0 ? (
        <p style={{ fontSize: "13px", color: "var(--color-text-3)" }}>
          Nenhum relatório ainda. O agente gera toda segunda-feira.
        </p>
      ) : (
        reports.map((r) => <WeeklyReportFull key={r.id} report={r} />)
      )}
    </div>
  );
}
