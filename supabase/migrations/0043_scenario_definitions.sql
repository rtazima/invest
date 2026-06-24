-- Fase 1 do PRD "análise profissional" (v2.3).
-- Cenário macro GLOBAL: dado público, mesmo para todas as famílias.
-- Firewall da seção 2: esta tabela não referencia nada por família.

create table public.scenario_definitions (
  id              uuid primary key default gen_random_uuid(),
  version         integer not null,
  period_ref      text not null,            -- semana ISO, ex: '2026-W26' (idempotência)
  generated_at    timestamptz not null default now(),
  -- frescor deriva do dado obrigatório mais antigo, não da hora de geração
  data_as_of      timestamptz not null,
  -- snapshot das entradas, com timestamp por série (BCB Focus, SGS, FRED)
  inputs          jsonb not null,
  election_notes  text,                     -- nota macro/eleitoral editável (global)
  -- saída do modelo: cada caso com probabilidade, tese, premissas e implicações
  base_case       jsonb not null,
  bull_case       jsonb not null,
  bear_case       jsonb not null,
  summary         text not null,
  model           text not null default 'claude-opus-4-7',
  prev_id         uuid references public.scenario_definitions(id),
  created_at      timestamptz not null default now()
);

create unique index scenario_definitions_period_version
  on public.scenario_definitions (period_ref, version);
create index scenario_definitions_generated_at
  on public.scenario_definitions (generated_at desc);

alter table public.scenario_definitions enable row level security;

-- dado macro não é sensível e é igual para todos: leitura para qualquer usuário autenticado.
create policy "scenario_definitions: authenticated read"
  on public.scenario_definitions
  for select to authenticated using (true);

-- escrita apenas via service role (agente). Sem policy de insert para usuários.

-- Rastreabilidade operacional exigida desde a primeira família (seção 12 do PRD).
create table public.agent_runs (
  id           uuid primary key default gen_random_uuid(),
  agent        text not null,
  period_ref   text,
  status       text not null check (status in ('running', 'success', 'failed')),
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  result       jsonb,
  error        text
);

create index agent_runs_agent_period on public.agent_runs (agent, period_ref, started_at desc);

alter table public.agent_runs enable row level security;
-- logs operacionais: sem policy de usuário; só service role acessa.
