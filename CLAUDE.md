# Invest — Plataforma de gestão de investimentos familiar

## Projeto

Plataforma de gestão de investimentos multi-conta e multi-titular (Rodrigo, esposa e filhos), com importação de portfólio por relatório das corretoras (XLSX da XP/BTG, PDF do Nomad, CSV), agente de monitoramento 2x/dia, recomendações de alocação via Claude e dashboard de acompanhamento patrimonial.

Ver `docs/product/vision.md` para a visão completa.
Ver `docs/product/prd-invest.md` para o PRD principal.

## Titulares e contas

| Titular | Corretoras/Bancos | Perfil | Obs |
|---|---|---|---|
| Rodrigo | XP, BTG, Nomad | Arrojado | Conta USD no Nomad |
| Grasi (esposa) | XP, BTG | Conservador | Liquidez máx 30 dias |
| Amora (filha, 6 anos) | XP | Moderado/arrojado | Meta: R$12k/mês renda passiva aos 18 |
| Benicio (filho, 1 ano) | XP | Arrojado | Mesma meta da Amora, 17 anos de horizonte |

Estratégias detalhadas em `docs/product/estrategias-por-titular.md`.

## Tech Stack

- Frontend: Next.js 15 + Tailwind + shadcn/ui (App Router)
- Backend/API: Supabase Edge Functions (Deno/TypeScript)
- Banco de dados: Supabase PostgreSQL
- Auth: Supabase Auth (magic link + MFA)
- AI: Claude API (Anthropic) — modelos por agente definidos abaixo
- Importação de portfólio: relatórios das corretoras (XLSX da XP/BTG, PDF do Nomad, CSV). Pluggy foi descartado (não fechamos contrato) — cliente e UI ficam dormentes atrás da flag `PLUGGY_ENABLED`. Plaid (Nomad) permanece previsto.
- Notificações: Evolution API (WhatsApp, self-hosted na VM GCP) + email como fallback
- Câmbio USD/BRL: inserção manual pelo usuário (cotação Nomad/Avenue)
- Scheduler: cron na VM GCP (Amaia) — 2x/dia para o agente de monitoramento
- Deploy frontend: Vercel
- Deploy backend: Supabase + GCP VM (Amaia) para jobs scheduled
- Testes: Vitest (unit) + Playwright (e2e)
- Package manager: pnpm

## Arquitetura de pastas

