import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getHolder } from "@/lib/data/holders";
import { getCouncilSession } from "@/lib/data/council";
import { SessionView } from "@/components/council/SessionView";

interface Props {
  params: Promise<{ holderId: string; sessionId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sessionId } = await params;
  const session = await getCouncilSession(sessionId);
  return { title: session ? `Conselho — ${session.title}` : "Conselho" };
}

export default async function CouncilSessionPage({ params }: Props) {
  const { holderId, sessionId } = await params;
  const [holder, session] = await Promise.all([
    getHolder(holderId),
    getCouncilSession(sessionId),
  ]);

  if (!holder || !session) notFound();

  return (
    <div style={{ maxWidth: "800px" }}>
      <div style={{ marginBottom: "24px" }}>
        <Link
          href={`/holders/${holderId}/council`}
          style={{ fontSize: "12.5px", color: "var(--color-text-3)", textDecoration: "none" }}
        >
          ← Conselho
        </Link>
        <h1 style={{ margin: "8px 0 0", fontSize: "18px", fontWeight: 700 }}>{session.title}</h1>
      </div>

      <SessionView session={session} holderId={holderId} />
    </div>
  );
}
