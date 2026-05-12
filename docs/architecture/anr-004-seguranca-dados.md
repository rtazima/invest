# ANR-004 — Segurança e privacidade de dados financeiros

**Status:** aprovado  
**Data:** 2026-05-11  
**Autor:** Rodrigo Tazima

---

## Decisão

Isolamento por titular via RLS no Supabase, sem dados financeiros em logs, MFA obrigatório, tokens de API nunca no cliente.

---

## Contexto

A plataforma armazena dados financeiros sensíveis de três titulares, incluindo menores de idade. Mesmo sendo uso pessoal, os riscos de vazamento ou acesso não autorizado são altos: valores de patrimônio, estratégias de investimento, e dados de contas bancárias.

---

## Princípios

**1. Dados financeiros nunca em logs**
- Valores, tickers e nomes de produtos não aparecem em logs de aplicação
- Logs registram eventos (sync_started, sync_failed, alert_generated) sem payload financeiro
- Stack traces de erro nunca incluem valores de portfólio

**2. Isolamento por titular (Row Level Security)**
- Toda tabela com dados financeiros tem RLS habilitado no Supabase
- Usuário autenticado só acessa registros dos titulares que gerencia
- Nenhuma query cruzada entre titulares sem policy explícita
- Service role (usado pelos jobs na VM) tem acesso total — proteger a service key como secret crítico

**3. Autenticação forte**
- Magic link por email (sem senha) + MFA obrigatório
- Sessão expira em 24h
- Tokens de Pluggy, Plaid e Anthropic ficam somente no servidor (Edge Functions e VM)
- Frontend nunca recebe tokens de API de terceiros

**4. Dados de menores (LGPD)**
- Contas dos filhos são associadas ao titular pai (Rodrigo)
- Nenhum dado de menor é compartilhado ou exposto separadamente
- Consentimento parental é implícito (Rodrigo é o responsável e o único usuário)
- Documentar essa decisão em `docs/specs/compliance/lgpd.md`

**5. Secrets management**
- Supabase: secrets via `supabase secrets set` (nunca em código)
- VM GCP: variáveis de ambiente via arquivo `.env` protegido (chmod 600)
- GitHub: secrets do repositório para CI/CD (Vercel deploy key, Supabase access token)
- Rotação semestral de todos os tokens de API

---

## Modelo de ameaças (resumido)

| Ameaça | Mitigação |
|---|---|
| Acesso não autorizado ao dashboard | MFA + sessão de 24h |
| Vazamento de service key do Supabase | Key só na VM e nos secrets do Supabase, nunca no código |
| Dados de portfólio em logs | Policy de código: sem valores em logs |
| Token Pluggy/Plaid comprometido | Tokens rotacionados semestralmente, revogar imediatamente se suspeita |
| VM GCP comprometida | Service key pode ser revogada no Supabase, acesso SSH apenas por chave |
| Dados em transit | HTTPS obrigatório em todas as rotas (Vercel e Supabase forçam) |

---

## O que não cobre

- Auditoria de segurança formal (não necessária para uso pessoal)
- Pen test externo
- SOC 2 / ISO 27001 (irrelevante para uso privado)

---

## Consequências

- RLS policies precisam de testes específicos (`supabase test` com roles distintos)
- Qualquer Edge Function nova precisa ser revisada: ela usa service role ou anon key?
- Nunca passar valores financeiros como query params de URL (ficam em logs de servidor)
- `docs/specs/compliance/lgpd.md` deve ser criado antes da Fase 2
