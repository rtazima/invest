-- Council sessions
create table public.council_sessions (
  id           uuid primary key default gen_random_uuid(),
  holder_id    uuid not null references public.holders(id) on delete cascade,
  title        text not null,
  status       text not null default 'configuring'
                 constraint council_sessions_status_check
                 check (status in ('round1_pending','round2_pending','synthesizing','completed')),
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);

-- Council participants
create table public.council_participants (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.council_sessions(id) on delete cascade,
  name        text not null,
  type        text not null
                constraint council_participants_type_check
                check (type in ('llm', 'human')),
  model       text,
  role_focus  text,
  sort_order  int not null default 0
);

-- Council messages
create table public.council_messages (
  id             uuid primary key default gen_random_uuid(),
  session_id     uuid not null references public.council_sessions(id) on delete cascade,
  participant_id uuid references public.council_participants(id) on delete set null,
  round          int not null,
  content        text not null,
  created_at     timestamptz not null default now()
);

-- RLS
alter table public.council_sessions     enable row level security;
alter table public.council_participants enable row level security;
alter table public.council_messages     enable row level security;

create policy "council_sessions: select" on public.council_sessions
  for select using (
    exists (
      select 1 from public.holders h
      where h.id = council_sessions.holder_id
        and (h.user_id = auth.uid() or is_family_owner(h.family_id))
    )
  );

create policy "council_sessions: insert" on public.council_sessions
  for insert with check (
    exists (
      select 1 from public.holders h
      where h.id = holder_id and is_family_owner(h.family_id)
    )
  );

create policy "council_sessions: update" on public.council_sessions
  for update using (
    exists (
      select 1 from public.holders h
      where h.id = council_sessions.holder_id and is_family_owner(h.family_id)
    )
  );

create policy "council_sessions: delete" on public.council_sessions
  for delete using (
    exists (
      select 1 from public.holders h
      where h.id = council_sessions.holder_id and is_family_owner(h.family_id)
    )
  );

create policy "council_participants: select" on public.council_participants
  for select using (
    exists (
      select 1 from public.council_sessions cs
      join public.holders h on h.id = cs.holder_id
      where cs.id = council_participants.session_id
        and (h.user_id = auth.uid() or is_family_owner(h.family_id))
    )
  );

create policy "council_participants: write" on public.council_participants
  for all using (
    exists (
      select 1 from public.council_sessions cs
      join public.holders h on h.id = cs.holder_id
      where cs.id = council_participants.session_id
        and is_family_owner(h.family_id)
    )
  ) with check (
    exists (
      select 1 from public.council_sessions cs
      join public.holders h on h.id = cs.holder_id
      where cs.id = session_id
        and is_family_owner(h.family_id)
    )
  );

create policy "council_messages: select" on public.council_messages
  for select using (
    exists (
      select 1 from public.council_sessions cs
      join public.holders h on h.id = cs.holder_id
      where cs.id = council_messages.session_id
        and (h.user_id = auth.uid() or is_family_owner(h.family_id))
    )
  );

create policy "council_messages: write" on public.council_messages
  for all using (
    exists (
      select 1 from public.council_sessions cs
      join public.holders h on h.id = cs.holder_id
      where cs.id = council_messages.session_id
        and is_family_owner(h.family_id)
    )
  ) with check (
    exists (
      select 1 from public.council_sessions cs
      join public.holders h on h.id = cs.holder_id
      where cs.id = session_id
        and is_family_owner(h.family_id)
    )
  );

create index council_sessions_holder_idx   on public.council_sessions (holder_id, created_at desc);
create index council_participants_sess_idx on public.council_participants (session_id, sort_order);
create index council_messages_sess_idx     on public.council_messages (session_id, round, created_at);
