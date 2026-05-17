create table public.holders (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  slug        text not null,
  birth_year  int,
  is_minor    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint holders_owner_slug_unique unique (owner_id, slug)
);
alter table public.holders enable row level security;
