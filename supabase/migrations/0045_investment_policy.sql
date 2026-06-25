-- Fundação de política de investimento (P0 da revisão de produto).
-- Estende `strategies` (que já é a política) com perda máxima e limite de
-- concentração, e adiciona auditoria/versionamento da política.

alter table public.strategies
  add column if not exists max_loss_pct          numeric(8,4),  -- perda máxima tolerada (fração, ex 0.20 = -20%)
  add column if not exists max_single_asset_pct  numeric(8,4);  -- concentração máx por ativo (fração)

create table public.strategy_versions (
  id          uuid primary key default gen_random_uuid(),
  holder_id   uuid not null references public.holders(id) on delete cascade,
  strategy_id uuid references public.strategies(id) on delete set null,
  snapshot    jsonb not null,   -- política + alocações no momento da gravação
  changed_by  uuid,             -- auth.users id de quem alterou
  created_at  timestamptz not null default now()
);

create index strategy_versions_holder on public.strategy_versions (holder_id, created_at desc);

alter table public.strategy_versions enable row level security;

create policy "strategy_versions: owner read" on public.strategy_versions
  for select using (is_family_owner((select family_id from public.holders where id = holder_id)));

create policy "strategy_versions: owner insert" on public.strategy_versions
  for insert with check (is_family_owner((select family_id from public.holders where id = holder_id)));
