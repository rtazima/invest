import { createServerClient } from "@/lib/supabase/server";
import type { DBCouncilSession, DBCouncilParticipant, DBCouncilMessage } from "@/types/database";

export type CouncilStatus = DBCouncilSession["status"];
export type ParticipantType = DBCouncilParticipant["type"];
export type CouncilModel = "claude-opus-4-7" | "gpt-4o";

export interface CouncilParticipantInput {
  name: string;
  type: ParticipantType;
  model: CouncilModel | null;
  role_focus: string;
  sort_order: number;
}

export interface CouncilParticipantFull extends DBCouncilParticipant {
  messages: DBCouncilMessage[];
}

export interface CouncilSessionFull extends DBCouncilSession {
  participants: CouncilParticipantFull[];
  synthesis: DBCouncilMessage | null;
}

export interface CouncilSessionSummary extends DBCouncilSession {
  participant_count: number;
}

export async function getCouncilSessions(holderId: string): Promise<CouncilSessionSummary[]> {
  const supabase = await createServerClient();

  const { data: sessions, error } = await supabase
    .from("council_sessions")
    .select("*, council_participants(id)")
    .eq("holder_id", holderId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`getCouncilSessions: ${error.message}`);

  return (sessions ?? []).map((s) => ({
    id: s.id,
    holder_id: s.holder_id,
    title: s.title,
    status: s.status,
    created_at: s.created_at,
    completed_at: s.completed_at,
    participant_count: Array.isArray(s.council_participants) ? s.council_participants.length : 0,
  }));
}

export async function getCouncilSession(sessionId: string): Promise<CouncilSessionFull | null> {
  const supabase = await createServerClient();

  const { data: session, error: sessErr } = await supabase
    .from("council_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (sessErr?.code === "PGRST116") return null;
  if (sessErr) throw new Error(`getCouncilSession: ${sessErr.message}`);

  const { data: participants, error: partErr } = await supabase
    .from("council_participants")
    .select("*")
    .eq("session_id", sessionId)
    .order("sort_order");

  if (partErr) throw new Error(`getCouncilSession/participants: ${partErr.message}`);

  const { data: messages, error: msgErr } = await supabase
    .from("council_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at");

  if (msgErr) throw new Error(`getCouncilSession/messages: ${msgErr.message}`);

  const allMessages = messages ?? [];
  const synthesis = allMessages.find((m) => m.round === 0) ?? null;

  const participantsFull: CouncilParticipantFull[] = (participants ?? []).map((p) => ({
    ...p,
    messages: allMessages.filter((m) => m.participant_id === p.id),
  }));

  return {
    ...session,
    participants: participantsFull,
    synthesis,
  };
}

export async function createCouncilSession(
  holderId: string,
  title: string,
  participants: CouncilParticipantInput[],
): Promise<string> {
  const supabase = await createServerClient();

  const { data: session, error: sessErr } = await supabase
    .from("council_sessions")
    .insert({ holder_id: holderId, title, status: "round1_pending" })
    .select()
    .single();

  if (sessErr) throw new Error(`createCouncilSession: ${sessErr.message}`);

  const { error: partErr } = await supabase
    .from("council_participants")
    .insert(participants.map((p) => ({ ...p, session_id: session.id })));

  if (partErr) throw new Error(`createCouncilSession/participants: ${partErr.message}`);

  return session.id;
}

export async function saveCouncilMessage(
  sessionId: string,
  participantId: string | null,
  round: number,
  content: string,
): Promise<void> {
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("council_messages")
    .insert({ session_id: sessionId, participant_id: participantId, round, content });

  if (error) throw new Error(`saveCouncilMessage: ${error.message}`);
}

export async function advanceSessionStatus(sessionId: string, status: CouncilStatus): Promise<void> {
  const supabase = await createServerClient();
  const update: Record<string, unknown> = { status };
  if (status === "completed") update["completed_at"] = new Date().toISOString();

  const { error } = await supabase
    .from("council_sessions")
    .update(update)
    .eq("id", sessionId);

  if (error) throw new Error(`advanceSessionStatus: ${error.message}`);
}

export async function countMessages(sessionId: string, round: number): Promise<number> {
  const supabase = await createServerClient();
  const { count, error } = await supabase
    .from("council_messages")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("round", round);

  if (error) throw new Error(`countMessages: ${error.message}`);
  return count ?? 0;
}
