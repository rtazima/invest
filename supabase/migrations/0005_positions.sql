create table public.import_batches (
  id                 uuid primary key default gen_random_uuid(),
  holder_id          uuid not null references public.holders(id) on delete cascade,
  institution        institution not null,
  status             import_status not null default 'pending',
  source             text not null default 'csv',
  filename           text,
  row_count          int,
  exchange_rate      numeric(10,6),
  exchange_rate_date date,
  error_message      text,
  imported_by        uuid references auth.users(id),
  imported_at        timestamptz not null default now(),
  completed_at       timestamptz
);

-- Todos os valores monetários: NUMERIC(18,4) — nunca FLOAT
create table public.positions (
  id               uuid primary key default gen_random_uuid(),
  batch_id         uuid not null references public.import_batches(id) on delete cascade,
  holder_id        uuid not null references public.holders(id),
  institution      institution not null,
  ticker           text,
  name             text not null,
  asset_class      asset_class not null,
  currency         currency not null default 'BRL',
  quantity         numeric(18,4) not null default 0,
  avg_price        numeric(18,4),
  current_price    numeric(18,4),
  market_value     numeric(18,4) not null,
  cost_basis       numeric(18,4),
  pnl              numeric(18,4),
  pnl_pct          numeric(8,4),
  exchange_rate    numeric(10,6),
  market_value_brl numeric(18,4),
  maturity_date    date,
  indexer          indexer,
  indexer_rate     numeric(8,4),
  liquidity_days   int,
  quota_value      numeric(18,4),
  quota_date       date,
  raw_data         jsonb,
  created_at       timestamptz not null default now()
);

alter table public.import_batches enable row level security;
alter table public.positions enable row level security;
