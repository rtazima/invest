-- Fix: is_family_owner expects family_id, not holder_id — join holders table
DROP POLICY IF EXISTS "council_sessions_family" ON council_sessions;
DROP POLICY IF EXISTS "council_participants_family" ON council_participants;
DROP POLICY IF EXISTS "council_messages_family" ON council_messages;

CREATE POLICY "council_sessions_family" ON council_sessions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM holders h
      WHERE h.id = council_sessions.holder_id
        AND is_family_owner(h.family_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM holders h
      WHERE h.id = council_sessions.holder_id
        AND is_family_owner(h.family_id)
    )
  );

CREATE POLICY "council_participants_family" ON council_participants
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM council_sessions s
      JOIN holders h ON h.id = s.holder_id
      WHERE s.id = council_participants.session_id
        AND is_family_owner(h.family_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM council_sessions s
      JOIN holders h ON h.id = s.holder_id
      WHERE s.id = council_participants.session_id
        AND is_family_owner(h.family_id)
    )
  );

CREATE POLICY "council_messages_family" ON council_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM council_sessions s
      JOIN holders h ON h.id = s.holder_id
      WHERE s.id = council_messages.session_id
        AND is_family_owner(h.family_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM council_sessions s
      JOIN holders h ON h.id = s.holder_id
      WHERE s.id = council_messages.session_id
        AND is_family_owner(h.family_id)
    )
  );
