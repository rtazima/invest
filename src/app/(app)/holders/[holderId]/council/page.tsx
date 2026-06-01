import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getHolder } from "@/lib/data/holders";
import { getCouncilSessions } from "@/lib/data/council";

interface Props {
  params: Promise<{ holderId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { holderId } = await params;
  const holder = await getHolder(holderId);
  return { title: holder ? `Conselho — ${holder.name}` : "Conselho" };
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Aguardando início",
  running: "Em andamento",
  awaiting_human: "Aguardando você",
  synthesizing: "Sintetizando",
  completed: "Concluído",
  no_consensus: "Sem consenso",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "var(--color-text-3)",
  running: "#f59e0b",
  awaiting_human: "#3b82f6",
  synthesizing: "#f59e0b",
  completed: "var(--color-gain)",
  no_consensus: "var(--color-text-3)",
};

export default async function CouncilPage({ params }: Props) {
  const { holderId } = await params;
  const [holder, sessions] = await Promise.all([
    getHolder(holderId),
    getCouncilSessions(holderId),
  ]);

  if (!holder) notFound();

  return (
    <div style={{ maxWidth: "680px" }}>
      <div style={{ marginBottom: "24px" }}>
        <Link href="/holders" style={{ fontSize: "12.5px", color: "var(--color-text-3)", textDecoration: "none" }}>
          ← Todos os titulares
        </Link>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "8px" }}>
          <h1 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>Conselho — {holder.name}</h1>
          <Link
            href={`/holders/${holderId}/council/new`}
            style={{ padding: "8px 16px", borderRadius: "6px", backgroundColor: "var(--color-text)", color: "var(--color-bg)", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}
          >
            Nova sessão
          </Link>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--color-text-3)", fontSize: "14px", borderRadius: "8px", border: "1px dashed var(--color-line)" }}>
          Nenhuma sessão ainda. Crie a primeira para começar o debate.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {sessions.map((s) => (
            <Link key={s.id} href={`/holders/${holderId}/council/${s.id}`} style={{ textDecoration: "none" }}>
              <div style={{ padding: "14px 16px", borderRadius: "8px", border: "1px solid var(--color-line-2)", backgroundColor: "var(--color-bg-2)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text)", marginBottom: "4px" }}>{s.title}</div>
                  <div style={{ fontSize: "12px", color: "var(--color-text-3)" }}>
                    {s.participant_count} participante{s.participant_count !== 1 ? "s" : ""} ·{" "}
                    Rodada {s.current_round}/{s.max_rounds} ·{" "}
                    {new Date(s.created_at).toLocaleDateString("pt-BR")}
                  </div>
                </div>
                <span style={{ fontSize: "11.5px", fontWeight: 600, color: STATUS_COLORS[s.status] ?? "var(--color-text-3)", whiteSpace: "nowrap" }}>
                  {STATUS_LABELS[s.status] ?? s.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
