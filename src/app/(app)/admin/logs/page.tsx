import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getHolders } from "@/lib/data/holders";

export const metadata: Metadata = { title: "Logs de auditoria — Invest" };

function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function metaSummary(meta: Record<string, unknown>): string {
  const keys = Object.keys(meta);
  if (keys.length === 0) return "—";
  if (keys.length <= 2) return JSON.stringify(meta);
  return `{${keys.join(", ")}}`;
}

type AuditRow = {
  id: string;
  created_at: string;
  user_email: string | null;
  user_role: string | null;
  action: string;
  resource: string | null;
  metadata: Record<string, unknown>;
};

export default async function AdminLogsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const holders = await getHolders();
  const myHolder = holders.find((h) => h.user_id === user.id);
  if (myHolder?.role !== "owner") redirect("/dashboard");

  const { data: logs } = await supabase
    .from("audit_logs")
    .select("id, created_at, user_email, user_role, action, resource, metadata")
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (logs ?? []) as AuditRow[];

  return (
    <div style={{ maxWidth: "1100px" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--color-text)", margin: "0 0 0.25rem" }}>
          Logs de auditoria
        </h1>
        <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", margin: 0 }}>
          Últimas 200 ações registradas.
        </p>
      </div>

      {rows.length === 0 ? (
        <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>Nenhum registro ainda.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
            <thead>
              <tr>
                {["Data/hora", "Usuário", "Papel", "Ação", "Recurso", "Metadados"].map((col) => (
                  <th
                    key={col}
                    style={{
                      textAlign: "left",
                      padding: "6px 10px",
                      fontWeight: 600,
                      fontSize: "0.75rem",
                      color: "var(--color-text-muted)",
                      borderBottom: "1px solid var(--color-line-2)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} style={{ borderBottom: "1px solid var(--color-line-2)" }}>
                  <td style={{ padding: "7px 10px", color: "var(--color-text-muted)", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
                    {formatDate(row.created_at)}
                  </td>
                  <td style={{ padding: "7px 10px", color: "var(--color-text)", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {row.user_email ?? "—"}
                  </td>
                  <td style={{ padding: "7px 10px", color: "var(--color-text-muted)" }}>
                    {row.user_role ?? "—"}
                  </td>
                  <td style={{ padding: "7px 10px" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 7px",
                        borderRadius: "4px",
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        backgroundColor:
                          row.action === "login"
                            ? "oklch(0.35 0.1 240 / 0.2)"
                            : row.action === "council_query"
                              ? "oklch(0.35 0.1 60 / 0.2)"
                              : "var(--color-bg-3)",
                        color:
                          row.action === "login"
                            ? "oklch(0.65 0.15 240)"
                            : row.action === "council_query"
                              ? "oklch(0.65 0.15 60)"
                              : "var(--color-text-muted)",
                      }}
                    >
                      {row.action}
                    </span>
                  </td>
                  <td style={{ padding: "7px 10px", color: "var(--color-text-muted)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>
                    {row.resource ?? "—"}
                  </td>
                  <td style={{ padding: "7px 10px", color: "var(--color-text-muted)", maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>
                    {metaSummary(row.metadata)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
