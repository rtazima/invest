# ANR-003 — Tech stack: Next.js 15 + Supabase + Claude API

**Status:** aprovado  
**Data:** 2026-05-11  
**Autor:** Rodrigo Tazima

---

## Decisão

Next.js 15 (App Router) para o frontend, Supabase para banco/auth/Edge Functions, Claude API para os agentes, TypeScript strict em tudo.

---

## Contexto

Projeto pessoal, sem equipe — precisa de stack produtiva para um desenvolvedor. Rodrigo já tem experiência com esse conjunto (padrão do ecossistema cøntextTrust). Reutilizar conhecimento e padrões reduz tempo de setup e manutenção.

---

## Frontend: Next.js 15 + shadcn/ui

**Por quê:**
- App Router com Server Components reduz JavaScript no browser — importante para um dashboard com muitos dados
- Vercel deploy é trivial com Next.js
- shadcn/ui + Tailwind: componentes de qualidade sem overhead de design system customizado
- Recharts (ou tremor) para os gráficos de portfólio

**Alternativas descartadas:**
- Remix: boa opção, mas menos familiar e menos integrado com Vercel
- Vite + React SPA: sem SSR, SEO não importa para uso privado, mas perco Server Components e o pattern de cache do Next.js é útil para dados de portfólio

---

## Backend: Supabase Edge Functions

**Por quê:**
- Edge Functions (Deno/TypeScript) para APIs REST do produto
- PostgreSQL com RLS garante isolamento de dados por titular na camada de banco
- Auth nativo com magic link + MFA — não preciso implementar autenticação
- Supabase Realtime para atualização do dashboard quando sync termina

**Alternativas descartadas:**
- Express/Hono na VM GCP: possível, mas adiciona infra para gerenciar
- Next.js API Routes para tudo: funciona para APIs simples, mas jobs longos (sync, agente) precisam rodar fora do serverless

---

## Jobs agendados: scripts Node/Python na VM GCP

**Por quê:**
- Sync bancário e agente de monitoramento podem demorar mais de 30s
- Serverless tem timeout — VM não tem
- Amaia já existe — custo marginal zero

**Stack dos jobs:**
- Node.js + TypeScript (mesma linguagem do restante) ou Python
- Chama Pluggy/Plaid APIs → normaliza → upserta no Supabase via REST API
- Chama Claude API para o agente de monitoramento
- crontab ou systemd timer para agendamento

---

## Banco de dados: PostgreSQL via Supabase

**Modelo de decisão para tipos financeiros:**
- Valores monetários: `NUMERIC(18,4)` — nunca `FLOAT` (perde precisão)
- Datas: `TIMESTAMPTZ` com timezone explícito
- Percentuais: `NUMERIC(8,4)` (ex. 0.1250 = 12.50%)
- JSON de dados brutos da API: `JSONB` com índice GIN

**Extensões habilitadas:**
- `pgcrypto` para UUIDs
- `pg_stat_statements` para performance monitoring

---

## AI: Claude API

| Agente | Modelo | Razão |
|---|---|---|
| Monitoring agent | claude-sonnet-4-5 | Roda 2x/dia, custo importa, tarefa estruturada |
| Recommendation agent | claude-opus-4-5 | Raciocínio complexo, decisão financeira, roda on-demand |
| Allocation agent | claude-opus-4-5 | Idem |

Prompt caching habilitado para contexto de estratégia dos titulares (cache de até 1h).

---

## Testes

- **Unit:** Vitest (rápido, TypeScript nativo)
- **Integration:** Supabase local (supabase start) para testar queries e RLS
- **E2E:** Playwright (fluxo de login, visualização de portfólio, geração de recomendação)
- **Agentes:** evals com dataset de alertas históricos (fase futura)

---

## Consequências

- TypeScript strict: sem `any`, sem variáveis financeiras como `number` puro — usar `Decimal.js` ou trabalhar com `bigint` + centavos onde precisão crítica
- Migrations do Supabase versionadas em `supabase/migrations/`
- Edge Functions novas sempre têm runbook em `docs/runbooks/`
- Recharts ou Tremor para gráficos — decidir na Fase 1 (MVP)
