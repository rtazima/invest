import { waitUntil } from "@vercel/functions";
import { createServerClient } from "@/lib/supabase/server";
import {
  getCouncilSession,
  saveCouncilMessage,
  advanceSessionStatus,
  countMessages,
} from "@/lib/data/council";
import { buildCouncilContext } from "@/lib/council/context-builder";
import { buildRound1Prompt, buildRound2Prompt, buildSynthesisPrompt } from "@/lib/council/prompt-builder";
import { runLlmMessage, SYNTHESIS_MODEL } from "@/lib/council/llm-runner";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

async function runRound(sessionId: string, round: 1 | 2 | 0) {
  const session = await getCouncilSession(sessionId);
  if (!session) return;

  const holderContext = await buildCouncilContext(session.holder_id);

  if (round === 0) {
    await runSynthesis(session, holderContext);
    return;
  }

  const llmParticipants = session.participants.filter(
    (p) => p.type === "llm" && p.model && !p.messages.some((m) => m.round === round),
  );

  await Promise.allSettled(
    llmParticipants.map(async (p) => {
      try {
        let prompt: string;
        if (round === 1) {
          prompt = buildRound1Prompt({
            participantName: p.name,
            roleFocus: p.role_focus ?? "",
            holderContext,
          });
        } else {
          const otherMessages = session.participants
            .filter((other) => other.id !== p.id)
            .flatMap((other) =>
              other.messages.filter((m) => m.round === 1).map((m) => ({
                participantName: other.name,
                roleFocus: other.role_focus ?? "",
                content: m.content,
              })),
            );
          prompt = buildRound2Prompt({
            participantName: p.name,
            roleFocus: p.role_focus ?? "",
            holderContext,
            otherMessages,
          });
        }
        const content = await runLlmMessage({ model: p.model!, prompt });
        await saveCouncilMessage(sessionId, p.id, round, content);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        await saveCouncilMessage(sessionId, p.id, round, `[Erro: ${errMsg}]`);
      }
    }),
  );

  // Check if all participants have responded
  const totalParticipants = session.participants.length;
  const msgCount = await countMessages(sessionId, round);

  if (msgCount >= totalParticipants) {
    if (round === 1) {
      await advanceSessionStatus(sessionId, "round2_pending");
    } else {
      // Round 2 complete — run synthesis
      await advanceSessionStatus(sessionId, "synthesizing");
      const updated = await getCouncilSession(sessionId);
      if (updated) await runSynthesis(updated, holderContext);
    }
  } else if (round === 1) {
    // LLMs done but humans still pending — advance to round2_pending so human form shows
    await advanceSessionStatus(sessionId, "round2_pending");
  }
}

async function runSynthesis(
  session: Awaited<ReturnType<typeof getCouncilSession>>,
  holderContext: string,
) {
  if (!session) return;

  const r1 = session.participants.flatMap((p) =>
    p.messages.filter((m) => m.round === 1).map((m) => ({
      participantName: p.name,
      roleFocus: p.role_focus ?? "",
      content: m.content,
    })),
  );
  const r2 = session.participants.flatMap((p) =>
    p.messages.filter((m) => m.round === 2).map((m) => ({
      participantName: p.name,
      roleFocus: p.role_focus ?? "",
      content: m.content,
    })),
  );

  try {
    const prompt = buildSynthesisPrompt({ holderContext, round1Messages: r1, round2Messages: r2 });
    const content = await runLlmMessage({ model: SYNTHESIS_MODEL, prompt, maxTokens: 4096 });
    await saveCouncilMessage(session.id, null, 0, content);
    await advanceSessionStatus(session.id, "completed");
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await saveCouncilMessage(session.id, null, 0, `[Erro na síntese: ${errMsg}]`);
    await advanceSessionStatus(session.id, "completed");
  }
}

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Não autorizado", { status: 401 });

  let body: { sessionId: string; round: 1 | 2 | 0 };
  try {
    body = await request.json() as typeof body;
  } catch {
    return new Response("Body inválido", { status: 400 });
  }

  const { sessionId, round } = body;

  const session = await getCouncilSession(sessionId);
  if (!session) return new Response("Sessão não encontrada", { status: 404 });

  // Return immediately — work runs in background via waitUntil
  waitUntil(runRound(sessionId, round));
  return Response.json({ ok: true, started: true });
}
