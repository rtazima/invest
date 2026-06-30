-- Fase 4 do PRD: relatório semanal consolidado por família.
-- Junta cenário + visão das casas + posições em atenção (alertas) + narrativa
-- por titular numa única leitura. Per-família, isolado por RLS.

create table public.weekly_reports (
  id           uuid primary key default gen_random_uuid(),
  family_id    uuid not null references public.families(id) on delete cascade,
  scenario_id  uuid references public.scenario_definitions(id) on delete set null,
  week_start   date not null,   -- segunda-feira da semana de referência
  body         jsonb not null,  -- { summary, scenario_summary, house_views, by_holder }
  model        text,
  generated_at timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  unique (family_id, week_start)
);

create index weekly_reports_family on public.weekly_reports (family_id, week_start desc);

alter table public.weekly_reports enable row level security;

create policy "weekly_reports: owner read" on public.weekly_reports
  for select using (is_family_owner(family_id));
-- escrita apenas via service role (agente)
