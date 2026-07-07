# Post-Mortem: total ao vivo do card divergindo da tabela de posições

## Summary
| Field | Value |
|-------|-------|
| Date | 2026-07-07 |
| Duration | pontual (dado inconsistente desde ~05/06, reportado em 07/07) |
| Severity | Medium |
| Impact | Card do titular Beni mostrava 29.374,95 enquanto a tabela filtrada por titular mostrava 2.442,59. Patrimônio exibido inconsistente para um titular. |
| Detected by | usuário |

## Timeline
| Time | Event |
|------|-------|
| 05-09/06 | Dois `transfer_events` "settled" duplicados (XP→BTG, fundo AZ-AXS, 1 unidade cada) lançados por engano |
| 07/07 | Usuário reporta card ≠ tabela no dashboard do Beni |
| 07/07 | Causa raiz identificada (filtro de transferência assimétrico entre os dois caminhos) |
| 07/07 | Transfer_events cancelados + `/api/prices/current` alinhado ao `getLatestPositions` (PR #18) |

## Root cause
Dois problemas somados:

1. Dado. Dois `transfer_events` idênticos e "settled" (from=xp, to=btg, quantidade 1 cada) para o fundo AZ-AXS Energia, cuja posição no XP tem quantidade 1. O `applyTransferFilter` somava transferido = 2 ≥ posição = 1 e suprimia a posição XP (26.932,36) inteira. Como o último import do BTG (27/05) era anterior à liquidação da transferência (05-09/06), o ativo não aparecia no destino — sumia da origem sem entrar no destino.

2. Código. O total ao vivo dos cards vem de `/api/prices/current`, que replicava a dedup de batches de `getLatestPositions` mas **não** aplicava o `applyTransferFilter`. A tabela e o resumo (via `getLatestPositions`) aplicavam. Com uma transferência ativa, o card somava a posição suprimida e a tabela não — daí a divergência.

## What went well
- Os dois números batiam exatamente com as somas reais do banco (XP 26.932,36 + BTG 2.442,59), o que apontou direto para o filtro de transferência.

## What went wrong
- Dois caminhos calculando o mesmo total (patrimônio por titular) com lógicas duplicadas e desalinhadas. A dedup de batches foi copiada para `/api/prices/current`, mas o filtro de transferência não.
- Transferência liquidada cujo import de destino é anterior à liquidação cria um "buraco": ativo suprimido na origem e ausente no destino. O filtro não se protege desse caso.

## Corrective actions
| Action | Owner | Deadline | Status |
|--------|-------|----------|--------|
| Cancelar os 2 transfer_events lançados por engano | Rodrigo | 2026-07-07 | feito |
| `/api/prices/current` aplicar `applyTransferFilter` (PR #18) | Rodrigo | 2026-07-07 | feito |
| Avaliar unificar dedup+filtro num helper único compartilhado entre `getLatestPositions` e `/api/prices/current` | Rodrigo | — | aberto |
| Filtro de transferência não suprimir na origem quando o import de destino for anterior à data de liquidação (evitar "buraco") | Rodrigo | — | aberto |

## Related ADR
—
