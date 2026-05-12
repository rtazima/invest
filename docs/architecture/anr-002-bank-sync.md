# ANR-002 — Sincronização bancária: Pluggy + Plaid + CSV

**Status:** aprovado  
**Data:** 2026-05-11  
**Autor:** Rodrigo Tazima

---

## Decisão

Usar Pluggy para XP e BTG (Open Finance Brasil), Plaid para Nomad (Open Banking EUA), e CSV import como fallback universal.

---

## Contexto

XP, BTG e Nomad não têm APIs públicas diretas para clientes pessoa física. O acesso aos dados de portfólio precisa passar por um agregador financeiro regulado ou por exportação manual.

---

## Opções de integração por instituição

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
| Plaid API | Média | Nomad suporta Plaid. Requer aprovação de conta Plaid Development/Production. |
| CSV manual | Alta | Nomad exporta extrato CSV facilmente |
| Open Finance EUA | N/A | Não aplicável para conta estrangeira no Brasil |

**Escolha: CSV manual no MVP. Integrar Plaid na Fase 2 se o processo de aprovação for viável.**

---

## Pluggy — decisão de detalhe

**Por que Pluggy e não Belvo ou Open Finance direto?**

- Belvo: bom produto, mas foco maior em crédito/banking. Cobertura de investimentos no Brasil é menor que Pluggy.
- Open Finance direto (Banco Central): possível, mas requer cadastro de instituição participante — inviável para uso pessoal.
- Pluggy: foco em investimentos, suporte a XP e BTG confirmado, SDK bem documentado, usado por fintechs brasileiras de referência.

**Limitações do Pluggy:**
- Rate limit: 1 requisição/segundo por item (conta conectada). Com 5 itens (Rodrigo XP, Rodrigo BTG, Esposa XP, Esposa BTG, Filhos XP), sync sequencial leva ~5s mínimo — aceitável.
- Consent tem validade (geralmente 12 meses). Re-autenticação via redirect OAuth — o app precisa tratar graciosamente.
- Custo por item conectado — ver ANR-001 para estimativa.

---

## Modelo de dados do sync

```
sync_jobs
  id, titular_id, institution, status, started_at, finished_at, error

portfolio_snapshots
  id, titular_id, institution, synced_at, raw_data (JSONB)

positions
  id, snapshot_id, ticker, name, quantity, avg_price, current_price,
  asset_class, maturity_date, indexer, liquidity_days, currency
```

Snapshot salva o raw da API para auditoria. Posições são derivadas do raw.

---

## Tratamento de falhas

| Falha | Comportamento |
|---|---|
| Consent expirado | Notificação ao usuário, dashboard mostra última posição com timestamp |
| Rate limit atingido | Retry com exponential backoff, máx 3 tentativas |
| Timeout da API Pluggy | Log de erro, continua com outras contas |
| Conta com MFA pendente | Notificação, não bloqueia outras contas |
| Plaid indisponível | Usa último CSV importado como referência |

---

## Segurança

- Tokens Pluggy e Plaid nunca vão para o frontend
- Armazenados como secrets no Supabase (env vars de Edge Functions) e na VM GCP
- Raw data do portfólio armazenado com RLS por titular — nenhum registro cruzado entre titulares
- Logs de sync não incluem valores ou tickers em plaintext

---

## Consequências

- Precisamos de conta Pluggy (plano pago) antes da Fase 2
- Plaid requer processo de aprovação (pode levar semanas) — iniciar cedo se quiser para Nomad
- CSV import precisa de parsers para os formatos específicos de XP, BTG e Nomad (documentar em `docs/runbooks/csv-import.md`)
- Webhook Pluggy (push de eventos) é uma melhoria futura — reduz latência do sync

---

## Revisão

Verificar cobertura exata do Pluggy para XP (tipos de produto: ações, FIIs, fundos, renda fixa) antes de contratar.
