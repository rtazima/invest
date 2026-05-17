-- Auth v2: multi-família com CPF por titular
-- Cada pessoa tem conta própria; owner vê todos da família, member só vê si mesmo.

-- 1. Remove políticas antigas (todas reescritas abaixo)
drop policy if exists "holders: owner select" on public.holders;
drop policy if exists "holders: owner insert" on public.holders;
drop policy if exists "holders: owner update" on public.holders;
drop policy if exists "strategies: owner select" on public.strategies;
drop policy if exists "strategies: owner insert" on public.strategies;
drop policy if exists "strategies: owner update" on public.strategies;
drop policy if exists "strategy_allocations: owner select" on public.strategy_allocations;
drop policy if exists "strategy_allocations: owner insert" on public.strategy_allocations;
drop policy if exists "strategy_allocations: owner update" on public.strategy_allocations;
drop policy if exists "strategy_allocations: owner delete" on public.strategy_allocations;
drop policy if exists "import_batches: owner select" on public.import_batches;
drop policy if exists "import_batches: owner insert" on public.import_batches;
drop policy if exists "positions: owner select" on public.positions;
drop policy if exists "positions: owner insert" on public.positions;
drop policy if exists "alerts: owner select" on public.alerts;
drop policy if exists "alerts: owner update" on public.alerts;
drop policy if exists "exchange_rates: any auth select" on public.exchange_rates;
drop policy if exists "exchange_rates: owner insert" on public.exchange_rates;

-- 2. Cria tabela families
create table public.families (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  owner_user_id  uuid not null references auth.users(id) on delete cascade,
  created_at     timestamptz not null default now()
);
alter table public.families enable row level security;

-- 3. Cria tabela family_cpfs (CPFs pré-cadastrados pelo owner para futuros membros)
create table public.family_cpfs (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references public.families(id) on delete cascade,
  cpf        varchar(11) not null,
  added_by   uuid not null references auth.users(id),
  added_at   timestamptz not null default now(),
  constraint family_cpfs_unique unique (family_id, cpf)
);
alter table public.family_cpfs enable row level security;

-- 4. Altera tabela holders
alter table public.holders
  drop constraint if exists holders_owner_slug_unique;

alter table public.holders
  drop column if exists owner_id;

alter table public.holders
  add column if not exists user_id    uuid references auth.users(id) on delete set null,
  add column if not exists cpf        varchar(11),
  add column if not exists full_name  text,
  add column if not exists family_id  uuid references public.families(id) on delete cascade,
  add column if not exists role       text not null default 'member'
    constraint holders_role_check check (role in ('owner', 'member'));

alter table public.holders
  add constraint holders_cpf_unique unique (cpf);

-- 5. Funções auxiliares de RLS (security definer para acesso seguro)

create or replace function public.is_family_owner(p_family_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.families
    where id = p_family_id and owner_user_id = auth.uid()
  );
$$;

-- Retorna o family_id do holder do usuário atual
create or replace function public.my_family_id()
returns uuid
language sql
security definer
stable
as $$
  select family_id from public.holders
  where user_id = auth.uid()
  limit 1;
$$;

-- Tenta vincular o usuário atual a um holder pelo CPF armazenado em user_metadata.
-- Retorna o holder_id se vinculado, null se nenhum holder não-reclamado com esse CPF existe.
create or replace function public.claim_holder_by_cpf()
returns uuid
language plpgsql
security definer
as $$
declare
  v_holder_id uuid;
  v_cpf       varchar;
begin
  -- Lê CPF do metadata do usuário autenticado
  select raw_user_meta_data->>'cpf' into v_cpf
  from auth.users
  where id = auth.uid();

  if v_cpf is null or v_cpf = '' then
    return null;
  end if;

  -- Procura holder com esse CPF ainda não vinculado
  select id into v_holder_id
  from public.holders
  where cpf = v_cpf and user_id is null
  limit 1;

  if v_holder_id is null then
    return null;
  end if;

  -- Vincula
  update public.holders
  set user_id = auth.uid()
  where id = v_holder_id;

  return v_holder_id;
end;
$$;

-- 6. RLS: families
create policy "families: select" on public.families
  for select using (owner_user_id = auth.uid());

create policy "families: insert" on public.families
  for insert with check (owner_user_id = auth.uid());

