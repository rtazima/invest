#!/usr/bin/env tsx
/**
 * generate-design.ts
 *
 * Gera os arquivos PROMPT.md de design para cada tela do projeto
 * usando Claude API diretamente — substitui o fluxo manual do claude.ai/design.
 *
 * Uso:
 *   pnpm tsx scripts/generate-design.ts --screen dashboard
 *   pnpm tsx scripts/generate-design.ts --screen alertas
 *   pnpm tsx scripts/generate-design.ts --screen estrategia
 *   pnpm tsx scripts/generate-design.ts --all
 *
 * Output: docs/design/<screen>-PROMPT.md
 *
 * Requer: ANTHROPIC_API_KEY no .env.local
 */

import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

// ─── Config ──────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, "..");
const DESIGN_DIR = path.join(ROOT, "docs", "design");
const DOCS_DIR = path.join(ROOT, "docs");

const SCREENS = ["dashboard", "alertas", "estrategia", "importar"] as const;
type Screen = (typeof SCREENS)[number];

// Prompt caching: o contexto do projeto é cacheado entre chamadas
const CACHE_TTL = "ephemeral"; // cache de 5 min no Claude API

// ─── Contexto base (vai para o cache) ────────────────────────────────────────

function loadProjectContext(): string {
  const files = [
    "../../CLAUDE.md",
    "product/prd-invest.md",
    "product/estrategias-por-titular.md",
    "architecture/anr-007-design-system.md",
  ];

  const parts: string[] = [];
  for (const f of files) {
    const fullPath = path.join(DOCS_DIR, f);
    if (fs.existsSync(fullPath)) {
      parts.push(`\n\n## ${f}\n\n${fs.readFileSync(fullPath, "utf-8")}`);
    }
  }
  return parts.join("");
}

// ─── Prompts por tela ────────────────────────────────────────────────────────

