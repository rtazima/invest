-- Chat sessions e messages para o assistente Opus
create table chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null default 'Nova conversa',
  scope_type text not null default 'family' check (scope_type in ('family', 'holder')),
  scope_holder_id uuid references holders(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references chat_sessions(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;

create policy "users manage own sessions"
  on chat_sessions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "users manage own messages"
  on chat_messages for all
  using (
    exists (select 1 from chat_sessions where id = session_id and user_id = auth.uid())
  )
  with check (
    exists (select 1 from chat_sessions where id = session_id and user_id = auth.uid())
  );

create index on chat_sessions (user_id, updated_at desc);
create index on chat_messages (session_id, created_at);
