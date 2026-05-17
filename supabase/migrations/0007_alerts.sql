create table public.alerts (
  id             uuid primary key default gen_random_uuid(),
  holder_id      uuid references public.holders(id),
  ticker         text,
  severity       alert_severity not null,
  status         alert_status not null default 'unread',
  title          text not null,
  description    text not null,
  recommendation text,
  sources        text[],
  generated_by   text not null default 'manual',
  generated_at   timestamptz not null default now(),
  read_at        timestamptz,
  dismissed_at   timestamptz
);
alter table public.alerts enable row level security;