create policy "families: update" on public.families
  for update using (owner_user_id = auth.uid());

-- 7. RLS: family_cpfs (só o owner da família)
create policy "family_cpfs: all" on public.family_cpfs
  for all
  using (is_family_owner(family_id))
  with check (is_family_owner(family_id));

-- 8. RLS: holders
-- Select: o próprio holder OU o owner da família
create policy "holders: select" on public.holders
  for select using (
    user_id = auth.uid()
    or is_family_owner(family_id)
  );

-- Insert: apenas o owner da família pode criar holders para membros
create policy "holders: insert" on public.holders
  for insert with check (
    is_family_owner(family_id)
  );

-- Update: o próprio holder (atualizar full_name etc.) OU o owner da família
create policy "holders: update" on public.holders
  for update using (
    user_id = auth.uid()
    or is_family_owner(family_id)
  );

-- 9. RLS: strategies
create policy "strategies: select" on public.strategies
  for select using (
    exists (
      select 1 from public.holders h
      where h.id = strategies.holder_id
        and (h.user_id = auth.uid() or is_family_owner(h.family_id))
    )
  );

create policy "strategies: insert" on public.strategies
  for insert with check (
    exists (
      select 1 from public.holders h
      where h.id = holder_id and is_family_owner(h.family_id)
    )
  );

create policy "strategies: update" on public.strategies
  for update using (
    exists (
      select 1 from public.holders h
      where h.id = strategies.holder_id and is_family_owner(h.family_id)
    )
  );

-- 10. RLS: strategy_allocations
create policy "strategy_allocations: select" on public.strategy_allocations
  for select using (
    exists (
      select 1 from public.strategies s
      join public.holders h on h.id = s.holder_id
      where s.id = strategy_allocations.strategy_id
        and (h.user_id = auth.uid() or is_family_owner(h.family_id))
    )
  );

create policy "strategy_allocations: insert" on public.strategy_allocations
  for insert with check (
    exists (
      select 1 from public.strategies s
      join public.holders h on h.id = s.holder_id
      where s.id = strategy_id and is_family_owner(h.family_id)
    )
  );

create policy "strategy_allocations: update" on public.strategy_allocations
  for update using (
    exists (
      select 1 from public.strategies s
      join public.holders h on h.id = s.holder_id
      where s.id = strategy_allocations.strategy_id and is_family_owner(h.family_id)
    )
  );

create policy "strategy_allocations: delete" on public.strategy_allocations
  for delete using (
    exists (
      select 1 from public.strategies s
      join public.holders h on h.id = s.holder_id
      where s.id = strategy_allocations.strategy_id and is_family_owner(h.family_id)
    )
  );

-- 11. RLS: import_batches
create policy "import_batches: select" on public.import_batches
  for select using (
    exists (
      select 1 from public.holders h
      where h.id = import_batches.holder_id
        and (h.user_id = auth.uid() or is_family_owner(h.family_id))
    )
  );

create policy "import_batches: insert" on public.import_batches
  for insert with check (
    exists (
      select 1 from public.holders h
      where h.id = holder_id and is_family_owner(h.family_id)
    )
  );

-- 12. RLS: positions
create policy "positions: select" on public.positions
  for select using (
    exists (
      select 1 from public.holders h
      where h.id = positions.holder_id
        and (h.user_id = auth.uid() or is_family_owner(h.family_id))
    )
  );

create policy "positions: insert" on public.positions
  for insert with check (
    exists (
      select 1 from public.holders h
      where h.id = holder_id and is_family_owner(h.family_id)
    )
  );

-- 13. RLS: alerts
create policy "alerts: select" on public.alerts
  for select using (
    holder_id is null
    or exists (
      select 1 from public.holders h
      where h.id = alerts.holder_id
        and (h.user_id = auth.uid() or is_family_owner(h.family_id))
    )
  );

create policy "alerts: update" on public.alerts
  for update using (
    holder_id is null
    or exists (
      select 1 from public.holders h
      where h.id = alerts.holder_id
        and (h.user_id = auth.uid() or is_family_owner(h.family_id))
    )
  );

-- 14. RLS: exchange_rates (inalterado)
create policy "exchange_rates: any auth select" on public.exchange_rates
  for select using (auth.uid() is not null);

create policy "exchange_rates: owner insert" on public.exchange_rates
  for insert with check (registered_by = auth.uid());
