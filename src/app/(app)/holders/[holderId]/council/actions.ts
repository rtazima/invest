"use server";

import { revalidatePath } from "next/cache";
import {
  createCouncilSession,
  saveCouncilMessage,
  advanceSessionStatus,
  countMessages,
  getCouncilSession,
  type CouncilParticipantInput,
} from "@/lib/data/council";

export async function createSessionAction(
  holderId: string,
  title: string,
  participants: CouncilParticipantInput[],
): Promise<{ sessionId: string }> {
  if (participants.length < 2) throw new Error("O conselho precisa de pelo menos 2 participantes.");

  const sessionId = await createCouncilSession(holderId, title, participants);
  revalidatePath(`/holders/${holderId}/council`);
  return { sessionId };
}

export async function submitHumanMessageAction(
  holderId: string,
  sessionId: string,
  participantId: string,
  round: number,
  content: string,
): Promise<void> {
  if (!content.trim()) throw new Error("Mensagem não pode ser vazia.");

  await saveCouncilMessage(sessionId, participantId, round, content.trim());

  const session = await getCouncilSession(sessionId);
  if (!session) return;

  const totalParticipants = session.participants.length;
  const msgCount = await countMessages(sessionId, round);

  if (msgCount >= totalParticipants) {
    if (round === 1) {
      await advanceSessionStatus(sessionId, "round2_pending");
    } else if (round === 2) {
      await advanceSessionStatus(sessionId, "synthesizing");
    }
  }

  revalidatePath(`/holders/${holderId}/council/${sessionId}`);
}

export async function skipHumanRoundAction(
  holderId: string,
  sessionId: string,
  participantId: string,
  round: number,
): Promise<void> {
  await saveCouncilMessage(sessionId, participantId, round, "[Participante optou por não responder nesta rodada]");

  const session = await getCouncilSession(sessionId);
  if (!session) return;

  const totalParticipants = session.participants.length;
  const msgCount = await countMessages(sessionId, round);

  if (msgCount >= totalParticipants) {
    if (round === 1) {
      await advanceSessionStatus(sessionId, "round2_pending");
    } else if (round === 2) {
      await advanceSessionStatus(sessionId, "synthesizing");
    }
  }

  revalidatePath(`/holders/${holderId}/council/${sessionId}`);
}
