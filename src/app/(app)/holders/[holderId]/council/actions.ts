"use server";

import { revalidatePath } from "next/cache";
import {
  createCouncilSession,
  saveCouncilMessage,
  type CouncilParticipantInput,
  type CouncilMode,
} from "@/lib/data/council";

export async function createSessionAction(
  holderId: string,
  title: string,
  mode: CouncilMode,
  initialPrompt: string,
  maxRounds: number,
  participants: CouncilParticipantInput[],
  autonomous: boolean,
): Promise<{ sessionId: string }> {
  if (!title.trim()) throw new Error("Título é obrigatório.");
  if (!initialPrompt.trim()) throw new Error("O ponto de partida do debate é obrigatório.");
  if (participants.length < 2) throw new Error("O conselho precisa de pelo menos 2 participantes.");

  const sessionId = await createCouncilSession(holderId, title, mode, initialPrompt.trim(), maxRounds, participants, autonomous);
  revalidatePath(`/holders/${holderId}/council`);
  return { sessionId };
}

export async function addInterjectionAction(
  holderId: string,
  sessionId: string,
  content: string,
  type: "human_user" | "human_advisor",
  round: number,
): Promise<void> {
  if (!content.trim()) throw new Error("Mensagem não pode ser vazia.");
  await saveCouncilMessage(sessionId, null, round, type, content.trim());
  revalidatePath(`/holders/${holderId}/council/${sessionId}`);
}
