# Import de relatórios e deduplicação

## Fontes

Import é por relatório das corretoras: XLSX (XP/BTG), PDF (Nomad), CSV. Fluxo:
`ImportWizard` → `processCSVImport` (Server Action em `src/app/(app)/import/actions.ts`).
Cada import cria um `import_batch` com `source` (xlsx/csv/pdf/csv_supplement).

## Dedup no dashboard

`getLatestPositions` (`src/lib/data/positions.ts`, espelhado em `/api/prices/current`
e nas rotas de snapshot) seleciona os batches assim:

- `csv_supplement` (Tesouro): sempre aparece junto, nunca é ocultado.
- Report normal: dedup por `(holder_id, institution, filename)`. Re-importar o
  mesmo nome de arquivo substitui; nomes distintos coexistem (sub-contas).

Limitação: reimportar a mesma conta com um nome de arquivo diferente NÃO substitui
o antigo — os dois somam. Foi o que causou o double-count de jul/2026 (ver
[[dedup-filename-double-count]] na memória do projeto).

## Substituir no import (mitigação)

No passo "Confirmar" do wizard, se já existem imports daquela conta (titular +
instituição, fora suplementos), aparece um seletor:

- "Nova conta/carteira (adicionar)" — não remove nada. Default quando há mais de
  um import anterior (sub-contas, ex.: as 3 contas XP do Tazima).
- "Substituir: <arquivo>" — após o novo import concluir, remove o batch escolhido.
  Default quando há exatamente um import anterior (caso comum de reimport).

Server: `processCSVImport` lê `replace_batch_id` e, após marcar o novo batch como
`completed`, remove o batch alvo (validando que é do mesmo titular+instituição).
Só roda no sucesso, então uma falha de parse não apaga o dado anterior.

Fora do escopo por enquanto: import "foto" (Nomad+XP combinado, via
`processFotoImport`) não tem o seletor de substituição.

## XP Global (PDF da XP Investments US)

A conta XP Global é da XP Investments US LLC (Miami), em USD, legalmente separada
da XP BR (BRL). Entra como instituição própria `xp_global` (migração
`0047_xp_global_institution.sql`), com card, sync e agrupamento separados da XP no
dashboard. Importa por PDF (Account Statement), igual ao fluxo do Nomad: exige
cotação USD/BRL manual (sem API de câmbio), e a conversão para BRL acontece na
Server Action (`market_value_brl = market_value × exchange_rate`).

Parser: `src/lib/pdf/xpglobal-pdf-parser.ts`.

O `pdf-parse` cola as colunas do extrato (ex.: `GLOBAL X FDS ... COPPERCOPX` e
`12.00076.97923.64...`), o que quebra qualquer parse posicional. A solução é
reconstruir as colunas pelas coordenadas (x,y) de cada trecho do pdfjs
(`renderByColumns` via `pagerender`), inserindo um separador quando há gap
horizontal. Isso separa o ticker do nome e cada número na sua coluna.

O que o parser extrai da seção `PORTFOLIO`: ticker (Symbol), nome (Description,
juntando continuação quando quebra em 2 linhas), quantidade, preço atual e Market
Value (USD). O extrato não traz custo médio, então `avgPrice = null` (sem P&L,
igual ao Nomad). O CUSIP vai em `raw_data`. O Cash Balance (fechamento) do ACCOUNT
SUMMARY vira uma posição de liquidez em USD, então a soma das posições fecha com o
Total Net Worth do extrato.

Classe do ativo por heurística de palavra na descrição (FDS/ETF/FUND/TRUST/TR/
INDEX/SPDR/SHS → `etf_intl`; senão `stocks_intl`). É aproximação: o extrato não
traz um código de tipo confiável na tabela de portfolio.

Detalhe do pdf-parse: importamos `pdf-parse/lib/pdf-parse.js` (módulo interno) em
vez de `pdf-parse` (index.js), porque o index tem um branch de debug que lê um PDF
de teste inexistente quando `module.parent` é falsy (quebra sob Vitest com ENOENT).
Tipagem do subpath em `src/types/pdf-parse-lib.d.ts`.

Testes: `src/__tests__/lib/xpglobal-pdf-parser.test.ts`. O teste puro
(`parseXpGlobalLines` com linhas sintéticas) roda sempre; o de integração roda
contra um extrato real local (`XPGLOBAL.pdf`, git-ignorado por PII) e é pulado no
CI. Extratos reais nunca vão pro git (`*.pdf` no `.gitignore` — LGPD).

Deploy: a migração `0047` precisa rodar no Supabase antes do recurso funcionar em
produção (o insert com `institution='xp_global'` falha enquanto o valor não existe
no enum).
