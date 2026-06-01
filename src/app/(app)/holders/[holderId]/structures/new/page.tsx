import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getHolder } from "@/lib/data/holders";
import { StructureForm } from "@/components/structures/StructureForm";

interface Props {
  params: Promise<{ holderId: string }>;
}

export const metadata: Metadata = { title: "Nova estrutura" };

export default async function NewStructurePage({ params }: Props) {
  const { holderId } = await params;
  const holder = await getHolder(holderId);
  if (!holder) notFound();

  return (
    <div style={{ maxWidth: "720px" }}>
      <div style={{ marginBottom: "24px" }}>
        <Link href={`/holders/${holderId}/structures`} style={{ fontSize: "12.5px", color: "var(--color-text-3)", textDecoration: "none" }}>
          ← Estruturas
        </Link>
        <h1 style={{ margin: "8px 0 0", fontSize: "18px", fontWeight: 700 }}>Nova estrutura</h1>
      </div>
      <StructureForm holderId={holderId} />
    </div>
  );
}
