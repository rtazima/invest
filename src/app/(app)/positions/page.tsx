import { Metadata } from "next";
import { getPositionsForReview } from "@/lib/data/positions";
import { PositionsReview } from "@/components/positions/PositionsReview";

export const metadata: Metadata = { title: "Ativos" };

export default async function PositionsPage() {
  const positions = await getPositionsForReview();

  return (
    <div style={{ maxWidth: "900px" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "var(--color-text)" }}>
          Ativos
        </h1>
        <p style={{ margin: "6px 0 0", fontSize: "13px", color: "var(--color-text-3)" }}>
          Corrija a classe de ativo e inicie transferências de custódia. Selecione posições da mesma instituição para transferir.
        </p>
      </div>

      {positions.length === 0 ? (
        <p style={{ color: "var(--color-text-3)", fontSize: "13px" }}>
          Nenhuma posição importada ainda. Importe um CSV para começar.
        </p>
      ) : (
        <div
          style={{
            borderRadius: "8px",
            border: "1px solid var(--color-line-2)",
            backgroundColor: "var(--color-bg-2)",
            padding: "20px",
          }}
        >
          <PositionsReview initialPositions={positions} />
        </div>
      )}
    </div>
  );
}
