# Plano de implementação — Fase 1 (MVP)

**Critério de "pronto":** Rodrigo consegue ver o portfólio consolidado de todos os titulares.  
**Stack:** Next.js 15 + Tailwind v4 + shadcn/ui + Supabase + pnpm + Vitest + Playwright  
**Data:** 2026-05-11

---

## Visão geral das etapas

```
Etapa 0 → Scaffold do projeto + CI/CD
Etapa 1 → Schema SQL completo + RLS (migrations)
Etapa 2 → Auth (magic link + MFA)
Etapa 3 → Tipos TypeScript + camada de dados
Etapa 4 → F6: Editor de estratégia por titular     ┐
Etapa 5 → F2 parcial: Importação CSV               ┘ paralelas
Etapa 6 → F1: Dashboard de portfólio
Etapa 7 → F5 parcial: Alertas no dashboard
Etapa 8 → Testes e2e + hardening
```

As etapas 4 e 5 podem ser desenvolvidas em paralelo. Todas as outras são sequenciais.

---

## Etapa 0 — Scaffold do projeto

**Objetivo:** repositório Next.js 15 funcional rodando localmente e no Vercel, com CI passando.

### Arquivos a criar

```
package.json
pnpm-lock.yaml
tsconfig.json
next.config.ts
tailwind.config.ts
postcss.config.mjs
components.json                    ← configuração shadcn/ui
.eslintrc.json
.prettierrc
.env.example
vitest.config.ts
playwright.config.ts
src/
  app/
    layout.tsx                     ← RootLayout com dark mode, fonte mono
    page.tsx                       ← redirect para /dashboard (após auth) ou /login
    globals.css                    ← tokens Tailwind v4, variáveis CSS
    (auth)/
      login/page.tsx
    (app)/
      layout.tsx                   ← layout autenticado (sidebar, header)
      dashboard/page.tsx           ← placeholder
  components/ui/                   ← shadcn (gerado)
  lib/supabase/
    client.ts                      ← createBrowserClient()
    server.ts                      ← createServerClient() com cookies
  types/index.ts
middleware.ts
supabase/
  config.toml
  migrations/
  functions/
.github/workflows/ci.yml
```

### Comandos de inicialização

```bash
pnpm create next-app@latest invest --typescript --tailwind --app --src-dir --import-alias "@/*"
cd invest
pnpm add @supabase/supabase-js @supabase/ssr decimal.js
pnpm add -D vitest @vitejs/plugin-react @testing-library/react
pnpm add -D playwright @playwright/test
pnpm dlx shadcn@latest init
supabase init
```

### Variáveis de ambiente (`.env.example`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # nunca no frontend
```

### Critério de aceite

- `pnpm dev` sobe sem erros
- `pnpm build` compila sem erros TypeScript
- `pnpm lint` passa sem warnings
- Deploy no Vercel bem-sucedido via push para `main`

---

## Etapa 1 — Schema SQL + RLS

**Objetivo:** toda a modelagem de dados com RLS habilitado desde o início.

### Migrations a criar

```
supabase/migrations/
  0001_extensions.sql
  0002_enums.sql
  0003_holders.sql
  0004_strategies.sql
  0005_positions.sql
  0007_alerts.sql
  0008_exchange_rates.sql
  0009_rls_policies.sql
  0010_indexes.sql
```

### Enums (`0002_enums.sql`)

```sql
create type risk_profile as enum ('conservative', 'moderate', 'aggressive');
create type asset_class as enum (
  'fiis', 'stocks_br', 'stocks_intl', 'fixed_income',
  'funds', 'liquidity', 'etf_br', 'etf_intl'
);
create type indexer as enum ('cdi', 'ipca', 'igpm', 'selic', 'prefixado', 'usd', 'none');
create type institution as enum ('xp', 'btg', 'nomad');
create type import_status as enum ('pending', 'processing', 'completed', 'failed');
create type alert_severity as enum ('info', 'warning', 'critical');
create type alert_status as enum ('unread', 'read', 'dismissed');
create type currency as enum ('BRL', 'USD');
```

### Holders (`0003_holders.sql`)

```sql
create table public.holders (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  slug        text not null,           -- 'rodrigo' | 'grasi' | 'amora' | 'benicio'
  birth_year  int,
  is_minor    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint holders_owner_slug_unique unique (owner_id, slug)
);
alter table public.holders enable row level security;
```

### Strategies (`0004_strategies.sql`)

```sql
create table public.strategies (
  id                       uuid primary key default gen_random_uuid(),
  holder_id                uuid not null references public.holders(id) on delete cascade,
  risk_profile             risk_profile not null,
  investment_horizon_years int,
  goal_description         text,
  goal_monthly_income      numeric(18,4),   -- meta renda passiva mensal (BRL)
  goal_target_age          int,
  liquidity_min_pct        numeric(8,4) not null default 0.10,
  deviation_threshold_pct  numeric(8,4) not null default 0.05,
  restricted_assets        text[],
  notes                    text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint strategies_holder_unique unique (holder_id)
);

