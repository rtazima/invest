-- Tabela de assessores convidados
CREATE TABLE public.family_advisors (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id      uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  invited_email  text NOT NULL,
  user_id        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  role           text NOT NULL CHECK (role IN ('advisor_read', 'advisor_write')),
  status         text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked')),
  invite_token   uuid NOT NULL DEFAULT gen_random_uuid(),
  invited_by     uuid NOT NULL REFERENCES auth.users(id),
  invited_at     timestamptz NOT NULL DEFAULT now(),
  accepted_at    timestamptz,
  UNIQUE (family_id, invited_email)
);

ALTER TABLE public.family_advisors ENABLE ROW LEVEL SECURITY;

-- Owner gerencia todos os assessores da família
CREATE POLICY "family_advisors: owner" ON public.family_advisors
  FOR ALL USING (is_family_owner(family_id))
  WITH CHECK (is_family_owner(family_id));

-- Assessor vê o próprio registro
CREATE POLICY "family_advisors: self select" ON public.family_advisors
  FOR SELECT USING (user_id = auth.uid());

-- Assessor aceita convite (email deve bater, status pendente → ativo)
CREATE POLICY "family_advisors: accept" ON public.family_advisors
  FOR UPDATE
  USING (invited_email = auth.email() AND status = 'pending')
  WITH CHECK (user_id = auth.uid() AND status = 'active');

-- Funções auxiliares
CREATE OR REPLACE FUNCTION public.can_read_family(p_family_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT is_family_owner(p_family_id) OR EXISTS (
    SELECT 1 FROM public.family_advisors
    WHERE family_id = p_family_id AND user_id = auth.uid() AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.can_write_family(p_family_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT is_family_owner(p_family_id) OR EXISTS (
    SELECT 1 FROM public.family_advisors
    WHERE family_id = p_family_id AND user_id = auth.uid() AND status = 'active' AND role = 'advisor_write'
  );
$$;

-- Atualiza RLS de todas as tabelas para incluir assessores

-- families: leitura para assessores ativos
DROP POLICY IF EXISTS "families: select" ON public.families;
CREATE POLICY "families: select" ON public.families
  FOR SELECT USING (can_read_family(id));

-- family_cpfs: leitura para assessores; escrita só owner
DROP POLICY IF EXISTS "family_cpfs: all" ON public.family_cpfs;
CREATE POLICY "family_cpfs: select" ON public.family_cpfs
  FOR SELECT USING (can_read_family(family_id));
CREATE POLICY "family_cpfs: owner write" ON public.family_cpfs
  FOR INSERT WITH CHECK (is_family_owner(family_id));

-- holders: leitura para assessores
DROP POLICY IF EXISTS "holders: select" ON public.holders;
CREATE POLICY "holders: select" ON public.holders
  FOR SELECT USING (user_id = auth.uid() OR can_read_family(family_id));

-- strategies: leitura para assessores; escrita só owner
DROP POLICY IF EXISTS "strategies: select" ON public.strategies;
CREATE POLICY "strategies: select" ON public.strategies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.holders h
      WHERE h.id = strategies.holder_id
        AND (h.user_id = auth.uid() OR can_read_family(h.family_id))
    )
  );

-- strategy_allocations: leitura para assessores
DROP POLICY IF EXISTS "strategy_allocations: select" ON public.strategy_allocations;
CREATE POLICY "strategy_allocations: select" ON public.strategy_allocations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.strategies s
      JOIN public.holders h ON h.id = s.holder_id
      WHERE s.id = strategy_allocations.strategy_id
        AND (h.user_id = auth.uid() OR can_read_family(h.family_id))
    )
  );

-- import_batches: leitura + escrita para advisor_write
DROP POLICY IF EXISTS "import_batches: select" ON public.import_batches;
DROP POLICY IF EXISTS "import_batches: insert" ON public.import_batches;
DROP POLICY IF EXISTS "import_batches: update" ON public.import_batches;
CREATE POLICY "import_batches: select" ON public.import_batches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.holders h
      WHERE h.id = import_batches.holder_id
        AND (h.user_id = auth.uid() OR can_read_family(h.family_id))
    )
  );
CREATE POLICY "import_batches: insert" ON public.import_batches
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.holders h WHERE h.id = holder_id AND can_write_family(h.family_id))
  );
CREATE POLICY "import_batches: update" ON public.import_batches
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.holders h WHERE h.id = import_batches.holder_id AND can_write_family(h.family_id))
  );

-- positions: leitura + escrita para advisor_write
DROP POLICY IF EXISTS "positions: select" ON public.positions;
DROP POLICY IF EXISTS "positions: insert" ON public.positions;
DROP POLICY IF EXISTS "positions: update" ON public.positions;
CREATE POLICY "positions: select" ON public.positions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.holders h
      WHERE h.id = positions.holder_id
        AND (h.user_id = auth.uid() OR can_read_family(h.family_id))
    )
  );
