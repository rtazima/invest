CREATE TABLE portfolio_snapshots (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  holder_id   UUID        NOT NULL REFERENCES holders(id) ON DELETE CASCADE,
  date        DATE        NOT NULL,
  total_value_brl NUMERIC NOT NULL,
  fx_rate     NUMERIC,
  breakdown   JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(holder_id, date)
);

ALTER TABLE portfolio_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "family_read" ON portfolio_snapshots
  FOR SELECT USING (
    holder_id IN (
      SELECT h.id FROM holders h
      WHERE h.family_id IN (
        SELECT family_id FROM holders WHERE user_id = auth.uid()
        UNION ALL
        SELECT family_id FROM family_advisors WHERE user_id = auth.uid()
      )
    )
  );

CREATE INDEX portfolio_snapshots_holder_date_idx ON portfolio_snapshots(holder_id, date DESC);