create table public.strategy_allocations (
  id            uuid primary key default gen_random_uuid(),
  strategy_id   uuid not null references public.strategies(id) on delete cascade,
  asset_class   asset_class not null,
  target_pct    numeric(8,4) not null,   -- 0.25 = 25%
  tolerance_pct numeric(8,4) not null,   -- 0.05 = ±5%
  rationale     text,
  constraint strategy_allocations_unique unique (strategy_id, asset_class)
);

alter table public.strategies enable row level security;
alter table public.strategy_allocations enable row level security;
```

### Positions (`0005_positions.sql`)

```sql
create table public.import_batches (
  id              uuid primary key default gen_random_uuid(),
  holder_id       uuid not null references public.holders(id) on delete cascade,
  institution     institution not null,
  status          import_status not null default 'pending',
  source          text not null default 'csv',
  filename        text,
  row_count       int,
  exchange_rate   numeric(10,6),     -- cotação USD/BRL informada pelo usuário (Nomad)
  exchange_rate_date date,
  error_message   text,
  imported_by     uuid references auth.users(id),
  imported_at     timestamptz not null default now(),
  completed_at    timestamptz
);

-- Todos os valores monetários: NUMERIC(18,4) — nunca FLOAT
create table public.positions (
  id               uuid primary key default gen_random_uuid(),
  batch_id         uuid not null references public.import_batches(id) on delete cascade,
  holder_id        uuid not null references public.holders(id),
  institution      institution not null,
  ticker           text,
  name             text not null,
  asset_class      asset_class not null,
  currency         currency not null default 'BRL',
  quantity         numeric(18,4) not null default 0,
  avg_price        numeric(18,4),
  current_price    numeric(18,4),
  market_value     numeric(18,4) not null,   -- na moeda original
  cost_basis       numeric(18,4),
  pnl              numeric(18,4),
  pnl_pct          numeric(8,4),
  exchange_rate    numeric(10,6),
  market_value_brl numeric(18,4),            -- sempre em BRL
  maturity_date    date,
  indexer          indexer,
  indexer_rate     numeric(8,4),
  liquidity_days   int,
  quota_value      numeric(18,4),
  quota_date       date,
  raw_data         jsonb,
  created_at       timestamptz not null default now()
);

