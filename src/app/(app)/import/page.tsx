import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getHolders } from "@/lib/data/holders";
import { getImportBatches } from "@/lib/data/positions";
import { ImportWizard } from "@/components/import/ImportWizard";
import { formatDatetimeBR } from "@/lib/dates";

export const metadata: Metadata = { title: "Importar — Invest" };

export default async function ImportPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [holders, batches] = await Promise.all([getHolders(), getImportBatches()]);

  return (
    <div style={{ maxWidth: "700px" }}>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "18px", fontWeight: 700, color: "var(--color-text)", margin: "0 0 4px" }}>
          Importar portfólio
        </h1>
        <p style={{ margin: 0, fontSize: "13px", color: "var(--color-text-3)" }}>
          Importe posições de XP, BTG e Nomad via CSV.
        </p>
      </div>

      <div
        style={{
          borderRadius: "8px",
          border: "1px solid var(--color-line-2)",
          backgroundColor: "var(--color-bg-2)",
          padding: "24px",
          marginBottom: "32px",
        }}
      >
        <ImportWizard holders={holders} />
      </div>

      {/* Histórico de imports */}
      {batches.length > 0 && (
        <div>
          <h2 style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text-2)", marginBottom: "12px" }}>
            Histórico de importações
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {batches.slice(0, 10).map((b) => {
              const statusColor =
                b.status === "completed"
                  ? "var(--color-gain)"
                  : b.status === "failed"
                    ? "var(--color-crit)"
                    : "var(--color-text-3)";
              return (
                <div
                  key={b.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "10px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--color-line-2)",
                    backgroundColor: "var(--color-bg-2)",
                    fontSize: "12.5px",
                  }}
                >
                  <span
                    className="dot"
                    style={{ backgroundColor: statusColor, flexShrink: 0 }}
                  />
                  <span style={{ fontWeight: 500, minWidth: "50px" }}>
                    {b.institution.toUpperCase()}
                  </span>
                  <span style={{ color: "var(--color-text-3)", flex: 1 }}>{b.filename ?? "—"}</span>
                  {b.row_count !== null && (
                    <span className="num" style={{ color: "var(--color-text-2)" }}>
                      {b.row_count} linhas
                    </span>
                  )}
                  <span className="num" style={{ color: "var(--color-text-3)", whiteSpace: "nowrap" }}>
                    {formatDatetimeBR(b.imported_at)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
