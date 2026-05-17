create table public.strategies (
  id                       uuid primary key default gen_random_uuid(),
  holder_id                uuid not null references public.holders(id) on delete cascade,
  risk_profile             risk_profile not null,
  investment_horizon_years int,
  goal_description         text,
  goal_monthly_income      numeric(18,4),
  goal_target_age          int,
  liquidity_min_pct        numeric(8,4) not null default 0.10,
  deviation_threshold_pct  numeric(8,4) not null default 0.05,
  restricted_assets        text[],
  notes                    text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint strategies_holder_unique unique (holder_id)
);

create table public.strategy_allocations (
  id            uuid primary key default gen_random_uuid(),
  strategy_id   uuid not null references public.strategies(id) on delete cascade,
  asset_class   asset_class not null,
  target_pct    numeric(8,4) not null,
  tolerance_pct numeric(8,4) not null,
  rationale     text,
  constraint strategy_allocations_unique unique (strategy_id, asset_class)
);

alter table public.strategies enable row level security;
alter table public.strategy_allocations enable row level security;
