create table public.alert_mutes (
  id           uuid primary key default gen_random_uuid(),
  family_id    uuid not null references public.families(id) on delete cascade,
  ticker       text,        -- null = aplica a todos os tickers
  alert_type   text,        -- null = aplica a todos os tipos (matches generated_by)
  muted_until  timestamptz, -- null = permanente
  created_at   timestamptz not null default now()
);

alter table public.alert_mutes enable row level security;

create policy "alert_mutes: owner manage" on public.alert_mutes
  for all using (is_family_owner(family_id))
  with check (is_family_owner(family_id));
