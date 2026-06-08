create table if not exists public.asset_archetypes (
  ticker text primary key,
  archetype text not null check (archetype in ('financeiras','asset_light','capital_intensivo','commodity','utility')),
  sector_b3 text,
  classified_at timestamptz default now(),
  classified_by text default 'manual' check (classified_by in ('manual','ai'))
);
alter table public.asset_archetypes enable row level security;
create policy "owner_all" on public.asset_archetypes for all using (true);
