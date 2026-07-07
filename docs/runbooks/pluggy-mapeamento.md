# Pluggy — mapeamento de campos e gotchas

Referência do cliente: `src/lib/pluggy/client.ts` (`pluggyInvestmentToPosition`).
Doc oficial do objeto Investment: https://docs.pluggy.ai/docs/investments

## Datas do Investment

A Pluggy expõe três campos de data e é fácil confundir:

- `date` — data de referência da posição (valuation). É a MESMA para todos os ativos de um snapshot (ex.: último dia útil). **Não é vencimento.**
- `dueDate` — vencimento / expiração. É o que vai para `maturity_date`.
- `issueDate` — data de emissão.

Bug histórico (corrigido no PR #19): o mapeamento usava `inv.date` como
vencimento. Resultado: todas as posições de um snapshot recebiam a mesma
data (ações do BTG em 05/06, renda fixa em 11/06), inclusive ações, que
não vencem. A correção passou a usar `inv.dueDate`.

Ao mexer no mapeamento de vencimento, lembrar que o Tesouro Direto usa
`maturityDate` para o lookup de PU no Tesouro Transparente
(`lookupPU`) — trocar a fonte da data afeta esse enriquecimento.

## Dedup: Pluggy vence o relatório

Quando existe batch Pluggy para (titular, instituição), ele é a fonte
principal e os imports por relatório (xlsx/csv) da mesma dupla ficam
ocultos no dashboard (ver `getLatestPositions`). Ou seja, para BTG/XP
sincronizados via Pluggy, é o dado da Pluggy que aparece — corrigir o
mapeamento da Pluggy, não o parser de relatório.

## Correção de dados existentes

O código só afeta syncs futuros. Para corrigir posições já gravadas com
vencimento errado, basta um novo sync do Pluggy (cron 2×/dia, 8h e 18h,
ou disparo manual): ele cria um novo batch que a dedup passa a usar.

## Exibição do vencimento

Na tabela do dashboard (`PositionsTable`), o vencimento aparece como pill
com o ano ao lado da classe do ativo e a data completa (DD/MM/AAAA) mais
o indexador no tooltip (`title`) do nome do ativo.