const SCREEN_PROMPTS: Record<Screen, string> = {
  dashboard: `
Gere o PROMPT.md de design para o DASHBOARD PRINCIPAL do Invest.

O dashboard é a tela mais crítica: precisa mostrar muito dado com clareza.

## Contexto desta tela

- Server Component (Next.js 15 App Router)
- Tabs: Global | Por Titular | Por Instituição | Por Classe de Ativo
- Componentes: PortfolioOverview, HolderPortfolioCard, PositionsTable (TanStack Table + Virtual), AllocationDonut (Recharts), InstitutionBreakdown, LastSyncStatus, StaleDataBadge
- Estado vazio: CTA "Importar portfólio"

## O que o PROMPT.md deve conter

1. **Design tokens completos** (CSS custom properties para Tailwind v4):
   - Paleta de cores: background, surface, border, text (4 níveis), brand
   - Cores semânticas: pnl-positive, pnl-negative, pnl-neutral, alert-info, alert-warning, alert-critical
   - Tipografia: família, tamanhos (xs a 2xl), peso, line-height
   - Fonte monoespaçada para números financeiros
   - Espaçamentos, border-radius, shadows (3 níveis)
   - Z-index scale

2. **Especificação de componentes** (para cada componente listado acima):
   - Props TypeScript
   - Variantes visuais
   - Descrição visual precisa (cores, layout, hierarquia)
   - Comportamento responsivo
   - Estado de loading (skeleton)
   - Estado vazio

3. **Layout da página**:
   - Header: logo + nav + badge de alertas + avatar
   - Sidebar (se houver): itens de navegação
   - Content area: tabs + grid de cards
   - Descrição de grid/flex para cada seção

4. **Instruções de implementação**:
   - Quais componentes shadcn/ui usar como base
   - Como configurar Recharts para dark mode
   - Como aplicar font-mono nas células de tabela
   - Como implementar as cores de P&L com Tailwind

Formato de saída: markdown bem estruturado, pronto para ser lido pelo comando /implement.
Seja específico: hex codes reais, tamanhos em rem, nomes de variáveis CSS exatos.
`,

  alertas: `
Gere o PROMPT.md de design para a TELA DE ALERTAS do Invest.

## Contexto desta tela

- Rota: /alerts
- Componentes: AlertFeed, AlertCard (expansível), AlertBadgeCounter, AlertFilters
- Severidades: info (azul) | warning (âmbar) | critical (vermelho com vibração)
- Estado de um alerta: unread | read | dismissed
- Filtros: por severidade, titular, período

## O que o PROMPT.md deve conter

1. **Design tokens** (apenas o que é específico ou sobrescreve o dashboard):
   - Cores de severidade com variantes: bg, border, icon, text para cada severidade
   - Badge de contagem: posicionamento, tamanho, cor por severidade máxima presente

2. **Especificação de componentes**:
   - AlertCard: layout colapsado vs expandido, animação de expansão, ações (marcar lido, descartar)
   - AlertFeed: lista com separadores, ordenação por data
   - AlertBadgeCounter: badge no header com número, pisca se critical
   - AlertFilters: chips de filtro, estado ativo/inativo

3. **Layout da página**:
   - Header da página com título + contador total
   - Área de filtros (sticky?)
   - Lista de alertas com infinite scroll ou paginação

4. **Instruções de implementação**:
   - Animação de expansão do AlertCard (Framer Motion ou CSS transition)
   - Como fazer o badge piscar para critical (CSS animation)
`,

  estrategia: `
Gere o PROMPT.md de design para o EDITOR DE ESTRATÉGIA por titular do Invest.

## Contexto desta tela

- Rota: /holders/[holderId]/strategy
- Componentes: StrategyPanel (view/edit), AllocationEditor (tabela editável), RiskProfileBadge
- Modos: view (leitura) e edit (edição inline com validação)
- Validação: soma das alocações-alvo deve ser exatamente 100%
- Titulares: Rodrigo (arrojado), Grasi (conservador), Amora (moderado/arrojado), Benicio (arrojado)

## O que o PROMPT.md deve conter

1. **Design tokens específicos**:
   - Cores dos perfis de risco: conservador (azul frio), moderado (verde), arrojado (laranja/âmbar)
   - Cores de estado do formulário: error, success, warning (para validação)
   - Input styles: focused, error, disabled

2. **Especificação de componentes**:
   - RiskProfileBadge: 3 variantes de cor + ícone
   - StrategyPanel: layout view (cards de informação) vs edit (formulário)
   - AllocationEditor: tabela com inputs numéricos por linha, rodapé com soma total + indicador de erro se ≠ 100%
   - Campos: objetivo, horizonte, liquidez mínima, threshold de desvio, restrições (tags)

3. **Layout da página**:
   - Breadcrumb: Titulares → [Nome] → Estratégia
   - Seções: Perfil de risco | Objetivo | Alocação-alvo | Restrições
   - Botões: Editar / Salvar / Cancelar

4. **Instruções de implementação**:
   - Componente shadcn/ui base para cada input
   - Validação visual da soma de alocações em tempo real
   - Transição suave entre modo view e edit
`,

  importar: `
Gere o PROMPT.md de design para a TELA DE IMPORTAÇÃO CSV do Invest.

## Contexto desta tela

- Rota: /import
- Componentes: ImportWizard (stepper 4 passos), FileDropzone, ExchangeRateInput (só para Nomad), ImportPreview (tabela de preview), ImportHistory
- Passos: 1) Selecionar titular → 2) Selecionar instituição → 3) Upload arquivo → 4) Informar cotação (Nomad only) → 5) Preview + confirmar

## O que o PROMPT.md deve conter

1. **Design tokens específicos**:
   - Cores do stepper: step completed, active, pending
   - Dropzone: idle, dragover, uploading, success, error
   - Preview table: zebra striping, linha inválida destacada em vermelho

2. **Especificação de componentes**:
   - ImportWizard: stepper horizontal no topo, área de conteúdo, botões next/back
   - FileDropzone: ícone de upload, texto de instrução, estados visuais
   - ExchangeRateInput: campo com label "Cotação USD/BRL", hint "ex: 5.87", visível só para Nomad
   - ImportPreview: tabela com top 10 linhas + "e mais N itens", resumo no rodapé (total de linhas, erros)
   - ImportHistory: tabela de últimas importações (titular, instituição, data, status, linhas)

3. **Layout da página**:
   - Header com título + botão "Ver histórico"
   - Stepper no topo
   - Content area centralizado (max-width 640px)

4. **Instruções de implementação**:
   - Stepper: estado controlado por React state
   - Dropzone: react-dropzone ou HTML5 drag-and-drop nativo
   - ExchangeRateInput: visível condicionalmente quando institution === 'nomad'
`,
};

