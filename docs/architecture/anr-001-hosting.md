# ANR-001 — Hosting: Vercel + GCP VM (Amaia) + Supabase

**Status:** aprovado  
**Data:** 2026-05-11  
**Autor:** Rodrigo Tazima

---

## Decisão

Frontend no Vercel, banco de dados e autenticação no Supabase, jobs agendados na VM GCP já existente (Amaia).

---

## Contexto

Rodrigo já tem uma VM GCP chamada Amaia rodando outros serviços. A pergunta foi: dá pra usar a mesma máquina? E dá pra usar Vercel também?

As três partes da plataforma têm necessidades diferentes:

- **Frontend**: deploy frequente, CDN global, preview por PR — Vercel é o fit natural
- **Banco de dados + Auth**: precisa ser managed, seguro, com RLS — Supabase resolve
- **Jobs agendados** (sync bancário, agente de monitoramento 2x/dia): precisam rodar em background, sem timeout de função serverless — VM GCP é o lugar certo

---

## Alternativas consideradas

### Opção A — Tudo no Vercel (serverless)
**Prós:** simples, sem infra pra gerenciar  
**Contras:** funções serverless têm timeout de 30s (Hobby) ou 300s (Pro). O agente de monitoramento pode demorar mais. Além disso, cron jobs no Vercel custam mais e são menos flexíveis que um cron numa VM.  
**Descartado.**

### Opção B — Tudo na VM GCP
**Prós:** total controle, um lugar só  
**Contras:** precisa configurar HTTPS, nginx, CI/CD manualmente. Frontend sem CDN. Muito overhead operacional para um projeto pessoal.  
**Descartado.**

### Opção C — Vercel + Supabase + GCP VM (escolhida)
**Prós:**
- Vercel: deploy automático do GitHub, CDN, preview PRs gratuitos — zero overhead de infra para o frontend
- Supabase: banco gerenciado, RLS nativo, Auth pronto, Edge Functions para APIs simples
- GCP VM (Amaia): cron jobs sem timeout, reutiliza infraestrutura já paga e configurada

**Contras:**
- Três sistemas para monitorar (aceitável, todos são managed/semi-managed)
- Latência adicional se Edge Function e VM precisarem conversar (minimizar com chamadas diretas ao Supabase)

---

## Arquitetura resultante

```
[Browser]
    ↓ HTTPS
[Vercel — Next.js 15]
    ↓ API calls
[Supabase Edge Functions — APIs do produto]
    ↓ PostgreSQL com RLS
[Supabase PostgreSQL]

[GCP VM — Amaia] (jobs agendados via cron)
    → Sync bancário (Pluggy/Plaid) → Supabase
    → Agente de monitoramento → Supabase (alertas)
    → Executa às 7h (sync) e 8h/18h (monitoramento)
```

---

## Custos estimados (mês)

| Serviço | Plano | Custo |
|---|---|---|
| Vercel | Hobby (gratuito) ou Pro se precisar de cron | $0–$20 |
| Supabase | Free tier ou Pro | $0–$25 |
| GCP VM (Amaia) | Já existe — custo marginal zero | $0 |
| Pluggy | Plano pago por item conectado | ~$30–$60 |
| Plaid (Nomad) | Development tier grátis | $0 |
| Claude API | Uso estimado leve | ~$10–$30 |
| **Total** | | **~$40–$135/mês** |

---

## Consequências

- Precisamos de um serviço de cron na VM Amaia (systemd timer ou crontab) para chamar as Edge Functions ou scripts Python/Node
- Secrets de API (Pluggy, Plaid, Anthropic) ficam em variáveis de ambiente da VM e do Supabase, nunca no código
- CI/CD: GitHub Actions → Vercel (frontend) e GitHub Actions → Supabase (migrations)
- Monitorar uptime da VM Amaia — se cair, o sync e o agente param

---

## Revisão

Revisar se Supabase Pro for necessário (RLS, storage de imagens de statements, etc.).