```
src/
  app/
    (app)/
      dashboard/    ← dashboard principal (4 tabs: global, titular, instituição, classe)
      alerts/       ← página de alertas + Server Actions (markRead, dismiss)
      import/       ← wizard de importação CSV + Server Action processCSVImport
      holders/
        [holderId]/
          strategy/ ← editor de estratégia por titular + Server Actions
  components/
    ui/
      Sidebar.tsx       ← sidebar fixa 56px com nav + badge de alertas
      AppHeader.tsx     ← breadcrumb + status dots de sync por instituição
      PnlValue.tsx      ← valor P&L com cor gain/loss + símbolo U+2212
    dashboard/
      types.ts          ← interfaces serializáveis (ClientPortfolioSummary etc.)
      DashboardView.tsx ← orquestrador client-side (tabs + hero + alertas)
      PortfolioHeroCard.tsx ← card hero com period switcher + SVG line chart
      HolderCard.tsx    ← card por titular com sparkline SVG
      AllocationDonut.tsx   ← donut SVG com hover expand por segmento
      PositionsTable.tsx    ← tabela de posições com sort/filter client-side
      TabByHolder.tsx       ← tab por titular
      TabByInstitution.tsx  ← tab por instituição com sync status
      TabByClass.tsx        ← tab por classe de ativo
      AlertsPanel.tsx       ← painel lateral de alertas com dismiss
    alerts/
      AlertCard.tsx     ← card de alerta com severity + dismiss handler
      AlertFilters.tsx  ← filtros URL-based por severity/status
    import/
      ImportWizard.tsx  ← wizard 4 etapas: titular → instituição → arquivo → confirmar
    strategy/
      RiskProfileBadge.tsx  ← badge colorido por perfil de risco
      AllocationEditor.tsx  ← tabela editável de alocações (soma = 100%)
      StrategyPanel.tsx     ← painel combinado perfil + alocações
  agents/           ← agentes Claude (monitoring, recommendation, allocation)
  lib/
    csv/
      types.ts      ← ParsedPosition, ParseError, ParseResult, CsvFormat
      validators.ts ← parseDecimalBR/US, parseDateBR/US, parsePct, validatePositions
      xp-parser.ts  ← parser CSV XP (sep auto-detect, assets, indexadores, liquidez)
      btg-parser.ts ← parser CSV BTG
      nomad-parser.ts ← parser CSV Nomad (USD, exchangeRate: Decimal)
      index.ts      ← detectFormat() + parseCSV() orquestrador
    data/
      sync.ts       ← getInstitutionSyncStatuses() — ok/warn/never por instituição
    pluggy/         ← cliente Pluggy API
    plaid/          ← cliente Plaid API (Nomad)
    supabase/       ← cliente Supabase (browser + server)
    claude/         ← utilitários Claude API
  hooks/            ← React hooks
  types/            ← TypeScript types compartilhados
supabase/
  functions/        ← Edge Functions (sync, alerts, recommendations)
  migrations/       ← migrações SQL
docs/
  product/          ← PRDs, personas, roadmap, estratégias
  architecture/     ← ANRs (Architecture Decision Records)
  specs/            ← módulos de especificação
  runbooks/         ← deploy, debug, post-mortems
.claude/
  agents/           ← agentes especializados
  skills/           ← skills do projeto
  commands/         ← slash commands
memory/             ← vetor DB (ChromaDB)
scripts/            ← bootstrap, pre-commit, ci
```

## Módulos habilitados

- [x] `security/` → Dados financeiros pessoais — alta prioridade
- [x] `compliance/` → LGPD (dados de menores incluídos)
- [x] `observability/` → Monitoramento de jobs e agentes
- [x] `data-architecture/` → Modelagem de portfólio + série histórica
- [x] `api/` → API interna + webhooks Pluggy
- [x] `ai-ml/` → Agentes Claude, prompts, evals
- [x] `long-term-memory/` → Histórico de recomendações e aprendizado
- [x] `devops/` → CI/CD Vercel + GCP

## Agentes de produção (src/app/api/agents/)

Rodam via cron GCP (Amaia) e via API protegida por `AGENT_SECRET`. Ver `docs/runbooks/agents.md`.

| Agente | Rota | Modelo | Frequência |
|---|---|---|---|
| `strategy-check` | `/api/agents/strategy-check` | Supabase direto | 2×/dia (8h e 18h) |
| `news-monitoring` | `/api/agents/news-monitoring` | Claude Haiku | 2×/dia (8h e 18h) |
| `fundamental-analysis` | `/api/agents/fundamental-analysis` | Claude Opus 4.7 | 1×/mês |

## Agentes Claude Code (.claude/agents/)

Usados durante o desenvolvimento via Claude Code. Não são agentes de produção.

| Agente | Arquivo | Modelo | Quando usar |
|---|---|---|---|
| `security-auditor` | `.claude/agents/security-auditor.md` | opus | a cada commit |
| `compliance-auditor` | `.claude/agents/compliance-auditor.md` | opus | semanal |
| `quality-guardian` | `.claude/agents/quality-guardian.md` | sonnet | a cada commit |
| `performance-auditor` | `.claude/agents/performance-auditor.md` | sonnet | semanal |

## Comandos do dia a dia

- `pnpm dev` → servidor local (localhost:3000)
- `pnpm test` → Vitest
- `pnpm test:e2e` → Playwright
- `pnpm lint` → ESLint + Prettier
- `pnpm build` → build de produção
- `supabase functions serve` → Edge Functions local
- `python memory/query.py "query"` → busca semântica

### Slash commands

