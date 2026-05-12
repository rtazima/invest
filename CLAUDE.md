# Invest — Plataforma de gestão de investimentos familiar

## Projeto

Plataforma de gestão de investimentos multi-conta e multi-titular (Rodrigo, esposa e filhos), com sincronização automática de portfólio via Pluggy (XP, BTG) e Plaid/CSV (Nomad), agente de monitoramento 2x/dia, recomendações de alocação via Claude e dashboard de acompanhamento patrimonial.

Ver `docs/product/vision.md` para a visão completa.
Ver `docs/product/prd-invest.md` para o PRD principal.

## Titulares e contas

| Titular | Corretoras/Bancos |
|---|---|
| Rodrigo | XP, BTG, Nomad |
| Esposa | XP, BTG |
| Filhos | XP |

Cada titular tem estratégia independente configurada em `docs/product/estrategias-por-titular.md`.

## Tech Stack

- Frontend: Next.js 15 + Tailwind + shadcn/ui (App Router)
- Backend/API: Supabase Edge Functions (Deno/TypeScript)
- Banco de dados: Supabase PostgreSQL
- Auth: Supabase Auth (magic link + MFA)
- AI: Claude API (Anthropic) — modelos por agente definidos abaixo
- Sync bancário: Pluggy API (XP, BTG) + Plaid API (Nomad) + CSV import (fallback)
- Scheduler: cron na VM GCP (Amaia) — 2x/dia para o agente de monitoramento
- Deploy frontend: Vercel
- Deploy backend: Supabase + GCP VM (Amaia) para jobs scheduled
- Testes: Vitest (unit) + Playwright (e2e)
- Package manager: pnpm

## Arquitetura de pastas

```
src/
  app/              ← Next.js App Router (páginas e layouts)
  components/       ← componentes React (shadcn + customizados)
  agents/           ← agentes Claude (monitoring, recommendation, allocation)
  lib/
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

## Agentes Claude

| Agente | Arquivo | Modelo | Frequência |
|---|---|---|---|
| `monitoring-agent` | `.claude/agents/monitoring-agent.md` | sonnet | 2x/dia (8h e 18h) |
| `recommendation-agent` | `.claude/agents/recommendation-agent.md` | opus | on-demand |
| `allocation-agent` | `.claude/agents/allocation-agent.md` | opus | on-demand |
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
| Sync bancário via Pluggy + Plaid | ANR-002 | aprovado |
| Tech stack Next.js 15 + Supabase | ANR-003 | aprovado |
| Dados financeiros isolados por tenant | ANR-004 | aprovado |
| Agente de monitoramento 2x/dia via cron GCP | ANR-005 | aprovado |

## Gotchas

- Pluggy tem rate limit de 1 req/seg por item. Sync de múltiplas contas precisa de fila.
- XP e BTG às vezes exigem re-autenticação MFA — tratar expiração de consent graciosamente.
- Nomad é banco americano — valores em USD, converter com cotação do dia (API BCB ou OpenExchangeRates).
- Dados de menores (filhos) exigem atenção extra de LGPD — consentimento parental documentado.
- Tesouro Direto: preços intraday variam, valor de mercado diverge do valor investido — deixar claro no UI.
- Fundos de investimento têm cota D+1 ou D+2 — não mostrar valor de hoje como definitivo.

## Memória (L4)

- Index: `python memory/index.py`
- Busca: `python memory/query.py "query"`
- Incremental: `python memory/index.py --incremental`
- Config: `memory/config.yaml`
