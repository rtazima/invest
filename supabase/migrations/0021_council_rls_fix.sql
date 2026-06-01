-- Fix RLS policies on council tables: FOR ALL without WITH CHECK blocks INSERT
DROP POLICY IF EXISTS "council_sessions_family" ON council_sessions;
DROP POLICY IF EXISTS "council_participants_family" ON council_participants;
DROP POLICY IF EXISTS "council_messages_family" ON council_messages;

CREATE POLICY "council_sessions_family" ON council_sessions
  FOR ALL
  USING (is_family_owner(holder_id))
  WITH CHECK (is_family_owner(holder_id));

CREATE POLICY "council_participants_family" ON council_participants
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM council_sessions s
      WHERE s.id = council_participants.session_id
        AND is_family_owner(s.holder_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM council_sessions s
      WHERE s.id = council_participants.session_id
        AND is_family_owner(s.holder_id)
    )
  );

CREATE POLICY "council_messages_family" ON council_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM council_sessions s
      WHERE s.id = council_messages.session_id
        AND is_family_owner(s.holder_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM council_sessions s
      WHERE s.id = council_messages.session_id
        AND is_family_owner(s.holder_id)
    )
  );
