import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getHolders } from "@/lib/data/holders";
import { getImportBatches } from "@/lib/data/positions";
import { ImportWizard } from "@/components/import/ImportWizard";
import { ImportHistoryList } from "@/components/import/ImportHistoryList";
import { PluggySyncSection } from "@/components/import/PluggySyncSection";
import { MercadoPagoForm } from "@/components/import/MercadoPagoForm";

export const metadata: Metadata = { title: "Importar — Invest" };

export default async function ImportPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [holders, batches] = await Promise.all([getHolders(), getImportBatches()]);

  // Última sync Pluggy por instituição
  const lastPluggySync = (inst: string) => {
    const b = batches
      .filter((x) => x.source === "pluggy" && x.institution === inst && x.status === "completed")
      .sort((a, b) => new Date(b.completed_at ?? 0).getTime() - new Date(a.completed_at ?? 0).getTime())[0];
    return {
      lastSyncAt: b?.completed_at ?? null,
      lastSyncCount: b?.row_count ?? null,
    };
  };

  const pluggyConnections = [
    {
      institution: "btg",
      label: "BTG Pactual Investimentos",
      connected: !!process.env.PLUGGY_ITEM_ID_BTG,
      ...lastPluggySync("btg"),
    },
    {
      institution: "xp",
      label: "XP Investimentos",
      connected: !!process.env.PLUGGY_ITEM_ID_XP,
      ...lastPluggySync("xp"),
    },
  ];

  return (
    <div style={{ maxWidth: "700px" }}>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "18px", fontWeight: 700, color: "var(--color-text)", margin: "0 0 4px" }}>
          Importar portfólio
        </h1>
        <p style={{ margin: 0, fontSize: "13px", color: "var(--color-text-3)" }}>
          Sincronize via Pluggy ou importe o extrato manual das corretoras.
        </p>
      </div>

      <PluggySyncSection holders={holders} connections={pluggyConnections} />

      <div
        style={{
          borderRadius: "8px",
          border: "1px solid var(--color-line-2)",
          backgroundColor: "var(--color-bg-2)",
          padding: "24px",
          marginBottom: "32px",
        }}
      >
        <div style={{ marginBottom: "16px" }}>
          <h2 style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text)", margin: "0 0 4px" }}>
            Importação manual
          </h2>
          <p style={{ fontSize: "12px", color: "var(--color-text-muted)", margin: 0 }}>
            CSV/XLSX para XP e BTG, PDF para Nomad. Necessário para Tesouro Direto e posições BTG.
          </p>
        </div>
        <ImportWizard holders={holders} />
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
        <div style={{ marginBottom: "16px" }}>
          <h2 style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text)", margin: "0 0 4px" }}>
            Mercado Pago — cofrinhos
          </h2>
          <p style={{ fontSize: "12px", color: "var(--color-text-muted)", margin: 0 }}>
            Entrada manual de reservas em cofrinhos. Substitui os valores anteriores a cada salvar.
          </p>
        </div>
        <MercadoPagoForm holders={holders} />
      </div>

      <ImportHistoryList batches={batches} holders={holders} />
    </div>
  );
}
