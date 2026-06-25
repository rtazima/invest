-- Fase 2 do PRD "análise profissional": ingestão de research das casas.
-- Tudo POR FAMÍLIA e isolado por RLS. O research de uma família nunca cruza
-- para outra (firewall da seção 2 do PRD).

create table public.research_reports (
  id               uuid primary key default gen_random_uuid(),
  family_id        uuid not null references public.families(id) on delete cascade,
  house            text not null,                 -- 'xp' | 'btg'
  report_type      text,                          -- 'macro'|'setorial'|'single_name'|'carteira'|'outro'
  report_date      date,
  title            text,
  scenario_summary text,
  top_picks        text[] not null default '{}',
  file_hash        text not null,                 -- sha256 do PDF (dedup)
  storage_path     text,                          -- caminho no bucket privado 'research'
  status           text not null default 'processed',  -- 'processed'|'needs_review'|'failed'
  model            text,
  ingested_at      timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  unique (family_id, file_hash)
);

create index research_reports_family_date on public.research_reports (family_id, report_date desc);

create table public.research_observations (
  id               uuid primary key default gen_random_uuid(),
  family_id        uuid not null references public.families(id) on delete cascade,
  report_id        uuid not null references public.research_reports(id) on delete cascade,
  ticker           text,
  asset_name       text,
  rating           text,           -- recomendação original da casa (texto)
  rating_canonical text,           -- 'buy'|'hold'|'sell'|'neutral'|'unknown'
  target_price     numeric,
  currency         text,
  horizon          text,
  rationale        text,
  confidence       numeric,        -- 0..1 (confiança da extração)
  source_page      integer,
  needs_review     boolean not null default false,
  created_at       timestamptz not null default now()
);

create index research_observations_report on public.research_observations (report_id);
create index research_observations_family_ticker on public.research_observations (family_id, ticker);

alter table public.research_reports enable row level security;
alter table public.research_observations enable row level security;

create policy "research_reports: owner manage" on public.research_reports
  for all using (is_family_owner(family_id)) with check (is_family_owner(family_id));

create policy "research_observations: owner manage" on public.research_observations
  for all using (is_family_owner(family_id)) with check (is_family_owner(family_id));

-- Bucket privado para os PDFs originais. Caminho: {family_id}/{hash}.pdf
insert into storage.buckets (id, name, public)
values ('research', 'research', false)
on conflict (id) do nothing;

create policy "research bucket: owner read" on storage.objects
  for select using (
    bucket_id = 'research' and (storage.foldername(name))[1] = public.my_family_id()::text
  );

create policy "research bucket: owner insert" on storage.objects
  for insert with check (
    bucket_id = 'research' and (storage.foldername(name))[1] = public.my_family_id()::text
  );

create policy "research bucket: owner delete" on storage.objects
  for delete using (
    bucket_id = 'research' and (storage.foldername(name))[1] = public.my_family_id()::text
  );
