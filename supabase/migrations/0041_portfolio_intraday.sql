CREATE TABLE IF NOT EXISTS portfolio_intraday (
  id BIGSERIAL PRIMARY KEY,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_value_brl NUMERIC(18, 2) NOT NULL,
  fx_rate NUMERIC(10, 6)
);

CREATE INDEX portfolio_intraday_captured_at_idx ON portfolio_intraday (captured_at DESC);
