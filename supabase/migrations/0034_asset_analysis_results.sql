create table if not exists public.asset_analysis_results (
  id uuid primary key default gen_random_uuid(),
  ticker text not null,
  analyzed_at timestamptz not null default now(),
  archetype text,
  status text not null default 'ok' check (status in ('ok','blocked','no_data')),
  missing_metrics text[],
  semaphores jsonb default '{}',
  solvency_override boolean default false,
  quality_score text check (quality_score in ('high','medium','low')),
  valuation text check (valuation in ('attractive','fair','stretched','informational')),
  recommendation text check (recommendation in ('buy','hold','sell','avoid','reduce')),
  trend_downgrade boolean default false,
  justifications jsonb default '{}',
  constraint unique_ticker_analyzed unique (ticker, analyzed_at)
);
create index on public.asset_analysis_results (ticker, analyzed_at desc);
alter table public.asset_analysis_results enable row level security;
create policy "owner_all" on public.asset_analysis_results for all using (true);
