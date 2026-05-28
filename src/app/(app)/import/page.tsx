import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getHolders } from "@/lib/data/holders";
import { getImportBatches } from "@/lib/data/positions";
import { ImportWizard } from "@/components/import/ImportWizard";
import { ImportHistoryList } from "@/components/import/ImportHistoryList";

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

      <ImportHistoryList batches={batches} holders={holders} />
    </div>
  );
}
