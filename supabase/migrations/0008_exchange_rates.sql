create table public.exchange_rates (
  id            uuid primary key default gen_random_uuid(),
  currency_pair text not null default 'USD/BRL',
  rate          numeric(10,6) not null,
  source        text not null default 'manual',
  rate_date     date not null,
  registered_by uuid references auth.users(id),
  registered_at timestamptz not null default now()
);
alter table public.exchange_rates enable row level security;