// ─── Gerador principal ────────────────────────────────────────────────────────

async function generateDesignPrompt(screen: Screen): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY não encontrado. Configure no .env.local."
    );
  }

  const client = new Anthropic({ apiKey });

  console.log(`\n🎨 Gerando design para: ${screen}...`);

  const projectContext = loadProjectContext();
  const screenPrompt = SCREEN_PROMPTS[screen];

  const response = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 8000,
    system: [
      {
        type: "text",
        text: `Você é um designer de sistemas especializado em dashboards financeiros.
Seu trabalho é gerar especificações de design precisas e implementáveis para componentes React.

Contexto do projeto:
${projectContext}

Princípios inegociáveis:
- Dark mode como padrão (light mode opcional)
- Números financeiros sempre em fonte monoespaçada
- P&L positivo: verde | P&L negativo: vermelho | neutro: cinza
- Alertas: info=azul | warning=âmbar | critical=vermelho
- Referências visuais: Linear, Vercel Dashboard, Fey app
- Stack: Next.js 15 + Tailwind v4 + shadcn/ui + Recharts + TanStack Table
- Nunca inventar bibliotecas — usar apenas o stack definido`,
        // @ts-ignore — cache_control é suportado mas não tipado em todas as versões do SDK
        cache_control: { type: CACHE_TTL },
      },
    ],
    messages: [
      {
        role: "user",
        content: screenPrompt,
      },
    ],
  });

  const content = response.content[0];
  if (!content || content.type !== "text") {
    throw new Error("Resposta inesperada da API");
  }

  const outputPath = path.join(DESIGN_DIR, `${screen}-PROMPT.md`);
  const header = `# Design PROMPT — ${screen}

> Gerado automaticamente por \`scripts/generate-design.ts\`
> Data: ${new Date().toISOString().split("T")[0]}
> Modelo: claude-opus-4-5
>
> Este arquivo é a fonte de verdade para implementação da tela **${screen}**.
> O comando \`/implement\` usa este arquivo como contexto de UI.
>
> Regra de conflito: PRD > CLAUDE.md > este PROMPT.md
> Para regenerar: \`pnpm tsx scripts/generate-design.ts --screen ${screen}\`

---

`;

  fs.writeFileSync(outputPath, header + content.text, "utf-8");

  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;
  // @ts-ignore
  const cacheHit = response.usage.cache_read_input_tokens ?? 0;

  console.log(`✅ Salvo em: docs/design/${screen}-PROMPT.md`);
  console.log(
    `   tokens: ${inputTokens} in (${cacheHit} cache hit) / ${outputTokens} out`
  );
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  if (!fs.existsSync(DESIGN_DIR)) {
    fs.mkdirSync(DESIGN_DIR, { recursive: true });
  }

  if (args.includes("--all")) {
    console.log(`🚀 Gerando design para todas as telas: ${SCREENS.join(", ")}`);
    for (const screen of SCREENS) {
      await generateDesignPrompt(screen);
    }
    console.log("\n✅ Todos os PROMPT.md gerados em docs/design/");
    return;
  }

  const screenIdx = args.indexOf("--screen");
  if (screenIdx === -1 || !args[screenIdx + 1]) {
    console.error(
      "Uso: pnpm tsx scripts/generate-design.ts --screen <screen> | --all"
    );
    console.error(`Telas disponíveis: ${SCREENS.join(", ")}`);
    process.exit(1);
  }

  const screen = args[screenIdx + 1] as Screen;
  if (!SCREENS.includes(screen)) {
    console.error(`Tela inválida: ${screen}`);
    console.error(`Telas disponíveis: ${SCREENS.join(", ")}`);
    process.exit(1);
  }

  await generateDesignPrompt(screen);
  console.log("\n✅ Done.");
}

main().catch((err) => {
  console.error("❌ Erro:", err.message);
  process.exit(1);
});
