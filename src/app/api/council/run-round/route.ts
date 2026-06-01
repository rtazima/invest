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

  try {
    const session = await getCouncilSession(sessionId);
    if (!session) return new Response("Sessão não encontrada", { status: 404 });

    const holderContext = await buildCouncilContext(session.holder_id);

    if (round === 0) {
      // Synthesis
      await advanceSessionStatus(sessionId, "synthesizing");

      const round1 = session.participants.flatMap((p) =>
        p.messages.filter((m) => m.round === 1).map((m) => ({
          participantName: p.name,
          roleFocus: p.role_focus ?? "",
          content: m.content,
        })),
      );
      const round2 = session.participants.flatMap((p) =>
        p.messages.filter((m) => m.round === 2).map((m) => ({
          participantName: p.name,
          roleFocus: p.role_focus ?? "",
          content: m.content,
        })),
      );

      const prompt = buildSynthesisPrompt({ holderContext, round1Messages: round1, round2Messages: round2 });
      const content = await runLlmMessage({ model: SYNTHESIS_MODEL, prompt, maxTokens: 4096 });
      await saveCouncilMessage(sessionId, null, 0, content);
      await advanceSessionStatus(sessionId, "completed");

      return Response.json({ ok: true, status: "completed" });
    }

    // Rounds 1 or 2
    const llmParticipants = session.participants.filter(
      (p) => p.type === "llm" && p.model && !p.messages.some((m) => m.round === round),
    );

    const results = await Promise.allSettled(
      llmParticipants.map(async (p) => {
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
      }),
    );

    // Save error placeholders for failed LLMs
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result?.status === "rejected") {
        const p = llmParticipants[i];
        if (p) {
          const errMsg = result.reason instanceof Error ? result.reason.message : String(result.reason);
          await saveCouncilMessage(sessionId, p.id, round, `[Erro: ${errMsg}]`);
        }
      }
    }

    // Check if all participants have responded in this round
    const totalParticipants = session.participants.length;
    const msgCount = await countMessages(sessionId, round);

    if (msgCount >= totalParticipants) {
      if (round === 1) {
        await advanceSessionStatus(sessionId, "round2_pending");
      } else {
        // Trigger synthesis immediately if round 2 is complete
        await advanceSessionStatus(sessionId, "synthesizing");
        const updatedSession = await getCouncilSession(sessionId);
        if (updatedSession) {
          const r1 = updatedSession.participants.flatMap((p) =>
            p.messages.filter((m) => m.round === 1).map((m) => ({
              participantName: p.name,
              roleFocus: p.role_focus ?? "",
              content: m.content,
            })),
          );
          const r2 = updatedSession.participants.flatMap((p) =>
            p.messages.filter((m) => m.round === 2).map((m) => ({
              participantName: p.name,
              roleFocus: p.role_focus ?? "",
              content: m.content,
            })),
          );
          const synthPrompt = buildSynthesisPrompt({ holderContext, round1Messages: r1, round2Messages: r2 });
          const synthContent = await runLlmMessage({ model: SYNTHESIS_MODEL, prompt: synthPrompt, maxTokens: 4096 });
          await saveCouncilMessage(sessionId, null, 0, synthContent);
          await advanceSessionStatus(sessionId, "completed");
          return Response.json({ ok: true, status: "completed" });
        }
      }
    }

    return Response.json({ ok: true, status: round === 1 ? "round1_pending" : "round2_pending" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(msg, { status: 500 });
  }
}
