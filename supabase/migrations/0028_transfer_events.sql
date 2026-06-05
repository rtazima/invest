CREATE TABLE public.transfer_events (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  holder_id        uuid        NOT NULL REFERENCES public.holders(id) ON DELETE CASCADE,
  from_institution text        NOT NULL,
  to_institution   text        NOT NULL,
  asset_name       text        NOT NULL,
  ticker           text,
  quantity         numeric     NOT NULL CHECK (quantity > 0),
  transfer_date    date        NOT NULL DEFAULT CURRENT_DATE,
  settlement_date  date        NOT NULL,
  status           text        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'settled', 'cancelled')),
  settled_at       timestamptz,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid        REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX transfer_events_holder_idx      ON public.transfer_events (holder_id, status);
CREATE INDEX transfer_events_institution_idx ON public.transfer_events (from_institution, status);

ALTER TABLE public.transfer_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transfer_events: select"
  ON public.transfer_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.holders h
      WHERE h.id = transfer_events.holder_id
        AND (h.user_id = auth.uid() OR can_read_family(h.family_id))
    )
  );

CREATE POLICY "transfer_events: insert"
  ON public.transfer_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.holders h
      WHERE h.id = holder_id AND can_write_family(h.family_id)
    )
  );

CREATE POLICY "transfer_events: update"
  ON public.transfer_events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.holders h
      WHERE h.id = transfer_events.holder_id AND can_write_family(h.family_id)
    )
  );