CREATE POLICY "positions: insert" ON public.positions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.holders h WHERE h.id = holder_id AND can_write_family(h.family_id))
  );
CREATE POLICY "positions: update" ON public.positions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.holders h WHERE h.id = positions.holder_id AND can_write_family(h.family_id))
  );

-- alerts: leitura + update para advisor_write
DROP POLICY IF EXISTS "alerts: select" ON public.alerts;
DROP POLICY IF EXISTS "alerts: update" ON public.alerts;
CREATE POLICY "alerts: select" ON public.alerts
  FOR SELECT USING (
    holder_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.holders h
      WHERE h.id = alerts.holder_id
        AND (h.user_id = auth.uid() OR can_read_family(h.family_id))
    )
  );
CREATE POLICY "alerts: update" ON public.alerts
  FOR UPDATE USING (
    holder_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.holders h
      WHERE h.id = alerts.holder_id AND can_write_family(h.family_id)
    )
  );

-- position_structures: leitura + escrita para advisor_write
DROP POLICY IF EXISTS "position_structures: select" ON public.position_structures;
DROP POLICY IF EXISTS "position_structures: insert" ON public.position_structures;
DROP POLICY IF EXISTS "position_structures: update" ON public.position_structures;
DROP POLICY IF EXISTS "position_structures: delete" ON public.position_structures;
CREATE POLICY "position_structures: select" ON public.position_structures
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.holders h
      WHERE h.id = position_structures.holder_id
        AND (h.user_id = auth.uid() OR can_read_family(h.family_id))
    )
  );
CREATE POLICY "position_structures: write" ON public.position_structures
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.holders h WHERE h.id = position_structures.holder_id AND can_write_family(h.family_id))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.holders h WHERE h.id = holder_id AND can_write_family(h.family_id))
  );

DROP POLICY IF EXISTS "position_structure_legs: select" ON public.position_structure_legs;
DROP POLICY IF EXISTS "position_structure_legs: write" ON public.position_structure_legs;
CREATE POLICY "position_structure_legs: select" ON public.position_structure_legs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.position_structures ps
      JOIN public.holders h ON h.id = ps.holder_id
      WHERE ps.id = position_structure_legs.structure_id
        AND (h.user_id = auth.uid() OR can_read_family(h.family_id))
    )
  );
CREATE POLICY "position_structure_legs: write" ON public.position_structure_legs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.position_structures ps
      JOIN public.holders h ON h.id = ps.holder_id
      WHERE ps.id = position_structure_legs.structure_id AND can_write_family(h.family_id)
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.position_structures ps
      JOIN public.holders h ON h.id = ps.holder_id
      WHERE ps.id = structure_id AND can_write_family(h.family_id)
    )
  );

-- council_sessions: leitura + escrita para advisor_write
DROP POLICY IF EXISTS "council_sessions_family" ON public.council_sessions;
CREATE POLICY "council_sessions: select" ON public.council_sessions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.holders h WHERE h.id = council_sessions.holder_id AND can_read_family(h.family_id))
  );
CREATE POLICY "council_sessions: write" ON public.council_sessions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.holders h WHERE h.id = council_sessions.holder_id AND can_write_family(h.family_id))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.holders h WHERE h.id = council_sessions.holder_id AND can_write_family(h.family_id))
  );

-- council_participants
DROP POLICY IF EXISTS "council_participants_family" ON public.council_participants;
CREATE POLICY "council_participants: select" ON public.council_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.council_sessions s
      JOIN public.holders h ON h.id = s.holder_id
      WHERE s.id = council_participants.session_id AND can_read_family(h.family_id)
    )
  );
CREATE POLICY "council_participants: write" ON public.council_participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.council_sessions s
      JOIN public.holders h ON h.id = s.holder_id
      WHERE s.id = council_participants.session_id AND can_write_family(h.family_id)
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.council_sessions s
      JOIN public.holders h ON h.id = s.holder_id
      WHERE s.id = session_id AND can_write_family(h.family_id)
    )
  );

-- council_messages
DROP POLICY IF EXISTS "council_messages_family" ON public.council_messages;
CREATE POLICY "council_messages: select" ON public.council_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.council_sessions s
      JOIN public.holders h ON h.id = s.holder_id
      WHERE s.id = council_messages.session_id AND can_read_family(h.family_id)
    )
  );
CREATE POLICY "council_messages: write" ON public.council_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.council_sessions s
      JOIN public.holders h ON h.id = s.holder_id
      WHERE s.id = council_messages.session_id AND can_write_family(h.family_id)
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.council_sessions s
      JOIN public.holders h ON h.id = s.holder_id
      WHERE s.id = session_id AND can_write_family(h.family_id)
    )
  );