alter table public.import_batches enable row level security;
alter table public.positions enable row level security;
```

### Alerts (`0007_alerts.sql`)

```sql
create table public.alerts (
  id             uuid primary key default gen_random_uuid(),
  holder_id      uuid references public.holders(id),  -- null = alerta global
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
```

### Exchange rates (`0008_exchange_rates.sql`)

```sql
create table public.exchange_rates (
  id            uuid primary key default gen_random_uuid(),
  currency_pair text not null default 'USD/BRL',
  rate          numeric(10,6) not null,
  source        text not null default 'manual',
  rate_date     date not null,
  registered_by uuid references auth.users(id),
  registered_at timestamptz not null default now()
);
alter table public.exchange_rates enable row level security;
```

### RLS policies (`0009_rls_policies.sql`)

Padrão: usuário só acessa dados dos seus próprios holders (`owner_id = auth.uid()`). Service role ignora RLS.

```sql
-- holders
create policy "holders: owner select" on public.holders for select using (owner_id = auth.uid());
create policy "holders: owner insert" on public.holders for insert with check (owner_id = auth.uid());
create policy "holders: owner update" on public.holders for update using (owner_id = auth.uid());

-- strategies (via holder)
create policy "strategies: owner select" on public.strategies for select
  using (exists (select 1 from public.holders h where h.id = strategies.holder_id and h.owner_id = auth.uid()));
create policy "strategies: owner insert" on public.strategies for insert
  with check (exists (select 1 from public.holders h where h.id = holder_id and h.owner_id = auth.uid()));
create policy "strategies: owner update" on public.strategies for update
  using (exists (select 1 from public.holders h where h.id = strategies.holder_id and h.owner_id = auth.uid()));

-- strategy_allocations (via strategy → holder)
create policy "strategy_allocations: owner select" on public.strategy_allocations for select
  using (exists (select 1 from public.strategies s join public.holders h on h.id = s.holder_id
    where s.id = strategy_allocations.strategy_id and h.owner_id = auth.uid()));
create policy "strategy_allocations: owner insert" on public.strategy_allocations for insert
  with check (exists (select 1 from public.strategies s join public.holders h on h.id = s.holder_id
    where s.id = strategy_id and h.owner_id = auth.uid()));
create policy "strategy_allocations: owner update" on public.strategy_allocations for update
  using (exists (select 1 from public.strategies s join public.holders h on h.id = s.holder_id
    where s.id = strategy_allocations.strategy_id and h.owner_id = auth.uid()));
create policy "strategy_allocations: owner delete" on public.strategy_allocations for delete
  using (exists (select 1 from public.strategies s join public.holders h on h.id = s.holder_id
    where s.id = strategy_allocations.strategy_id and h.owner_id = auth.uid()));

-- import_batches + positions (via holder)
create policy "import_batches: owner select" on public.import_batches for select
  using (exists (select 1 from public.holders h where h.id = import_batches.holder_id and h.owner_id = auth.uid()));
create policy "import_batches: owner insert" on public.import_batches for insert
  with check (exists (select 1 from public.holders h where h.id = holder_id and h.owner_id = auth.uid()));
create policy "positions: owner select" on public.positions for select
  using (exists (select 1 from public.holders h where h.id = positions.holder_id and h.owner_id = auth.uid()));
create policy "positions: owner insert" on public.positions for insert
  with check (exists (select 1 from public.holders h where h.id = holder_id and h.owner_id = auth.uid()));

-- alerts (holder_id null = global, visível para qualquer auth)
create policy "alerts: owner select" on public.alerts for select
  using (holder_id is null or exists (select 1 from public.holders h where h.id = alerts.holder_id and h.owner_id = auth.uid()));
create policy "alerts: owner update" on public.alerts for update
  using (holder_id is null or exists (select 1 from public.holders h where h.id = alerts.holder_id and h.owner_id = auth.uid()));

-- exchange_rates (qualquer usuário auth lê, só owner insere)
create policy "exchange_rates: any auth select" on public.exchange_rates for select using (auth.uid() is not null);
create policy "exchange_rates: owner insert" on public.exchange_rates for insert with check (registered_by = auth.uid());
```

### Indexes (`0010_indexes.sql`)

```sql
create index positions_holder_id_idx on public.positions (holder_id);
create index positions_batch_id_idx on public.positions (batch_id);
create index positions_institution_idx on public.positions (institution);
create index positions_asset_class_idx on public.positions (asset_class);
create index import_batches_holder_institution_idx on public.import_batches (holder_id, institution, imported_at desc);
create index alerts_holder_status_idx on public.alerts (holder_id, status);
create index alerts_severity_idx on public.alerts (severity);
create index import_batches_latest_idx on public.import_batches (holder_id, institution, completed_at desc nulls last)
  where status = 'completed';
```

### Critério de aceite

- `supabase db reset` sem erros
- `supabase gen types typescript --local` gera tipos sem warnings
- Insert com anon key falha (RLS); com service_role funciona

---

## Etapa 2 — Auth (magic link + MFA)

**Objetivo:** login via magic link, MFA TOTP obrigatório, middleware protege rotas.

### Arquivos a criar

```
src/
  app/
    (auth)/
      login/page.tsx + actions.ts        ← signInWithOtp()
      auth/callback/route.ts             ← exchangeCodeForSession()
      mfa/
        enroll/page.tsx + actions.ts     ← enrollMFA(), challengeMFA()
        verify/page.tsx + actions.ts     ← verifyMFA()
  components/auth/
    LoginForm.tsx
    MfaEnrollForm.tsx
    MfaVerifyForm.tsx
middleware.ts
```

### Fluxo

```
1. /login → email → signInWithOtp() → magic link no email
2. Link clicado → /auth/callback?code=... → exchangeCodeForSession()
3. Middleware: sessão ok? → MFA completado (aal2)? → /dashboard
   Se aal1: → /mfa/verify
   Se sem TOTP: → /mfa/enroll
```

### Config Supabase Auth

- JWT expiry: `86400` (24h)
- MFA TOTP: habilitado
- OTP expiry: `3600`s

### Critério de aceite

- Magic link funciona (testar com `supabase inbucket` local)
- `/dashboard` sem sessão → `/login`
- Sessão aal1 → `/mfa/verify`
- Após MFA → acesso liberado

---

## Etapa 3 — Tipos TypeScript + camada de dados

**Objetivo:** tipos gerados + abstrações de query. Nenhuma tela nova — lógica de dados testável unitariamente.

### Arquivos a criar

```
src/
  types/
    database.ts           ← supabase gen types typescript --local
    domain.ts             ← PortfolioSummary, HolderSummary, EnrichedPosition
  lib/
    data/
      holders.ts
      strategies.ts
      positions.ts        ← "batch mais recente" por (holder, institution)
      alerts.ts
      portfolio.ts        ← getPortfolioSummary(), getHolderSummary()
    decimal.ts            ← formatBRL(), formatPct(), formatMono(), toBRL()
    dates.ts              ← formatDateBR(), isStaleQuota()
  __tests__/lib/
    portfolio.test.ts
    decimal.test.ts
```

### Tipos de domínio (`domain.ts`)

```typescript
import Decimal from 'decimal.js'

export interface PortfolioSummary {
  totalBrl: Decimal
  byHolder: HolderSummary[]
  byInstitution: Record<string, Decimal>
  byAssetClass: Record<string, Decimal>
  lastUpdatedAt: Date | null
}

export interface HolderSummary {
  holder: Holder
  totalBrl: Decimal
  byInstitution: Record<string, Decimal>
  byAssetClass: Record<string, Decimal>
  positions: EnrichedPosition[]
  lastImportAt: Date | null
}

export interface EnrichedPosition extends Position {
  marketValueBrl: Decimal
  pnlDecimal: Decimal | null
  pnlPctDecimal: Decimal | null
  isStaleQuota: boolean
}
```

### Regra crítica

**Nunca `number` para valores financeiros.** Colunas `NUMERIC` chegam como `string` via supabase-js. Sempre `new Decimal(value)` antes de qualquer operação.

### Critério de aceite

- `pnpm test` passa: `portfolio.test.ts` + `decimal.test.ts`
- `formatBRL(new Decimal('1234567.89'))` → `"R$ 1.234.567,89"`
- `getPortfolioSummary` com 0 holders → `PortfolioSummary` vazio, sem exception

---

## Etapa 4 — F6: Editor de estratégia (paralela com Etapa 5)

**Objetivo:** editar estratégia de cada titular — perfil, objetivo, alocação-alvo, threshold.

### Arquivos a criar

```
src/
  app/(app)/
    holders/
      page.tsx                          ← lista de titulares
      [holderId]/
        page.tsx                        ← detalhe do titular
        strategy/
          page.tsx + actions.ts         ← upsertStrategy(), upsertAllocations()
  components/
    holders/HolderCard.tsx + HolderList.tsx
    strategy/
      StrategyPanel.tsx                 ← view + edit inline
      AllocationEditor.tsx              ← tabela editável (validação: soma = 100%)
      RiskProfileBadge.tsx
supabase/seed.sql                       ← 4 titulares + estratégias iniciais
```

### Seed de titulares

```sql
-- seed.sql — substituir __RODRIGO_UID__ pelo auth.uid() real em produção
-- Em dev: rodar com `supabase db reset --seed`
insert into public.holders (owner_id, name, slug, birth_year, is_minor) values
  ('__RODRIGO_UID__', 'Rodrigo', 'rodrigo', 1985, false),
  ('__RODRIGO_UID__', 'Grasi',   'grasi',   1988, false),
  ('__RODRIGO_UID__', 'Amora',   'amora',   2019, true),
  ('__RODRIGO_UID__', 'Benicio', 'benicio', 2024, true);
-- strategies e strategy_allocations conforme estrategias-por-titular.md
```

### Critério de aceite

- `/holders` lista os 4 titulares
- Editar estratégia persiste (RLS bloqueia outro owner)
- `AllocationEditor`: soma ≠ 100% → erro de validação, sem persistir

---

## Etapa 5 — F2 parcial: Importação CSV (paralela com Etapa 4)

**Objetivo:** importar posições de XP, BTG e Nomad via CSV com cotação manual para Nomad.

### Arquivos a criar

```
src/
  app/(app)/import/
    page.tsx + actions.ts              ← processCSVImport()
  components/import/
    ImportWizard.tsx                   ← stepper: titular → instituição → upload → cotação → confirmar
    FileDropzone.tsx
    ExchangeRateInput.tsx              ← só visível para Nomad
    ImportPreview.tsx                  ← tabela preview antes de confirmar
    ImportHistory.tsx
  lib/csv/
    index.ts                           ← detectFormat() + parse()
    xp-parser.ts
    btg-parser.ts
    nomad-parser.ts
    types.ts                           ← ParsedPosition
    validators.ts
  __tests__/lib/
    xp-parser.test.ts
    btg-parser.test.ts
    nomad-parser.test.ts
```

### Tipo intermediário `ParsedPosition`

```typescript
interface ParsedPosition {
  ticker: string | null
  name: string
  assetClass: AssetClass
  currency: 'BRL' | 'USD'
  quantity: Decimal        // sempre Decimal, nunca parseFloat()
  avgPrice: Decimal | null
  currentPrice: Decimal | null
  marketValue: Decimal
  maturityDate: Date | null
  indexer: Indexer | null
  indexerRate: Decimal | null
  liquidityDays: number | null
  quotaValue: Decimal | null
  quotaDate: Date | null
  rawData: Record<string, string>
}
```

### Fluxo `processCSVImport` (Server Action)

```
1. Criar import_batch status='processing'
2. Detectar formato + parsear CSV → ParsedPosition[]
3. Validar linhas (erros coletados, não param o processo)
4. Calcular market_value_brl (USD × exchange_rate se Nomad)
5. Calcular pnl, pnl_pct
6. Bulk insert positions
7. Atualizar batch: status='completed', row_count, completed_at
8. revalidatePath('/dashboard') + revalidatePath('/holders')
9. Retornar { success, batchId, rowCount, errors[] }
```

### Critério de aceite

- Upload CSV XP real → parseia corretamente
- Upload CSV BTG real → parseia corretamente
- Upload CSV Nomad real + cotação → converte USD→BRL corretamente
- Linha inválida → não cancela importação, linhas válidas inseridas
- `pnpm test` passa todos os unit tests com fixtures de CSV reais

---

## Etapa 6 — F1: Dashboard de portfólio

**Objetivo:** dashboard completo com visões global, por titular, por instituição e por classe de ativo.

### Arquivos a criar

```
src/
  app/(app)/dashboard/
    page.tsx               ← Server Component, chama getPortfolioSummary()
    loading.tsx            ← skeleton
  components/dashboard/
    PortfolioOverview.tsx
    HolderPortfolioCard.tsx
    PositionsTable.tsx     ← TanStack Table + Virtual (client component)
    AllocationDonut.tsx    ← Recharts
    InstitutionBreakdown.tsx
    DashboardFilters.tsx
    StaleDataBadge.tsx
    LastSyncStatus.tsx
  components/ui/
    MonoNumber.tsx         ← span font-mono para valores numéricos
    PnlValue.tsx           ← verde/vermelho com sinal
```

### Estrutura do dashboard

```
Dashboard (Server Component)
  ├── PortfolioOverview (patrimônio total)
  ├── Tabs: Global | Por Titular | Por Instituição | Por Classe
  │   ├── Global: AllocationDonut + PositionsTable (todas as posições)
  │   ├── Por Titular: HolderPortfolioCard × 4 → /holders/[id]
  │   ├── Por Instituição: InstitutionBreakdown (XP, BTG, Nomad)
  │   └── Por Classe: AllocationDonut + tabela por classe
  └── LastSyncStatus por titular
```

### Tokens de design (`globals.css`)

```css
--color-pnl-positive: oklch(0.72 0.17 142);
--color-pnl-negative: oklch(0.65 0.22 27);
--color-pnl-neutral:  oklch(0.65 0 0);
--font-mono: 'Geist Mono', 'JetBrains Mono', monospace;
--color-alert-info:     oklch(0.65 0.15 245);
--color-alert-warning:  oklch(0.80 0.18 75);
--color-alert-critical: oklch(0.65 0.22 27);
```

### Colunas da `PositionsTable`

Nome · Ticker (mono) · Classe (badge) · Instituição (badge) · Qtd (mono right) · Preço Médio (mono right) · Preço Atual (mono right) · **Valor de Mercado** (mono bold right) · P&L (PnlValue right) · P&L % (PnlValue right) · Venc. (date center) · Liquidez (D+n center)

Funcionalidades: ordenação por coluna numérica, filtro client-side por classe/instituição, virtualização para > 50 posições.

### Critério de aceite

- Dashboard < 3s (Lighthouse)
- Patrimônio total = soma das positions do banco
- Estado vazio → CTA "Importar portfólio"
- Fundos com `quota_date` desatualizado → `StaleDataBadge`

---

## Etapa 7 — F5 parcial: Alertas no dashboard

**Objetivo:** alertas do banco visíveis com badge de não-lido.

### Arquivos a criar

```
src/
  app/(app)/alerts/page.tsx
  components/alerts/
    AlertFeed.tsx
    AlertCard.tsx
    AlertBadgeCounter.tsx    ← badge "N não lidos" no header
    AlertFilters.tsx         ← severidade, titular, período
  lib/data/alerts.ts         ← getUnreadAlerts(), markAsRead(), dismissAlert()
```

### Seed de alertas de exemplo

```sql
insert into public.alerts (severity, title, description, generated_by) values
  ('info', 'Plataforma inicializada',
   'Bem-vindo ao Invest. Importe seu portfólio para começar.', 'system');
```

### Critério de aceite

- Badge no header exibe contagem de não-lidos
- Clicar → marca como lido → badge atualiza
- `CRITICAL`: borda + bg tintado vermelho
- `WARNING`: borda + bg tintado âmbar

---

## Etapa 8 — Testes e2e + hardening

### Arquivos a criar

```
playwright/
  e2e/
    auth.spec.ts
    import.spec.ts
    dashboard.spec.ts
    strategy.spec.ts
    alerts.spec.ts
  fixtures/
    xp-sample.csv
    btg-sample.csv
    nomad-sample.csv
  helpers/auth.ts
```

### RLS audit

Criar dois usuários em dev, inserir dados para cada um, verificar com anon key que nenhum acessa dados do outro.

### Critério de aceite final

- Todos os e2e passam
- RLS audit passa (sem acesso cruzado entre owners)
- Dashboard com dados reais < 3s
- `pnpm build` sem erros TypeScript

---

## Estrutura de pastas final

```
invest/
├── src/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── (auth)/login/, auth/callback/, mfa/enroll/, mfa/verify/
│   │   └── (app)/dashboard/, holders/[holderId]/strategy/, import/, alerts/
│   ├── components/ui/, auth/, dashboard/, holders/, strategy/, import/, alerts/
│   ├── lib/supabase/, data/, csv/
│   ├── hooks/
│   └── types/database.ts, domain.ts
├── supabase/migrations/ (0001–0010), seed.sql, functions/
├── playwright/e2e/, fixtures/, helpers/
├── middleware.ts
└── package.json, tsconfig.json, next.config.ts, tailwind.config.ts, components.json, vitest.config.ts, playwright.config.ts
```

---

## Dependências entre etapas

```
0 (scaffold)
└── 1 (schema SQL + RLS)
      └── 2 (auth)
            └── 3 (tipos + camada de dados)
                  ├── 4 (estratégia)  ─┐
                  └── 5 (CSV import)  ─┤ paralelas
                                        ▼
                                   6 (dashboard)
                                        └── 7 (alertas)
                                              └── 8 (testes + hardening)
```

---

## Riscos

| Risco | Mitigação |
|---|---|
| Formato CSV de XP/BTG muda | Parser detecta via headers; erro claro "formato não reconhecido" |
| Valores USD com perda de precisão | Parsers: string → Decimal.js, nunca parseFloat() |
| RLS policy incorreta | Teste automatizado de isolamento na Etapa 8 |
| MFA enforcement exige config específica no Supabase | Testar local antes de produção |
| `supabase gen types` desatualizado | Adicionar como step do CI |

---

## Observações críticas de implementação

1. **Nunca `number` para valores financeiros.** Colunas `NUMERIC` chegam como `string` via supabase-js. Sempre `new Decimal(value)`.

2. **`import_batches` como fonte de verdade.** O dashboard lê sempre o batch mais recente com `status = 'completed'` por `(holder_id, institution)`. Sem tabela de "posição atual".

3. **Auth callback com PKCE.** Em App Router: `/auth/callback/route.ts` chama `supabase.auth.exchangeCodeForSession(code)` com o `code` da query string.

4. **Seed em produção.** `seed.sql` é só para dev local. Em produção, Rodrigo roda um script one-time via CLI após criar a conta para inserir os 4 titulares com o `auth.uid()` real.

5. **Server Actions com revalidação.** Após qualquer mutation, chamar `revalidatePath('/dashboard')` + `revalidatePath('/holders')` para Next.js limpar o cache.

6. **`isStaleQuota`.** Lógica em `src/lib/dates.ts`: se `quota_date < hoje - 1 dia útil`, o fundo tem cota desatualizada → exibir `StaleDataBadge`.
