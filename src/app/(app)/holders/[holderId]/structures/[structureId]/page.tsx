import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getHolder } from "@/lib/data/holders";
import { getStructure } from "@/lib/data/structures";
import { StructureForm } from "@/components/structures/StructureForm";
import { DeleteStructureButton } from "@/components/structures/DeleteStructureButton";

interface Props {
  params: Promise<{ holderId: string; structureId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { structureId } = await params;
  const structure = await getStructure(structureId);
  return { title: structure ? `Estrutura — ${structure.name}` : "Estrutura" };
}

export default async function StructureDetailPage({ params }: Props) {
  const { holderId, structureId } = await params;
  const [holder, structure] = await Promise.all([
    getHolder(holderId),
    getStructure(structureId),
  ]);

  if (!holder || !structure) notFound();

  return (
    <div style={{ maxWidth: "720px" }}>
      <div style={{ marginBottom: "24px" }}>
        <Link
          href={`/holders/${holderId}/structures`}
          style={{ fontSize: "12.5px", color: "var(--color-text-3)", textDecoration: "none" }}
        >
          ← Estruturas
        </Link>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "8px" }}>
          <h1 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>{structure.name}</h1>
          <DeleteStructureButton holderId={holderId} structureId={structureId} />
        </div>
      </div>
      <StructureForm holderId={holderId} initial={structure} />
    </div>
  );
}
