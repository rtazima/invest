import { createServerClient } from "@/lib/supabase/server";
import type { DBCouncilSession, DBCouncilParticipant, DBCouncilMessage } from "@/types/database";

export type CouncilStatus = DBCouncilSession["status"];
export type CouncilMode = DBCouncilSession["mode"];
export type ParticipantType = DBCouncilParticipant["type"];
export type MessageType = DBCouncilMessage["message_type"];
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
  allMessages: DBCouncilMessage[];
}

export interface CouncilSessionSummary {
  id: string;
  holder_id: string;
  title: string;
  mode: CouncilMode;
  status: CouncilStatus;
  current_round: number;
  max_rounds: number;
  participant_count: number;
  created_at: string;
  completed_at: string | null;
}

export interface JudgeResult {
  converged: boolean;
  summary: string;
  key_disagreements: string[];
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
    mode: s.mode,
    status: s.status,
    current_round: s.current_round,
    max_rounds: s.max_rounds,
    participant_count: Array.isArray(s.council_participants) ? s.council_participants.length : 0,
    created_at: s.created_at,
    completed_at: s.completed_at,
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

  const participantsFull: CouncilParticipantFull[] = (participants ?? []).map((p) => ({
    ...p,
    messages: allMessages.filter((m) => m.participant_id === p.id),
  }));

  return { ...session, participants: participantsFull, allMessages };
}

export async function createCouncilSession(
  holderId: string,
  title: string,
  mode: CouncilMode,
  initialPrompt: string,
  maxRounds: number,
  participants: CouncilParticipantInput[],
): Promise<string> {
  const supabase = await createServerClient();

  const { data: session, error: sessErr } = await supabase
    .from("council_sessions")
    .insert({
      holder_id: holderId,
      title,
      mode,
      initial_prompt: initialPrompt,
      max_rounds: maxRounds,
      status: "pending",
      current_round: 0,
    })
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
  messageType: MessageType,
  content: string,
): Promise<void> {
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("council_messages")
    .insert({ session_id: sessionId, participant_id: participantId, round, message_type: messageType, content });

  if (error) throw new Error(`saveCouncilMessage: ${error.message}`);
}

export async function advanceSession(
  sessionId: string,
  status: CouncilStatus,
  currentRound?: number,
): Promise<void> {
  const supabase = await createServerClient();
  const update: Record<string, unknown> = { status };
  if (currentRound !== undefined) update["current_round"] = currentRound;
  if (status === "completed" || status === "no_consensus") update["completed_at"] = new Date().toISOString();

  const { error } = await supabase.from("council_sessions").update(update).eq("id", sessionId);
  if (error) throw new Error(`advanceSession: ${error.message}`);
}

export function getJudgeResult(session: CouncilSessionFull, round: number): JudgeResult | null {
  const msg = session.allMessages.find(
    (m) => m.message_type === "round_judge" && m.round === round,
  );
  if (!msg) return null;
  try {
    return JSON.parse(msg.content) as JudgeResult;
  } catch {
    return null;
  }
}

export function getSynthesis(session: CouncilSessionFull): DBCouncilMessage | null {
  return session.allMessages.find((m) => m.message_type === "synthesis") ?? null;
}
