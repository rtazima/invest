# ANR-007 — Design system: Claude Design

**Status:** aprovado  
**Data:** 2026-05-11  
**Autor:** Rodrigo Tazima

---

## Decisão

Usar Claude Design para gerar o design system e os componentes do frontend. O handoff é feito via arquivo `PROMPT.md` que alimenta diretamente a implementação no Next.js.

---

## Contexto

A plataforma precisa de UI de qualidade para um dashboard financeiro: tabelas densas de dados, gráficos de evolução patrimonial, cards de alertas com severidade visual e formulários de estratégia. Um design system consistente é mais importante que um design único — a legibilidade e a hierarquia visual dos dados são críticas.

---

## Por que Claude Design

- Rodrigo não tem designer — Claude Design elimina essa dependência
- Gera design system diretamente a partir do contexto do produto (PRD + CLAUDE.md)
- Handoff via `PROMPT.md` alimenta o comando `/implement` sem atrito
- Resultado: componentes React coerentes com shadcn/ui + Tailwind, sem CSS personalizado ad hoc

**Alternativa descartada: Figma**
Requereria um designer ou tempo de Rodrigo no Figma. Para um projeto solo, o fluxo Claude Design → PROMPT.md → `/implement` é mais rápido e menos fragmentado.

---

## Fluxo de trabalho (automatizado)

Claude Design (claude.ai/design) não tem API pública. O fluxo usa o script `scripts/generate-design.ts` que chama a Claude API diretamente e produz o mesmo output: um `PROMPT.md` com tokens de design e specs de componentes.

```bash
# Gerar design para uma tela específica
pnpm tsx scripts/generate-design.ts --screen dashboard

# Gerar todas as telas de uma vez
pnpm tsx scripts/generate-design.ts --all
```

```
1. Script lê: CLAUDE.md + PRD + ANR-007 (contexto com cache)
2. Chama Claude API (claude-opus-4-5) com prompt específico por tela
3. Salva output em docs/design/<slug>-PROMPT.md
4. `/implement` detecta o PROMPT.md e usa como contexto de UI
5. Conflito de decisão: PRD > CLAUDE.md > PROMPT.md
```

Telas configuradas: `dashboard`, `alertas`, `estrategia`, `importar`

Adicionar nova tela: incluir entrada em `SCREEN_PROMPTS` no script.

---

## Diretrizes de identidade visual (a refinar com Claude Design)

**Tom:** profissional, limpo, denso em dados sem parecer planilha. Referências: Linear, Vercel dashboard, Fey (app de portfólio).

**Modo escuro obrigatório:** dados financeiros são lidos à noite/madrugada. Dark mode como padrão, light mode opcional.

**Hierarquia de cor para alertas:**
- `INFO`: azul sutil (texto/ícone)
- `WARNING`: amarelo/âmbar
- `CRITICAL`: vermelho, com vibração visual (border, bg tinted)

**Números financeiros:**
- Valores positivos: verde
- Valores negativos: vermelho
- Neutros: cinza
- Fonte monoespaçada para colunas numéricas (alinhamento por dígito)

**Componentes-chave a gerar:**
- `PortfolioCard` — patrimônio de um titular com sparkline
- `PositionRow` — linha de uma posição (ticker, valor, P&L, %)
- `AlertBadge` — tag info/warning/critical
- `AllocationDonut` — gráfico de rosca de alocação por classe
- `PatrimonyChart` — gráfico de linha mês a mês
- `StrategyPanel` — visualização + edição da estratégia do titular
- `SyncStatus` — status de cada conta (ok / expirado / sincronizando)

---

## Biblioteca de componentes

Base: **shadcn/ui** + **Tailwind CSS v4**

Gráficos: **Recharts** (flexível, React-native, bom suporte TypeScript)

Tabelas densas: **TanStack Table v8** (virtualização para portfólios grandes)

---

## Onde ficam os arquivos de design

```
docs/design/
  dashboard-PROMPT.md       ← handoff do dashboard principal
  alertas-PROMPT.md         ← handoff do painel de alertas
  estrategia-PROMPT.md      ← handoff do editor de estratégia
```

Cada PROMPT.md é gerado uma vez e atualizado quando o Claude Design produzir uma nova revisão.

---

## Consequências

- Antes de implementar qualquer tela, gerar o PROMPT.md correspondente no Claude Design
- `/implement` sempre verifica se existe PROMPT.md para a feature em desenvolvimento
- Tokens de design (cores, espaçamentos, tipografia) em `docs/specs/design-system/README.md`
- Nunca sobrescrever decisões do PRD com decisões visuais do PROMPT.md
