"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CouncilSessionFull, JudgeResult } from "@/lib/data/council";
import { addInterjectionAction } from "@/app/(app)/holders/[holderId]/council/actions";

interface Props {
  session: CouncilSessionFull;
  holderId: string;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: "6px",
  border: "1px solid var(--color-line)",
  backgroundColor: "var(--color-bg)",
  color: "var(--color-text)",
  fontSize: "13px",
  boxSizing: "border-box",
  fontFamily: "inherit",
  resize: "vertical" as const,
};

function parseJudge(content: string): JudgeResult | null {
  try { return JSON.parse(content) as JudgeResult; } catch { return null; }
}

export function SessionView({ session, holderId }: Props) {
  const router = useRouter();
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [starting, setStarting] = useState(false);
  const [interjection, setInterjection] = useState("");
  const [interjectionType, setInterjectionType] = useState<"human_user" | "human_advisor">("human_user");
  const [interjecting, startInterjecting] = useTransition();
  const [interjectionError, setInterjectionError] = useState("");

  const isTerminal = session.status === "completed" || session.status === "no_consensus";
  const isRunning = session.status === "running";
  const isAwaiting = session.status === "awaiting_human";
  const isPending = session.status === "pending";

  useEffect(() => {
    if (!isTerminal && !isAwaiting) {
      pollingRef.current = setInterval(() => router.refresh(), 3000);
    }
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [session.status, isTerminal, isAwaiting, router]);

  async function startNextRound() {
    setStarting(true);
    try {
      await fetch("/api/council/run-round", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id }),
      });
      pollingRef.current = setInterval(() => router.refresh(), 3000);
      router.refresh();
    } finally {
      setStarting(false);
    }
  }

  function handleInterject() {
    if (!interjection.trim()) return;
    setInterjectionError("");
    startInterjecting(async () => {
      try {
        await addInterjectionAction(holderId, session.id, interjection, interjectionType, session.current_round);
        setInterjection("");
        router.refresh();
      } catch (e) {
        setInterjectionError(e instanceof Error ? e.message : "Erro ao salvar.");
      }
    });
  }

  // Group messages by round
  const rounds = Array.from(
    new Set(session.allMessages.filter((m) => m.round > 0).map((m) => m.round)),
  ).sort((a, b) => a - b);

  const participantMap = new Map(session.participants.map((p) => [p.id, p]));
  const synthesis = session.allMessages.find((m) => m.message_type === "synthesis");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Initial prompt */}
      <div style={{ padding: "16px", borderRadius: "8px", border: "1px solid var(--color-line-2)", backgroundColor: "var(--color-bg-2)" }}>
        <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-3)", marginBottom: "8px" }}>
          {session.mode === "advisor_first" ? "Recomendação do assessor" : "Questão proposta"}
        </div>
        <p style={{ margin: 0, fontSize: "13.5px", lineHeight: 1.6, color: "var(--color-text)", whiteSpace: "pre-wrap" }}>
          {session.initial_prompt}
        </p>
      </div>

      {/* Pending state */}
      {isPending && (
        <div style={{ textAlign: "center", padding: "32px" }}>
          <p style={{ fontSize: "14px", color: "var(--color-text-3)", marginBottom: "16px" }}>
            Sessão criada. Inicie o debate para a Rodada 1.
          </p>
          <button
            onClick={startNextRound}
            disabled={starting}
            style={{ padding: "10px 24px", borderRadius: "6px", backgroundColor: "var(--color-text)", border: "none", color: "var(--color-bg)", fontSize: "13px", fontWeight: 600, cursor: starting ? "not-allowed" : "pointer", opacity: starting ? 0.7 : 1 }}
          >
            {starting ? "Iniciando..." : "Iniciar Rodada 1"}
          </button>
        </div>
      )}

      {/* Running indicator */}
      {isRunning && (
        <div style={{ padding: "14px 16px", borderRadius: "8px", border: "1px solid var(--color-line-2)", backgroundColor: "var(--color-bg-2)", display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#f59e0b", animation: "pulse 1.5s ease-in-out infinite" }} />
          <span style={{ fontSize: "13px", color: "var(--color-text-2)" }}>
            Rodada {session.current_round} em andamento — aguarde...
          </span>
        </div>
      )}

      {/* Rounds */}
      {rounds.map((round) => {
        const roundMsgs = session.allMessages.filter((m) => m.round === round);
        const llmMsgs = roundMsgs.filter((m) => m.message_type === "llm");
        const humanMsgs = roundMsgs.filter((m) => m.message_type === "human_user" || m.message_type === "human_advisor");
        const judgeMsg = roundMsgs.find((m) => m.message_type === "round_judge");
        const judge = judgeMsg ? parseJudge(judgeMsg.content) : null;

        return (
          <div key={round} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-3)" }}>
              Rodada {round} / {session.max_rounds}
            </div>

            {llmMsgs.map((m) => {
              const p = m.participant_id ? participantMap.get(m.participant_id) : null;
              const isError = m.content.startsWith("[Erro:");
              return (
                <div key={m.id} style={{ padding: "16px", borderRadius: "8px", border: "1px solid var(--color-line-2)", backgroundColor: "var(--color-bg-2)" }}>
                  <div style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--color-text-3)", marginBottom: "10px" }}>
                    {p?.name ?? "Participante"}{p?.role_focus ? ` — ${p.role_focus}` : ""}
                  </div>
                  <p style={{ margin: 0, fontSize: "13.5px", lineHeight: 1.65, color: isError ? "var(--color-crit)" : "var(--color-text)", whiteSpace: "pre-wrap" }}>
                    {m.content}
                  </p>
                </div>
              );
            })}

            {humanMsgs.map((m) => (
              <div key={m.id} style={{ padding: "12px 16px", borderRadius: "8px", border: "1px solid var(--color-line)", backgroundColor: "var(--color-bg)", borderLeft: "3px solid var(--color-text-3)" }}>
                <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-text-3)", marginBottom: "6px" }}>
                  {m.message_type === "human_advisor" ? "Resposta do assessor" : "Sua contribuição"}
                </div>
                <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.6, color: "var(--color-text-2)", whiteSpace: "pre-wrap" }}>
                  {m.content}
                </p>
              </div>
            ))}

            {judge && (
              <div style={{
                padding: "12px 16px",
                borderRadius: "8px",
                border: `1px solid ${judge.converged ? "var(--color-gain)" : "var(--color-line-2)"}`,
                backgroundColor: judge.converged ? "rgba(34,197,94,0.06)" : "var(--color-bg-2)",
              }}>
                <div style={{ fontSize: "11px", fontWeight: 600, color: judge.converged ? "var(--color-gain)" : "var(--color-text-3)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {judge.converged ? "Convergência detectada" : "Sem convergência"}
                </div>
                <p style={{ margin: 0, fontSize: "13px", color: "var(--color-text-2)", lineHeight: 1.5 }}>{judge.summary}</p>
                {judge.key_disagreements.length > 0 && (
                  <ul style={{ margin: "8px 0 0", paddingLeft: "16px", fontSize: "12.5px", color: "var(--color-text-3)" }}>
                    {judge.key_disagreements.map((d, i) => <li key={i}>{d}</li>)}
                  </ul>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Synthesis */}
      {synthesis && (
        <div style={{ padding: "20px", borderRadius: "8px", border: "1px solid var(--color-gain)", backgroundColor: "rgba(34,197,94,0.04)" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-gain)", marginBottom: "12px" }}>
            Síntese final
          </div>
          <p style={{ margin: 0, fontSize: "13.5px", lineHeight: 1.65, color: "var(--color-text)", whiteSpace: "pre-wrap" }}>
            {synthesis.content}
          </p>
        </div>
      )}

      {/* No consensus */}
      {session.status === "no_consensus" && !synthesis && (
        <div style={{ padding: "16px", borderRadius: "8px", border: "1px solid var(--color-line)", backgroundColor: "var(--color-bg-2)", textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: "13px", color: "var(--color-text-3)" }}>
            Debate encerrado após {session.max_rounds} rodadas sem convergência. As posições finais estão acima.
          </p>
        </div>
      )}

      {/* Awaiting human — interjection + next round */}
      {isAwaiting && (
        <div style={{ padding: "20px", borderRadius: "8px", border: "1px solid var(--color-line-2)", backgroundColor: "var(--color-bg-2)", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text)" }}>
            Rodada {session.current_round} concluída
          </div>

          <div>
            <div style={{ fontSize: "11.5px", fontWeight: 500, color: "var(--color-text-3)", marginBottom: "6px" }}>
              Adicionar contribuição antes da próxima rodada (opcional)
            </div>
            {session.mode === "advisor_first" && (
              <div style={{ display: "flex", gap: "6px", marginBottom: "6px" }}>
                {(["human_user", "human_advisor"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setInterjectionType(t)}
                    style={{
                      fontSize: "11.5px",
                      padding: "4px 10px",
                      borderRadius: "4px",
                      border: `1px solid ${interjectionType === t ? "var(--color-text)" : "var(--color-line)"}`,
                      backgroundColor: interjectionType === t ? "var(--color-text)" : "transparent",
                      color: interjectionType === t ? "var(--color-bg)" : "var(--color-text-3)",
                      cursor: "pointer",
                    }}
                  >
                    {t === "human_user" ? "Minha opinião" : "Resposta do assessor"}
                  </button>
                ))}
              </div>
            )}
            <textarea
              value={interjection}
              onChange={(e) => setInterjection(e.target.value)}
              rows={3}
              placeholder="Escreva sua contribuição aqui..."
              style={inputStyle}
            />
            {interjectionError && <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--color-crit)" }}>{interjectionError}</p>}
            {interjection.trim() && (
              <button
                onClick={handleInterject}
                disabled={interjecting}
                style={{ marginTop: "6px", fontSize: "12.5px", padding: "6px 14px", borderRadius: "5px", border: "1px solid var(--color-line)", backgroundColor: "transparent", color: "var(--color-text-2)", cursor: interjecting ? "not-allowed" : "pointer" }}
              >
                {interjecting ? "Salvando..." : "Salvar contribuição"}
              </button>
            )}
          </div>

          <button
            onClick={startNextRound}
            disabled={starting}
            style={{ padding: "10px 20px", borderRadius: "6px", backgroundColor: "var(--color-text)", border: "none", color: "var(--color-bg)", fontSize: "13px", fontWeight: 600, cursor: starting ? "not-allowed" : "pointer", opacity: starting ? 0.7 : 1, alignSelf: "flex-start" }}
          >
            {starting ? "Iniciando..." : `Iniciar Rodada ${session.current_round + 1}`}
          </button>
        </div>
      )}
    </div>
  );
}
