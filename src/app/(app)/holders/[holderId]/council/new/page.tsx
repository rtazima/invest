import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getHolder } from "@/lib/data/holders";
import { SessionConfig } from "@/components/council/SessionConfig";

interface Props {
  params: Promise<{ holderId: string }>;
}

export const metadata: Metadata = { title: "Novo Conselho" };

export default async function NewCouncilPage({ params }: Props) {
  const { holderId } = await params;
  const holder = await getHolder(holderId);
  if (!holder) notFound();

  return (
    <div style={{ maxWidth: "680px" }}>
      <div style={{ marginBottom: "24px" }}>
        <Link
          href={`/holders/${holderId}/council`}
          style={{ fontSize: "12.5px", color: "var(--color-text-3)", textDecoration: "none" }}
        >
          ← Conselho
        </Link>
        <h1 style={{ margin: "8px 0 0", fontSize: "18px", fontWeight: 700 }}>Nova sessão</h1>
      </div>

      <SessionConfig holderId={holderId} holderName={holder.name} />
    </div>
  );
}
