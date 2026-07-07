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
