-- Drop old council tables
DROP TABLE IF EXISTS council_messages CASCADE;
DROP TABLE IF EXISTS council_participants CASCADE;
DROP TABLE IF EXISTS council_sessions CASCADE;

-- Sessions
CREATE TABLE council_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holder_id UUID NOT NULL REFERENCES holders(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'user_first' CHECK (mode IN ('advisor_first', 'user_first')),
  initial_prompt TEXT NOT NULL DEFAULT '',
  current_round INT NOT NULL DEFAULT 0,
  max_rounds INT NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'awaiting_human', 'synthesizing', 'completed', 'no_consensus')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Participants
CREATE TABLE council_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES council_sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('llm', 'human')),
  model TEXT,
  role_focus TEXT,
  sort_order INT NOT NULL DEFAULT 0
);

-- Messages
CREATE TABLE council_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES council_sessions(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES council_participants(id) ON DELETE SET NULL,
  round INT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'llm'
    CHECK (message_type IN ('llm', 'human_user', 'human_advisor', 'round_judge', 'synthesis')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE council_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE council_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE council_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "council_sessions_family" ON council_sessions
  FOR ALL USING (is_family_owner(holder_id));

CREATE POLICY "council_participants_family" ON council_participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM council_sessions s
      WHERE s.id = council_participants.session_id
        AND is_family_owner(s.holder_id)
    )
  );

CREATE POLICY "council_messages_family" ON council_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM council_sessions s
      WHERE s.id = council_messages.session_id
        AND is_family_owner(s.holder_id)
    )
  );

-- Indexes
CREATE INDEX council_sessions_holder_id_idx ON council_sessions(holder_id);
CREATE INDEX council_participants_session_id_idx ON council_participants(session_id);
CREATE INDEX council_messages_session_round_idx ON council_messages(session_id, round);
CREATE INDEX council_messages_type_idx ON council_messages(session_id, message_type);
