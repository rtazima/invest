-- Histórico diário de valores por posição individual.
-- Permite gráficos de série temporal por ativo.

CREATE TABLE IF NOT EXISTS public.position_snapshots (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id     uuid        NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
  snapshot_date   date        NOT NULL,
  price           numeric,
  market_value    numeric     NOT NULL,
  market_value_brl numeric    NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (position_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_position_snapshots_position_date
  ON public.position_snapshots (position_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_position_snapshots_date
  ON public.position_snapshots (snapshot_date);

ALTER TABLE public.position_snapshots ENABLE ROW LEVEL SECURITY;

-- Apenas service role escreve; usuários autenticados leem suas próprias posições via join
CREATE POLICY "service_role_all" ON public.position_snapshots
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_read" ON public.position_snapshots
  FOR SELECT TO authenticated
  USING (
    position_id IN (
      SELECT p.id FROM public.positions p
      JOIN public.holders h ON h.id = p.holder_id
      WHERE h.user_id = auth.uid()
    )
  );
