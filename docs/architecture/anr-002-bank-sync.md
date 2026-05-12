# ANR-002 — Sincronização bancária: Pluggy + Plaid + CSV

**Status:** aprovado (atualizado 2026-05-11)  
**Data:** 2026-05-11  
**Autor:** Rodrigo Tazima

---

## Decisão

Usar Pluggy para XP e BTG (Open Finance Brasil), Plaid para Nomad (integração direta desde a Fase 2), e CSV import como fallback universal.

---

## Contexto

XP, BTG e Nomad não têm APIs públicas diretas para clientes pessoa física. O acesso a dados de portfólio precisa passar por um agregador financeiro regulado ou por exportação manual.

---

## Integração por instituição

### XP Investimentos

| Opção | Viabilidade | Observações |
|---|---|---|
| Pluggy API | Alta | XP participa do Open Finance Brasil. Pluggy é agregador homologado. |
| Screen scraping | Baixa | Viola ToS, frágil, risco de bloqueio de conta |
| CSV manual | Sempre disponível | Fallback confiável, XP exporta extratos em CSV/PDF |

**Escolha: Pluggy como primário, CSV como fallback.**

### BTG Pactual

| Opção | Viabilidade | Observações |
|---|---|---|
| Pluggy API | Alta | BTG participa do Open Finance Brasil |
| CSV manual | Sempre disponível | BTG exporta posição consolidada |

**Escolha: Pluggy como primário, CSV como fallback.**

### Nomad (banco americano)

| Opção | Viabilidade | Observações |
|---|---|---|
| Plaid API | Alta | Nomad suporta Plaid. Requer aprovação de conta Development → Production. |
| CSV manual | Alta | Nomad exporta extrato CSV facilmente — usado como fallback |

**Escolha: Plaid integrado desde a Fase 2 (junto com Pluggy). CSV como fallback.**

**Ação imediata:** iniciar processo de aprovação da conta Plaid Production assim que o MVP estiver funcionando — o processo de revisão leva 1–4 semanas.

---

## Câmbio USD/BRL

A cotação é inserida manualmente pelo usuário no momento do aporte, consultando Nomad ou Avenue. Não há API de câmbio automática — decisão intencional para refletir a taxa real utilizada na operação.

O campo de câmbio aparece em:
- Tela de importação CSV (Nomad)
- Tela de novo aporte em conta internacional
- Posições em USD exibidas com a cotação do último aporte registrado + nota de que pode estar desatualizada

---

## Pluggy — detalhes

**Por que Pluggy e não Belvo ou Open Finance direto?**

- Belvo: foco maior em crédito/banking, cobertura de investimentos no Brasil menor que Pluggy
- Open Finance direto (BCB): requer cadastro de instituição participante — inviável para uso pessoal
- Pluggy: foco em investimentos, suporte a XP e BTG confirmado, SDK TypeScript bem documentado

**Limitações do Pluggy:**
- Rate limit: 1 req/s por item. Com 5 itens (Rodrigo XP, Rodrigo BTG, Grasi XP, Grasi BTG, Filhos XP), sync sequencial leva ~5s mínimo — aceitável.
- Consent com validade (~12 meses). Re-autenticação via redirect OAuth — tratar expiração graciosamente.
- Custo por item conectado (ver ANR-001).

---

## Modelo de dados do sync

```sql
sync_jobs
  id, titular_id, institution, status, started_at, finished_at, error

portfolio_snapshots
  id, titular_id, institution, synced_at, raw_data JSONB

positions
  id, snapshot_id, ticker, name, quantity,
  avg_price NUMERIC(18,4), current_price NUMERIC(18,4),
  asset_class, maturity_date, indexer, liquidity_days,
  currency, exchange_rate_used NUMERIC(10,6)

exchange_rate_entries
  id, titular_id, currency_pair, rate NUMERIC(10,6),
  source, registered_at, registered_by
```

`exchange_rate_entries` registra cada cotação informada manualmente pelo usuário.

---

## Tratamento de falhas

| Falha | Comportamento |
|---|---|
| Consent expirado | Notificação ao usuário, dashboard mostra última posição com timestamp |
| Rate limit Pluggy | Retry com exponential backoff, máx 3 tentativas |
| Timeout API Pluggy/Plaid | Log de erro, continua com outras contas |
| Conta com MFA pendente | Notificação, não bloqueia outras contas |
| Plaid indisponível | Usa último CSV importado como referência, alerta info |

---

## Segurança

- Tokens Pluggy e Plaid nunca vão para o frontend
- Armazenados como secrets no Supabase (Edge Functions env) e na VM GCP
- Raw data com RLS por titular — sem acesso cruzado entre titulares
- Logs de sync sem valores ou tickers em plaintext

---

## Consequências

- Abrir conta Pluggy (plano pago) antes de iniciar a Fase 2
- Iniciar aprovação Plaid Production assim que MVP estiver no ar
- CSV parsers para XP, BTG e Nomad documentados em `docs/runbooks/csv-import.md`
- Tela de importação CSV deve incluir campo de câmbio para posições Nomad
- Webhook Pluggy (push de eventos) é melhoria futura para reduzir latência do sync

---

## Revisão

Verificar cobertura exata do Pluggy para XP antes de contratar (ações, FIIs, fundos, renda fixa — todos precisam estar cobertos).
