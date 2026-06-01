create table public.position_structures (
  id          uuid primary key default gen_random_uuid(),
  holder_id   uuid not null references public.holders(id) on delete cascade,
  name        text not null,
  type        text not null
                constraint position_structures_type_check
                check (type in ('covered_call', 'synthetic_dividend', 'collar', 'protective_put')),
  status      text not null default 'active'
                constraint position_structures_status_check
                check (status in ('active', 'expired', 'closed')),
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.position_structure_legs (
  id              uuid primary key default gen_random_uuid(),
  structure_id    uuid not null references public.position_structures(id) on delete cascade,
  role            text not null
                    constraint position_structure_legs_role_check
                    check (role in ('underlying', 'short_call', 'long_put', 'short_put', 'long_call')),
  ticker          text,
  asset_class     text,
  strike          numeric(18,4),
  expiration_date date,
  contracts       int,
  premium         numeric(18,4),
  sort_order      int not null default 0
);

alter table public.position_structures      enable row level security;
alter table public.position_structure_legs  enable row level security;

create policy "position_structures: select" on public.position_structures
  for select using (
    exists (
      select 1 from public.holders h
      where h.id = position_structures.holder_id
        and (h.user_id = auth.uid() or is_family_owner(h.family_id))
    )
  );

create policy "position_structures: insert" on public.position_structures
  for insert with check (
    exists (
      select 1 from public.holders h
      where h.id = holder_id and is_family_owner(h.family_id)
    )
  );

create policy "position_structures: update" on public.position_structures
  for update using (
    exists (
      select 1 from public.holders h
      where h.id = position_structures.holder_id and is_family_owner(h.family_id)
    )
  );

create policy "position_structures: delete" on public.position_structures
  for delete using (
    exists (
      select 1 from public.holders h
      where h.id = position_structures.holder_id and is_family_owner(h.family_id)
    )
  );

create policy "position_structure_legs: select" on public.position_structure_legs
  for select using (
    exists (
      select 1 from public.position_structures ps
      join public.holders h on h.id = ps.holder_id
      where ps.id = position_structure_legs.structure_id
        and (h.user_id = auth.uid() or is_family_owner(h.family_id))
    )
  );

create policy "position_structure_legs: write" on public.position_structure_legs
  for all
  using (
    exists (
      select 1 from public.position_structures ps
      join public.holders h on h.id = ps.holder_id
      where ps.id = position_structure_legs.structure_id
        and is_family_owner(h.family_id)
    )
  )
  with check (
    exists (
      select 1 from public.position_structures ps
      join public.holders h on h.id = ps.holder_id
      where ps.id = structure_id
        and is_family_owner(h.family_id)
    )
  );

create index position_structures_holder_idx
  on public.position_structures (holder_id, status);

create index position_structure_legs_struct_idx
  on public.position_structure_legs (structure_id, sort_order);

create index position_structure_legs_ticker_idx
  on public.position_structure_legs (ticker)
  where ticker is not null;
