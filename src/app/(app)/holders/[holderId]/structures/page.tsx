import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getHolder } from "@/lib/data/holders";
import { getStructures } from "@/lib/data/structures";
import { StructureCard } from "@/components/structures/StructureCard";

interface Props {
  params: Promise<{ holderId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { holderId } = await params;
  const holder = await getHolder(holderId);
  return { title: holder ? `Estruturas — ${holder.name}` : "Estruturas" };
}

export default async function StructuresPage({ params }: Props) {
  const { holderId } = await params;
  const [holder, structures] = await Promise.all([
    getHolder(holderId),
    getStructures(holderId),
  ]);

  if (!holder) notFound();

  const active = structures.filter((s) => s.status === "active");
  const inactive = structures.filter((s) => s.status !== "active");

  return (
    <div style={{ maxWidth: "720px" }}>
      <div style={{ marginBottom: "24px" }}>
        <Link href="/holders" style={{ fontSize: "12.5px", color: "var(--color-text-3)", textDecoration: "none" }}>
          ← Todos os titulares
        </Link>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "8px" }}>
          <h1 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>Estruturas — {holder.name}</h1>
          <Link
            href={`/holders/${holderId}/structures/new`}
            style={{ padding: "8px 16px", borderRadius: "6px", backgroundColor: "var(--color-text)", color: "var(--color-bg)", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}
          >
            Nova estrutura
          </Link>
        </div>
      </div>

      {structures.length === 0 ? (
        <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--color-text-3)", fontSize: "14px", borderRadius: "8px", border: "1px dashed var(--color-line)" }}>
          Nenhuma estrutura cadastrada. Crie a primeira para marcar lançamentos e proteções.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {active.length > 0 && (
            <div>
              <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-3)", marginBottom: "10px" }}>
                Ativas ({active.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {active.map((s) => <StructureCard key={s.id} structure={s} holderId={holderId} />)}
              </div>
            </div>
          )}

          {inactive.length > 0 && (
            <div>
              <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-3)", marginBottom: "10px" }}>
                Encerradas / Expiradas ({inactive.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {inactive.map((s) => <StructureCard key={s.id} structure={s} holderId={holderId} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