- `/implement <PRD>` → implementa feature a partir do PRD
- `/ralph <PRD>` → modo persistência — não para até os critérios passarem
- `/debug <erro|arquivo>` → debug sistemático
- `/refactor <arquivo|módulo>` → refatoração segura
- `/spec-review <path>` → auditoria com agentes (security + compliance + quality + performance)
- `/memory <search|index|stats>` → operações de memória longa

## Convenções de código

- TypeScript strict mode — sem `any`
- Commits: Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`)
- Commit body: inclua `Não alterou:` listando arquivos intencionalmente não modificados
- Branches: `feature/`, `fix/`, `docs/`, `refactor/`
- PRs: sempre com descrição, referência ao PRD/ANR quando aplicável
- Variáveis financeiras: sempre `Decimal` / `bigint` — nunca `float`
- Datas: sempre `Date` com timezone explícito (America/Sao_Paulo ou UTC, nunca ambíguo)

## Regras de workflow

- Nunca commitar secrets ou tokens de API
- Toda mudança que afeta produto → atualizar `docs/`
- Dados financeiros nunca vão para logs em plaintext
- Testes antes de commitar (pnpm test)
- Edge Functions novas → runbook em `docs/runbooks/`

## Decisões trancadas (ver ANRs)

| Decisão | ANR | Status |
|---|---|---|
| Hosting: Vercel + GCP VM + Supabase | ANR-001 | aprovado |
| Sync bancário via Pluggy + Plaid (Nomad direto) | ANR-002 | Pluggy descartado (não fechamos contrato); import por relatório é a fonte |
| Tech stack Next.js 15 + Supabase | ANR-003 | aprovado |
| Dados financeiros isolados por tenant | ANR-004 | aprovado |
| Agente de monitoramento 2x/dia via cron GCP | ANR-005 | aprovado |
| Notificações WhatsApp via Evolution API | ANR-006 | aprovado |
| Design system via Claude Design | ANR-007 | aprovado |

## Gotchas

- Pluggy foi descartado (não fechamos contrato). Import de XP/BTG é por relatório (XLSX). Código do Pluggy fica dormente atrás da flag `PLUGGY_ENABLED` — ver `docs/runbooks/pluggy-mapeamento.md`.
- Nomad é banco americano — valores em USD. Câmbio inserido manualmente pelo usuário (cotação Nomad/Avenue). Sem API de câmbio automática.
- Dados de menores (filhos) exigem atenção extra de LGPD — consentimento parental documentado.
- Tesouro Direto: preços intraday variam, valor de mercado diverge do valor investido — deixar claro no UI.
- Fundos de investimento têm cota D+1 ou D+2 — não mostrar valor de hoje como definitivo.
- Gráficos (donut, sparkline, line chart) são SVG puro — sem Recharts. Demo data hard-coded em PortfolioHeroCard e HolderCard até série histórica estar no banco.
- Decimal nunca passa direto como prop para Client Components — converter para `number` no Server Component antes de serializar (ver `dashboard/page.tsx`).

## Memória (L4)

- Index: `python memory/index.py`
- Busca: `python memory/query.py "query"`
- Incremental: `python memory/index.py --incremental`
- Config: `memory/config.yaml`

## Design

Design flow: **Claude Design** (ver ANR-007)

- Gerar PROMPT.md antes de implementar qualquer tela: `pnpm tsx scripts/generate-design.ts --screen <tela>`
- Gerar todas as telas de uma vez: `pnpm tsx scripts/generate-design.ts --all`
- Salvo automaticamente em `docs/design/<slug>-PROMPT.md`
- `/implement` detecta o PROMPT.md automaticamente
- Conflito: PRD > CLAUDE.md > PROMPT.md (PROMPT.md nunca sobrescreve decisões de produto)
- Componentes-base: shadcn/ui + Tailwind v4, gráficos com Recharts, tabelas com TanStack Table
- Dark mode como padrão; números negativos em vermelho, positivos em verde, monoespaçado em colunas financeiras
