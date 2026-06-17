ALTER TABLE portfolio_intraday ADD COLUMN IF NOT EXISTS by_holder JSONB DEFAULT '{}'::jsonb;
