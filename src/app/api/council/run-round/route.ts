import { waitUntil } from "@vercel/functions";
import { createServerClient } from "@/lib/supabase/server";
import {
  getCouncilSession,
  saveCouncilMessage,
  advanceSession,
  type CouncilSessionFull,
} from "@/lib/data/council";
import { buildCouncilContext } from "@/lib/council/context-builder";
import { buildRoundPrompt, buildSynthesisPrompt, type HistoryMessage } from "@/lib/council/prompt-builder";
import { runLlmMessage, SYNTHESIS_MODEL } from "@/lib/council/llm-runner";
import { judgeRound } from "@/lib/council/judge";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

function buildHistory(session: CouncilSessionFull, upToRound: number): HistoryMessage[] {
  const participantMap = new Map(session.participants.map((p) => [p.id, p]));

  return session.allMessages
    .filter((m) => m.round < upToRound && m.message_type !== "synthesis")
    .map((m) => {
      const p = m.participant_id ? participantMap.get(m.participant_id) : null;
      return {
        participantName: p?.name ?? "Participante",
        roleFocus: p?.role_focus ?? "",
        messageType: m.message_type as HistoryMessage["messageType"],
        round: m.round,
        content: m.content,
      };
    });
}

async function executeRound(sessionId: string, round: number) {
  const session = await getCouncilSession(sessionId);
  if (!session) return;

  const holderContext = await buildCouncilContext(session.holder_id);
  const history = buildHistory(session, round);

  // Run all LLM participants in parallel
  const llmParticipants = session.participants.filter(
    (p) => p.type === "llm" && p.model,
  );

  await Promise.allSettled(
    llmParticipants.map(async (p) => {
      try {
        const { system, user } = buildRoundPrompt({
          participantName: p.name,
          roleFocus: p.role_focus ?? "",
          holderContext,
          mode: session.mode,
          initialPrompt: session.initial_prompt,
          round,
          history,
        });
        const content = await runLlmMessage({ model: p.model!, system, user });
        await saveCouncilMessage(sessionId, p.id, round, "llm", content);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        await saveCouncilMessage(sessionId, p.id, round, "llm", `[Erro: ${errMsg}]`);
      }
    }),
  );

  // Re-fetch to get messages just saved
  const sessionAfterLLMs = await getCouncilSession(sessionId);
  if (!sessionAfterLLMs) return;

  const roundLLMMessages = sessionAfterLLMs.allMessages.filter(
    (m) => m.round === round && m.message_type === "llm",
  );

  const judgeInputs = roundLLMMessages.map((m) => {
    const p = m.participant_id
      ? sessionAfterLLMs.participants.find((x) => x.id === m.participant_id)
      : null;
    return {
      participantName: p?.name ?? "Participante",
      roleFocus: p?.role_focus ?? "",
      content: m.content,
    };
  });

  const judgeResult = await judgeRound(round, judgeInputs);
  await saveCouncilMessage(sessionId, null, round, "round_judge", JSON.stringify(judgeResult));

  if (judgeResult.converged) {
    await advanceSession(sessionId, "synthesizing", round);
    const sessionForSynth = await getCouncilSession(sessionId);
    if (sessionForSynth) await executeSynthesis(sessionForSynth, holderContext);
    return;
  }

  if (round >= session.max_rounds) {
    await advanceSession(sessionId, "no_consensus", round);
    return;
  }

  if (session.autonomous) {
    await advanceSession(sessionId, "running", round + 1);
    await executeRound(sessionId, round + 1);
    return;
  }

  await advanceSession(sessionId, "awaiting_human", round);
}

async function executeSynthesis(session: CouncilSessionFull, holderContext: string) {
  const history = buildHistory(session, 999);

  try {
    const { system, user } = buildSynthesisPrompt({
      holderContext,
      mode: session.mode,
      initialPrompt: session.initial_prompt,
      history,
    });
    const content = await runLlmMessage({ model: SYNTHESIS_MODEL, system, user, maxTokens: 4096 });
    await saveCouncilMessage(session.id, null, 0, "synthesis", content);
    await advanceSession(session.id, "completed");
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await saveCouncilMessage(session.id, null, 0, "synthesis", `[Erro na síntese: ${errMsg}]`);
    await advanceSession(session.id, "completed");
  }
}

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Não autorizado", { status: 401 });

  let body: { sessionId: string };
  try {
    body = await request.json() as typeof body;
  } catch {
    return new Response("Body inválido", { status: 400 });
  }

  const { sessionId } = body;
  const session = await getCouncilSession(sessionId);
  if (!session) return new Response("Sessão não encontrada", { status: 404 });

  if (session.status !== "pending" && session.status !== "awaiting_human") {
    return new Response("Sessão não está aguardando rodada", { status: 409 });
  }

  const nextRound = session.current_round + 1;
  await advanceSession(sessionId, "running", nextRound);

  waitUntil(executeRound(sessionId, nextRound));
  return Response.json({ ok: true, round: nextRound });
}
