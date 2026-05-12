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

## Fluxo de trabalho

```
1. Rodrigo acessa claude.ai/design
2. Carrega: PRD, CLAUDE.md, referências visuais (dashboards financeiros de referência)
3. Claude Design gera: paleta, tipografia, componentes-chave
4. Rodrigo revisa e exporta → salvo em docs/design/<slug>-PROMPT.md
5. `/implement` detecta o PROMPT.md e usa como contexto de UI
6. Conflito de decisão: PRD > CLAUDE.md > PROMPT.md
```

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
