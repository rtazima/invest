# ANR-006 — Notificações: WhatsApp via Evolution API

**Status:** aprovado  
**Data:** 2026-05-11  
**Autor:** Rodrigo Tazima

---

## Decisão

Notificações push via WhatsApp usando Evolution API (self-hosted na VM GCP), com fallback para email. Alertas `WARNING` e `CRITICAL` chegam no WhatsApp de Rodrigo.

---

## Contexto

O requisito é receber alertas do agente de monitoramento no WhatsApp. Existem duas categorias de solução:

**Soluções oficiais (Meta/WhatsApp Business API):**
- Exigem conta WhatsApp Business verificada
- Processo de aprovação de template de mensagem burocrático
- Custo por mensagem após cota gratuita
- Twilio: revendedor da API oficial, mais fácil de configurar mas cobra por mensagem

**Soluções não-oficiais (baseadas em WhatsApp Web):**
- Evolution API: open source, muito usada no Brasil, self-hosted
- Z-API: similar, SaaS, ~R$30/mês
- WPPConnect: open source, similar ao Evolution API

Para uso pessoal e volume baixo (~2 alertas/dia), a solução oficial é overkill. Evolution API é o padrão adotado pela comunidade brasileira para automação pessoal.

---

## Alternativas consideradas

| Opção | Prós | Contras | Decisão |
|---|---|---|---|
| Meta Cloud API (oficial) | Estável, sem risco de ban | Aprovação burocrática, templates rígidos, custo por msg | Descartado para MVP |
| Twilio WhatsApp | Fácil de configurar, sandbox disponível | ~$0.05/msg, ainda precisa de business number | Backup se Evolution API falhar |
| Evolution API (self-hosted) | Gratuito, flexível, sem aprovação de template, já temos VM GCP | Não-oficial (risco de ban em conta pessoal), precisa de manutenção | **Escolhido** |
| Z-API (SaaS) | Hosted, fácil | ~R$30/mês, terceiro com acesso à conta | Alternativa se não quiser self-host |
| Email (SendGrid/Resend) | Simples, gratuito | Não é push real, abre no email não no WhatsApp | Fallback, não primário |

---

## Arquitetura

```
GCP VM (Amaia)
  ├── Evolution API (Docker container, porta 8080)
  │     └── Conectado ao WhatsApp de Rodrigo via QR Code
  │     └── Webhook recebe chamadas do monitoramento agent
  └── Monitoring agent (cron 8h e 18h)
        → Gera alertas
        → POST /evolution-api/send-text se severity >= warning
        → Fallback: POST /sendgrid se Evolution API offline
```

**Número WhatsApp**: o número pessoal de Rodrigo é usado para receber (e enviar via bot). O bot usa o mesmo número — Evolution API conecta via WhatsApp Web, então o número pessoal funciona.

---

## Formato das mensagens

```
⚠️ INVEST ALERT — WARNING

Titular: Rodrigo
Ativo: PETR4

Queda atípica: -8.3% (2σ acima da média 30d)
Notícia: Dividendos abaixo do esperado.

Recomendação: verificar tese. Se comprou por dividendos, reavaliar alocação.

[Ver no dashboard →]
```

Para `CRITICAL`:
```
🚨 INVEST ALERT — CRITICAL

Sync XP expirado — portfólio desatualizado há 26h.
Reconecte em: [link de reautenticação]
```

---

## Configuração na VM GCP (Amaia)

```bash
# Docker compose (evolution-api)
docker run -d \
  --name evolution-api \
  -p 8080:8080 \
  -e AUTHENTICATION_API_KEY=<secret> \
  -v evolution_data:/evolution/instances \
  atendai/evolution-api:latest

# QR Code: acessar localhost:8080/manager e escanear com WhatsApp
```

O container é gerenciado pelo Docker, reinicia automaticamente. Monitorar uptime junto com os outros serviços da VM.

---

## Tratamento de falhas

| Falha | Comportamento |
|---|---|
| Evolution API offline | Fallback para email (SendGrid/Resend) |
| WhatsApp desconectado (QR expirou) | Email de alerta para reconectar + alertas ficam na fila por até 6h |
| WhatsApp ban de conta | Migrar para Z-API ou Twilio; email como interim |

---

## Threshold por severidade

| Severidade | WhatsApp | Dashboard | Email |
|---|---|---|---|
| `INFO` | Não | Sim | Não |
| `WARNING` | Sim | Sim | Não |
| `CRITICAL` | Sim | Sim (badge) | Sim (backup) |

---

## Consequências

- Evolution API roda como container Docker na VM Amaia (já existe)
- QR Code precisa ser re-escaneado se a sessão expirar (geralmente meses)
- Secret da Evolution API vai para variáveis de ambiente da VM e do Supabase
- `docs/runbooks/evolution-api-setup.md` a criar antes da Fase 3
- Revisar se Meta toma ações mais agressivas contra sessões não-oficiais em 2026
